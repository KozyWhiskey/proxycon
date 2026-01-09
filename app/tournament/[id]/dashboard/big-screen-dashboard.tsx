'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Users, RefreshCw, Clock, ArrowLeft, Smartphone, Monitor, Crown, History, Plus, Minus, Check, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  calculateStandings,
  sortStandings,
  convertDbMatchToMatchResult,
  formatOMWPercentage,
  type MatchResult,
  type PlayerStanding
} from '@/lib/swiss-pairing';
import { useRoundTimer } from '@/components/tournament/use-round-timer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { submitResultWithGamesNoRedirect } from '@/app/tournament/actions';

// --- Types ---
export interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  max_rounds: number;
  round_duration_minutes: number;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
}

export interface Match {
  id: string;
  round_number: number;
  started_at: string | null;
  paused_at: string | null;
  remaining_seconds: number | null;
  updated_at: string | null;
  created_at: string;
  tournament_id: string;
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  profile_id: string;
  result: 'win' | 'loss' | 'draw' | null;
  games_won: number;
}

export interface DashboardInitialData {
  tournament: Tournament;
  matches: Match[];
  participants: MatchParticipant[];
  profiles: Profile[];
}

export interface BigScreenDashboardProps {
  tournamentId: string;
  initialData: DashboardInitialData;
  serverStandings?: PlayerStanding[];
}

interface MatchFeedItem {
  id: string;
  round_number: number;
  p1Name: string;
  p2Name: string;
  p1Score: number;
  p2Score: number;
  winnerName: string | null; // null if draw
  isDraw: boolean;
  completedAt: Date;
}

