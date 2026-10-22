import { AddPlayers } from '@/components/events/add-players';
import { addTournamentPlayer } from '@/app/weekend/actions';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { gamesWonFor, currentRound, loadEventBoard, matchPlayers, nameOf, standingsFor, type EventBoard } from '@/lib/event-board';
import { chartSeatCount, manualTieGroups, needsSeats, placeLabel, podForSeat, tournamentLabel, type HistoryMatch } from '@/lib/weekend';
import { getColorClass } from '@/lib/player-colors';
import {
  addFinal,
  addSeat,
  clearPairings,
  dropPlayer,
  joinTournament,
  postPairings,
  randomizeSeats,
  startRound,
} from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
import { FinishForm } from '@/components/weekend/finish-form';
import { MatchReporter } from '@/components/weekend/match-reporter';
import { RoundClock } from '@/components/weekend/round-clock';
import { SeatChart } from '@/components/weekend/seat-chart';
import { TableName } from '@/components/weekend/tournament-tools';

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tournament?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const board = await loadEventBoard(id);
  if (!board) notFound();

  const limited = board.tournaments.filter((tournament) =>
    ['set_draft', 'chaos_draft', 'cube', 'sealed', 'draft'].includes(tournament.format)
  );
  const featured = pickTournament(board, limited, query.tournament);

  return (
    <main className="page room-page">
      <header className="room-top">
        <div>
          <p className="eyebrow">Tournament desk</p>
          <h1>{board.event.name}</h1>
          <p className="subtle mt-2">
            <Link href={`/events/${id}`}>← Event overview</Link>
            {' · '}
            One tournament at a time. Quick matches open from the event page.
          </p>
        </div>
        <Link href={`/events/${id}/stats`} className="room-top-link">Statistics</Link>
      </header>

      {limited.length > 1 && (
        <nav className="room-switch" aria-label="Tournaments on this dashboard">
          {limited.map((tournament) => {
            const selected = featured?.id === tournament.id;
            return (
              <Link
                key={tournament.id}
                href={`/events/${id}/room?tournament=${tournament.id}`}
                aria-current={selected ? 'page' : undefined}
              >
                {tournament.name}
              </Link>
            );
          })}
        </nav>
      )}

      {!featured && (
        <section className="empty-state">
          <h3>The next tournament starts here.</h3>
          <p>Create a draft, cube, or sealed. Quick matches live on their own pages from the event.</p>
          <Link className="text-primary text-sm" href={`/events/${id}/tournaments/new`}>Create tournament →</Link>
        </section>
      )}

      {featured && <TournamentDesk board={board} eventId={id} tournamentId={featured.id} />}
    </main>
  );
}

