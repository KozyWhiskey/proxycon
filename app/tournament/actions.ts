'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  generateSwissPairings,
  convertDbMatchToMatchResult,
  calculateStandings,
  sortStandings,
  BYE_GAMES_WON,
  type MatchResult,
} from '@/lib/swiss-pairing';
import { TimerData, TimerControlResult } from '@/lib/types';
import { checkAndAwardBadges, awardBadge, checkAndAwardCommanderBadge, checkAndAwardSetBadge, checkAndAwardMatchFeats } from '@/lib/badges';

interface CreateTournamentResult {
  success: boolean;
  message?: string;
  tournamentId?: string;
}

export async function createTournament(
  name: string,
  playerIds: string[], // profile_ids
  format: string = 'draft',
  maxRounds: number = 3,
  roundDurationMinutes: number = 50,
  // prize1st?: string, // Prize columns not in V3 schema yet
  // prize2nd?: string,
  // prize3rd?: string,
  eventId?: string,
  setCode?: string,
  setName?: string
): Promise<CreateTournamentResult> {
  try {
    if (!name || name.trim().length === 0) return { success: false, message: 'Tournament name is required' };
    if (playerIds.length < 2) return { success: false, message: 'At least 2 players are required' };
    if (maxRounds < 1 || maxRounds > 10) return { success: false, message: 'Rounds must be 1-10' };
    if (roundDurationMinutes < 1) return { success: false, message: 'Round duration must be positive' };

    const supabase = await createClient();

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        format,
        status: 'pending',
        max_rounds: maxRounds,
        round_duration_minutes: roundDurationMinutes,
        event_id: eventId || null,
        set_code: setCode || null,
        set_name: setName || null
      })
      .select()
      .single();

    if (tournamentError || !tournament) return { success: false, message: tournamentError?.message || 'Failed' };

    for (const profileId of playerIds) {
      const { error: pError } = await supabase.from('tournament_participants').insert({
        tournament_id: tournament.id,
        profile_id: profileId, // V3: profile_id
        draft_seat: null
      });
      if (pError) return { success: false, message: pError.message };
    }

    redirect(`/tournament/${tournament.id}/seating`);
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

interface SubmitResultResult {
  success: boolean;
  message?: string;
  nextRoundGenerated?: boolean;
  awardedBadges?: any[];
}

