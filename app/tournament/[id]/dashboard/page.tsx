'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Users, RefreshCw, Clock, ArrowLeft, Smartphone, Play, Pause, Minus, Plus, Check } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  calculateStandings,
  sortStandings,
  convertDbMatchToMatchResult,
  formatOMWPercentage,
  type MatchResult,
} from '@/lib/swiss-pairing';
import {
  startRoundTimer,
  pauseRoundTimer,
  resumeRoundTimer,
  submitResultWithGamesNoRedirect,
} from '@/app/tournament/actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  max_rounds: number;
  round_duration_minutes: number;
}

interface Player {
  id: string;
  name: string;
  nickname: string | null;
}

interface Match {
  id: string;
  round_number: number;
  started_at: string | null;
  paused_at: string | null;
  total_paused_seconds: number;
  updated_at: string | null;
  created_at: string;
}

interface MatchParticipant {
  id: string;
  match_id: string;
  player_id: string;
  result: 'win' | 'loss' | 'draw' | null;
  games_won: number;
}

interface Standing {
  rank: number;
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  omwPercentage: number;
}

interface PairingDisplay {
  matchId: string;
  player1: {
    id: string;
    name: string;
    record: string;
    result: 'win' | 'loss' | 'draw' | null;
    gamesWon: number;
  } | null;
  player2: {
    id: string;
    name: string;
    record: string;
    result: 'win' | 'loss' | 'draw' | null;
    gamesWon: number;
  } | null;
  isBye: boolean;
  status: 'pending' | 'completed';
}

interface MatchFeedItem {
  id: string;
  round_number: number;
  player1: {
    name: string;
    gamesWon: number;
  };
  player2: {
    name: string;
    gamesWon: number;
  } | null;
  winner: string | null;
  isDraw: boolean;
  isBye: boolean;
  completedAt: string;
}

interface TimerState {
  startedAt: string | null;
  pausedAt: string | null;
  totalPausedSeconds: number;
}

