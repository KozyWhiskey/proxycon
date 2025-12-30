import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { requireProfile } from "@/lib/get-current-user";
import { getUserGuilds } from "@/app/guilds/actions";
import ActiveTournament from "@/components/dashboard/active-tournament";
import ActiveEvents from "@/components/dashboard/active-events";
import MyStats from "@/components/dashboard/my-stats";
import QuickActions from "@/components/dashboard/quick-actions";
import MyGuilds from "@/components/dashboard/my-guilds";
import PendingInvites from "@/components/dashboard/pending-invites";
import UserHeader from "@/components/dashboard/user-header";
import Feed from "@/components/dashboard/feed";
import { TrophyCase } from "@/components/profile/trophy-case";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default async function Dashboard() {
  const supabase = await createClient();
  const { user, profile } = await requireProfile();

  // Fetch Guilds
  const userGuilds = await getUserGuilds(user.id);
  const pendingInvites = userGuilds.filter(g => g.status === 'invited');

  // --- 1. Fetch Active Events ---
  const { data: activeEventsRaw } = await supabase
    .from('events')
    .select(`
      id, name, start_date, end_date, is_active,
      event_members!inner(role)
    `)
    .eq('event_members.profile_id', user.id)
    .eq('is_active', true)
    .order('start_date', { ascending: false })
    .limit(3);

  const activeEvents = activeEventsRaw?.map(e => ({
    id: e.id,
    name: e.name,
    start_date: e.start_date,
    end_date: e.end_date,
    is_active: e.is_active,
    role: e.event_members[0]?.role
  })) || [];

  // --- 2. Fetch Active Tournament ---
  // Find tournaments where the user is a participant and status is active/pending
  const { data: activeTournamentData } = await supabase
    .from('tournaments')
    .select(`
      id, name, format, status,
      tournament_participants!inner(profile_id)
    `)
    .eq('tournament_participants.profile_id', user.id)
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let currentMatch = null;
  if (activeTournamentData) {
    // If there is an active tournament, find the user's current match
    const { data: matchData } = await supabase
      .from('matches')
      .select(`
        id, round_number,
        match_participants!inner(
          id, profile_id, result,
          profile:profiles(id, display_name, username)
        )
      `)
      .eq('tournament_id', activeTournamentData.id)
      .eq('match_participants.profile_id', user.id)
      .order('round_number', { ascending: false })
      .limit(1)
      .single();

    if (matchData) {
        // We need to fetch the *full* match participants, not just the user's
        // The previous query inner joined on the user, so it only returns the user's participant row?
        // Actually, Supabase inner join filters the parent rows, but the nested select might return all if configured correctly.
        // However, standard SQL behavior would filter. To be safe, let's fetch the match details separately.
        
        const { data: fullMatchData } = await supabase
        .from('matches')
        .select(`
            id, round_number,
            participants:match_participants(
            id, profile_id, result,
            profile:profiles(id, display_name, username)
            )
        `)
        .eq('id', matchData.id)
        .single();
        
        if (fullMatchData) {
             // Map to the shape expected by ActiveTournament
             // The component expects `participants` array on the match object
             currentMatch = fullMatchData;
        }
    }
  }

  // --- 3. Fetch Stats ---
  // A simplified stats fetch for the dashboard
  
  // Get all completed matches for the user
  const { data: userMatches } = await supabase
    .from('match_participants')
    .select('result, match:matches(tournament_id, game_type)')
    .eq('profile_id', user.id)
    .not('result', 'is', null);

  let tournamentWins = 0;
  let tournamentLosses = 0;
  let tournamentDraws = 0;
  let casualWins = 0;

  userMatches?.forEach((m) => {
    // Check if match is tournament or casual
    const isTournament = !!(m.match as any)?.tournament_id;
    
    if (isTournament) {
      if (m.result === 'win') tournamentWins++;
      else if (m.result === 'loss') tournamentLosses++;
      else if (m.result === 'draw') tournamentDraws++;
    } else {
      if (m.result === 'win') casualWins++;
    }
  });

  const totalTournamentMatches = tournamentWins + tournamentLosses + tournamentDraws;
  const tournamentWinRate = totalTournamentMatches > 0 
    ? ((tournamentWins / totalTournamentMatches) * 100).toFixed(1) 
    : "0.0";

  // Fetch casual win details (limit 5)
  const { data: casualWinDetailsRaw } = await supabase
    .from('match_participants')
    .select(`
      created_at,
      match:matches!inner(
        game_type,
        created_at
      )
    `)
    .eq('profile_id', user.id)
    .eq('result', 'win')
    .is('match.tournament_id', null)
    .order('created_at', { ascending: false })
    .limit(5);

  const casualWinDetails = casualWinDetailsRaw?.map(d => ({
    gameType: (d.match as any)?.game_type || 'Casual',
    createdAt: (d.match as any)?.created_at || new Date().toISOString(),
    boardGameName: null,
    opponents: []
  })) || [];

  // --- 4. Fetch Feed ---
  // Recent 5 matches system-wide
  const { data: feedMatches } = await supabase
    .from('matches')
    .select(`
      id, tournament_id, round_number, game_type, created_at,
      participants:match_participants(
        id, player_id:profile_id, result,
        player:profiles(id, name:username, nickname:display_name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  // Recent 5 badges system-wide (for feed)
  const { data: feedBadges } = await supabase
    .from('profile_badges')
    .select(`
      id, awarded_at,
      badges (name, description, icon_url),
      profile:profiles (display_name)
    `)
    .order('awarded_at', { ascending: false })
    .limit(10);

  // Combine and sort feed items
  const feedItems = [
    ...(feedMatches || []).map((m: any) => ({
      type: 'match' as const,
      id: m.id,
      tournament_id: m.tournament_id,
      round_number: m.round_number,
      game_type: m.game_type,
      created_at: m.created_at,
      participants: m.participants.map((p: any) => ({
        id: p.id,
        player_id: p.player_id,
        result: p.result,
        player: {
          id: p.player.id,
          name: p.player.name,
          nickname: p.player.nickname
        }
      }))
    })),
    ...(feedBadges || []).map((b: any) => ({
      type: 'badge' as const,
      id: b.id,
      awarded_at: b.awarded_at,
      badge: {
        name: b.badges?.name,
        description: b.badges?.description,
        icon_url: b.badges?.icon_url
      },
      profile: {
        display_name: b.profile?.display_name || 'Unknown'
      }
    }))
  ].sort((a, b) => {
    const dateA = a.type === 'match' ? new Date(a.created_at) : new Date(a.awarded_at);
    const dateB = b.type === 'match' ? new Date(b.created_at) : new Date(b.awarded_at);
    return dateB.getTime() - dateA.getTime();
  }).slice(0, 10);

  // --- 5. Fetch Badges (User's Trophy Case) ---
  const { data: rawBadges } = await supabase
    .from('profile_badges')
    .select(`
      awarded_at,
      badges (id, slug, name, description, icon_url, metadata),
      events (name)
    `)
    .eq('profile_id', user.id)
    .order('awarded_at', { ascending: false });

  const badges = rawBadges?.map((item: any) => ({
    ...item.badges,
    awarded_at: item.awarded_at,
    event_name: item.events?.name
  })) || [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* 1. Header Section */}
      <header className="flex flex-col gap-2">
         <UserHeader 
           displayName={profile.display_name || profile.username || 'Player'}
           username={profile.username}
           avatarUrl={profile.avatar_url}
         />
         <Separator className="bg-white/10 mt-4" />
      </header>

      {/* 2. Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Actions & Active Status (Desktop: 8 cols) */}
        <div className="md:col-span-8 flex flex-col gap-6">
          <section className="flex flex-col gap-6">
             <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-xl bg-white/5" />}>
               
               {/* Pending Invites */}
               <PendingInvites invites={pendingInvites} userId={user.id} />

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Show Active Tournament if exists, otherwise placeholder or null */}
                  {activeTournamentData ? (
                    <ActiveTournament 
                      tournament={activeTournamentData as any} 
                      currentMatch={currentMatch as any}
                      currentProfileId={user.id}
                    />
                  ) : (
                    // If no tournament, maybe show events prominent? 
                    // For now, let's keep the logic simple: Always ActiveTournament (it handles null state)
                    <ActiveTournament 
                      tournament={null} 
                      currentMatch={null}
                      currentProfileId={user.id}
                    />
                  )}
                  
                  {/* My Guilds (Replaces Active Events if none, or stacks) */}
                  <MyGuilds guilds={userGuilds} userId={user.id} />
               </div>
               
               {/* Show Active Events row below if any exist */}
               {activeEvents.length > 0 && (
                 <div className="w-full">
                    <ActiveEvents events={activeEvents} />
                 </div>
               )}
            </Suspense>
          </section>

          <section>
             <QuickActions />
          </section>

          <section className="hidden md:block">
             <Feed items={feedItems} />
          </section>
        </div>

        {/* Right Column: Stats (Desktop: 4 cols) */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <section>
             <MyStats 
               casualWins={casualWins}
               casualWinDetails={casualWinDetails}
               tournamentFirstPlace={0} // Placeholder for now as calculation is complex
               tournamentSecondPlace={0}
               tournamentThirdPlace={0}
               tournamentWins={tournamentWins}
               tournamentLosses={tournamentLosses}
               tournamentDraws={tournamentDraws}
               tournamentWinRate={tournamentWinRate}
             />
          </section>

          <section>
            <TrophyCase badges={badges} variant="dashboard" />
          </section>

          {/* Mobile Only Feed (Shown below stats on mobile) */}
          <section className="md:hidden">
             <Feed items={feedItems} />
          </section>
        </div>
      </div>
    </div>
  );
}
