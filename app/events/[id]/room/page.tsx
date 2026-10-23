import { Button } from '@/components/ui/button';
import { AddPlayers } from '@/components/events/add-players';
import { addTournamentPlayer } from '@/app/weekend/actions';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { gamesWonFor, currentRound, loadEventBoard, matchPlayers, nameOf, standingsFor, type EventBoard } from '@/lib/event-board';
import { chartSeatCount, manualTieGroups, needsSeats, placeLabel, podForSeat, tournamentLabel, type HistoryMatch } from '@/lib/weekend';
import {
  addFinal,
  addSeat,
  clearPairings,
  dropPlayer,
  joinTournament,
  postPairings,
  startRound,
} from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
import { FinishForm } from '@/components/weekend/finish-form';
import { MatchReporter } from '@/components/weekend/match-reporter';
import { RoundClock } from '@/components/weekend/round-clock';
import { SeatRandomizer } from '@/components/weekend/seat-randomizer';
import { SeatChart } from '@/components/weekend/seat-chart';
import { RoundEditor, SealedSwap } from '@/components/weekend/tournament-tools';
import { GameStatus } from '@/components/events/arena-ui';
import { ManaIdentity } from '@/components/ui/mana-identity';
import { RoomDialog, MatchPages, RoomFocus, StandingsPages } from '@/components/events/arena-controls';

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
    <main className="page room-page arena-room">
      <header className="room-top">
        <div>
          <p className="eyebrow">House / Tournament room</p>
          <h1>{board.event.name}</h1>
          <p className="subtle mt-2">
            <Link href={`/events/${id}`}>← Play</Link>
            {' · '}
            <Link href={`/events/${id}/manage`}>Event tools</Link>
          </p>
        </div>
        <div className="room-top-actions"><RoomFocus /><Button asChild variant="outline"><Link href={`/events/${id}/tournaments/new`}>Create tournament</Link></Button></div>
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
                <span>{tournament.name}</span><small>{tournament.status === 'completed' ? 'Finished' : tournament.field_locked ? 'Playing' : 'Setup'}</small>
              </Link>
            );
          })}
        </nav>
      )}

      {!featured && (
        <section className="empty-state">
          <h3>No tournament yet.</h3>
          <p>Create a draft, cube, or sealed to run from this screen. Quick games stay on the event Play page.</p>
          <Link className="text-link text-sm" href={`/events/${id}/tournaments/new`}>Create tournament →</Link>
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
  const canRun = board.canManage && row.status !== 'completed';
  const showPost = canRun && !posted && (round.round === 0 || round.matches.every((match) => matchPlayers(board, match.id).every((seat) => seat.result))) && round.round < (row.max_rounds || 1);
  const showClock = started && row.status !== 'completed' && row.clock_round === round.round && row.clock_remaining_seconds != null;
  const showRoundActions = posted && canRun;
  const finalPlayers = finalMatch ? matchPlayers(board, finalMatch.id) : [];
  const finalWaiting = Boolean(finalMatch && finalPlayers.some((seat) => !seat.result));
  const allReported = round.matches.length > 0 && round.matches.every(match => matchPlayers(board, match.id).length > 0 && matchPlayers(board, match.id).every(seat => seat.result));
  const readyToFinish = round.round >= (row.max_rounds || 1) && allReported && !finalWaiting;
  const unseated = joined.filter(person => !person.draft_seat);
  const completedTables = round.matches.filter(match => matchPlayers(board, match.id).length > 0 && matchPlayers(board, match.id).every(seat => seat.result)).length;
  const startedLabel = startedAt
    ? new Date(startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
    : null;

  const postButton = showPost ? (
    <ActButton label={round.round ? 'Post next round' : 'Post pairings'} action={postPairings.bind(null, row.id)} />
  ) : null;

  return (
    <>
      <section className={`room-stage${round.round ? ' has-round' : ' is-setup'}`}>
          <header className="room-mast">
            <div className="room-mast-copy">
              <div className="room-round-heading">
              <p className="eyebrow">{tournamentLabel(row.format)}</p>
              <h2 className={round.round ? 'room-round' : 'room-setup-title'}>
                {round.round ? <>Round {round.round}<span className="room-of"> of {row.max_rounds}</span></> : row.name}
              </h2>
              </div>
              <div className="room-round-details">
              <p className="room-status-line">
                <Link href={`/tournament/${row.id}`}>{row.name}</Link>
                {' · '}{joined.length} {joined.length === 1 ? 'player' : 'players'}
                {row.status === 'completed' ? ' · finished' : started ? ' · live' : posted ? ' · posted, not started' : ' · setup'}
                {startedLabel ? ` · started ${startedLabel}` : ''}
              </p>
              {prizeText && <p className="room-prizes">{prizeText}</p>}
              </div>
              {round.round > 0 && <div className="room-result-progress"><div className="arena-meter" role="progressbar" aria-label="Round results" aria-valuemin={0} aria-valuemax={Math.max(1, round.matches.length)} aria-valuenow={completedTables}><span style={{ width: `${completedTables / Math.max(1, round.matches.length) * 100}%` }} /></div><p className="room-note">{completedTables} / {round.matches.length} results in{openNames.length > 0 ? ` · Waiting on ${openNames.join(', ')}` : ''}</p></div>}
              {posted && <p className="room-note">Pairings are posted. The round has not started.</p>}
              {board.joined && canRun && !mine && !row.field_locked && (
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
                  canControl={board.canManage}
                />
              </div>
            )}
            {showRoundActions && (
              <div className="room-mast-actions">
                <ActButton label={`Start round ${round.round}`} action={startRound.bind(null, row.id)} />
                <ActButton label="Clear pairings" variant="outline" action={clearPairings.bind(null, row.id)} />
              </div>
            )}
          </header>
        <div className="room-main">
          {round.round === 0 && <div className="room-readiness"><span><strong>{joined.length}</strong> players</span>{needsSeats(row.format) && <span><strong>{unseated.length}</strong> unseated</span>}<span><strong>{row.max_rounds}</strong> rounds · {row.round_duration_minutes || 50} min</span><span>{row.pod_count === 2 ? 'Two pods · one leaderboard' : 'One field'}</span></div>}
          {canRun && !row.field_locked && <AddPlayers kind="tournament" players={board.members.filter(member => !joined.some(player => player.profile_id === member.id)).map(member => ({ id: member.id, name: member.name }))} action={addTournamentPlayer.bind(null, row.id)} />}
          {seating && (
            <div className="room-seat-board">
              <div className="room-seat-head">
                <p className="eyebrow">Seats</p>
                {board.canManage && (
                  <div className="room-toolbar" aria-label="Seat tools">
                    {postButton}
                    <ActButton label="Add seat" variant="outline" action={addSeat.bind(null, row.id)} />
                    <SeatRandomizer tournamentId={row.id} />
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
                          canControl={board.canManage}
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
            <MatchPages key={`${row.id}-${round.round}`}>
              {finalWaiting && finalMatch && <TableCard board={board} match={finalMatch} posted={false} final />}
              {[...round.matches].sort((a, b) => Number(Boolean(a.completed_at)) - Number(Boolean(b.completed_at)) || (a.table_number || 0) - (b.table_number || 0)).map((match) => <TableCard key={match.id} board={board} match={match} posted={posted} />)}
              {finalMatch && !finalWaiting && <TableCard board={board} match={finalMatch} posted={false} final />}
            </MatchPages>
          )}

          {!seating && round.matches.length === 0 && !finalMatch && (
            <p className="room-note">No pairings posted.</p>
          )}

          {posted && round.round === 1 && !needsSeats(row.format) && canRun && <SealedSwap tournamentId={row.id} players={joined.map(person => ({ id: person.id, name: nameOf(board, person.profile_id) }))} />}
          {canRun && row.field_locked && readyToFinish && (
            <section className="room-finish" aria-label="Finish tournament">
              <h3>Finish tournament</h3>
              <p className="subtle mb-4">All results are in. Lock places from the standings below.</p>
              <FinishForm
                tournamentId={row.id}
                ranked={standings.map((player) => ({ id: player.id, name: player.name }))}
                tieGroups={ties}
                prizes={[row.prize_1st, row.prize_2nd, row.prize_3rd]}
                finalResult={finalPlayers.map((player) => ({ id: player.participant_id || '', result: player.result }))}
              />
              {!finalMatch && (
                <div className="mt-4">
                  <ActButton label="Add top-two final instead" variant="outline" action={addFinal.bind(null, row.id)} />
                </div>
              )}
            </section>
          )}
          {canRun && !row.field_locked && <details className="disclosure"><summary>Tournament settings</summary><div><RoundEditor tournamentId={row.id} rounds={row.max_rounds || 3} locked={false} pods={row.pod_count || 1} note={row.product_note || ''} bringing={Boolean(row.brought_by)} showPods={needsSeats(row.format) && round.matches.length === 0} prize1st={row.prize_1st || ''} prize2nd={row.prize_2nd || ''} prize3rd={row.prize_3rd || ''} duration={row.round_duration_minutes || 50} /></div></details>}
          {recent.length > 0 && (
            <details className="room-recent"><summary>Previous round results</summary>
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
            </details>
          )}
        </div>

        <aside className="room-rail">
          <div className="room-standings">
            <h3>Standings</h3>
            <p>{row.status === 'completed' ? 'Final places' : 'Live standings'}</p>
            <StandingsPages key={row.id} headings={<thead>
                  <tr>
                    <th scope="col" aria-label={row.status === 'completed' ? 'Place' : 'Position'}>#</th>
                    <th scope="col">Player</th>
                    <th scope="col">Pts</th>
                    <th scope="col" aria-label="Match record: wins, losses, draws">W–L–D</th>
                    <th scope="col" className="minor">Game wins</th>
                    <th scope="col" className="minor" aria-label="Opponent match-win percentage">Opp. win %</th>
                  </tr>
                </thead>}>
                  {standings.map((player, index) => {
                    return (
                      <tr key={player.id} className={player.dropped ? 'is-dropped' : undefined}>
                        <td className="place">{player.place ? placeLabel(player.place) : index + 1}</td>
                        <td>
                          <span className="room-who">
                            <ManaIdentity color={board.members.find(member => member.id === player.profileId)?.color} size={14} />{player.name}{player.dropped ? ' · dropped' : ''}
                          </span>
                        </td>
                        <td className="pts">{player.points}</td>
                        <td className="rec">{player.wins}–{player.losses}–{player.draws}</td>
                        <td className="minor">{gamesWonFor(board, tournamentId, player.id)}</td>
                        <td className="minor">{Math.round(player.omw * 1000) / 10}%</td>
                      </tr>
                    );
                  })}
            </StandingsPages>
            {standings.length === 0 && <p>Nobody has joined.</p>}
          </div>

          {row.status === 'completed' && (
            <RoomDialog title="Final places & prizes" label="Final places & prizes"><div className="room-places">
              <p className="eyebrow">Tournament winner</p><h3>{standings.find(player => player.place === 1)?.name || 'Final places'}</h3>
              {standings.filter((player) => player.place).map((player) => {
                const prize = player.place === 1 ? row.prize_1st : player.place === 2 ? row.prize_2nd : player.place === 3 ? row.prize_3rd : null;
                return (
                  <p key={player.id}>
                    <span>{placeLabel(player.place || 0)}</span> {player.name}
                    {prize ? ` · ${prize}` : ''}
                  </p>
                );
              })}
            </div></RoomDialog>
          )}
        </aside>
      </section>

      {(board.canManage) && (
        <RoomDialog title="Tournament tools" label="Tournament tools"><div className="room-quiet">

          {canRun && row.field_locked && !readyToFinish && !finalWaiting && (
            <details className="disclosure">
              <summary>End tournament early</summary>
              <div className="room-quiet-body">
                {!finalMatch && <ActButton label="Add top-two final" variant="outline" action={addFinal.bind(null, row.id)} />}
                <FinishForm
                  tournamentId={row.id}
                  ranked={standings.map((player) => ({ id: player.id, name: player.name }))}
                  tieGroups={ties}
                  prizes={[row.prize_1st, row.prize_2nd, row.prize_3rd]}
                  finalResult={finalPlayers.map(player => ({ id: player.participant_id || '', result: player.result }))}
                  early
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
                <Link href={`/tournament/${row.id}`}>Tournament page</Link>
                <Link href={`/events/${eventId}`}>Event</Link>
              </p>
            </div>
          </details>
        </div></RoomDialog>
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
  const reported = players.length > 0 && players.every((player) => player.result);
  const open = Boolean(match.started_at) && !bye && players.some((player) => !player.result);
  const canReport = board.canManage && players.length >= 2 && (final || Boolean(match.started_at));
  const label = match.table_label || (final ? 'Final' : `Table ${match.table_number}`);
  const showGames = !bye && players.some((seat) => (seat.games_won || 0) > 0);

  return (
    <article className={`room-table${open ? ' is-open' : ''}${reported ? ' is-settled' : ''}${bye ? ' is-bye' : ''}`}>
      <div className="room-table-top">
        <h3>{label}</h3>
        <div className="room-table-flags">
          {final && <span className="room-rematch">Final</span>}
          {match.is_rematch && <span className="room-rematch">Rematch</span>}
          {open && <GameStatus state="live">Playing</GameStatus>}
          {reported && <GameStatus state="complete">Final</GameStatus>}
          {!open && !reported && posted && <GameStatus state="setup">Not started</GameStatus>}
        </div>
      </div>
      {bye ? (
        <p className="room-bye"><span>{players[0]?.name || 'Player'}</span> has the bye</p>
      ) : (
        <PlayerLine players={players} teams={false} scale="board" colors={Object.fromEntries(board.members.map(member => [member.id, member.color]))} />
      )}
      {reported && !bye && (
        <p className="room-score">
          {players.every(p => p.result === 'draw') ? 'Draw' : `${players.filter(p => p.result === 'win').map(p => p.name).join(' & ')} won`}{showGames ? ` · ${players.map(p => p.games_won || 0).join('–')}` : ''}
        </p>
      )}
      {canReport && (
        <RoomDialog title={`${label} · ${players.map(p => p.name).join(' vs ')}`} label={reported ? 'Correct result' : 'Report result'} kind={reported ? 'correct' : 'report'}>
          <MatchReporter
            matchId={match.id}
            showGamesWon
            tournament
            players={players.filter((player) => player.profile_id).map((player) => ({ id: player.profile_id!, name: player.name, result: player.result, gamesWon: player.games_won }))}
          />
        </RoomDialog>
      )}
    </article>
  );
}

function PlayerLine({
  players,
  teams,
  scale,
  colors,
}: {
  players: ReturnType<typeof matchPlayers>;
  teams: boolean;
  scale: 'board' | 'side';
  colors: Record<string, string | null>;
}) {
  if (players.length === 0) return <p className="room-bye">Open</p>;

  if (!teams && players.length === 2) {
    return (
      <p className={`room-matchup${scale === 'side' ? ' is-side' : ''}`}>
        <PlayerName player={players[0]} color={colors[players[0].profile_id || '']} />
        <span className="room-vs">VS</span>
        <PlayerName player={players[1]} color={colors[players[1].profile_id || '']} away />
      </p>
    );
  }

  return (
    <p className={scale === 'board' ? 'room-names' : 'room-names is-side'}>
      {players.map((player, index) => (
        <span key={player.id} className="room-name-chip">
          {index > 0 && <span className="room-vs">{teams ? '·' : 'vs'}</span>}
          <PlayerName player={player} color={colors[player.profile_id || '']} />
        </span>
      ))}
    </p>
  );
}

function PlayerName({
  player,
  away = false,
  color,
}: {
  player: ReturnType<typeof matchPlayers>[number];
  away?: boolean;
  color?: string | null;
}) {
  return (
    <span className={`room-side${away ? ' is-away' : ''}`}>
      <ManaIdentity color={color} size={14} />{player.name}
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