export async function submitResultWithGames(
  matchId: string,
  player1Id: string,
  player1Games: number,
  player1DeckId: string | null,
  player2Id: string,
  player2Games: number,
  player2DeckId: string | null,
  tournamentId: string
): Promise<SubmitResultResult> {
  try {
    const supabase = await createClient();
    
    let p1Result = 'loss', p2Result = 'loss';
    if (player1Games > player2Games) { p1Result = 'win'; p2Result = 'loss'; }
    else if (player2Games > player1Games) { p1Result = 'loss'; p2Result = 'win'; }
    else { p1Result = 'draw'; p2Result = 'draw'; }

    await supabase.from('match_participants').update({ result: p1Result, games_won: player1Games, deck_id: player1DeckId }).eq('match_id', matchId).eq('profile_id', player1Id);
    await supabase.from('match_participants').update({ result: p2Result, games_won: player2Games, deck_id: player2DeckId }).eq('match_id', matchId).eq('profile_id', player2Id);

    // Badge Check
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('event_id, format, set_code, set_name')
      .eq('id', tournamentId)
      .single();

    if (tournament) {
      await Promise.all([
        checkAndAwardBadges(player1Id, tournament.event_id),
        checkAndAwardBadges(player2Id, tournament.event_id)
      ]);

      let winnerId = null;
      let winnerDeckId = null;
      if (player1Games > player2Games) { winnerId = player1Id; winnerDeckId = player1DeckId; }
      else if (player2Games > player1Games) { winnerId = player2Id; winnerDeckId = player2DeckId; }

      if (winnerId) {
         if (tournament.format === 'draft' || tournament.format === 'sealed') {
            if (tournament.set_code && tournament.set_name) {
               await checkAndAwardSetBadge(winnerId, tournament.set_code, tournament.set_name, tournament.event_id);
            }
         } else if (winnerDeckId) {
            await checkAndAwardCommanderBadge(winnerId, winnerDeckId, tournament.event_id);
         }
         
         const loserId = winnerId === player1Id ? player2Id : player1Id;
         await checkAndAwardMatchFeats(matchId, winnerId, loserId);
      }
          }
    
        const nextRoundGenerated = await checkAndGenerateNextRound(supabase, matchId, tournamentId);
        revalidatePath(`/tournament/${tournamentId}`);
        revalidatePath('/stats');
        redirect(`/tournament/${tournamentId}${nextRoundGenerated ? '?roundGenerated=true' : ''}`);  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function submitDraw(matchId: string, playerIds: string[], tournamentId: string): Promise<SubmitResultResult> {
   try {
    const supabase = await createClient();
    await supabase.from('match_participants').update({ result: 'draw' }).eq('match_id', matchId).in('profile_id', playerIds);
    
    const nextRoundGenerated = await checkAndGenerateNextRound(supabase, matchId, tournamentId);
    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath('/stats');
    redirect(`/tournament/${tournamentId}${nextRoundGenerated ? '?roundGenerated=true' : ''}`);
   } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
   }
}

async function checkAndGenerateNextRound(supabase: any, matchId: string, tournamentId: string) {
  const { data: match } = await supabase.from('matches').select('round_number').eq('id', matchId).single();
  if (!match) return false;

  const { data: roundMatches } = await supabase.from('matches').select('id').eq('tournament_id', tournamentId).eq('round_number', match.round_number);
  if (!roundMatches) return false;

  const matchIds = roundMatches.map((m: any) => m.id);
  const { data: participants } = await supabase.from('match_participants').select('match_id, result').in('match_id', matchIds);

  const map = new Map();
  participants?.forEach((p: any) => {
    if (!map.has(p.match_id)) map.set(p.match_id, { total: 0, done: 0 });
    const d = map.get(p.match_id);
    d.total++;
    if (p.result) d.done++;
  });

  const allComplete = roundMatches.every((m: any) => {
    const d = map.get(m.id);
    return d && d.total > 0 && d.total === d.done;
  });

  if (allComplete) {
    await generateNextRound(tournamentId, match.round_number);
    return true;
  }
  return false;
}

async function generateNextRound(tournamentId: string, currentRound: number) {
  const supabase = await createClient();
  const { data: tournament } = await supabase.from('tournaments').select('format, max_rounds, event_id').eq('id', tournamentId).single();
  
  const { data: tps } = await supabase.from('tournament_participants').select('profile_id').eq('tournament_id', tournamentId);
  const profileIds = tps?.map(p => p.profile_id) || [];

  const { data: matches } = await supabase.from('matches').select('id, round_number').eq('tournament_id', tournamentId).lte('round_number', currentRound);
  const matchIds = matches?.map(m => m.id) || [];
  const { data: mps } = await supabase.from('match_participants').select('match_id, profile_id, result').in('match_id', matchIds);

  const history: MatchResult[] = [];
  matches?.forEach(m => {
    const p = mps?.filter((mp: any) => mp.match_id === m.id);
    if (p && p.length > 0) {
      history.push(convertDbMatchToMatchResult(m.id, m.round_number, p.map((x: any) => ({ playerId: x.profile_id, result: x.result }))));
    }
  });

  if (currentRound >= (tournament?.max_rounds || 3)) {
    await supabase.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId);
    
    // Award 'Champion' badge to the winner
    try {
      const standingsMap = calculateStandings(profileIds, history);
      const sortedStandings = sortStandings(Array.from(standingsMap.values()));
      
      if (sortedStandings.length > 0) {
        const winner = sortedStandings[0];
        await awardBadge(supabase, winner.playerId, 'champion', tournament?.event_id || null);
      }
    } catch (e) {
      console.error('Error awarding champion badge:', e);
    }
    
    return;
  }

  const { pairings } = generateSwissPairings(profileIds, history);
  const nextRound = currentRound + 1;

  for (const pair of pairings) {
    const { data: m } = await supabase.from('matches').insert({ tournament_id: tournamentId, round_number: nextRound, game_type: tournament?.format }).select().single();
    if (!m) continue;

    if (!pair.player2) {
      await supabase.from('match_participants').insert({ match_id: m.id, profile_id: pair.player1, result: 'win', games_won: BYE_GAMES_WON });
    } else {
      await supabase.from('match_participants').insert([
        { match_id: m.id, profile_id: pair.player1, result: null },
        { match_id: m.id, profile_id: pair.player2, result: null }
      ]);
    }
  }
}

