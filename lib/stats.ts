import { SupabaseClient } from '@supabase/supabase-js';
import { calculateStandings, sortStandings, convertDbMatchToMatchResult } from '@/lib/swiss-pairing';

export interface PlayerStats {
  playerId: string;
  playerName: string;
  playerNickname: string | null;
  playerAvatarUrl: string | null;
  tournamentWins: number;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
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

export async function getGlobalStats(supabase: SupabaseClient) {
  // Fetch all completed tournaments
  const { data: completedTournaments } = await supabase
    .from('tournaments')
    .select('id, name, format, created_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  // Fetch all casual matches (tournament_id is null)
  const { data: casualMatches } = await supabase
    .from('matches')
    .select('id, game_type, created_at, notes')
    .is('tournament_id', null);

  // Fetch all tournament matches
  const { data: tournamentMatches } = await supabase
    .from('matches')
    .select('id, tournament_id, round_number')
    .not('tournament_id', 'is', null);

  // Get all match participants for all matches
  const allMatchIds = [
    ...(casualMatches?.map((m) => m.id) || []),
    ...(tournamentMatches?.map((m) => m.id) || []),
  ];

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
      totalTournaments: completedTournaments?.length || 0,
      totalCasualGames: casualMatches?.length || 0,
    };
  }

  const profilesMap = new Map(allProfiles.map((p) => [p.id, p]));

  // Calculate tournament winners
  const tournamentWinners: TournamentWinner[] = [];
  for (const tournament of completedTournaments || []) {
    // Get tournament participants
    const { data: tournamentParticipants } = await supabase
      .from('tournament_participants')
      .select('profile_id')
      .eq('tournament_id', tournament.id);

    if (!tournamentParticipants || tournamentParticipants.length === 0) continue;

    const profileIds = tournamentParticipants.map((tp) => tp.profile_id);

    // Get all matches for this tournament
    const { data: tournamentMatchesData } = await supabase
      .from('matches')
      .select('id, round_number')
      .eq('tournament_id', tournament.id)
      .order('round_number', { ascending: true });

    if (!tournamentMatchesData || tournamentMatchesData.length === 0) continue;

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

  // Calculate player statistics
  const playerStatsMap = new Map<string, PlayerStats>();

  // Initialize all profiles
  for (const profile of allProfiles) {
    playerStatsMap.set(profile.id, {
      playerId: profile.id,
      playerName: profile.username,
      playerNickname: profile.display_name,
      playerAvatarUrl: profile.avatar_url,
      tournamentWins: 0,
      matchWins: 0,
      matchLosses: 0,
      matchDraws: 0,
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

  // Process all matches chronologically to calculate streaks
  const allMatchesWithParticipants = [];
  if (allMatchIds.length > 0 && allMatchParticipants) {
    for (const matchId of allMatchIds) {
      const participants = allMatchParticipants.filter((p) => p.match_id === matchId);
      if (participants.length > 0) {
        const match = tournamentMatches?.find((m) => m.id === matchId) || casualMatches?.find((m) => m.id === matchId);
        allMatchesWithParticipants.push({
          matchId,
          tournamentId: match && 'tournament_id' in match ? match.tournament_id : null,
          createdAt: null, // We'll fetch this if needed
          participants,
        });
      }
    }
  }

  // Fetch match creation times for chronological ordering
  let matchesWithTime: { id: string; created_at: string }[] | null = null;
  const matchTimeMap = new Map<string, string>();
  if (allMatchIds.length > 0) {
    const { data } = await supabase
      .from('matches')
      .select('id, created_at')
      .in('id', allMatchIds);
    matchesWithTime = data;
    if (matchesWithTime) {
      matchesWithTime.forEach((m) => {
        if (m.created_at) {
          matchTimeMap.set(m.id, m.created_at);
        }
      });
    }
  }

  // Sort matches by creation time
  if (matchesWithTime) {
    allMatchesWithParticipants.sort((a, b) => {
      const timeA = matchTimeMap.get(a.matchId) || '';
      const timeB = matchTimeMap.get(b.matchId) || '';
      return timeA.localeCompare(timeB);
    });
  }

  // Track current streaks per player
  const currentStreaks = new Map<string, number>();
  const longestStreaks = new Map<string, number>();

  // Process matches chronologically
  for (const { participants } of allMatchesWithParticipants) {
    // Only process completed matches
    const hasResults = participants.some((p: { result: string | null }) => p.result !== null);
    if (!hasResults) continue;

    for (const participant of participants) {
      const stats = playerStatsMap.get(participant.profile_id);
      if (!stats) continue;

      stats.totalMatches++;

      if (participant.result === 'win') {
        stats.matchWins++;
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
        // Draws break win streaks but don't count as losses for streak purposes
        currentStreaks.set(participant.profile_id, 0);
      }
    }
  }

  // Update final stats
  for (const stats of playerStatsMap.values()) {
    stats.currentWinStreak = currentStreaks.get(stats.playerId) || 0;
    stats.longestWinStreak = longestStreaks.get(stats.playerId) || 0;
    if (stats.totalMatches > 0) {
      stats.winPercentage = (stats.matchWins / stats.totalMatches) * 100;
    }
  }

  return {
    playerStats: Array.from(playerStatsMap.values()),
    tournamentWinners,
    totalTournaments: completedTournaments?.length || 0,
    totalCasualGames: casualMatches?.length || 0,
  };
}
