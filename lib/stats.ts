import { SupabaseClient } from '@supabase/supabase-js';
import { calculateStandings, sortStandings, convertDbMatchToMatchResult } from '@/lib/swiss-pairing';

export interface PlayerStats {
  playerId: string;
  playerName: string;
  playerNickname: string | null;
  playerAvatarUrl: string | null;
  tournamentWins: number; // Number of tournaments won
  matchWins: number; // Total match wins (Casual + Tournament)
  matchLosses: number;
  matchDraws: number;
  tournamentMatchWins: number; // Wins in tournament matches
  casualMatchWins: number; // Wins in casual matches
  tournamentMatchesPlayed: number; // Total tournament matches played
  casualMatchesPlayed: number; // Total casual matches played
  totalMatches: number;
  winPercentage: number;
  currentWinStreak: number;
  longestWinStreak: number;
}

export interface TournamentWinner {
  tournamentId: string;
  tournamentName: string;
  winnerId: string;
  winnerName: string;
  winnerNickname: string | null;
}

export interface RecentMatch {
  id: string;
  winnerIds: string[];
  loserIds: string[];
  isDraw: boolean;
  gameType: string;
  eventName: string | null;
  tournamentName: string | null;
  completedAt: string; // or created_at
}

export interface EventStat {
  id: string;
  name: string;
  totalMatches: number;
  totalTournaments: number;
  uniquePlayers: number;
}

