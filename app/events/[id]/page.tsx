import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { redirect } from 'next/navigation';
import MyStats from '@/components/dashboard/my-stats';
import ActiveTournament from '@/components/dashboard/active-tournament';
import Feed from '@/components/dashboard/feed';
import UserHeader from '@/components/dashboard/user-header';
import QuickActions from '@/components/dashboard/quick-actions';
import ManageMembersDialog from '@/components/events/manage-members-dialog';
import { getEventMembers } from '@/app/events/actions';
import {
  calculateStandings,
  sortStandings,
  convertDbMatchToMatchResult,
} from '@/lib/swiss-pairing';
import { Button } from '@/components/ui/button';
import { Trophy, Plus } from 'lucide-react';
import Link from 'next/link';

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
    .select('name, invite_code')
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

  // Placeholder for Placements (Requires analyzing full tournament history)
  const tournamentFirstPlace = 0;
  const tournamentSecondPlace = 0;
  const tournamentThirdPlace = 0;


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

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      {/* User Header */}
      <div className="sticky top-0 z-10">
        <UserHeader
          displayName={currentProfile.display_name || 'Player'}
          username={currentProfile.username}
          avatarUrl={currentProfile.avatar_url}
        />
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-100 mb-2">{event?.name || 'Event Dashboard'}</h1>
            <p className="text-slate-400 text-sm">ProxyCon Platform</p>
          </div>
          <ManageMembersDialog 
            eventId={eventId}
            eventName={event?.name || 'Event'}
            inviteCode={event?.invite_code}
            initialMembers={members}
            canManage={['owner', 'admin'].includes(eventMember.role)}
          />
        </div>
        
        {/* MyStats will need to be refactored to use V3 schema */}
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
        
        <QuickActions eventId={eventId} />
        
        {tournamentsWithMatches.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-100">Active Tournaments</h2>
            {tournamentsWithMatches.map(({ tournament, currentMatch }) => (
              <ActiveTournament
                key={tournament.id}
                tournament={tournament}
                currentMatch={currentMatch}
                currentProfileId={currentProfileId} // Use currentProfileId
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
             <h2 className="text-2xl font-bold text-slate-100">Active Tournaments</h2>
             <ActiveTournament
                tournament={null}
                currentMatch={null}
                currentProfileId={currentProfileId} // Use currentProfileId
              />
          </div>
        )}
        
        <Feed matches={formattedMatches} /> {/* Feed needs V3 data */}
      </div>
    </main>
  );
}
