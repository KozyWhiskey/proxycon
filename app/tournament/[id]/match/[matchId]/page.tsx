import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { loadEventBoard, matchPlayers, standingsFor } from '@/lib/event-board';
import { EventNav } from '@/components/events/event-nav';
import { MatchReporter } from '@/components/weekend/match-reporter';
import { ActButton } from '@/components/weekend/act-button';
import { startRound } from '@/app/weekend/actions';
import { Button } from '@/components/ui/button';
import { PlayerAvatar, GameStatus } from '@/components/events/arena-ui';

/** Modern event-scoped match page, including matches from previous rounds. */
export default async function TournamentMatchPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(matchId).success) notFound();
  const db = await createClient();
  const { data: tournament } = await db.from('tournaments').select('event_id').eq('id', id).maybeSingle();
  if (!tournament?.event_id) notFound();
  const board = await loadEventBoard(tournament.event_id);
  if (!board) notFound();
  const game = board.tournaments.find((row) => row.id === id);
  const match = board.matches.find((row) => row.id === matchId && row.tournament_id === id);
  if (!game || !match) notFound();

  const players = matchPlayers(board, match.id);
  const bye = players.length === 1;
  const recorded = players.length > 0 && players.every((player) => player.result);
  const standings = standingsFor(board, id);
  const canOperate = board.canManage || board.joined;
  const waiting = !match.started_at && !recorded;
  const playing = Boolean(match.started_at) && !recorded;
  const matchup = bye
    ? `${players[0]?.name || 'Player'} has the bye`
    : players.map((player) => player.name).join(' vs ');
  const table = match.table_label || `Table ${match.table_number}`;
  const state = recorded
    ? 'Result recorded'
    : playing
      ? 'Playing'
      : 'Pairings posted · Not started';
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
      <main className={`page form-page match-page arena-match-detail${recorded ? ' is-complete' : ' is-playing'}`}>
        <Link href={`/tournament/${id}`} className="subtle">← {game.name}</Link>
        <header className="match-page-head">
          <p className="eyebrow">
            {match.is_final ? 'Final' : `Round ${match.round_number} of ${game.max_rounds}`}
            {!bye ? ` · ${table}` : ''}
          </p>
          <h1>{matchup}</h1>
          <div className="match-state"><GameStatus state={recorded ? 'complete' : playing ? 'live' : 'setup'}>{state}</GameStatus></div>
        </header>

        <section className="match-detail panel">
          <div className="match-detail-players">
            {players.map((player) => {
              const standing = standings.find((row) => row.profileId === player.profile_id);
              return (
                <div key={player.id} className={`match-contender${player.result === 'win' ? ' is-winner' : ''}`}>
                  <PlayerAvatar name={player.name} color={board.members.find(m => m.id === player.profile_id)?.color} />
                  <span className="subtle">{player.profile_id === board.userId ? 'You' : 'Player'}</span>
                  <h2>{player.name}</h2>
                  {standing && (
                    <p className="subtle">
                      {standing.points} points · {standing.wins}–{standing.losses}–{standing.draws} match record
                    </p>
                  )}
                  {recorded && (
                    <p className="recorded-outcome">
                      {bye
                        ? 'Bye · 3 match points'
                        : `${player.result === 'win' ? 'Won' : player.result === 'loss' ? 'Lost' : 'Draw'}${
                            players.some((seat) => (seat.games_won || 0) > 0) ? ` · ${player.games_won || 0} games won` : ''
                          }`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {match.is_rematch && <p className="subtle">Rematch · no alternative legal pairing was available.</p>}
          {bye && !recorded && <p className="subtle">Your bye counts as a win when the round starts.</p>}

          {waiting && canOperate && (
            <div className="round-start-panel match-start-panel">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">Ready to play</p>
              <p className="text-sm text-muted-foreground">
                Starts Round {match.round_number} for every table, then you can enter the score here.
              </p>
              <ActButton label="Start round" action={startRound.bind(null, id)} />
            </div>
          )}

          {waiting && !canOperate && (
            <p className="subtle">Waiting for the round to start. Scores open after that.</p>
          )}

          {recorded ? (
            reporter && (
              <details className="disclosure">
                <summary>Correct this result</summary>
                <div>{reporter}</div>
              </details>
            )
          ) : (
            reporter
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