export async function getGlobalStats(supabase: SupabaseClient) {
  // Fetch all events
  const { data: events } = await supabase
    .from('events')
    .select('id, name')
    .eq('is_active', true);

  const eventMap = new Map(events?.map(e => [e.id, e.name]) || []);

  // Fetch all completed tournaments
  const { data: completedTournaments } = await supabase
    .from('tournaments')
    .select('id, name, format, created_at, event_id')
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  const tournamentMap = new Map(completedTournaments?.map(t => [t.id, t]) || []);

  // Fetch all matches
  const { data: allMatches } = await supabase
    .from('matches')
    .select('id, game_type, created_at, notes, tournament_id, event_id, round_number')
    .order('created_at', { ascending: true }); // Chronological for streak calc

  const allMatchIds = allMatches?.map((m) => m.id) || [];

  let allMatchParticipants: { match_id: string; profile_id: string; result: string | null }[] | null = null;
  if (allMatchIds.length > 0) {
    const { data } = await supabase
      .from('match_participants')
      .select('match_id, profile_id, result')
      .in('match_id', allMatchIds);
    allMatchParticipants = data;
  }

  // Get all profiles
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .order('username', { ascending: true });

  if (!allProfiles || allProfiles.length === 0) {
    return {
      playerStats: [],
      tournamentWinners: [],
      recentMatches: [],
      eventStats: [],
      totalTournaments: completedTournaments?.length || 0,
      totalCasualGames: allMatches?.filter(m => !m.tournament_id).length || 0,
    };
  }

  const profilesMap = new Map(allProfiles.map((p) => [p.id, p]));

  // --- Calculate Tournament Winners ---
  const tournamentWinners: TournamentWinner[] = [];
  
  // Group matches by tournament for calculating winners
  // We need to fetch ALL tournament matches, not just the ones in `allMatches` (though `allMatches` should have them)
  // But we need them structured for `calculateStandings`.
  
  for (const tournament of completedTournaments || []) {
    // Get tournament participants
    const { data: tournamentParticipants } = await supabase
      .from('tournament_participants')
      .select('profile_id')
      .eq('tournament_id', tournament.id);

    if (!tournamentParticipants || tournamentParticipants.length === 0) continue;

    const profileIds = tournamentParticipants.map((tp) => tp.profile_id);

    // Filter matches for this tournament from our already fetched `allMatches`
    const tournamentMatchesData = allMatches?.filter(m => m.tournament_id === tournament.id) || [];

    // Build match history
    const matchHistory = [];
    for (const match of tournamentMatchesData) {
      const participants = allMatchParticipants?.filter((p) => p.match_id === match.id) || [];
      if (participants.length > 0) {
        matchHistory.push(
          convertDbMatchToMatchResult(
            match.id,
            match.round_number || 1, 
            participants.map((p) => ({ playerId: p.profile_id, result: p.result as 'win' | 'loss' | 'draw' | null }))
          )
        );
      }
    }

    // Calculate standings
    const standingsMap = calculateStandings(profileIds, matchHistory);
    const sortedStandings = sortStandings(Array.from(standingsMap.values()));

    if (sortedStandings.length > 0) {
      const winner = sortedStandings[0];
      const winnerProfile = profilesMap.get(winner.playerId);
      if (winnerProfile) {
        tournamentWinners.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          winnerId: winner.playerId,
          winnerName: winnerProfile.username,
          winnerNickname: winnerProfile.display_name,
        });
      }
    }
  }

  // --- Calculate Player Stats ---
  const playerStatsMap = new Map<string, PlayerStats>();

  // Initialize all profiles
  for (const profile of allProfiles) {
    playerStatsMap.set(profile.id, {
      playerId: profile.id,
      playerName: profile.username || 'Unknown',
      playerNickname: profile.display_name,
      playerAvatarUrl: profile.avatar_url,
      tournamentWins: 0,
      matchWins: 0,
      matchLosses: 0,
      matchDraws: 0,
      tournamentMatchWins: 0,
      casualMatchWins: 0,
      tournamentMatchesPlayed: 0,
      casualMatchesPlayed: 0,
      totalMatches: 0,
      winPercentage: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
    });
  }

  // Count tournament wins
  for (const winner of tournamentWinners) {
    const stats = playerStatsMap.get(winner.winnerId);
    if (stats) {
      stats.tournamentWins++;
    }
  }

  // Track current streaks per player
  const currentStreaks = new Map<string, number>();
  const longestStreaks = new Map<string, number>();

  // Process matches chronologically (allMatches is already sorted by created_at ascending)
  if (allMatches && allMatchParticipants) {
    for (const match of allMatches) {
       const participants = allMatchParticipants.filter((p) => p.match_id === match.id);
       
       // Only process completed matches
       const hasResults = participants.some((p) => p.result !== null);
       if (!hasResults) continue;

       const isTournament = !!match.tournament_id;

       for (const participant of participants) {
        const stats = playerStatsMap.get(participant.profile_id);
        if (!stats) continue;

        stats.totalMatches++;
        if (isTournament) stats.tournamentMatchesPlayed++;
        else stats.casualMatchesPlayed++;

        if (participant.result === 'win') {
          stats.matchWins++;
          if (isTournament) stats.tournamentMatchWins++;
          else stats.casualMatchWins++;

          const currentStreak = (currentStreaks.get(participant.profile_id) || 0) + 1;
          currentStreaks.set(participant.profile_id, currentStreak);
          const longestStreak = longestStreaks.get(participant.profile_id) || 0;
          if (currentStreak > longestStreak) {
            longestStreaks.set(participant.profile_id, currentStreak);
          }
        } else if (participant.result === 'loss') {
          stats.matchLosses++;
          currentStreaks.set(participant.profile_id, 0);
        } else if (participant.result === 'draw') {
          stats.matchDraws++;
          // Draws break win streaks but don't count as losses
          currentStreaks.set(participant.profile_id, 0);
        }
       }
    }
  }

  // Finalize Player Stats
  for (const stats of playerStatsMap.values()) {
    stats.currentWinStreak = currentStreaks.get(stats.playerId) || 0;
    stats.longestWinStreak = longestStreaks.get(stats.playerId) || 0;
    if (stats.totalMatches > 0) {
      stats.winPercentage = (stats.matchWins / stats.totalMatches) * 100;
    }
  }

  // --- Calculate Event Stats ---
  const eventStats: EventStat[] = [];
  if (events) {
    for (const event of events) {
      const eventMatches = allMatches?.filter(m => m.event_id === event.id) || [];
      const eventTournaments = completedTournaments?.filter(t => t.event_id === event.id).length || 0;
      
      const eventPlayerIds = new Set<string>();
      eventMatches.forEach(m => {
        const parts = allMatchParticipants?.filter(p => p.match_id === m.id) || [];
        parts.forEach(p => eventPlayerIds.add(p.profile_id));
      });

      eventStats.push({
        id: event.id,
        name: event.name,
        totalMatches: eventMatches.length,
        totalTournaments: eventTournaments,
        uniquePlayers: eventPlayerIds.size
      });
    }
  }

  // --- Recent Matches ---
  const recentMatches: RecentMatch[] = [];
  const sortedMatchesDesc = [...(allMatches || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const last5Matches = sortedMatchesDesc.slice(0, 5);

  for (const match of last5Matches) {
    const participants = allMatchParticipants?.filter(p => p.match_id === match.id) || [];
    const winnerIds = participants.filter(p => p.result === 'win').map(p => p.profile_id);
    const loserIds = participants.filter(p => p.result === 'loss').map(p => p.profile_id);
    const isDraw = participants.every(p => p.result === 'draw') || (winnerIds.length === 0 && participants.length > 0);
    
    // Only include matches that have results
    if (participants.some(p => p.result !== null)) {
        recentMatches.push({
            id: match.id,
            winnerIds,
            loserIds,
            isDraw,
            gameType: match.game_type,
            eventName: match.event_id ? eventMap.get(match.event_id) || null : null,
            tournamentName: match.tournament_id ? tournamentMap.get(match.tournament_id)?.name || null : null,
            completedAt: match.created_at
        });
    }
  }

  return {
    playerStats: Array.from(playerStatsMap.values()),
    tournamentWinners,
    recentMatches,
    eventStats,
    totalTournaments: completedTournaments?.length || 0,
    totalCasualGames: allMatches?.filter(m => !m.tournament_id).length || 0,
  };
}