function TournamentDesk({ board, eventId, tournamentId }: { board: EventBoard; eventId: string; tournamentId: string }) {
  const row = board.tournaments.find((item) => item.id === tournamentId);
  if (!row) return null;
  const roster = board.roster.filter((person) => person.tournament_id === tournamentId);
  const joined = roster.filter((person) => person.profile_id && !person.dropped);
  const mine = joined.find((person) => person.profile_id === board.userId);
  const round = currentRound(board, tournamentId);
  const posted = round.matches.length > 0 && round.matches.every((match) => !match.started_at);
  const started = round.matches.some((match) => match.started_at);
  const startedAt = round.matches.find((match) => match.started_at)?.started_at;
  const standings = standingsFor(board, tournamentId);
  const history = historyFor(board, tournamentId);
  const ties = row.status === 'completed' ? [] : manualTieGroups(standings, history);
  const finalMatch = board.matches.find((match) => match.tournament_id === tournamentId && match.is_final);
  const seatNumbers = roster.map((person) => person.draft_seat || 0);
  const seatCount = chartSeatCount(seatNumbers, joined.length);
  const seats = Array.from({ length: seatCount }, (_, index) => index + 1);
  const openNames = round.matches
    .filter((match) => match.started_at && matchPlayers(board, match.id).some((seat) => !seat.result))
    .map((match) => match.table_label || `Table ${match.table_number}`);
  const recent = board.matches
    .filter((match) => match.tournament_id === tournamentId && match.completed_at && !match.is_final)
    .slice(0, 6);
  const prizeText = [row.prize_1st && `1st ${row.prize_1st}`, row.prize_2nd && `2nd ${row.prize_2nd}`, row.prize_3rd && `3rd ${row.prize_3rd}`].filter(Boolean).join(' · ');
  const seating = needsSeats(row.format) && round.round === 0 && row.status !== 'completed';
  const canRun = board.joined && row.status !== 'completed';
  const showPost = canRun && !posted && (round.round === 0 || round.matches.every((match) => matchPlayers(board, match.id).every((seat) => seat.result))) && round.round < (row.max_rounds || 1);
  const showClock = started && row.status !== 'completed' && row.clock_round === round.round && row.clock_remaining_seconds != null;
  const showRoundActions = posted && canRun;
  const finalPlayers = finalMatch ? matchPlayers(board, finalMatch.id) : [];
  const finalWaiting = Boolean(finalMatch && finalPlayers.some((seat) => !seat.result));
  const startedLabel = startedAt
    ? new Date(startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
    : null;

  const postButton = showPost ? (
    <ActButton label={round.round ? 'Post next round' : 'Post pairings'} action={postPairings.bind(null, row.id)} />
  ) : null;

  return (
    <>
      <section className="room-stage">
        <div className="room-main">
          <header className="room-mast">
            <div className="room-mast-copy">
              <p className="eyebrow">{tournamentLabel(row.format)}</p>
              <h2 className={round.round ? 'room-round' : 'room-setup-title'}>
                {round.round ? <>Round {round.round}<span className="room-of"> of {row.max_rounds}</span></> : row.name}
              </h2>
              <p className="room-status-line">
                <Link href={`/tournament/${row.id}`}>{round.round ? row.name : 'Open on a phone'}</Link>
                {' · '}{joined.length} {joined.length === 1 ? 'player' : 'players'}
                {row.status === 'completed' ? ' · finished' : started ? ' · live' : posted ? ' · posted, not started' : ' · setup'}
                {startedLabel ? ` · started ${startedLabel}` : ''}
              </p>
              {prizeText && <p className="room-prizes">{prizeText}</p>}
              {openNames.length > 0 && <p className="room-open-note">Still open: {openNames.join(', ')}</p>}
              {posted && <p className="room-note">Pairings are posted. The round has not started.</p>}
              {canRun && !mine && !row.field_locked && (
                <div className="room-join"><ActButton label="Join tournament" action={joinTournament.bind(null, row.id)} /></div>
              )}
            </div>
            {showClock && (
              <div className="room-clock">
                <RoundClock
                  tournamentId={row.id}
                  durationMinutes={row.round_duration_minutes || 50}
                  anchor={row.clock_anchor}
                  pausedAt={row.clock_paused_at}
                  remainingSeconds={row.clock_remaining_seconds}
                  canControl={board.joined}
                />
              </div>
            )}
            {showRoundActions && (
              <div className="room-mast-actions">
                <ActButton label="Start round" action={startRound.bind(null, row.id)} />
                <ActButton label="Clear pairings" variant="outline" action={clearPairings.bind(null, row.id)} />
              </div>
            )}
          </header>

          {seating && (
            <div className="room-seat-board">
              <div className="room-seat-head">
                <p className="eyebrow">Seats</p>
                {board.joined && (
                  <div className="room-toolbar" aria-label="Seat tools">
                    {postButton}
                    <ActButton label="Add seat" variant="outline" action={addSeat.bind(null, row.id)} />
                    <ActButton label="Fill empty" variant="outline" action={randomizeSeats.bind(null, row.id, 'fill')} />
                    <ActButton label="Reshuffle" variant="outline" action={randomizeSeats.bind(null, row.id, 'reshuffle')} />
                  </div>
                )}
              </div>
              <div className={`room-pods${row.pod_count === 2 ? ' is-split' : ''}`}>
                {[1, ...(row.pod_count === 2 ? [2] : [])].map((pod) => {
                  const podSeats = seats.filter((number) => {
                    const holder = roster.find((person) => person.draft_seat === number);
                    if (row.pod_count !== 2) return true;
                    return (holder?.pod || podForSeat(2, number, seatCount)) === pod;
                  });
                  return (
                    <div key={pod} className="room-pod">
                      {row.pod_count === 2 && <h3>Pod {pod}</h3>}
                      <div className="room-seats">
                        <SeatChart
                          canControl={board.joined}
                          tournamentId={row.id}
                          seats={podSeats.map((number) => {
                            const holder = roster.find((person) => person.draft_seat === number);
                            const member = board.members.find((person) => person.id === holder?.profile_id);
                            return {
                              number,
                              name: holder?.profile_id ? nameOf(board, holder.profile_id) : null,
                              participantId: holder?.profile_id ? holder.id : null,
                              color: member?.color || null,
                            };
                          })}
                          people={joined.map((person) => ({ participantId: person.id, name: nameOf(board, person.profile_id) }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!seating && showPost && <div className="room-toolbar">{postButton}</div>}

          {(round.matches.length > 0 || finalMatch) && (
            <div className="room-tables" aria-label="Tables">
              {finalWaiting && finalMatch && <TableCard board={board} match={finalMatch} posted={false} final />}
              {round.matches.map((match) => <TableCard key={match.id} board={board} match={match} posted={posted} />)}
              {finalMatch && !finalWaiting && <TableCard board={board} match={finalMatch} posted={false} final />}
            </div>
          )}

          {!seating && round.matches.length === 0 && !finalMatch && (
            <p className="room-note">No pairings posted.</p>
          )}

          {recent.length > 0 && (
            <div className="room-recent">
              <h3>Recent results</h3>
              {recent.map((match) => {
                const players = matchPlayers(board, match.id);
                const bye = players.length === 1;
                return (
                  <p key={match.id}>
                    Round {match.round_number} · {match.table_label || `Table ${match.table_number}`} · {bye ? `${players[0]?.name} bye` : players.map((player) => `${player.name} ${player.result || ''}`).join(' · ')}
                  </p>
                );
              })}
            </div>
          )}
        </div>

        <aside className="room-rail">
          <div className="room-standings">
            <h3>Standings</h3>
            <p>Match points, then opponent match-win percentage. Game scores do not change the order.</p>
            <div className="room-standings-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Place</th>
                    <th scope="col">Name</th>
                    <th scope="col">Pts</th>
                    <th scope="col">Record</th>
                    <th scope="col" className="minor">Games</th>
                    <th scope="col" className="minor">Opp %</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((player, index) => {
                    const swatch = getColorClass(board.members.find((member) => member.id === player.profileId)?.color);
                    return (
                      <tr key={player.id} className={player.dropped ? 'is-dropped' : undefined}>
                        <td className="place">{player.place ? placeLabel(player.place) : index + 1}</td>
                        <td>
                          <span className="room-who">
                            {swatch && <span className={`room-swatch ${swatch}`} />}
                            {player.name}{player.dropped ? ' · dropped' : ''}
                          </span>
                        </td>
                        <td className="pts">{player.points}</td>
                        <td className="rec">{player.wins}–{player.losses}–{player.draws}</td>
                        <td className="minor">{gamesWonFor(board, tournamentId, player.id)}</td>
                        <td className="minor">{Math.round(player.omw * 1000) / 10}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {standings.length === 0 && <p>Nobody has joined.</p>}
          </div>

          {row.status === 'completed' && (
            <div className="room-places">
              <h3>Places</h3>
              {standings.filter((player) => player.place).map((player) => {
                const prize = player.place === 1 ? row.prize_1st : player.place === 2 ? row.prize_2nd : player.place === 3 ? row.prize_3rd : null;
                return (
                  <p key={player.id}>
                    <span>{placeLabel(player.place || 0)}</span> {player.name}
                    {prize ? ` · ${prize}` : ''}
                  </p>
                );
              })}
            </div>
          )}
        </aside>
      </section>

      {(board.joined) && (
        <div className="room-quiet">
          {canRun && !row.field_locked && (
            <AddPlayers
              kind="tournament"
              players={board.members.filter((member) => !joined.some((player) => player.profile_id === member.id)).map((member) => ({ id: member.id, name: member.name }))}
              action={addTournamentPlayer.bind(null, row.id)}
            />
          )}
          {canRun && row.field_locked && (
            <details className="disclosure">
              <summary>{ties.length ? 'Finish — choose the tied order' : 'Finish'}</summary>
              <div className="room-quiet-body">
                {!finalMatch && <ActButton label="Add top-two final" variant="outline" action={addFinal.bind(null, row.id)} />}
                <FinishForm
                  tournamentId={row.id}
                  ranked={standings.map((player) => ({ id: player.id, name: player.name }))}
                  tieGroups={ties}
                />
              </div>
            </details>
          )}
          <details className="disclosure">
            <summary>{row.status === 'completed' ? 'Players' : 'Drop a player'}</summary>
            <div className="room-quiet-body">
              {joined.map((person) => (
                <div key={person.id} className="room-player-row">
                  <span>{nameOf(board, person.profile_id)}{person.dropped ? ' · dropped' : ''}</span>
                  {!person.dropped && row.status !== 'completed' && (
                    <ActButton label="Drop" variant="ghost" action={dropPlayer.bind(null, row.id, person.id)} />
                  )}
                </div>
              ))}
              {joined.length === 0 && <p className="room-note">Nobody has joined.</p>}
              <p className="room-quiet-links">
                <Link href={`/tournament/${row.id}`}>Open on a phone</Link>
                <Link href={`/events/${eventId}`}>Event</Link>
              </p>
            </div>
          </details>
        </div>
      )}
    </>
  );
}

function TableCard({
  board,
  match,
  posted,
  final = false,
}: {
  board: EventBoard;
  match: EventBoard['matches'][number];
  posted: boolean;
  final?: boolean;
}) {
  const players = matchPlayers(board, match.id);
  const bye = players.length === 1;
  const reported = players.some((player) => player.result);
  const open = Boolean(match.started_at) && !bye && players.some((player) => !player.result);
  const canReport = board.joined && !bye && (final || Boolean(match.started_at));
  const canRename = board.joined;
  const label = match.table_label || (final ? 'Final' : `Table ${match.table_number}`);
  const showGames = !bye && players.some((seat) => (seat.games_won || 0) > 0);

  return (
    <article className={`room-table${open ? ' is-open' : ''}${reported ? ' is-settled' : ''}${bye ? ' is-bye' : ''}`}>
      <div className="room-table-top">
        <h3>{label}</h3>
        <div className="room-table-flags">
          {final && <span className="room-rematch">Final</span>}
          {match.is_rematch && <span className="room-rematch">Rematch</span>}
          {open && <span className="status live">Open</span>}
          {!open && !reported && posted && <span className="room-wait">Not started</span>}
        </div>
      </div>
      {bye ? (
        <p className="room-bye"><span>{players[0]?.name || 'Player'}</span> has the bye</p>
      ) : (
        <PlayerLine board={board} players={players} teams={false} scale="board" />
      )}
      {reported && !bye && (
        <p className="room-score">
          {players.map((player) => `${player.name} ${player.result}${showGames ? ` (${player.games_won || 0})` : ''}`).join(' · ')}
        </p>
      )}
      {(canRename || canReport) && (
        <details className="disclosure room-fold">
          <summary>{canReport ? 'Report or correct result' : 'Table name'}</summary>
          <div>
            {canReport && (
              <MatchReporter
                matchId={match.id}
                showGamesWon
                players={players.filter((player) => player.profile_id).map((player) => ({ id: player.profile_id!, name: player.name }))}
              />
            )}
            {canRename && <TableName matchId={match.id} label={match.table_label || `Table ${match.table_number || 1}`} />}
          </div>
        </details>
      )}
    </article>
  );
}

function PlayerLine({
  board,
  players,
  teams,
  scale,
}: {
  board: EventBoard;
  players: ReturnType<typeof matchPlayers>;
  teams: boolean;
  scale: 'board' | 'side';
}) {
  if (players.length === 0) return <p className="room-bye">Open</p>;

  if (!teams && players.length === 2) {
    return (
      <p className={`room-matchup${scale === 'side' ? ' is-side' : ''}`}>
        <PlayerName board={board} player={players[0]} />
        <span className="room-vs">vs</span>
        <PlayerName board={board} player={players[1]} away />
      </p>
    );
  }

  return (
    <p className={scale === 'board' ? 'room-names' : 'room-names is-side'}>
      {players.map((player, index) => (
        <span key={player.id} className="room-name-chip">
          {index > 0 && <span className="room-vs">{teams ? '·' : 'vs'}</span>}
          <PlayerName board={board} player={player} />
        </span>
      ))}
    </p>
  );
}

function PlayerName({
  board,
  player,
  away = false,
}: {
  board: EventBoard;
  player: ReturnType<typeof matchPlayers>[number];
  away?: boolean;
}) {
  const swatch = getColorClass(board.members.find((member) => member.id === player.profile_id)?.color);
  return (
    <span className={`room-side${away ? ' is-away' : ''}`}>
      {swatch && <span className={`room-swatch ${swatch}`} />}
      {player.name}
    </span>
  );
}

function pickTournament(board: EventBoard, limited: EventBoard['tournaments'], requested?: string) {
  if (requested) {
    const chosen = limited.find((tournament) => tournament.id === requested);
    if (chosen) return chosen;
  }
  const live = limited.find((tournament) => {
    if (tournament.status === 'completed') return false;
    return currentRound(board, tournament.id).matches.some((match) => match.started_at && matchPlayers(board, match.id).some((seat) => !seat.result));
  });
  if (live) return live;
  return limited.find((tournament) => tournament.status !== 'completed' && tournament.field_locked)
    || limited.find((tournament) => tournament.status !== 'completed')
    || limited[0]
    || null;
}

function historyFor(board: EventBoard, tournamentId: string): HistoryMatch[] {
  const history: HistoryMatch[] = [];
  for (const match of board.matches.filter((item) => item.tournament_id === tournamentId && !item.is_final)) {
    const seats = matchPlayers(board, match.id).filter((seat) => seat.participant_id && seat.result);
    if (seats.length === 1) {
      history.push({ player1: seats[0].participant_id!, player2: null, result1: 'win', result2: null });
    } else if (seats.length >= 2 && seats[0].result && seats[1].result) {
      history.push({
        player1: seats[0].participant_id!,
        player2: seats[1].participant_id!,
        result1: seats[0].result,
        result2: seats[1].result,
      });
    }
  }
  return history;
}