// --- Component: MatchResultEntry ---
function MatchResultEntry({
  matchId,
  p1,
  p2,
  tournamentId,
  onSuccess
}: {
  matchId: string;
  p1: { id: string; name: string };
  p2: { id: string; name: string };
  tournamentId: string;
  onSuccess: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if ((p1Score === 0 && p2Score === 0 && p1Score === p2Score) && !confirm("Report a 0-0 Draw?")) return;
    
    setIsSubmitting(true);
    try {
      const result = await submitResultWithGamesNoRedirect(
        matchId,
        p1.id, p1Score, null,
        p2.id, p2Score, null,
        tournamentId
      );

      if (result.success) {
        toast.success("Result recorded!");
        setIsExpanded(false);
        onSuccess();
      } else {
        toast.error(result.message || "Failed to submit result");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isExpanded) {
    return (
      <Button 
        onClick={() => setIsExpanded(true)}
        variant="outline" 
        className="w-full mt-4 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary-foreground transition-all h-12 text-lg font-medium"
      >
        Record Result
      </Button>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 fade-in duration-200">
      <div className="grid grid-cols-2 gap-8 mb-4">
        {/* Player 1 Input */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">{p1.name}</span>
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setP1Score(Math.max(0, p1Score - 1))}
              className="h-12 w-12 rounded-full border-white/10 hover:bg-white/10"
            >
              <Minus className="w-5 h-5" />
            </Button>
            <span className="text-4xl font-bold font-mono w-12 text-center text-foreground">{p1Score}</span>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setP1Score(p1Score + 1)}
              className="h-12 w-12 rounded-full border-white/10 hover:bg-white/10"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Player 2 Input */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">{p2.name}</span>
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setP2Score(Math.max(0, p2Score - 1))}
              className="h-12 w-12 rounded-full border-white/10 hover:bg-white/10"
            >
              <Minus className="w-5 h-5" />
            </Button>
            <span className="text-4xl font-bold font-mono w-12 text-center text-foreground">{p2Score}</span>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setP2Score(p2Score + 1)}
              className="h-12 w-12 rounded-full border-white/10 hover:bg-white/10"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-12 text-lg font-medium"
        >
          {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Submit"}
        </Button>
        <Button 
          onClick={() => setIsExpanded(false)} 
          variant="outline" 
          className="h-12 px-6 border-white/10 hover:bg-white/5"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// --- Hook: useTournamentSync ---
function useTournamentSync(tournamentId: string, initialData: DashboardInitialData) {
  const [data, setData] = useState<DashboardInitialData>(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      
      // Fetch tournament (for status updates)
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('id, name, format, status, max_rounds, round_duration_minutes')
        .eq('id', tournamentId)
        .single();

      // Fetch all matches
      const { data: matches } = await supabase
        .from('matches')
        .select('id, round_number, started_at, paused_at, remaining_seconds, updated_at, created_at, tournament_id')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true });

      const currentMatches = matches || [];
      const matchIds = currentMatches.map(m => m.id);

      // Fetch participants using explicit match IDs (Simpler, more robust than join)
      const { data: allParticipants } = await supabase
        .from('match_participants')
        .select('id, match_id, profile_id, result, games_won')
        .in('match_id', matchIds);

      const normalizedParticipants = (allParticipants || []).map((p: any) => ({
        id: p.id,
        match_id: p.match_id,
        profile_id: p.profile_id,
        result: p.result,
        games_won: p.games_won
      }));

      if (tournament && matches) {
        setData(prev => ({
          ...prev,
          tournament: tournament as Tournament,
          matches: matches as Match[],
          participants: normalizedParticipants,
          // Profiles rarely change, keep existing
        }));
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [tournamentId]);

  // Realtime Subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dashboard-sync-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_participants' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${tournamentId}` }, refresh)
      .subscribe();

    const interval = setInterval(refresh, 30000); // Polling backup

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [tournamentId, refresh]);

  return { data, lastUpdated, isRefreshing, refresh };
}

// --- Component: BigScreenDashboard ---
export default function BigScreenDashboard({ tournamentId, initialData, serverStandings }: BigScreenDashboardProps) {
  const { data, lastUpdated, isRefreshing, refresh } = useTournamentSync(tournamentId, initialData);
  const { tournament, matches, participants, profiles } = data;

  // Process Data (Memoized)
  const processedData = useMemo(() => {
    // DEBUG: Log incoming data
    console.log('[Dashboard] Processing Data:', { 
      matchCount: matches.length, 
      participantCount: participants.length,
      sampleMatchId: matches[0]?.id,
    });

    const currentRound = matches.length > 0
      ? Math.max(...matches.map(m => m.round_number || 1))
      : 1;

    const currentMatches = matches.filter(m => m.round_number === currentRound);
    
    // Timer Match
    const timerMatch = currentMatches[0];

    // Participants Map
    const participantsByMatch = new Map<string, MatchParticipant[]>();
    participants.forEach(p => {
      if (!participantsByMatch.has(p.match_id)) participantsByMatch.set(p.match_id, []);
      participantsByMatch.get(p.match_id)!.push(p);
    });

    // Profiles Map
    const profilesMap = new Map(profiles.map(p => [p.id, p]));

    // Match History & Feed
    const matchHistory: MatchResult[] = [];
    const feedItems: MatchFeedItem[] = [];

    matches.forEach(match => {
      const parts = participantsByMatch.get(match.id) || [];
      
      // Add to Standings History
      if (parts.length > 0) {
        matchHistory.push(convertDbMatchToMatchResult(
          match.id, 
          match.round_number, 
          parts.map(p => ({ playerId: p.profile_id, result: p.result }))
        ));
      }

      // Add to Match Feed (if completed)
      if (parts.length === 2 && parts.every(p => p.result !== null)) {
        const p1 = parts[0];
        const p2 = parts[1];
        const p1Profile = profilesMap.get(p1.profile_id);
        const p2Profile = profilesMap.get(p2.profile_id);
        
        let winnerName = null;
        if (p1.result === 'win') winnerName = p1Profile?.display_name || p1Profile?.username || 'Unknown';
        if (p2.result === 'win') winnerName = p2Profile?.display_name || p2Profile?.username || 'Unknown';

        feedItems.push({
          id: match.id,
          round_number: match.round_number,
          p1Name: p1Profile?.display_name || p1Profile?.username || 'Unknown',
          p2Name: p2Profile?.display_name || p2Profile?.username || 'Unknown',
          p1Score: p1.games_won || 0,
          p2Score: p2.games_won || 0,
          winnerName,
          isDraw: p1.result === 'draw',
          completedAt: match.updated_at ? new Date(match.updated_at) : new Date(match.created_at)
        });
      }
    });

    // Sort Feed (Newest first)
    feedItems.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

    // Calculate Standings
    const standingsMap = calculateStandings(profiles.map(p => p.id), matchHistory);
    const clientStandings = sortStandings(Array.from(standingsMap.values()));
    
    // Fallback Logic
    let standings = [];
    const clientTotalPoints = clientStandings.reduce((sum, s) => sum + s.points, 0);
    const serverTotalPoints = serverStandings?.reduce((sum, s) => sum + s.points, 0) || 0;
    
    if (clientTotalPoints === 0 && serverTotalPoints > 0) {
      standings = (serverStandings || []).map((s, i) => ({
        ...s,
        rank: i + 1,
        profile: profilesMap.get(s.playerId)
      }));
    } else {
       standings = clientStandings.map((s, i) => ({
        ...s,
        rank: i + 1,
        profile: profilesMap.get(s.playerId)
      }));
    }

    // Pairings
    const pairings = currentMatches.map(match => {
      const parts = participantsByMatch.get(match.id) || [];
      const p1 = parts[0];
      const p2 = parts[1]; // Undefined if bye

      return {
        match,
        p1: p1 ? { ...p1, profile: profilesMap.get(p1.profile_id) } : null,
        p2: p2 ? { ...p2, profile: profilesMap.get(p2.profile_id) } : null,
        isBye: parts.length === 1,
        isCompleted: parts.some(p => p.result !== null)
      };
    });

    return { currentRound, timerMatch, standings, pairings, feedItems };
  }, [matches, participants, profiles, serverStandings]);

  const { currentRound, timerMatch, standings, pairings, feedItems } = processedData;

  // Timer Hook
  const { displayTime, status: timerStatus } = useRoundTimer({
    tournamentId,
    roundNumber: currentRound,
    initialTimerData: {
      roundDurationMinutes: tournament.round_duration_minutes,
      startedAt: timerMatch?.started_at || null,
      pausedAt: timerMatch?.paused_at || null,
      remainingSeconds: timerMatch?.remaining_seconds ?? null
    }
  });

  const getTimerColor = () => {
    if (timerStatus === 'expired') return 'text-rose-500 text-glow animate-pulse';
    if (timerStatus === 'paused') return 'text-primary text-glow';
    if (timerStatus === 'running') {
      const [mins] = displayTime.split(':').map(Number);
      if (mins < 5) return 'text-rose-500 text-glow';
      if (mins < 10) return 'text-amber-500 text-glow';
      return 'text-emerald-500 text-glow';
    }
    return 'text-muted-foreground';
  };

  const getFormatDisplay = (completedAt: Date) => {
    const diff = Date.now() - completedAt.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return completedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col gap-6 font-sans">
      {/* --- HEADER --- */}
      <header className="glass-panel flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-2xl">
        
        {/* Title & Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
              <Link href={`/tournament/${tournamentId}`}><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground font-heading tracking-tight">
              {tournament.name}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-sm md:text-base font-medium">
            <span className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-full border border-white/5">
              <Trophy className="w-4 h-4 text-primary" />
              Round {currentRound} of {tournament.max_rounds}
            </span>
            <span className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-full border border-white/5">
              <Users className="w-4 h-4 text-cyan-500" />
              {profiles.length} Players
            </span>
            <span className="uppercase tracking-widest text-xs opacity-60">
              {tournament.format}
            </span>
          </div>
        </div>

        {/* Big Timer */}
        <div className="flex flex-col items-end">
          <div className={cn("text-6xl md:text-8xl font-black font-mono tracking-tighter tabular-nums leading-none transition-colors duration-500", getTimerColor())}>
            {displayTime}
          </div>
          <div className="text-sm font-medium uppercase tracking-widest opacity-60 mt-2 text-right w-full text-muted-foreground">
            {timerStatus === 'running' ? 'Time Remaining' : 
             timerStatus === 'paused' ? 'Timer Paused' : 
             timerStatus === 'expired' ? 'Time Expired' : 'Not Started'}
          </div>
        </div>
      </header>

      {/* --- MAIN GRID --- */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PAIRINGS (Left, Wider) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Card className="glass-panel flex-1 border-white/10">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-2xl font-heading text-foreground flex items-center gap-3">
                <Monitor className="w-6 h-6 text-cyan-500" />
                Current Pairings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
              {pairings.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground text-xl italic">
                  Waiting for pairings...
                </div>
              ) : (
                pairings.map(({ match, p1, p2, isBye, isCompleted }) => (
                  <div 
                    key={match.id}
                    className={cn(
                      "relative overflow-hidden rounded-xl border p-5 transition-all",
                      isCompleted 
                        ? "bg-secondary/40 border-white/5 opacity-70" 
                        : "bg-gradient-to-br from-secondary/80 to-secondary border-white/10 shadow-lg hover:border-primary/30"
                    )}
                  >
                    {/* Status Indicator */}
                    {isCompleted && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase rounded border border-emerald-500/30">
                        Finished
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between gap-4">
                      {/* Player 1 */}
                      <div className="flex-1 text-right flex flex-col items-end">
                        <div className={cn(
                          "text-xl md:text-2xl font-bold truncate flex items-center gap-2 font-heading",
                          p1?.result === 'win' ? "text-emerald-400 text-glow" : "text-foreground"
                        )}>
                          {p1?.result === 'win' && <Crown className="w-5 h-5 text-primary fill-primary" />}
                          {p1?.profile?.display_name || p1?.profile?.username || "Unknown"}
                        </div>
                        {isCompleted && (
                          <div className="text-3xl font-mono text-muted-foreground mt-1 tabular-nums">
                            {p1?.games_won}
                          </div>
                        )}
                      </div>

                      {/* VS */}
                      <div className="shrink-0 flex flex-col items-center justify-center w-12">
                        {isBye ? (
                          <span className="text-primary font-bold italic font-heading">BYE</span>
                        ) : (
                          <span className="text-muted-foreground/50 font-black text-xl">VS</span>
                        )}
                      </div>

                      {/* Player 2 */}
                      <div className="flex-1 text-left flex flex-col items-start">
                        {p2 ? (
                          <>
                            <div className={cn(
                              "text-xl md:text-2xl font-bold truncate flex items-center gap-2 font-heading",
                              p2.result === 'win' ? "text-emerald-400 text-glow" : "text-foreground"
                            )}>
                              {p2.profile?.display_name || p2.profile?.username || "Unknown"}
                              {p2.result === 'win' && <Crown className="w-5 h-5 text-primary fill-primary" />}
                            </div>
                            {isCompleted && (
                              <div className="text-3xl font-mono text-muted-foreground mt-1 tabular-nums">
                                {p2.games_won}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground/30 text-2xl">—</span>
                        )}
                      </div>
                    </div>

                    {/* Report Match Logic */}
                    {!isCompleted && !isBye && p1 && p2 && (
                      <MatchResultEntry 
                        matchId={match.id}
                        p1={{ id: p1.profile_id, name: p1.profile?.display_name || p1.profile?.username || "P1" }}
                        p2={{ id: p2.profile_id, name: p2.profile?.display_name || p2.profile?.username || "P2" }}
                        tournamentId={tournamentId}
                        onSuccess={refresh}
                      />
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* RECENT RESULTS TICKER */}
          {feedItems.length > 0 && (
            <Card className="glass-panel border-white/10">
              <CardHeader className="border-b border-white/5 py-3">
                <CardTitle className="text-lg font-heading text-muted-foreground flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Recent Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex overflow-x-auto p-4 gap-4 pb-4 custom-scrollbar">
                  {feedItems.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex-shrink-0 bg-secondary/50 rounded-lg p-3 border border-white/5 min-w-[200px]">
                      <div className="text-xs text-muted-foreground/50 uppercase tracking-wider mb-1">
                        R{item.round_number} • {getFormatDisplay(item.completedAt)}
                      </div>
                      {item.isDraw ? (
                        <div className="text-sm font-medium text-muted-foreground">
                          {item.p1Name} <span className="text-primary mx-1">drew</span> {item.p2Name}
                        </div>
                      ) : (
                        <div className="text-sm">
                          <span className="font-bold text-emerald-400">{item.winnerName}</span>
                          <span className="text-muted-foreground mx-1">def.</span>
                          <span className="text-muted-foreground">{item.winnerName === item.p1Name ? item.p2Name : item.p1Name}</span>
                        </div>
                      )}
                      <div className="text-xs font-mono text-muted-foreground mt-1 text-center bg-black/20 rounded py-0.5">
                        {item.p1Score} - {item.p2Score}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* STANDINGS (Right, Narrower) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="glass-panel flex-1 h-full border-white/10">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-2xl font-heading text-foreground flex items-center gap-3">
                <Trophy className="w-6 h-6 text-primary" />
                Standings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="w-12 text-center text-muted-foreground">#</TableHead>
                    <TableHead className="text-muted-foreground">Player</TableHead>
                    <TableHead className="text-center text-muted-foreground">Pts</TableHead>
                    <TableHead className="text-center text-muted-foreground w-16">OMW%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((s) => (
                    <TableRow key={s.playerId} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="text-center font-mono font-bold text-lg">
                        {s.rank === 1 && <span className="text-primary text-xl">🥇</span>}
                        {s.rank === 2 && <span className="text-zinc-300 text-xl">🥈</span>}
                        {s.rank === 3 && <span className="text-amber-700 text-xl">🥉</span>}
                        {s.rank > 3 && <span className="text-muted-foreground">{s.rank}</span>}
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "font-medium text-lg font-heading",
                          s.rank === 1 ? "text-primary text-glow" : "text-foreground"
                        )}>
                          {s.profile?.display_name || s.profile?.username || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {s.matchWins}-{s.matchLosses}-{s.matchDraws}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-2xl font-bold text-primary font-mono">{s.points}</div>
                      </TableCell>
                      <TableCell className="text-center text-sm font-mono text-cyan-500/80">
                        {formatOMWPercentage(s.opponentMatchWinPercentage)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {standings.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                         No standings available.
                       </TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-widest font-medium">
        <div className="flex items-center gap-2">
          {isRefreshing ? (
            <RefreshCw className="w-3 h-3 animate-spin text-cyan-500" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          )}
          {isRefreshing ? 'Syncing...' : 'Live Connected'}
        </div>
        <div className="flex items-center gap-2 opacity-50">
          <Monitor className="w-3 h-3" />
          <span>Big Screen Mode</span>
        </div>
        <div>
          Last Updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </footer>
    </div>
  );
}