// Match Result Entry Component
function MatchResultEntry({
  pairing,
  tournamentId,
  onResultSubmitted,
}: {
  pairing: PairingDisplay;
  tournamentId: string;
  onResultSubmitted: () => void;
}) {
  const [player1Games, setPlayer1Games] = useState(0);
  const [player2Games, setPlayer2Games] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (pairing.isBye || pairing.status === 'completed' || !pairing.player1 || !pairing.player2) {
    return null;
  }

  const getResultPreview = () => {
    if (player1Games === player2Games) {
      if (player1Games === 0) {
        return { text: 'Set scores', color: 'text-slate-500', type: 'none' };
      }
      return { text: 'Draw', color: 'text-blue-400', type: 'draw' };
    }
    if (player1Games > player2Games) {
      return { text: `${pairing.player1!.name} wins`, color: 'text-emerald-400', type: 'player1' };
    }
    return { text: `${pairing.player2!.name} wins`, color: 'text-emerald-400', type: 'player2' };
  };

  const result = getResultPreview();
  const canSubmit = player1Games > 0 || player2Games > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !pairing.player1 || !pairing.player2) return;

    setIsSubmitting(true);
    try {
      const isDraw = player1Games === player2Games;
      const winnerId = player1Games > player2Games ? pairing.player1.id : pairing.player2.id;
      const loserId = player1Games > player2Games ? pairing.player2.id : pairing.player1.id;

      const response = await submitResultWithGamesNoRedirect(
        pairing.matchId,
        isDraw ? null : winnerId,
        isDraw ? null : loserId,
        pairing.player1.id,
        player1Games,
        pairing.player2.id,
        player2Games,
        tournamentId
      );

      if (response.success) {
        toast.success('Result submitted!');
        if (response.nextRoundGenerated) {
          toast.success('Next round generated!');
        }
        setIsExpanded(false);
        setPlayer1Games(0);
        setPlayer2Games(0);
        onResultSubmitted();
      } else {
        toast.error(response.message || 'Failed to submit result');
      }
    } catch (error) {
      console.error('Error submitting result:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        className="w-full mt-3 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-medium"
      >
        Report Result
      </Button>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
      {/* Score Entry */}
      <div className="grid grid-cols-3 gap-2 items-center">
        {/* Player 1 Score */}
        <div className="text-center">
          <p className="text-sm text-slate-400 mb-2 truncate">{pairing.player1.name}</p>
          <div className="flex items-center justify-center gap-1">
            <Button
              type="button"
              onClick={() => setPlayer1Games(Math.max(0, player1Games - 1))}
              disabled={isSubmitting || player1Games === 0}
              size="sm"
              className="h-10 w-10 rounded-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-100 disabled:opacity-30"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-3xl font-bold text-yellow-500 w-12 text-center tabular-nums">
              {player1Games}
            </span>
            <Button
              type="button"
              onClick={() => setPlayer1Games(player1Games + 1)}
              disabled={isSubmitting}
              size="sm"
              className="h-10 w-10 rounded-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-100"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* VS */}
        <div className="text-center">
          <span className="text-slate-600 text-lg">—</span>
        </div>

        {/* Player 2 Score */}
        <div className="text-center">
          <p className="text-sm text-slate-400 mb-2 truncate">{pairing.player2.name}</p>
          <div className="flex items-center justify-center gap-1">
            <Button
              type="button"
              onClick={() => setPlayer2Games(Math.max(0, player2Games - 1))}
              disabled={isSubmitting || player2Games === 0}
              size="sm"
              className="h-10 w-10 rounded-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-100 disabled:opacity-30"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-3xl font-bold text-yellow-500 w-12 text-center tabular-nums">
              {player2Games}
            </span>
            <Button
              type="button"
              onClick={() => setPlayer2Games(player2Games + 1)}
              disabled={isSubmitting}
              size="sm"
              className="h-10 w-10 rounded-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-100"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Result Preview & Submit */}
      <div className="flex items-center gap-2">
        <div className={`flex-1 text-center py-2 px-3 rounded-lg bg-slate-800/50 ${result.color}`}>
          <span className="text-sm font-medium">{result.text}</span>
          {canSubmit && <span className="text-slate-500 ml-2">({player1Games}-{player2Games})</span>}
        </div>
        {canSubmit && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </Button>
        )}
        <Button
          onClick={() => {
            setIsExpanded(false);
            setPlayer1Games(0);
            setPlayer2Games(0);
          }}
          variant="ghost"
          className="text-slate-400 hover:text-slate-100"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function TournamentDashboard({ params }: PageProps) {
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [pairings, setPairings] = useState<PairingDisplay[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [matchFeed, setMatchFeed] = useState<MatchFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timerDisplay, setTimerDisplay] = useState<string>('--:--');
  const [timerStatus, setTimerStatus] = useState<'not_started' | 'running' | 'paused' | 'expired'>('not_started');
  const [timerState, setTimerState] = useState<TimerState>({
    startedAt: null,
    pausedAt: null,
    totalPausedSeconds: 0,
  });
  const [isTimerLoading, setIsTimerLoading] = useState(false);

  // Resolve params
  useEffect(() => {
    params.then(({ id }) => setTournamentId(id));
  }, [params]);

  const fetchDashboardData = useCallback(async () => {
    if (!tournamentId) return;

    const supabase = createClient();

    // Fetch tournament
    const { data: tournamentData, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, name, format, status, max_rounds, round_duration_minutes')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournamentData) {
      console.error('Failed to fetch tournament:', tournamentError);
      setIsLoading(false);
      return;
    }

    setTournament(tournamentData);

    // Fetch tournament participants
    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('player_id')
      .eq('tournament_id', tournamentId);

    const playerIds = participants?.map((p) => p.player_id) || [];
    setTotalPlayers(playerIds.length);

    // Fetch all matches
    const { data: matches } = await supabase
      .from('matches')
      .select('id, round_number, started_at, paused_at, total_paused_seconds, updated_at, created_at')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: true });

    if (!matches || matches.length === 0) {
      setIsLoading(false);
      return;
    }

    // Get current round
    const maxRound = Math.max(...matches.map((m) => m.round_number || 1));
    setCurrentRound(maxRound);

    // Get current round matches for timer
    const currentRoundMatches = matches.filter((m) => m.round_number === maxRound);
    const timerMatch = currentRoundMatches[0];

    // Update timer state
    if (timerMatch) {
      setTimerState({
        startedAt: timerMatch.started_at,
        pausedAt: timerMatch.paused_at,
        totalPausedSeconds: timerMatch.total_paused_seconds || 0,
      });
      updateTimerDisplay(timerMatch, tournamentData.round_duration_minutes);
    }

    // Fetch all match participants
    const matchIds = matches.map((m) => m.id);
    const { data: allParticipants } = await supabase
      .from('match_participants')
      .select('id, match_id, player_id, result, games_won')
      .in('match_id', matchIds);

    // Fetch player details
    const { data: players } = await supabase
      .from('players')
      .select('id, name, nickname')
      .in('id', playerIds);

    const playersMap = new Map<string, Player>(
      players?.map((p) => [p.id, p]) || []
    );

    // Build match history for standings calculation
    const participantsByMatch = new Map<string, MatchParticipant[]>();
    allParticipants?.forEach((p) => {
      if (!participantsByMatch.has(p.match_id)) {
        participantsByMatch.set(p.match_id, []);
      }
      participantsByMatch.get(p.match_id)!.push(p as MatchParticipant);
    });

    // Convert to MatchResult format
    const matchHistory: MatchResult[] = [];
    for (const match of matches) {
      const matchParticipants = participantsByMatch.get(match.id) || [];
      if (matchParticipants.length > 0) {
        matchHistory.push(
          convertDbMatchToMatchResult(
            match.id,
            match.round_number || 1,
            matchParticipants.map((p) => ({ playerId: p.player_id, result: p.result }))
          )
        );
      }
    }

    // Calculate standings
    const standingsMap = calculateStandings(playerIds, matchHistory);
    const sortedStandings = sortStandings(Array.from(standingsMap.values()));

    const standingsDisplay: Standing[] = sortedStandings.map((s, index) => {
      const player = playersMap.get(s.playerId);
      return {
        rank: index + 1,
        playerId: s.playerId,
        playerName: player?.nickname || player?.name || 'Unknown',
        wins: s.matchWins,
        losses: s.matchLosses,
        draws: s.matchDraws,
        points: s.points,
        omwPercentage: s.opponentMatchWinPercentage,
      };
    });

    setStandings(standingsDisplay);

    // Build current round pairings
    const currentRoundParticipants = currentRoundMatches.flatMap((match) => {
      const matchParticipants = participantsByMatch.get(match.id) || [];
      return matchParticipants.map((p) => ({ ...p, matchId: match.id }));
    });

    // Group by match
    const matchParticipantsGrouped = new Map<string, (MatchParticipant & { matchId: string })[]>();
    currentRoundParticipants.forEach((p) => {
      if (!matchParticipantsGrouped.has(p.matchId)) {
        matchParticipantsGrouped.set(p.matchId, []);
      }
      matchParticipantsGrouped.get(p.matchId)!.push(p);
    });

    // Create a map of player records
    const playerRecordMap = new Map<string, string>();
    standingsDisplay.forEach((s) => {
      playerRecordMap.set(s.playerId, `${s.wins}-${s.losses}-${s.draws}`);
    });

    const pairingsDisplay: PairingDisplay[] = [];
    for (const match of currentRoundMatches) {
      const matchParticipants = matchParticipantsGrouped.get(match.id) || [];
      const isBye = matchParticipants.length === 1;
      const isCompleted = matchParticipants.some((p) => p.result !== null);

      if (isBye) {
        const p = matchParticipants[0];
        const player = playersMap.get(p.player_id);
        pairingsDisplay.push({
          matchId: match.id,
          player1: {
            id: p.player_id,
            name: player?.nickname || player?.name || 'Unknown',
            record: playerRecordMap.get(p.player_id) || '0-0-0',
            result: p.result,
            gamesWon: p.games_won || 0,
          },
          player2: null,
          isBye: true,
          status: 'completed',
        });
      } else if (matchParticipants.length >= 2) {
        const p1 = matchParticipants[0];
        const p2 = matchParticipants[1];
        const player1 = playersMap.get(p1.player_id);
        const player2 = playersMap.get(p2.player_id);

        pairingsDisplay.push({
          matchId: match.id,
          player1: {
            id: p1.player_id,
            name: player1?.nickname || player1?.name || 'Unknown',
            record: playerRecordMap.get(p1.player_id) || '0-0-0',
            result: p1.result,
            gamesWon: p1.games_won || 0,
          },
          player2: {
            id: p2.player_id,
            name: player2?.nickname || player2?.name || 'Unknown',
            record: playerRecordMap.get(p2.player_id) || '0-0-0',
            result: p2.result,
            gamesWon: p2.games_won || 0,
          },
          isBye: false,
          status: isCompleted ? 'completed' : 'pending',
        });
      }
    }

    setPairings(pairingsDisplay);

    // Build match feed from all completed matches (most recent first)
    const completedMatches = matches.filter((m) => {
      const matchParticipants = participantsByMatch.get(m.id) || [];
      return matchParticipants.some((p) => p.result !== null);
    });

    const feedItems: MatchFeedItem[] = [];
    for (const match of completedMatches.sort((a, b) => {
      // Sort by updated_at (most recent first), then created_at, then round number
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.created_at).getTime();
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.created_at).getTime();
      if (aTime !== bTime) {
        return bTime - aTime; // Most recent first
      }
      // If same time, sort by round (descending) then by match id
      if (a.round_number !== b.round_number) {
        return (b.round_number || 0) - (a.round_number || 0);
      }
      return b.id.localeCompare(a.id);
    }).slice(0, 20)) { // Limit to 20 most recent
      const matchParticipants = participantsByMatch.get(match.id) || [];
      const isBye = matchParticipants.length === 1;
      const hasResult = matchParticipants.some((p) => p.result !== null);

      if (!hasResult) continue;

      if (isBye) {
        const p = matchParticipants[0];
        const player = playersMap.get(p.player_id);
        feedItems.push({
          id: match.id,
          round_number: match.round_number || 1,
          player1: {
            name: player?.nickname || player?.name || 'Unknown',
            gamesWon: p.games_won || 0,
          },
          player2: null,
          winner: player?.nickname || player?.name || 'Unknown',
          isDraw: false,
          isBye: true,
          completedAt: match.updated_at || match.created_at,
        });
      } else if (matchParticipants.length >= 2) {
        const p1 = matchParticipants[0];
        const p2 = matchParticipants[1];
        const player1 = playersMap.get(p1.player_id);
        const player2 = playersMap.get(p2.player_id);
        const isDraw = p1.result === 'draw';
        const winner = isDraw ? null : (p1.result === 'win' ? (player1?.nickname || player1?.name || 'Unknown') : (player2?.nickname || player2?.name || 'Unknown'));

        feedItems.push({
          id: match.id,
          round_number: match.round_number || 1,
          player1: {
            name: player1?.nickname || player1?.name || 'Unknown',
            gamesWon: p1.games_won || 0,
          },
          player2: {
            name: player2?.nickname || player2?.name || 'Unknown',
            gamesWon: p2.games_won || 0,
          },
          winner,
          isDraw,
          isBye: false,
          completedAt: match.updated_at || match.created_at,
        });
      }
    }

    setMatchFeed(feedItems);
    setLastUpdated(new Date());
    setIsLoading(false);
  }, [tournamentId]);

  const updateTimerDisplay = (
    timerMatch: Match,
    roundDurationMinutes: number
  ) => {
    if (!timerMatch.started_at) {
      setTimerDisplay(`${roundDurationMinutes}:00`);
      setTimerStatus('not_started');
      return;
    }

    const startTime = new Date(timerMatch.started_at).getTime();
    const durationMs = roundDurationMinutes * 60 * 1000;
    const pausedSeconds = timerMatch.total_paused_seconds || 0;

    if (timerMatch.paused_at) {
      const pauseTime = new Date(timerMatch.paused_at).getTime();
      const elapsedMs = pauseTime - startTime - pausedSeconds * 1000;
      const remainingMs = Math.max(0, durationMs - elapsedMs);
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      setTimerDisplay(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      setTimerStatus('paused');
    } else {
      const now = Date.now();
      const elapsedMs = now - startTime - pausedSeconds * 1000;
      const remainingMs = Math.max(0, durationMs - elapsedMs);
      
      if (remainingMs <= 0) {
        setTimerDisplay('00:00');
        setTimerStatus('expired');
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimerDisplay(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        setTimerStatus('running');
      }
    }
  };

  // Timer control handlers
  const handleStartTimer = async () => {
    if (!tournamentId || !currentRound) return;
    setIsTimerLoading(true);
    try {
      const result = await startRoundTimer(tournamentId, currentRound);
      if (result.success && result.updatedTimerData) {
        toast.success('Round timer started!');
        setTimerState({
          startedAt: result.updatedTimerData.startedAt,
          pausedAt: result.updatedTimerData.pausedAt,
          totalPausedSeconds: result.updatedTimerData.totalPausedSeconds,
        });
        fetchDashboardData();
      } else {
        toast.error(result.message || 'Failed to start timer');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsTimerLoading(false);
    }
  };

  const handlePauseTimer = async () => {
    if (!tournamentId || !currentRound) return;
    setIsTimerLoading(true);
    try {
      const result = await pauseRoundTimer(tournamentId, currentRound);
      if (result.success && result.updatedTimerData) {
        toast.success('Timer paused');
        setTimerState({
          startedAt: result.updatedTimerData.startedAt,
          pausedAt: result.updatedTimerData.pausedAt,
          totalPausedSeconds: result.updatedTimerData.totalPausedSeconds,
        });
        fetchDashboardData();
      } else {
        toast.error(result.message || 'Failed to pause timer');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsTimerLoading(false);
    }
  };

  const handleResumeTimer = async () => {
    if (!tournamentId || !currentRound) return;
    setIsTimerLoading(true);
    try {
      const result = await resumeRoundTimer(tournamentId, currentRound);
      if (result.success && result.updatedTimerData) {
        toast.success('Timer resumed');
        setTimerState({
          startedAt: result.updatedTimerData.startedAt,
          pausedAt: result.updatedTimerData.pausedAt,
          totalPausedSeconds: result.updatedTimerData.totalPausedSeconds,
        });
        fetchDashboardData();
      } else {
        toast.error(result.message || 'Failed to resume timer');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsTimerLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (tournamentId) {
      fetchDashboardData();
    }
  }, [tournamentId, fetchDashboardData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!tournamentId) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000);

    return () => clearInterval(interval);
  }, [tournamentId, fetchDashboardData]);

  // Timer countdown (1 second updates when running)
  useEffect(() => {
    if (timerStatus !== 'running') return;

    const interval = setInterval(() => {
      const [mins, secs] = timerDisplay.split(':').map(Number);
      const totalSecs = mins * 60 + secs;
      
      if (totalSecs <= 0) {
        setTimerStatus('expired');
        return;
      }

      const newTotal = totalSecs - 1;
      const newMins = Math.floor(newTotal / 60);
      const newSecs = newTotal % 60;
      setTimerDisplay(`${newMins.toString().padStart(2, '0')}:${newSecs.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStatus, timerDisplay]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!tournamentId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`tournament-dashboard-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_participants',
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, fetchDashboardData]);

  const getTimerColor = () => {
    if (timerStatus === 'not_started') return 'text-slate-400';
    if (timerStatus === 'paused') return 'text-yellow-400';
    if (timerStatus === 'expired') return 'text-red-500';
    
    const [mins] = timerDisplay.split(':').map(Number);
    if (mins > 10) return 'text-emerald-400';
    if (mins > 5) return 'text-yellow-400';
    return 'text-red-500';
  };

  const getMatchResultDisplay = (pairing: PairingDisplay) => {
    if (pairing.isBye) {
      return (
        <span className="text-slate-400 text-lg">Bye</span>
      );
    }

    if (pairing.status === 'pending') {
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-yellow-500 text-lg font-medium">In Progress</span>
        </div>
      );
    }

    // Completed match
    const p1 = pairing.player1!;
    const p2 = pairing.player2!;

    if (p1.result === 'draw') {
      return (
        <span className="text-slate-300 text-lg">
          Draw ({p1.gamesWon}-{p2.gamesWon})
        </span>
      );
    }

    const winner = p1.result === 'win' ? p1 : p2;
    const loser = p1.result === 'win' ? p2 : p1;

    return (
      <span className="text-emerald-400 text-lg font-medium">
        {winner.name} won ({winner.gamesWon}-{loser.gamesWon})
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-xl">Loading tournament data...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-2xl">Tournament not found</p>
        </div>
      </div>
    );
  }

  const formatFeedTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 lg:p-6">
      {/* Compact Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 shrink-0"
            >
              <Link href={`/tournament/${tournamentId}`}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                <Smartphone className="w-4 h-4" />
              </Link>
            </Button>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-100 truncate">
              {tournament.name}
            </h1>
          </div>
          
          {/* Compact Timer Card */}
          <Card className="bg-slate-900/90 border-slate-700 shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Clock className={`w-5 h-5 ${getTimerColor()}`} />
                <div className="flex flex-col">
                  <span className={`text-2xl lg:text-3xl font-mono font-bold ${getTimerColor()} tabular-nums leading-none`}>
                    {timerDisplay}
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5">
                    {timerStatus === 'not_started' && 'Not started'}
                    {timerStatus === 'running' && 'Running'}
                    {timerStatus === 'paused' && 'Paused'}
                    {timerStatus === 'expired' && 'Expired'}
                  </span>
                </div>
                {tournament.status === 'active' && (
                  <div className="flex gap-2 ml-2">
                    {timerStatus === 'not_started' && (
                      <Button
                        onClick={handleStartTimer}
                        disabled={isTimerLoading}
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 px-3 text-xs font-medium"
                      >
                        {isTimerLoading ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1.5" />
                            Start
                          </>
                        )}
                      </Button>
                    )}
                    {timerStatus === 'running' && (
                      <Button
                        onClick={handlePauseTimer}
                        disabled={isTimerLoading}
                        size="sm"
                        className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 h-9 px-3 text-xs font-medium"
                      >
                        {isTimerLoading ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                            Pausing...
                          </>
                        ) : (
                          <>
                            <Pause className="w-3 h-3 mr-1.5" />
                            Pause
                          </>
                        )}
                      </Button>
                    )}
                    {timerStatus === 'paused' && (
                      <Button
                        onClick={handleResumeTimer}
                        disabled={isTimerLoading}
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 px-3 text-xs font-medium"
                      >
                        {isTimerLoading ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                            Resuming...
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1.5" />
                            Resume
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tournament Info Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-slate-300">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">
              Round {currentRound} of {tournament.max_rounds}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4 text-cyan-500" />
            <span className="text-sm">{totalPlayers} Players</span>
          </div>
          <span className="text-sm capitalize px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
            {tournament.format}
          </span>
          {tournament.status === 'completed' && (
            <span className="text-sm px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Current Round Pairings */}
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-2xl text-slate-100 flex items-center gap-3">
              <span className="text-yellow-500">Round {currentRound}</span>
              <span className="text-slate-400">Pairings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {pairings.map((pairing) => (
                <div
                  key={pairing.matchId}
                  className={`p-4 rounded-xl border ${
                    pairing.status === 'pending'
                      ? 'bg-yellow-500/5 border-yellow-500/30'
                      : 'bg-slate-800/50 border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Player 1 */}
                    <div className="flex-1 text-right">
                      <p className={`text-2xl font-semibold ${
                        pairing.player1?.result === 'win' ? 'text-emerald-400' : 'text-slate-100'
                      }`}>
                        {pairing.player1?.name}
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        {pairing.player1?.record}
                      </p>
                    </div>

                    {/* VS / Result */}
                    <div className="flex-shrink-0 text-center px-4">
                      {pairing.isBye ? (
                        <span className="text-slate-500 text-xl font-medium">BYE</span>
                      ) : pairing.status === 'pending' ? (
                        <span className="text-yellow-500 text-xl font-bold">VS</span>
                      ) : (
                        <div className="text-sm">
                          <span className="text-slate-400">
                            {pairing.player1?.gamesWon} - {pairing.player2?.gamesWon}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Player 2 */}
                    <div className="flex-1 text-left">
                      {pairing.player2 ? (
                        <>
                          <p className={`text-2xl font-semibold ${
                            pairing.player2?.result === 'win' ? 'text-emerald-400' : 'text-slate-100'
                          }`}>
                            {pairing.player2?.name}
                          </p>
                          <p className="text-slate-400 text-sm mt-1">
                            {pairing.player2?.record}
                          </p>
                        </>
                      ) : (
                        <p className="text-slate-500 text-2xl">—</p>
                      )}
                    </div>
                  </div>

                  {/* Match Status */}
                  <div className="mt-3 pt-3 border-t border-slate-700/50 text-center">
                    {getMatchResultDisplay(pairing)}
                  </div>

                  {/* Match Result Entry - Only for pending matches */}
                  {pairing.status === 'pending' && tournamentId && (
                    <MatchResultEntry
                      pairing={pairing}
                      tournamentId={tournamentId}
                      onResultSubmitted={fetchDashboardData}
                    />
                  )}
                </div>
              ))}

              {pairings.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-xl">No pairings for this round yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Standings */}
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-2xl text-slate-100 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span>Standings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-base w-16">#</TableHead>
                  <TableHead className="text-slate-400 text-base">Player</TableHead>
                  <TableHead className="text-slate-400 text-base text-center">Record</TableHead>
                  <TableHead className="text-slate-400 text-base text-center">Points</TableHead>
                  <TableHead className="text-slate-400 text-base text-center">OMW%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((standing) => (
                  <TableRow
                    key={standing.playerId}
                    className={`border-slate-700/50 ${
                      standing.rank <= 3 ? 'bg-yellow-500/5' : ''
                    }`}
                  >
                    <TableCell className="font-bold text-xl">
                      {standing.rank === 1 && (
                        <span className="text-yellow-400">🥇</span>
                      )}
                      {standing.rank === 2 && (
                        <span className="text-slate-300">🥈</span>
                      )}
                      {standing.rank === 3 && (
                        <span className="text-amber-600">🥉</span>
                      )}
                      {standing.rank > 3 && (
                        <span className="text-slate-400">{standing.rank}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xl font-medium ${
                        standing.rank === 1 ? 'text-yellow-400' : 'text-slate-100'
                      }`}>
                        {standing.playerName}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-lg text-slate-300">
                        {standing.wins}-{standing.losses}-{standing.draws}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xl font-bold text-yellow-500">
                        {standing.points}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-lg text-cyan-400">
                        {formatOMWPercentage(standing.omwPercentage)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}

                {standings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-slate-500 text-xl">No standings yet</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Point System Legend */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-sm text-slate-500 text-center">
                Win = 3pts • Draw = 1pt • Loss = 0pts • OMW% = Opponent Match Win %
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Results Feed */}
      <div className="mt-6">
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span>Match Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {matchFeed.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">No completed matches yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {matchFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800/70 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {item.isBye ? (
                          <p className="text-slate-100 font-medium">
                            <span className="text-emerald-400">{item.winner}</span>
                            <span className="text-slate-500 ml-2">received a bye</span>
                          </p>
                        ) : item.isDraw ? (
                          <p className="text-slate-100">
                            <span className="font-medium">{item.player1.name}</span>
                            <span className="text-slate-500 mx-2">drew with</span>
                            <span className="font-medium">{item.player2?.name}</span>
                            <span className="text-blue-400 ml-2">
                              ({item.player1.gamesWon}-{item.player2?.gamesWon})
                            </span>
                          </p>
                        ) : (
                          <p className="text-slate-100">
                            <span className="text-emerald-400 font-semibold">{item.winner}</span>
                            <span className="text-slate-500 mx-2">beat</span>
                            <span className="font-medium">
                              {item.winner === item.player1.name ? item.player2?.name : item.player1.name}
                            </span>
                            <span className="text-yellow-500 ml-2">
                              ({item.winner === item.player1.name ? item.player1.gamesWon : item.player2?.gamesWon}-
                              {item.winner === item.player1.name ? item.player2?.gamesWon : item.player1.gamesWon})
                            </span>
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          Round {item.round_number} • {formatFeedTime(item.completedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer with refresh info */}
      <div className="mt-4 flex items-center justify-between text-slate-500 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3 h-3" />
          <span>Auto-refreshes every 10 seconds</span>
        </div>
        <div className="text-slate-600">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
        <Button
          onClick={() => fetchDashboardData()}
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-slate-100 h-7 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
