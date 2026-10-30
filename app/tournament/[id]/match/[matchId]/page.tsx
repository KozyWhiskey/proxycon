import { withLiveSnapshot } from '@/lib/live-page';
import {safeNext} from '@/lib/continuation';
import {resultText,tableName} from '@/lib/weekend-view';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { loadMatchBoard, matchPlayers } from '@/lib/event-board';
import { EventNav } from '@/components/events/event-nav';
import { MatchReporter } from '@/components/weekend/match-reporter';
import { ActButton } from '@/components/weekend/act-button';
import { startRound } from '@/app/weekend/actions';
import { Button } from '@/components/ui/button';
import { GameStatus } from '@/components/events/arena-ui';

/** Modern event-scoped match page, including matches from previous rounds. */
async function TournamentMatchPage({ params,searchParams }: { params: Promise<{ id: string; matchId: string }>;searchParams:Promise<{from?:string}> }) {
  const { id, matchId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(matchId).success) notFound();
  const db = await createClient();
  const { data: tournament } = await db.from('tournaments').select('event_id').eq('id', id).maybeSingle();
  if (!tournament?.event_id) notFound();
  const board = await loadMatchBoard(tournament.event_id,matchId);
  if (!board) notFound();
  const from=safeNext((await searchParams).from);const back=from.startsWith('/events/'+board.event.id+'/history')?from:null;
  const game = board.tournaments.find((row) => row.id === id);
  const match = board.matches.find((row) => row.id === matchId && row.tournament_id === id);
  if (!game || !match) notFound();

  const players = matchPlayers(board, match.id);
  const bye = players.length === 1;
  const recorded = players.length > 0 && players.every((player) => player.result);
  const canOperate = board.canManage || board.joined;
  const waiting = !match.started_at && !recorded;
  const playing = Boolean(match.started_at) && !recorded;
  const matchup = bye
    ? `${players[0]?.name || 'Player'} has the bye`
    : players.map((player) => player.name).join(' vs ');
  const table=tableName(match);
  const state = recorded
    ? 'Result recorded'
    : playing
      ? 'Playing'
      : 'Pairings posted';
  const reporter = canOperate && match.started_at && !bye ? (
    <MatchReporter
      key={match.id}
      matchId={match.id}
      showGamesWon
      tournament
      returnTo={`/tournament/${id}`}
      players={players.filter((player) => player.profile_id).map((player) => ({
        id: player.profile_id!,
        name: player.name,
        result: player.result,
        gamesWon: player.games_won,
      }))}
    />
  ) : null;


  return (
    <>
      <EventNav id={board.event.id} house={board.house} name={board.event.name} />
      <main className={`page form-page match-page arena-match-detail task-page${recorded ? ' is-complete' : ' is-playing'}`}>
        <Link href={back||`/tournament/${id}`} className="subtle">← {back?'Game history':game.name}</Link>
        <header className="match-page-head">
          <p className="subtle match-context">{game.name}</p>
          <p className="eyebrow">
            {match.is_final ? table : `Round ${match.round_number} of ${game.max_rounds}`}
            {!bye && !match.is_final ? ` · ${table}` : ''}
          </p>
          <h1>{matchup}</h1>
          <div className="match-state">
            <GameStatus state={recorded ? 'complete' : playing ? 'live' : 'setup'}>{state}</GameStatus>
          </div>
        </header>

        <section className="match-detail panel">
          {match.is_rematch && <p className="subtle">Rematch · no alternative legal pairing was available.</p>}
          {bye && !recorded && <p className="subtle">Bye counts as a win when the round starts.</p>}

          {waiting && canOperate && (
            <div className="round-start-panel match-start-panel">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-link">Ready to play</p>
              <p className="text-sm text-muted-foreground">
                Starts Round {match.round_number} for every table, then scores open here.
              </p>
              <ActButton label={`Start round ${match.round_number}`} action={startRound.bind(null, id)} />
            </div>
          )}

          {waiting && !canOperate && (
            <p className="subtle">Waiting for the round to start. Scores open after that.</p>
          )}

          {/* Score entry first while playing — identity cards stay secondary. */}
          {!recorded && reporter}

          {recorded&&<p className="subtle">{resultText(players)}</p>}

          {recorded && reporter && (
            <details className="disclosure">
              <summary>Correct this result</summary>
              <div>{reporter}</div>
            </details>
          )}

          {!canOperate && playing && (
            <p className="subtle">Join the event to report or correct a result.</p>
          )}
        </section>

        <div className="action-row">
          <Button asChild variant="outline">
            <Link href={`/tournament/${id}`}>Pairings & standings</Link>
          </Button>
          {board.house && (
            <Button asChild variant="outline">
              <Link href={`/events/${board.event.id}/room?tournament=${id}`}>Back to room</Link>
            </Button>
          )}
        </div>
      </main>
    </>
  );
}

export default withLiveSnapshot(TournamentMatchPage);
