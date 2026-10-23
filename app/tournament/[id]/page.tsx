import { EventNav } from '@/components/events/event-nav';
import { AddPlayers } from '@/components/events/add-players';
import { addTournamentPlayer } from '@/app/weekend/actions';
import { LiveSlip } from '@/components/weekend/live-slip';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { gamesWonFor, loadEventBoard, matchPlayers, nameOf, standingsFor, currentRound } from '@/lib/event-board';
import { chartSeatCount, manualTieGroups, needsSeats, placeLabel, podForSeat, suggestedRounds, tournamentLabel, type HistoryMatch } from '@/lib/weekend';
import {
  addFinal,
  addSeat,
  claimSeat,
  clearPairings,
  deleteTournament,
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
import { MovePlayer, RoundEditor, SealedSwap } from '@/components/weekend/tournament-tools';
import { FeaturePanel } from '@/components/layout/page-intro';
import { GameStatus } from '@/components/events/arena-ui';

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, event_id, format')
    .eq('id', id)
    .maybeSingle();
  if (!tournament?.event_id) notFound();
  if (!needsSeats(tournament.format) && tournament.format !== 'sealed') {
    redirect(`/events/${tournament.event_id}/play`);
  }

  const board = await loadEventBoard(tournament.event_id);
  if (!board) notFound();
  const row = board.tournaments.find((item) => item.id === id);
  if (!row) notFound();

  const roster = board.roster.filter((person) => person.tournament_id === id);
  const joined = roster.filter((person) => person.profile_id && !person.dropped);
  const mine = joined.find((person) => person.profile_id === board.userId);
  const round = currentRound(board, id);
  const posted = round.matches.length > 0 && round.matches.every((match) => !match.started_at);
  const started = round.matches.some((match) => match.started_at);
  const startedAt = round.matches.find((match) => match.started_at)?.started_at;
  const standings = standingsFor(board, id);
  const history: HistoryMatch[] = [];
  for (const match of board.matches.filter((item) => item.tournament_id === id && !item.is_final)) {
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
  const ties = row.status === 'completed' ? [] : manualTieGroups(standings, history);
  const finalMatch = board.matches.find((match) => match.tournament_id === id && match.is_final);
  const seatNumbers = roster.map((person) => person.draft_seat || 0);
  const seatCount = chartSeatCount(seatNumbers, joined.length);
  const seats = Array.from({ length: seatCount }, (_, index) => index + 1);
  const bringer = row.brought_by ? nameOf(board, row.brought_by) : null;
  const openNames = round.matches
    .filter((match) => match.started_at && matchPlayers(board, match.id).some((seat) => !seat.result))
    .map((match) => {
      const players = matchPlayers(board, match.id);
      if (players.length === 1) return `${players[0]?.name || 'Player'} bye`;
      return players.map((player) => player.name).join(' vs ');
    });
  const showClock = started && row.status !== 'completed' && row.clock_round === round.round && row.clock_remaining_seconds != null;
  const settings = row.status !== 'completed' && board.canManage ? (
    <details className="disclosure tournament-settings"><summary>Tournament settings</summary><div>
      <RoundEditor
        tournamentId={id}
        rounds={row.max_rounds || 3}
        locked={Boolean(row.field_locked)}
        pods={row.pod_count || 1}
        note={row.product_note || ''}
        bringing={Boolean(row.brought_by)}
        showPods={needsSeats(row.format) && round.matches.length === 0 && board.matches.every((match) => match.tournament_id !== id || match.is_final)}
        prize1st={row.prize_1st || ''}
        prize2nd={row.prize_2nd || ''}
        prize3rd={row.prize_3rd || ''}
        duration={row.round_duration_minutes || 50}
      />
    </div></details>
  ) : null;

  return (
    <><EventNav id={tournament.event_id} name={board.event.name} house={board.house} /><main className="page tournament-player-page arena-tournament-detail">

      <header className="tournament-live-head">
        <div className="tournament-live-copy">
          <Link href={`/events/${tournament.event_id}`} className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Event</Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">{tournamentLabel(row.format)}{round.round ? ` · Round ${round.round}` : ''}</p>
          <h1 className="font-heading text-4xl">{row.name}</h1>
          <GameStatus state={row.status === 'completed' ? 'complete' : started ? 'live' : 'setup'}>{row.status === 'completed' ? 'Completed' : started ? `Round ${round.round} in progress` : posted ? 'Pairings posted' : 'Joining & seating'}</GameStatus>
          <p className="text-sm text-muted-foreground">
            {joined.length} players · {row.max_rounds} rounds
            {joined.length >= 6 ? ` · suggestion is ${suggestedRounds(joined.length)}` : ''}
            {row.pod_count === 2 ? ' · two pods' : ''}
            {startedAt ? ` · started ${new Date(startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })}` : ''}
          </p>
          {(bringer || row.product_note) && (
            <p className="text-sm text-muted-foreground">{bringer ? `${bringer} is bringing them.` : ''} {row.product_note}</p>
          )}
          {(row.prize_1st || row.prize_2nd || row.prize_3rd) && (
            <p className="text-sm text-muted-foreground">
              {[row.prize_1st && `1st ${row.prize_1st}`, row.prize_2nd && `2nd ${row.prize_2nd}`, row.prize_3rd && `3rd ${row.prize_3rd}`].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        {showClock && (
          <RoundClock
            tournamentId={id}
            durationMinutes={row.round_duration_minutes || 50}
            anchor={row.clock_anchor}
            pausedAt={row.clock_paused_at}
            remainingSeconds={row.clock_remaining_seconds}
            canControl={board.canManage}
          />
        )}
        {posted && board.canManage && row.status !== 'completed' && (
          <div className="round-start-panel">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">Round {round.round}</p>
            <p className="text-sm text-muted-foreground">Pairings are posted. Start when tables are ready.</p>
            <div className="flex flex-wrap gap-2">
              <ActButton label="Start round" action={startRound.bind(null, id)} />
              <ActButton label="Clear pairings" variant="outline" action={clearPairings.bind(null, id)} />
            </div>
          </div>
        )}
      </header>
      <FeaturePanel icon="room" eyebrow="THE TOURNAMENT ROOM" title="The whole draft. One screen." description="Open the house view for current pairings, the round clock, and live standings." href={`/events/${board.event.id}/room?tournament=${id}`} action="Open tournament room" />

      {round.matches.filter(match => matchPlayers(board, match.id).some(p => p.profile_id === board.userId && !p.result)).map(match => <LiveSlip record={(() => { const me = standings.find(p => p.profileId === board.userId); return me ? `${me.points} points · ${me.wins}–${me.losses}–${me.draws} match record` : undefined; })()} actionLabel={match.started_at ? "Report result" : "View match"} key={match.id} href={`/tournament/${id}/match/${match.id}`} kicker={match.table_label || `Table ${match.table_number}`} title={matchPlayers(board,match.id).filter(p=>p.profile_id !== board.userId).map(p=>p.name).join(' vs ') || 'You have the bye'} detail={`Round ${round.round} · ${match.started_at ? 'In progress' : 'Pairings posted'}`} />)}

      {board.joined && !mine && !row.field_locked && row.status !== 'completed' && (
        <ActButton label="Join tournament" action={joinTournament.bind(null, id)} />
      )}
      {board.userId && row.field_locked && !mine && <p className="text-sm text-muted-foreground">The field locked when round 1 started.</p>}

      {!posted && !started && settings}

      {board.canManage && !row.field_locked && row.status !== 'completed' && (
        <AddPlayers kind="tournament" players={board.members.filter(member => !joined.some(player => player.profile_id === member.id)).map(member => ({ id:member.id, name:member.name }))} action={addTournamentPlayer.bind(null,id)} />
      )}

      {needsSeats(row.format) && round.round === 0 && row.status !== 'completed' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-2xl">Seats{row.pod_count === 2 ? ' · two pods' : ''}</h2>
            <div className="flex flex-wrap gap-2">
              <ActButton label="Add seat" variant="outline" action={addSeat.bind(null, id)} />
                    <SeatRandomizer tournamentId={id} />
            </div>
          </div>
          {row.pod_count === 2 && <p className="text-sm text-muted-foreground">Round 1 stays inside each pod. Later rounds can cross.</p>}
          <div className={`grid gap-4 ${row.pod_count === 2 ? 'sm:grid-cols-2' : ''}`}>
            {[1, ...(row.pod_count === 2 ? [2] : [])].map((pod) => {
              const podSeats = seats.filter((number) => {
                const holder = roster.find((person) => person.draft_seat === number);
                if (row.pod_count !== 2) return true;
                return (holder?.pod || podForSeat(2, number, seatCount)) === pod;
              });
              return (
                <div key={pod} className="space-y-2">
                  {row.pod_count === 2 && <h3 className="font-heading text-lg">Pod {pod}</h3>}
                  <SeatChart
                      canControl={board.canManage}
                    tournamentId={id}
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
                    people={joined.map((person) => ({
                      participantId: person.id,
                      name: nameOf(board, person.profile_id),
                    }))}
                  />
                  {board.joined && podSeats.some((number) => !roster.find((person) => person.draft_seat === number)?.profile_id) && (
                    <div className="flex flex-wrap gap-2">
                      {podSeats.filter((number) => !roster.find((person) => person.draft_seat === number)?.profile_id).map((number) => (
                        <ActButton key={number} label={`Claim ${number}`} variant="outline" action={claimSeat.bind(null, id, number)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {joined.some((person) => !person.draft_seat) && (
            <div className="space-y-2">
              <h3 className="font-heading text-lg">Joined, no seat</h3>
              {joined.filter((person) => !person.draft_seat).map((person) => (
                <div key={person.id} className="flex items-center justify-between">
                  <span>{nameOf(board, person.profile_id)}</span>
                  <MovePlayer tournamentId={id} participantId={person.id} seat={null} seatCount={seatCount} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="round-board space-y-3">
        {!showClock && !posted && (
          <h2 className="font-heading text-2xl">{round.round ? `Round ${round.round}` : 'Pairings'}</h2>
        )}
        {openNames.length > 0 && <p className="text-sm text-muted-foreground">Still open: {openNames.join(' · ')}</p>}
        <div className="round-match-grid">
        {[...round.matches].sort((a,b) => Number(matchPlayers(board,b.id).some(p=>p.profile_id===board.userId)) - Number(matchPlayers(board,a.id).some(p=>p.profile_id===board.userId))).map((match) => {
          const players = matchPlayers(board, match.id);
          const bye = players.length === 1;
          const matchup = bye ? `${players[0]?.name || 'Player'} has the bye` : players.map((player) => player.name).join(' vs ');
          return (
            <article id={`match-${match.id}`} key={match.id} className="match-card space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-heading text-xl">{matchup}</h3>
                {match.is_rematch && <span className="text-xs uppercase tracking-widest text-primary">Rematch</span>}
              </div>
              {players.some((player) => player.result) && (
                <p className="text-sm text-muted-foreground">
                  {players.map((player) => {
                    const showGames = !bye && players.some((seat) => (seat.games_won || 0) > 0);
                    return `${player.name} ${player.result}${showGames ? ` (${player.games_won || 0})` : ''}`;
                  }).join(' · ')}
                </p>
              )}
              {board.canManage && match.started_at && !bye && (
                players.every((player) => player.result) ? (
                  <details className="disclosure">
                    <summary>Correct result</summary>
                    <div>
                      <MatchReporter
                        matchId={match.id}
                        showGamesWon
                        tournament
                        players={players.filter((player) => player.profile_id).map((player) => ({ id: player.profile_id!, name: player.name, result: player.result, gamesWon: player.games_won }))}
                      />
                    </div>
                  </details>
                ) : (
                  <MatchReporter
                    matchId={match.id}
                    showGamesWon
                    tournament
                    players={players.filter((player) => player.profile_id).map((player) => ({ id: player.profile_id!, name: player.name, result: player.result, gamesWon: player.games_won }))}
                  />
                )
              )}
            </article>
          );
        })}
        </div>
        {board.canManage && row.status !== 'completed' && !posted && (round.round === 0 || round.matches.every((match) => matchPlayers(board, match.id).every((seat) => seat.result))) && round.round < (row.max_rounds || 1) && (
          <div className="flex flex-wrap gap-2">
            <ActButton label={round.round ? 'Post next round' : 'Post pairings'} action={postPairings.bind(null, id)} />
          </div>
        )}
        {posted && round.round === 1 && !needsSeats(row.format) && board.canManage && (
          <SealedSwap
            tournamentId={id}
            players={joined.map((person) => ({ id: person.id, name: nameOf(board, person.profile_id) }))}
          />
        )}
      </section>

      {finalMatch && (
        <section className="space-y-3 rounded-xl border border-primary/30 p-4">
          <h2 className="font-heading text-2xl">Final</h2>
          <p>{matchPlayers(board, finalMatch.id).map((player) => player.name).join(' vs ')}</p>
          <p className="text-sm text-muted-foreground">{matchPlayers(board, finalMatch.id).every(player => player.result) ? matchPlayers(board, finalMatch.id).map(player => `${player.name}: ${player.result}`).join(' · ') : 'Awaiting final result'}</p>
          {board.canManage && (
            matchPlayers(board, finalMatch.id).every((player) => player.result) ? (
              <details className="disclosure">
                <summary>Correct result</summary>
                <div>
                  <MatchReporter
                    matchId={finalMatch.id}
                    showGamesWon
                    tournament
                    players={matchPlayers(board, finalMatch.id).filter((player) => player.profile_id).map((player) => ({ id: player.profile_id!, name: player.name, result: player.result, gamesWon: player.games_won }))}
                  />
                </div>
              </details>
            ) : (
              <MatchReporter
                matchId={finalMatch.id}
                showGamesWon
                tournament
                players={matchPlayers(board, finalMatch.id).filter((player) => player.profile_id).map((player) => ({ id: player.profile_id!, name: player.name, result: player.result, gamesWon: player.games_won }))}
              />
            )
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-heading text-2xl">Match points</h2>
        <p className="text-xs text-muted-foreground">Higher opponent percentage means tougher opponents. Game scores are not used.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2">{row.status === 'completed' ? 'Place' : 'Position'}</th>
                <th>Player</th>
                <th>Points</th>
                <th>Record</th>
                <th>Games</th>
                <th>Opponents</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((player, index) => (
                <tr key={player.id} className="border-t border-border">
                  <td className="py-2 font-heading">{player.place ? placeLabel(player.place) : index + 1}</td>
                  <td>{player.name}{player.dropped ? ' · dropped' : ''}</td>
                  <td>{player.points}</td>
                  <td>{player.wins}–{player.losses}–{player.draws}</td>
                  <td>{gamesWonFor(board, id, player.id)}</td>
                  <td>{Math.round(player.omw * 1000) / 10}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {board.canManage && row.status !== 'completed' && row.field_locked && (
        <details className="disclosure">
          <summary>{round.round < (row.max_rounds || 1) ? 'End tournament early' : 'Review final places'}</summary>
          <div className="space-y-4">
            {!finalMatch && <ActButton label="Add top-two final" variant="outline" action={addFinal.bind(null, id)} />}
            <FinishForm
              tournamentId={id}
              ranked={standings.map((player) => ({ id: player.id, name: player.name }))}
              tieGroups={ties}
              prizes={[row.prize_1st, row.prize_2nd, row.prize_3rd]}
              finalResult={finalMatch ? matchPlayers(board, finalMatch.id).map(player => ({ id: player.participant_id || '', result: player.result })) : []}
              early={round.round < (row.max_rounds || 1)}
            />
          </div>
        </details>
      )}

      {row.status === 'completed' && (
        <section className="space-y-2">
          <h2 className="font-heading text-2xl">Places</h2>
          {standings.filter((player) => player.place).map((player) => {
            const prize = player.place === 1 ? row.prize_1st : player.place === 2 ? row.prize_2nd : player.place === 3 ? row.prize_3rd : null;
            return (
              <p key={player.id}>
                <span className="font-heading text-primary">{placeLabel(player.place || 0)}</span> {player.name}
                {prize ? ` · ${prize}` : ''}
              </p>
            );
          })}
          <p className="text-sm text-muted-foreground">Replacing a result clears the places. The prize text stays. Finish again after that.</p>
        </section>
      )}

      {board.canManage && round.round === 0 && row.status !== 'completed' && (
        <ActButton label="Delete tournament" variant="ghost" action={deleteTournament.bind(null, id)} />
      )}

      {(posted || started) && settings}
    </main></>
  );
}
