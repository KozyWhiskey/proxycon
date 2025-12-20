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
import { Trophy, Users, RefreshCw, Clock, ArrowLeft, Smartphone, Play, Pause, Minus, Plus, Check, History } from 'lucide-react';
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

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
}

interface Match {
  id: string;
  round_number: number;
  started_at: string | null;
  paused_at: string | null;
  remaining_seconds: number | null;
  updated_at: string | null;
  created_at: string;
}

interface MatchParticipant {
  id: string;
  match_id: string;
  profile_id: string;
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
  remainingSeconds: number | null;
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
        return { text: 'Set scores', color: 'text-muted-foreground', type: 'none' };
      }
      return { text: 'Draw', color: 'text-primary', type: 'draw' };
    }
    if (player1Games > player2Games) {
      return { text: `${pairing.player1!.name} wins`, color: 'text-emerald-500', type: 'player1' };
    }
    return { text: `${pairing.player2!.name} wins`, color: 'text-emerald-500', type: 'player2' };
  };

  const result = getResultPreview();
  const canSubmit = player1Games > 0 || player2Games > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !pairing.player1 || !pairing.player2) return;

    setIsSubmitting(true);
    try {
      const response = await submitResultWithGamesNoRedirect(
        pairing.matchId,
        pairing.player1.id,
        player1Games,
        null, // Deck ID not supported in quick dashboard
        pairing.player2.id,
        player2Games,
        null, // Deck ID not supported in quick dashboard
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
        className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
      >
        Report Result
      </Button>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
      {/* Score Entry */}
      <div className="grid grid-cols-3 gap-2 items-center">
        {/* Player 1 Score */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2 truncate">{pairing.player1.name}</p>
          <div className="flex items-center justify-center gap-1">
            <Button
              type="button"
              onClick={() => setPlayer1Games(Math.max(0, player1Games - 1))}
              disabled={isSubmitting || player1Games === 0}
              size="sm"
              className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-foreground disabled:opacity-30"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-3xl font-bold text-primary w-12 text-center tabular-nums">
              {player1Games}
            </span>
            <Button
              type="button"
              onClick={() => setPlayer1Games(player1Games + 1)}
              disabled={isSubmitting}
              size="sm"
              className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-foreground"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* VS */}
        <div className="text-center">
          <span className="text-muted-foreground/30 text-lg">—</span>
        </div>

        {/* Player 2 Score */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2 truncate">{pairing.player2.name}</p>
          <div className="flex items-center justify-center gap-1">
            <Button
              type="button"
              onClick={() => setPlayer2Games(Math.max(0, player2Games - 1))}
              disabled={isSubmitting || player2Games === 0}
              size="sm"
              className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-foreground disabled:opacity-30"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-3xl font-bold text-primary w-12 text-center tabular-nums">
              {player2Games}
            </span>
            <Button
              type="button"
              onClick={() => setPlayer2Games(player2Games + 1)}
              disabled={isSubmitting}
              size="sm"
              className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-foreground"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Result Preview & Submit */}
      <div className="flex items-center gap-2">
        <div className={`flex-1 text-center py-2 px-3 rounded-lg bg-white/5 border border-white/5 ${result.color}`}>
          <span className="text-sm font-medium">{result.text}</span>
          {canSubmit && <span className="text-muted-foreground ml-2">({player1Games}-{player2Games})</span>}
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
          className="text-muted-foreground hover:text-foreground"
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
    remainingSeconds: null,
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
      .select('profile_id')
      .eq('tournament_id', tournamentId);

    const profileIds = participants?.map((p) => p.profile_id) || [];
    setTotalPlayers(profileIds.length);

    // Fetch all matches
    const { data: matches } = await supabase
      .from('matches')
      .select('id, round_number, started_at, paused_at, remaining_seconds, updated_at, created_at')
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
        remainingSeconds: timerMatch.remaining_seconds,
      });
      updateTimerDisplay(timerMatch, tournamentData.round_duration_minutes);
    }

    // Fetch all match participants
    const matchIds = matches.map((m) => m.id);
    const { data: allParticipants } = await supabase
      .from('match_participants')
      .select('id, match_id, profile_id, result, games_won')
      .in('match_id', matchIds);

    // Fetch profile details
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', profileIds);

    const profilesMap = new Map<string, Profile>(
      profiles?.map((p) => [p.id, p]) || []
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
            matchParticipants.map((p) => ({ playerId: p.profile_id, result: p.result }))
          )
        );
      }
    }

    // Calculate standings
    const standingsMap = calculateStandings(profileIds, matchHistory);
    const sortedStandings = sortStandings(Array.from(standingsMap.values()));

    const standingsDisplay: Standing[] = sortedStandings.map((s, index) => {
      const profile = profilesMap.get(s.playerId);
      return {
        rank: index + 1,
        playerId: s.playerId,
        playerName: profile?.display_name || profile?.username || 'Unknown',
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

    // Create a map of profile records
    const profileRecordMap = new Map<string, string>();
    standingsDisplay.forEach((s) => {
      profileRecordMap.set(s.playerId, `${s.wins}-${s.losses}-${s.draws}`);
    });

    const pairingsDisplay: PairingDisplay[] = [];
    for (const match of currentRoundMatches) {
      const matchParticipants = matchParticipantsGrouped.get(match.id) || [];
      const isBye = matchParticipants.length === 1;
      const isCompleted = matchParticipants.some((p) => p.result !== null);

      if (isBye) {
        const p = matchParticipants[0];
        const profile = profilesMap.get(p.profile_id);
        pairingsDisplay.push({
          matchId: match.id,
          player1: {
            id: p.profile_id,
            name: profile?.display_name || profile?.username || 'Unknown',
            record: profileRecordMap.get(p.profile_id) || '0-0-0',
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
        const profile1 = profilesMap.get(p1.profile_id);
        const profile2 = profilesMap.get(p2.profile_id);

        pairingsDisplay.push({
          matchId: match.id,
          player1: {
            id: p1.profile_id,
            name: profile1?.display_name || profile1?.username || 'Unknown',
            record: profileRecordMap.get(p1.profile_id) || '0-0-0',
            result: p1.result,
            gamesWon: p1.games_won || 0,
          },
          player2: {
            id: p2.profile_id,
            name: profile2?.display_name || profile2?.username || 'Unknown',
            record: profileRecordMap.get(p2.profile_id) || '0-0-0',
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
        const profile = profilesMap.get(p.profile_id);
        feedItems.push({
          id: match.id,
          round_number: match.round_number || 1,
          player1: {
            name: profile?.display_name || profile?.username || 'Unknown',
            gamesWon: p.games_won || 0,
          },
          player2: null,
          winner: profile?.display_name || profile?.username || 'Unknown',
          isDraw: false,
          isBye: true,
          completedAt: match.updated_at || match.created_at,
        });
      } else if (matchParticipants.length >= 2) {
        const p1 = matchParticipants[0];
        const p2 = matchParticipants[1];
        const profile1 = profilesMap.get(p1.profile_id);
        const profile2 = profilesMap.get(p2.profile_id);
        const isDraw = p1.result === 'draw';
        const winner = isDraw ? null : (p1.result === 'win' ? (profile1?.display_name || profile1?.username || 'Unknown') : (profile2?.display_name || profile2?.username || 'Unknown'));

        feedItems.push({
          id: match.id,
          round_number: match.round_number || 1,
          player1: {
            name: profile1?.display_name || profile1?.username || 'Unknown',
            gamesWon: p1.games_won || 0,
          },
          player2: {
            name: profile2?.display_name || profile2?.username || 'Unknown',
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

  // Fix timezone: database stores timestamp without timezone, treat as UTC
  const ensureUTC = (timestamp: string | null): string | null => {
    if (!timestamp) return null;
    if (!timestamp.endsWith('Z') && !timestamp.match(/[+-]\d{2}:\d{2}$/)) {
      return timestamp + 'Z';
    }
    return timestamp;
  };

  const updateTimerDisplay = (
    timerMatch: Match,
    roundDurationMinutes: number
  ) => {
    // State 1: Timer not started - show full duration
    if (!timerMatch.started_at) {
      const mins = roundDurationMinutes;
      setTimerDisplay(`${mins.toString().padStart(2, '0')}:00`);
      setTimerStatus('not_started');
      return;
    }

    // State 2: Timer is paused - show exact remaining seconds from server
    if (timerMatch.paused_at) {
      const remaining = Math.max(0, timerMatch.remaining_seconds ?? 0);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setTimerDisplay(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      setTimerStatus('paused');
      return;
    }

    // State 3: Timer is running - calculate from startedAt and remaining_seconds
    const startedAtFixed = ensureUTC(timerMatch.started_at)!;
    const startTime = new Date(startedAtFixed).getTime();
    const now = Date.now();
    const elapsedSecs = Math.floor((now - startTime) / 1000);
    const remaining = Math.max(0, (timerMatch.remaining_seconds ?? 0) - elapsedSecs);

    if (remaining <= 0) {
      setTimerDisplay('00:00');
      setTimerStatus('expired');
    } else {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setTimerDisplay(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      setTimerStatus('running');
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
          remainingSeconds: result.updatedTimerData.remainingSeconds,
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
          remainingSeconds: result.updatedTimerData.remainingSeconds,
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
          remainingSeconds: result.updatedTimerData.remainingSeconds,
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
    if (timerStatus === 'not_started') return 'text-muted-foreground';
    if (timerStatus === 'paused') return 'text-primary';
    if (timerStatus === 'expired') return 'text-rose-500';
    
    const [mins] = timerDisplay.split(':').map(Number);
    if (mins > 10) return 'text-emerald-500';
    if (mins > 5) return 'text-primary';
    return 'text-rose-500';
  };

  const getMatchResultDisplay = (pairing: PairingDisplay) => {
    if (pairing.isBye) {
      return (
        <span className="text-muted-foreground text-lg italic">Bye</span>
      );
    }

    if (pairing.status === 'pending') {
      return (
        <div className="flex items-center gap-2 justify-center">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-primary text-lg font-medium">In Progress</span>
        </div>
      );
    }

    // Completed match
    const p1 = pairing.player1!;
    const p2 = pairing.player2!;

    if (p1.result === 'draw') {
      return (
        <span className="text-muted-foreground text-lg">
          Draw ({p1.gamesWon}-{p2.gamesWon})
        </span>
      );
    }

    const winner = p1.result === 'win' ? p1 : p2;
    const loser = p1.result === 'win' ? p2 : p1;

    return (
      <span className="text-emerald-500 text-lg font-medium">
        {winner.name} won ({winner.gamesWon}-{loser.gamesWon})
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-xl">Loading tournament data...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-2xl">Tournament not found</p>
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
    <div className="min-h-screen bg-background p-4 lg:p-6">
      {/* Compact Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-white/5 shrink-0"
            >
              <Link href={`/tournament/${tournamentId}`}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                <Smartphone className="w-4 h-4" />
              </Link>
            </Button>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground truncate font-heading">
              {tournament.name}
            </h1>
          </div>
          
          {/* Compact Timer Card */}
          <Card className="glass-panel shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Clock className={`w-5 h-5 ${getTimerColor()}`} />
                <div className="flex flex-col">
                  <span className={`text-2xl lg:text-3xl font-mono font-bold ${getTimerColor()} tabular-nums leading-none`}>
                    {timerDisplay}
                  </span>
                  <span className="text-xs text-muted-foreground/60 mt-0.5">
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
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-3 text-xs font-medium"
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
          <div className="flex items-center gap-2 text-foreground">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              Round {currentRound} of {tournament.max_rounds}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm">{totalPlayers} Players</span>
          </div>
          <span className="text-xs uppercase tracking-wider px-2 py-1 rounded-md bg-white/5 border border-white/10 text-muted-foreground">
            {tournament.format}
          </span>
          {tournament.status === 'completed' && (
            <span className="text-xs uppercase tracking-wider px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Current Round Pairings */}
        <Card className="glass-panel">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-2xl text-foreground flex items-center gap-3 font-heading">
              <span className="text-primary">Round {currentRound}</span>
              <span className="text-muted-foreground/40">Pairings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {pairings.map((pairing) => (
                <div
                  key={pairing.matchId}
                  className={`p-4 rounded-xl border ${
                    pairing.status === 'pending'
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-white/5 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Player 1 */}
                    <div className="flex-1 text-right">
                      <p className={`text-2xl font-semibold font-heading ${
                        pairing.player1?.result === 'win' ? 'text-emerald-500' : 'text-foreground'
                      }`}>
                        {pairing.player1?.name}
                      </p>
                      <p className="text-muted-foreground text-sm mt-1">
                        {pairing.player1?.record}
                      </p>
                    </div>

                    {/* VS / Result */}
                    <div className="flex-shrink-0 text-center px-4">
                      {pairing.isBye ? (
                        <span className="text-muted-foreground/30 text-xl font-medium italic">BYE</span>
                      ) : pairing.status === 'pending' ? (
                        <span className="text-primary text-xl font-bold">VS</span>
                      ) : (
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            {pairing.player1?.gamesWon} - {pairing.player2?.gamesWon}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Player 2 */}
                    <div className="flex-1 text-left">
                      {pairing.player2 ? (
                        <>
                          <p className={`text-2xl font-semibold font-heading ${
                            pairing.player2?.result === 'win' ? 'text-emerald-500' : 'text-foreground'
                          }`}>
                            {pairing.player2?.name}
                          </p>
                          <p className="text-muted-foreground text-sm mt-1">
                            {pairing.player2?.record}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground/20 text-2xl">—</p>
                      )}
                    </div>
                  </div>

                  {/* Match Status */}
                  <div className="mt-3 pt-3 border-t border-white/5 text-center">
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
                  <p className="text-muted-foreground text-xl italic">No pairings for this round yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Standings */}
        <Card className="glass-panel">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-2xl text-foreground flex items-center gap-3 font-heading">
              <Trophy className="w-6 h-6 text-primary" />
              <span>Standings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-base w-16">#</TableHead>
                  <TableHead className="text-muted-foreground text-base">Player</TableHead>
                  <TableHead className="text-muted-foreground text-base text-center">Record</TableHead>
                  <TableHead className="text-muted-foreground text-base text-center">Points</TableHead>
                  <TableHead className="text-muted-foreground text-base text-center">OMW%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((standing) => (
                  <TableRow
                    key={standing.playerId}
                    className={`border-white/5 ${
                      standing.rank <= 3 ? 'bg-primary/5' : ''
                    }`}
                  >
                    <TableCell className="font-bold text-xl">
                      {standing.rank === 1 && (
                        <span className="text-primary">🥇</span>
                      )}
                      {standing.rank === 2 && (
                        <span className="text-zinc-300">🥈</span>
                      )}
                      {standing.rank === 3 && (
                        <span className="text-amber-700">🥉</span>
                      )}
                      {standing.rank > 3 && (
                        <span className="text-muted-foreground/40">{standing.rank}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xl font-medium font-heading ${
                        standing.rank === 1 ? 'text-primary' : 'text-foreground'
                      }`}>
                        {standing.playerName}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-lg text-foreground/80 font-mono">
                        {standing.wins}-{standing.losses}-{standing.draws}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xl font-bold text-primary font-mono">
                        {standing.points}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-lg text-primary font-mono opacity-80">
                        {formatOMWPercentage(standing.omwPercentage)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}

                {standings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground text-xl italic">No standings yet</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Point System Legend */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-muted-foreground/40 text-center uppercase tracking-widest">
                Win 3pt • Draw 1pt • Loss 0pt
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Results Feed */}
      <div className="mt-6">
        <Card className="glass-panel">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-xl text-foreground flex items-center gap-2 font-heading">
              <History className="w-5 h-5 text-primary" />
              <span>Match Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {matchFeed.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground italic">No completed matches yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {matchFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {item.isBye ? (
                          <p className="text-foreground">
                            <span className="text-emerald-500 font-medium">{item.winner}</span>
                            <span className="text-muted-foreground ml-2">received a bye</span>
                          </p>
                        ) : item.isDraw ? (
                          <p className="text-foreground">
                            <span className="font-medium">{item.player1.name}</span>
                            <span className="text-muted-foreground/40 mx-2">drew with</span>
                            <span className="font-medium">{item.player2?.name}</span>
                            <span className="text-primary ml-2 font-mono">
                              ({item.player1.gamesWon}-{item.player2?.gamesWon})
                            </span>
                          </p>
                        ) : (
                          <p className="text-foreground">
                            <span className="text-emerald-500 font-semibold">{item.winner}</span>
                            <span className="text-muted-foreground/40 mx-2">beat</span>
                            <span className="font-medium">
                              {item.winner === item.player1.name ? item.player2?.name : item.player1.name}
                            </span>
                            <span className="text-primary ml-2 font-mono">
                              ({item.winner === item.player1.name ? item.player1.gamesWon : item.player2?.gamesWon}-
                              {item.winner === item.player1.name ? item.player2?.gamesWon : item.player1.gamesWon})
                            </span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/30 mt-1 uppercase tracking-wider">
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
      <div className="mt-4 flex items-center justify-between text-muted-foreground/40 text-[10px] uppercase tracking-widest flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3 h-3" />
          <span>Auto-refreshes every 10 seconds</span>
        </div>
        <div>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
        <Button
          onClick={() => fetchDashboardData()}
          variant="ghost"
          size="sm"
          className="text-muted-foreground/60 hover:text-foreground h-7 px-2"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>
        </div>
      );
    }
    