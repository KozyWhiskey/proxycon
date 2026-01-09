import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { redirect } from 'next/navigation';
import MyStats from '@/components/dashboard/my-stats';
import ActiveTournament from '@/components/dashboard/active-tournament';
import Feed from '@/components/dashboard/feed';
import UserHeader from '@/components/dashboard/user-header';
import QuickActions from '@/components/dashboard/quick-actions';
import ManageMembersDialog from '@/components/events/manage-members-dialog';
import EventPlayerList from '@/components/events/event-player-list';
import EventTrophies from '@/components/events/event-trophies';
import { getEventMembers } from '@/app/events/actions';
import {
  calculateStandings,
  sortStandings,
  convertDbMatchToMatchResult,
} from '@/lib/swiss-pairing';
import { Button } from '@/components/ui/button';
import { Trophy, Plus } from 'lucide-react';
import EventSettingsDialog from '@/components/events/event-settings-dialog';

interface EventDashboardProps {
  params: Promise<{ id: string }>;
}

export default async function EventDashboard({ params }: EventDashboardProps) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  
  // Auth Check
  const authData = await getCurrentUser();
  if (!authData || !authData.user) {
    redirect('/login');
  }

  const { user, profile } = authData;

  // Ensure profile is complete (V3 Onboarding)
  if (!profile || !profile.username || !profile.display_name) {
    redirect('/onboarding');
  }

  // Check if user is a member of this event (V3: event_members)
  const { data: eventMember, error: eventMemberError } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', eventId)
    .eq('profile_id', user.id)
    .single();

  if (eventMemberError || !eventMember) {
    // User not a member of event -> redirect to global landing or show "Join"
    redirect('/');
  }
  
  const currentProfile = profile;
  const currentProfileId = user.id;

  // Fetch Event Details
  const { data: event } = await supabase
    .from('events')
    .select('name, invite_code, is_active')
    .eq('id', eventId)
    .single();

  // Fetch Event Members
  const members = await getEventMembers(eventId);

  // Fetch active tournaments FOR THIS EVENT
  const { data: activeTournaments } = await supabase
    .from('tournaments')
    .select('id, name, format, status') // Select relevant tournament fields
    .eq('event_id', eventId)
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false });

  // Fetch current user's match for each active tournament
  const tournamentsWithMatches = await Promise.all(
    (activeTournaments || []).map(async (tournament) => {
      // Get all matches for this tournament
      const { data: allMatches } = await supabase
        .from('matches')
        .select('id, round_number, tournament_id, game_type, started_at, completed_at, ai_commentary, created_at') // Select all match fields
        .eq('tournament_id', tournament.id)
        .order('round_number', { ascending: false });

      let currentMatch = null;
      if (allMatches && allMatches.length > 0) {
        // Find matches where the current user is a participant
        for (const match of allMatches) {
          const { data: participants } = await supabase
            .from('match_participants')
            .select('id, profile_id, result') // V3: profile_id
            .eq('match_id', match.id);

          if (participants?.some((p) => p.profile_id === currentProfileId)) {
            // Fetch profile details for all participants
            const profileIds = participants.map((p) => p.profile_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, display_name, username') // V3: profiles
              .in('id', profileIds);

            const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

            // Construct currentMatch to match ActiveTournament's Match interface
            currentMatch = {
              id: match.id,
              round_number: match.round_number,
              // Other match properties are not directly used by ActiveTournament, but included for completeness.
              // We need to ensure that the participants array structure is correct.
              participants: participants.map((p) => ({
                id: p.id, // match_participant_id
                profile_id: p.profile_id,
                result: p.result,
                profile: profilesMap.get(p.profile_id) || { id: p.profile_id, display_name: 'Unknown', username: null }, // Ensure profile object is always there
              })),
            };
            break;
          }
        }
      }

      return {
        tournament,
        currentMatch,
      };
    })
  );

  // --- 1. Fetch Stats (Casual & Tournament Matches) ---
  const { data: userMatches } = await supabase
    .from('match_participants')
    .select(`
      result,
      match:matches (
        id,
        game_type,
        created_at,
        tournament_id,
        event_id
      )
    `)
    .eq('profile_id', currentProfileId)
    .not('match', 'is', null) // Ensure match exists
    .filter('match.event_id', 'eq', eventId); // Filter by this event

  // Process stats in memory (efficient enough for single user/event)
  let casualWins = 0;
  let tournamentWins = 0;
  let tournamentLosses = 0;
  let tournamentDraws = 0;
  const casualWinDetails: any[] = [];

  // Helper to get opponents for a match (for casual details)
  // We'll fetch these in bulk if needed, but for now let's just show game type
  
  if (userMatches) {
    for (const record of userMatches) {
      // @ts-ignore - Supabase type inference for joined tables can be tricky
      const matchData = record.match;
      const match = Array.isArray(matchData) ? matchData[0] : matchData;
      
      if (!match) continue;

      if (match.tournament_id) {
        // Tournament Stats
        if (record.result === 'win') tournamentWins++;
        else if (record.result === 'loss') tournamentLosses++;
        else if (record.result === 'draw') tournamentDraws++;
      } else {
        // Casual Stats
        if (record.result === 'win') {
          casualWins++;
          casualWinDetails.push({
            gameType: match.game_type || 'Casual',
            createdAt: match.created_at,
            // We could fetch opponents here if strictly necessary, but it's N+1. 
            // For now, leaving opponents undefined is acceptable per the interface.
          });
        }
      }
    }
  }

  const tournamentTotal = tournamentWins + tournamentLosses + tournamentDraws;
  const tournamentWinRate = tournamentTotal > 0
    ? ((tournamentWins / tournamentTotal) * 100).toFixed(1)
    : '0.0';

  // --- 1.5 Calculate Tournament Placements ---
  let tournamentFirstPlace = 0;
  let tournamentSecondPlace = 0;
  let tournamentThirdPlace = 0;

  const { data: completedTournaments } = await supabase
    .from('tournaments')
    .select('id')
    .eq('event_id', eventId)
    .eq('status', 'completed');

  if (completedTournaments && completedTournaments.length > 0) {
    for (const t of completedTournaments) {
      // Fetch matches and participants for this tournament to calc standings
      const { data: tMatches } = await supabase
        .from('matches')
        .select('id, round_number')
        .eq('tournament_id', t.id);
        
      const { data: tParticipants } = await supabase
        .from('tournament_participants')
        .select('profile_id')
        .eq('tournament_id', t.id);
        
      if (!tMatches || !tParticipants) continue;

      const tMatchIds = tMatches.map(m => m.id);
      const { data: tMatchParticipants } = await supabase
        .from('match_participants')
        .select('match_id, profile_id, result')
        .in('match_id', tMatchIds);

      const tProfileIds = tParticipants.map(p => p.profile_id);
      
      // Build history
      const tMatchHistory: any[] = [];
      const participantsByMatch = new Map<string, any[]>();
      tMatchParticipants?.forEach(p => {
        if (!participantsByMatch.has(p.match_id)) participantsByMatch.set(p.match_id, []);
        participantsByMatch.get(p.match_id)!.push(p);
      });

      for (const m of tMatches) {
        const parts = participantsByMatch.get(m.id) || [];
        if (parts.length > 0) {
          tMatchHistory.push(convertDbMatchToMatchResult(m.id, m.round_number, parts.map(p => ({ playerId: p.profile_id, result: p.result }))));
        }
      }

      // Calculate Standings
      const tStandingsMap = calculateStandings(tProfileIds, tMatchHistory);
      const tSortedStandings = sortStandings(Array.from(tStandingsMap.values()));

      // Check user rank
      const userRankIndex = tSortedStandings.findIndex(s => s.playerId === currentProfileId);
      if (userRankIndex === 0) tournamentFirstPlace++;
      else if (userRankIndex === 1) tournamentSecondPlace++;
      else if (userRankIndex === 2) tournamentThirdPlace++;
    }
  }


  // --- 2. Fetch Feed Data (Recent Matches for Event) ---
  const { data: recentMatches } = await supabase
    .from('matches')
    .select(`
      id,
      tournament_id,
      round_number,
      game_type,
      created_at,
      participants:match_participants (
        id,
        profile_id,
        result,
        profile:profiles (
          id,
          display_name,
          username
        )
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(20);

  const formattedMatches = (recentMatches || []).map((m: any) => ({
    type: 'match' as const,
    id: m.id,
    tournament_id: m.tournament_id,
    round_number: m.round_number,
    game_type: m.game_type,
    created_at: m.created_at,
    participants: m.participants.map((p: any) => ({
      id: p.id,
      player_id: p.profile_id,
      result: p.result,
      player: {
        id: p.profile.id,
        name: p.profile.display_name,
        nickname: p.profile.display_name // Fallback to display_name
      }
    }))
  }));

  // --- 3. Fetch Event Trophies ---
  const { data: eventBadges } = await supabase
    .from('profile_badges')
    .select(`
      id, awarded_at,
      badges (id, slug, name, description, icon_url),
      profile:profiles (id, display_name)
    `)
    .eq('event_id', eventId)
    .order('awarded_at', { ascending: false });

  const eventTrophies = eventBadges?.map((b: any) => ({
    id: b.id,
    awarded_at: b.awarded_at,
    badge: b.badges,
    profile: b.profile
  })) || [];

  // Combine and sort feed
  const feedItems = [
    ...formattedMatches,
    ...eventTrophies.map(t => ({
      type: 'badge' as const,
      id: t.id,
      awarded_at: t.awarded_at,
      badge: t.badge,
      profile: t.profile
    }))
  ].sort((a, b) => {
    const dateA = a.type === 'match' ? new Date(a.created_at) : new Date(a.awarded_at);
    const dateB = b.type === 'match' ? new Date(b.created_at) : new Date(b.awarded_at);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* User Header - Sticky only on Desktop to save mobile screen real estate */}
      <div className="md:sticky md:top-0 z-10">
        <UserHeader
          displayName={currentProfile.display_name || 'Player'}
          username={currentProfile.username}
          avatarUrl={currentProfile.avatar_url}
        />
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-8 mt-4">
        <div className="flex justify-between items-center px-1">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1 font-heading tracking-tight">{event?.name || 'Event Dashboard'}</h1>
            <p className="text-muted-foreground/60 text-xs uppercase tracking-[0.2em] font-heading">Event Context</p>
          </div>
          <div className="flex gap-2">
            <ManageMembersDialog 
              eventId={eventId}
              eventName={event?.name || 'Event'}
              inviteCode={event?.invite_code}
              initialMembers={members}
              canManage={['owner', 'admin'].includes(eventMember.role)}
            />
            {eventMember.role === 'owner' && (
              <EventSettingsDialog 
                eventId={eventId}
                eventName={event?.name || 'Event'}
                isActive={event?.is_active ?? true}
              />
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="md:col-span-8 space-y-8 flex flex-col">
            
            {/* 1. Active Tournaments (Priority 1) */}
            <section className="order-1">
              {tournamentsWithMatches.length > 0 && (
                <h2 className="text-sm font-bold text-muted-foreground/40 uppercase tracking-[0.2em] font-heading mb-4 px-1">Active Match</h2>
              )}
              <div className="space-y-4">
                {tournamentsWithMatches.length > 0 ? (
                  tournamentsWithMatches.map(({ tournament, currentMatch }) => (
                    <ActiveTournament
                      key={tournament.id}
                      tournament={tournament}
                      currentMatch={currentMatch}
                      currentProfileId={currentProfileId}
                    />
                  ))
                ) : (
                  /* Only show empty state if NO quick actions or other content (optional, but keeping simple for now) 
                     Actually, standard design: if no active tournament, we just show quick actions first.
                     We can conditionally render this section only if active.
                  */
                   <ActiveTournament
                    tournament={null}
                    currentMatch={null}
                    currentProfileId={currentProfileId}
                  />
                )}
              </div>
            </section>

            {/* 2. Quick Actions (Priority 2) */}
            <section className="order-2">
              <h2 className="text-sm font-bold text-muted-foreground/40 uppercase tracking-[0.2em] font-heading mb-4 px-1">Quick Actions</h2>
              <QuickActions eventId={eventId} />
            </section>

            {/* 3. Feed (Desktop Only in this col, or shifted via grid?) 
                Actually, following the request to consolidate feed:
                We will remove the feed from here and let the sidebar handle it on desktop?
                OR we keep it here and hide on mobile?
                The original layout had Feed in main col for Desktop, and Sidebar for Mobile (duplicated).
                
                Better Approach:
                Mobile: Active -> Actions -> Stats -> Feed
                Desktop: 
                  Left: Active -> Actions -> Feed
                  Right: Stats -> Trophies -> Players
            */}
            <section className="order-3 hidden md:block">
              <h2 className="text-sm font-bold text-muted-foreground/40 uppercase tracking-[0.2em] font-heading mb-4 px-1">Activity Feed</h2>
              <Feed items={feedItems} />
            </section>
          </div>

          {/* Sidebar Stats Area */}
          <div className="md:col-span-4 space-y-8 flex flex-col">
            <section className="order-1">
              <h2 className="text-sm font-bold text-muted-foreground/40 uppercase tracking-[0.2em] font-heading mb-4 px-1">Event Stats</h2>
              <MyStats
                casualWins={casualWins}
                casualWinDetails={casualWinDetails}
                tournamentFirstPlace={tournamentFirstPlace}
                tournamentSecondPlace={tournamentSecondPlace}
                tournamentThirdPlace={tournamentThirdPlace}
                tournamentWins={tournamentWins}
                tournamentLosses={tournamentLosses}
                tournamentDraws={tournamentDraws}
                tournamentWinRate={tournamentWinRate}
              />
            </section>

            <section className="order-2">
              <h2 className="text-sm font-bold text-muted-foreground/40 uppercase tracking-[0.2em] font-heading mb-4 px-1">Awarded Trophies</h2>
              <EventTrophies trophies={eventTrophies} />
            </section>

            <section className="order-3">
              <h2 className="text-sm font-bold text-muted-foreground/40 uppercase tracking-[0.2em] font-heading mb-4 px-1">Players</h2>
              <EventPlayerList members={members} />
            </section>

            {/* Mobile Feed (Priority 4) */}
            <section className="md:hidden order-4">
              <h2 className="text-sm font-bold text-muted-foreground/40 uppercase tracking-[0.2em] font-heading mb-4 px-1">Activity Feed</h2>
              <Feed items={feedItems} />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}