// Helper to get timer data
async function getTimerData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  roundNumber: number
): Promise<TimerData | null> {
  const { data: tournamentData, error: tournamentError } = await supabase
    .from('tournaments')
    .select('round_duration_minutes')
    .eq('id', tournamentId)
    .single();

  if (tournamentError || !tournamentData) {
    console.error('getTimerData: Error fetching tournament', tournamentError);
    return null;
  }

  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select('started_at, paused_at, remaining_seconds')
    .eq('tournament_id', tournamentId)
    .eq('round_number', roundNumber)
    .limit(1)
    .maybeSingle();

  if (matchError) {
    console.error('getTimerData: Error fetching match', matchError);
    return null;
  }

  return {
    roundDurationMinutes: tournamentData.round_duration_minutes,
    startedAt: matchData?.started_at || null,
    pausedAt: matchData?.paused_at || null,
    remainingSeconds: matchData?.remaining_seconds ?? null,
  };
}

export async function startRoundTimer(
  tournamentId: string,
  roundNumber: number
): Promise<TimerControlResult> {
  try {
    const supabase = await createClient();

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('round_duration_minutes')
      .eq('id', tournamentId)
      .single();

    if (!tournament) return { success: false, message: 'Tournament not found' };

    const now = new Date().toISOString();
    const durationSeconds = tournament.round_duration_minutes * 60;
    
    await supabase
      .from('matches')
      .update({ started_at: now, paused_at: null, remaining_seconds: durationSeconds })
      .eq('tournament_id', tournamentId)
      .eq('round_number', roundNumber);

    const updatedTimerData = await getTimerData(supabase, tournamentId, roundNumber);
    return { success: true, updatedTimerData };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function pauseRoundTimer(
  tournamentId: string,
  roundNumber: number
): Promise<TimerControlResult> {
  try {
    const supabase = await createClient();
    const { data: match } = await supabase.from('matches').select('started_at, remaining_seconds').eq('tournament_id', tournamentId).eq('round_number', roundNumber).single();

    if (!match?.started_at) return { success: false, message: 'Timer not started' };
    
    const now = new Date();
    const start = new Date(match.started_at);
    const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
    const newRemainingSeconds = Math.max(0, (match.remaining_seconds || 0) - elapsedSeconds);

    await supabase.from('matches').update({ paused_at: now.toISOString(), remaining_seconds: newRemainingSeconds }).eq('tournament_id', tournamentId).eq('round_number', roundNumber);
    
    const updatedTimerData = await getTimerData(supabase, tournamentId, roundNumber);
    return { success: true, updatedTimerData };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function resumeRoundTimer(
  tournamentId: string,
  roundNumber: number
): Promise<TimerControlResult> {
  try {
    const supabase = await createClient();
    const { data: match } = await supabase.from('matches').select('started_at, paused_at, remaining_seconds').eq('tournament_id', tournamentId).eq('round_number', roundNumber).single();

    if (!match?.started_at || !match.paused_at) return { success: false, message: 'Timer not paused' };

    await supabase.from('matches').update({ started_at: new Date().toISOString(), paused_at: null }).eq('tournament_id', tournamentId).eq('round_number', roundNumber);
    
    const updatedTimerData = await getTimerData(supabase, tournamentId, roundNumber);
    return { success: true, updatedTimerData };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateRoundDuration(
  tournamentId: string,
  newDurationMinutes: number
): Promise<TimerControlResult> {
  try {
    const supabase = await createClient();

    if (newDurationMinutes < 1 || newDurationMinutes > 300) {
      return { success: false, message: 'Duration must be between 1 and 300 minutes' };
    }

    const { error: tournamentError } = await supabase
      .from('tournaments')
      .update({ round_duration_minutes: newDurationMinutes })
      .eq('id', tournamentId);

    if (tournamentError) return { success: false, message: tournamentError.message };

    const { data: activeRoundData } = await supabase
      .from('matches')
      .select('round_number')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: false })
      .limit(1)
      .single();

    if (!activeRoundData) {
      return { success: true, updatedTimerData: { roundDurationMinutes: newDurationMinutes, startedAt: null, pausedAt: null, remainingSeconds: null } };
    }
    const currentRound = activeRoundData.round_number;

    await supabase
      .from('matches')
      .update({ started_at: null, paused_at: null, remaining_seconds: null })
      .eq('tournament_id', tournamentId)
      .eq('round_number', currentRound);
    
    const updatedTimerData = await getTimerData(supabase, tournamentId, currentRound);
    return { success: true, updatedTimerData };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function submitResultWithGamesNoRedirect(
  matchId: string,
  player1Id: string,
  player1Games: number,
  player1DeckId: string | null,
  player2Id: string,
  player2Games: number,
  player2DeckId: string | null,
  tournamentId: string
): Promise<SubmitResultResult> {
  try {
    const supabase = await createClient();
    
    let p1Result = 'loss', p2Result = 'loss';
    let winnerId: string | null = null;
    let winnerDeckId: string | null = null;

    if (player1Games > player2Games) { 
      p1Result = 'win'; 
      p2Result = 'loss'; 
      winnerId = player1Id;
      winnerDeckId = player1DeckId;
    }
    else if (player2Games > player1Games) { 
      p1Result = 'loss'; 
      p2Result = 'win'; 
      winnerId = player2Id;
      winnerDeckId = player2DeckId;
    }
    else { p1Result = 'draw'; p2Result = 'draw'; }

    await supabase.from('match_participants').update({ result: p1Result, games_won: player1Games, deck_id: player1DeckId }).eq('match_id', matchId).eq('profile_id', player1Id);
    await supabase.from('match_participants').update({ result: p2Result, games_won: player2Games, deck_id: player2DeckId }).eq('match_id', matchId).eq('profile_id', player2Id);

    // Badge Check
    let awardedBadges: any[] = [];
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('event_id, format, set_code, set_name')
      .eq('id', tournamentId)
      .single();

    if (tournament) {
      const [b1, b2] = await Promise.all([
        checkAndAwardBadges(player1Id, tournament.event_id),
        checkAndAwardBadges(player2Id, tournament.event_id)
      ]);
      awardedBadges = [...b1, ...b2];

      // Winner Specific Badges
      if (winnerId) {
        if (tournament.format === 'draft' || tournament.format === 'sealed') {
          // Limited: Award Set Badge
          if (tournament.set_code && tournament.set_name) {
             try {
               const setBadge = await checkAndAwardSetBadge(winnerId, tournament.set_code, tournament.set_name, tournament.event_id);
               if (setBadge) awardedBadges.push(setBadge);
             } catch (e) {
               console.error('Set Badge Error:', e);
             }
          }
        } else {
          // Constructed: Award Commander/Deck Badge
          if (winnerDeckId) {
            try {
              const aiBadge = await checkAndAwardCommanderBadge(winnerId, winnerDeckId, tournament.event_id);
              if (aiBadge) awardedBadges.push(aiBadge);
            } catch (e) {
              console.error('AI Badge Error:', e);
            }
          }
        }
        
        // Match Feats (Stomp, Mirror)
        const loserId = winnerId === player1Id ? player2Id : player1Id;
        try {
           const feat = await checkAndAwardMatchFeats(matchId, winnerId, loserId);
           if (feat) awardedBadges.push(feat);
        } catch (e) {
           console.error('Match Feat Error:', e);
        }
      }
    }

    const nextRoundGenerated = await checkAndGenerateNextRound(supabase, matchId, tournamentId);
    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath(`/tournament/${tournamentId}/dashboard`);
    revalidatePath('/stats');

    return { success: true, nextRoundGenerated, awardedBadges };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function randomizeSeating(tournamentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();

    const { data: participants } = await supabase.from('tournament_participants').select('id, profile_id').eq('tournament_id', tournamentId);
    if (!participants || participants.length === 0) return { success: false, message: 'No participants to seat' };

    const shuffled = [...participants].sort(() => Math.random() - 0.5);

    await supabase.from('tournament_participants').update({ draft_seat: null }).eq('tournament_id', tournamentId);

    for (let i = 0; i < shuffled.length; i++) {
      await supabase.from('tournament_participants').update({ draft_seat: i + 1 }).eq('id', shuffled[i].id);
    }

    revalidatePath(`/tournament/${tournamentId}/seating`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function selectSeat(
  tournamentId: string,
  profileId: string, // Changed from playerId to profileId
  seatNumber: number | null
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();

    if (seatNumber === null) {
      await supabase.from('tournament_participants').update({ draft_seat: null }).eq('tournament_id', tournamentId).eq('profile_id', profileId);
    } else {
      const { data: numParticipants } = await supabase.from('tournament_participants').select('id').eq('tournament_id', tournamentId);
      const totalPlayers = numParticipants?.length || 0;
      if (seatNumber < 1 || seatNumber > totalPlayers) return { success: false, message: `Seat must be between 1 and ${totalPlayers}` };

      const { data: existingSeatHolder } = await supabase.from('tournament_participants').select('id, profile_id').eq('tournament_id', tournamentId).eq('draft_seat', seatNumber).maybeSingle();

      if (existingSeatHolder && existingSeatHolder.profile_id !== profileId) {
        await supabase.from('tournament_participants').update({ draft_seat: null }).eq('id', existingSeatHolder.id);
      }

      await supabase.from('tournament_participants').update({ draft_seat: null }).eq('tournament_id', tournamentId).eq('profile_id', profileId);
      await supabase.from('tournament_participants').update({ draft_seat: seatNumber }).eq('tournament_id', tournamentId).eq('profile_id', profileId);
    }
    revalidatePath(`/tournament/${tournamentId}/seating`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function startDraft(tournamentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();

    const { data: existingMatches } = await supabase.from('matches').select('id').eq('tournament_id', tournamentId).limit(1);
    if (existingMatches && existingMatches.length > 0) return { success: false, message: 'Draft has already started' };

    const { data: tournament } = await supabase.from('tournaments').select('id, format').eq('id', tournamentId).single();
    if (!tournament) return { success: false, message: 'Tournament not found' };

    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('profile_id, draft_seat')
      .eq('tournament_id', tournamentId)
      .order('draft_seat', { ascending: true });

    if (!participants || participants.length < 2) return { success: false, message: 'Not enough participants' };
    if (participants.some(p => p.draft_seat === null)) return { success: false, message: 'All players must select their seats' };

    const numPlayers = participants.length;
    const pairings: Array<{ player1: string; player2?: string }> = [];

    for (let i = 0; i < Math.floor(numPlayers / 2); i++) {
      const seat1 = i + 1;
      const seat2 = i + 1 + Math.floor(numPlayers / 2);
      
      const p1 = participants.find((p) => p.draft_seat === seat1);
      const p2 = participants.find((p) => p.draft_seat === seat2);
      
      if (p1 && p2) {
        pairings.push({ player1: p1.profile_id, player2: p2.profile_id });
      }
    }

    if (numPlayers % 2 === 1) {
      const byePlayer = participants.find((p) => p.draft_seat === numPlayers);
      if (byePlayer) pairings.push({ player1: byePlayer.profile_id });
    }

    await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId);

    for (const pairing of pairings) {
      const { data: match } = await supabase.from('matches').insert({
        tournament_id: tournamentId,
        round_number: 1,
        game_type: tournament.format,
      }).select().single();

      if (!match) continue;

      if (!pairing.player2) {
        await supabase.from('match_participants').insert({
          match_id: match.id,
          profile_id: pairing.player1,
          result: 'win',
          games_won: BYE_GAMES_WON,
        });
      } else {
        await supabase.from('match_participants').insert([
          { match_id: match.id, profile_id: pairing.player1, result: null },
          { match_id: match.id, profile_id: pairing.player2, result: null },
        ]);
      }
    }

    revalidatePath(`/tournament/${tournamentId}`);
    redirect(`/tournament/${tournamentId}`);
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { success: false, message: error instanceof Error ? error.message : 'Error' };
  }
}

export async function deleteTournament(tournamentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();
    await supabase.from('tournaments').delete().eq('id', tournamentId);
    revalidatePath('/tournaments');
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
