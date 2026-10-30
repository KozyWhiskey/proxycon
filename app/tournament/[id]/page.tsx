import { Suspense } from 'react';
import { withLiveSnapshot } from '@/lib/live-page';
import {PersonalGames} from '@/components/weekend/personal-games';
import {TournamentPlaces} from '@/components/weekend/tournament-places';
import {OrientationLabel} from '@/components/weekend/orientation-label';
import {RoomDialog} from '@/components/events/arena-controls';
import {resultText,tableName} from '@/lib/weekend-view';
import {suggestedRounds} from '@/lib/weekend';
import { EventNav } from '@/components/events/event-nav';
import { AddPlayers } from '@/components/events/add-players';
import { addTournamentPlayer } from '@/app/weekend/actions';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { gamesWonFor, loadTournamentBoard, matchPlayers, nameOf, standingsFor, currentRound } from '@/lib/event-board';
import { chartSeatCount, manualTieGroups, needsSeats, podForSeat, tournamentLabel, tournamentRoundPhase, type HistoryMatch } from '@/lib/weekend';
import {
  addSeat,
  clearPairings,
  deleteTournament,
  joinTournament,
  postPairings,
  startRound,
  setTournamentSetup,
} from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
import { FinishForm } from '@/components/weekend/finish-form';
import { MatchReporter } from '@/components/weekend/match-reporter';
import { RoundClock } from '@/components/weekend/round-clock';
import { SeatRandomizer } from '@/components/weekend/seat-randomizer';
import { SeatChart } from '@/components/weekend/seat-chart';
import { MovePlayer, RoundEditor, SealedSwap } from '@/components/weekend/tournament-tools';
import { GameStatus } from '@/components/events/arena-ui';
import { deckMemoriesEnabled } from '@/lib/deck-memory-config';
import { LimitedMemoryList } from '@/components/decks/limited-memory-list';

async function TournamentPage({ params,searchParams }: { params: Promise<{ id: string }>;searchParams:Promise<{round?:string}> }) {
  const query=await searchParams;
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

  const board = await loadTournamentBoard(tournament.event_id,id);
  if (!board) notFound();
  const row = board.tournaments.find((item) => item.id === id);
  if (!row) notFound();

  const roster = board.roster.filter((person) => person.tournament_id === id);
  const joined = roster.filter((person) => person.profile_id && !person.dropped);
  const mine = joined.find((person) => person.profile_id === board.userId);
  const round = currentRound(board, id);
  const selectedRound=Number(query.round)||round.round;
  const viewingHistory = Boolean(query.round && (query.round === 'final' || selectedRound !== round.round));
  const displayMatches=query.round==='final'?[]:board.matches.filter(m=>m.tournament_id===id&&!m.is_final&&m.round_number===selectedRound);
  const posted = round.matches.length > 0 && round.matches.every((match) => !match.started_at);
  const started = round.matches.some((match) => match.started_at);
  const startedAt = round.matches.find((match) => match.started_at)?.started_at;
  const standings = standingsFor(board, id);
  const swissStandings=standingsFor(board,id,false);
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
  const finalPlayers = finalMatch ? matchPlayers(board, finalMatch.id) : [];
  const finalWaiting = Boolean(finalMatch && finalPlayers.some((seat) => !seat.result));
  const allReported = round.matches.length > 0 && round.matches.every((match) => {
    const seats = matchPlayers(board, match.id);
    return seats.length > 0 && seats.every((seat) => seat.result);
  });
  const readyToFinish = row.field_locked && round.round >= (row.max_rounds || 1) && allReported && !finalWaiting;
  const showClock = started && row.status !== 'completed' && row.clock_round === round.round && row.clock_remaining_seconds != null && !allReported && !finalMatch && !viewingHistory;
  const phase = tournamentRoundPhase({
    tournamentStatus: row.status,
    readyToFinish,
    started,
    posted,
    round: round.round,
    pausedAt: row.clock_paused_at,
    remainingSeconds: row.clock_remaining_seconds,
    clockRound: row.clock_round,
    clockAnchor: row.clock_anchor,
    durationMinutes: row.round_duration_minutes || 50,
  });
  const statusLabel = finalWaiting ? 'Final in progress' : phase.label;
  const statusState = phase.status;
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

  const roundsSection=(<>      {round.round>0&&<nav className="action-row" aria-label="Round history">{[...new Set(board.matches.filter(m=>m.tournament_id===id&&!m.is_final).map(m=>m.round_number))].sort((a,b)=>(a||0)-(b||0)).map(r=><Link aria-current={selectedRound===r?'page':undefined} key={r} href={'/tournament/'+id+'?round='+r}>Round {r}</Link>)}{finalMatch&&<Link aria-current={query.round==='final'?'page':undefined} href={'/tournament/'+id+'?round=final#final'}>Final</Link>}<Link href={'/events/'+board.event.id+'/history?tournament='+id}>Game history</Link></nav>}
      {query.round!=='final'&&<section className="round-board space-y-3">
        <h2 className="font-heading text-2xl">{query.round==='final'?'Final':selectedRound ? `Round ${selectedRound}${row.status==='completed'?' · Results':viewingHistory ? ' · Previous results' : ' · Current round'}` : 'Pairings'}</h2>
        {viewingHistory && <Link className="text-link" href={'/tournament/'+id}>Return to live tournament →</Link>}
        {!viewingHistory && openNames.length > 0 && <p className="text-sm text-muted-foreground">Still open: {openNames.join(' · ')}</p>}
        <div className="round-match-grid">
        {[...displayMatches].sort((a,b)=>(a.table_number||999)-(b.table_number||999)).map((match) => {
          const players = matchPlayers(board, match.id);
          const bye = players.length === 1;
          const reported = players.length > 0 && players.every((seat) => seat.result);
          const playing = Boolean(match.started_at) && !bye && !reported;
          const matchup = bye ? `${players[0]?.name || 'Player'} has the bye` : players.map((player) => player.name).join(' vs ');
          const table = tableName(match);
          return (
            <article id={`match-${match.id}`} key={match.id} className="match-card space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{table}</p>
                  <h3 className="font-heading text-xl">{matchup}</h3>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {match.is_rematch && <span className="text-xs uppercase tracking-widest text-link">Rematch</span>}
                  {bye && <GameStatus state={reported ? 'complete' : 'setup'}>Bye</GameStatus>}
                  {!bye && playing && <GameStatus state="live">Playing</GameStatus>}
                  {!bye && reported && <GameStatus state="complete">Result recorded</GameStatus>}
                  {!bye && !playing && !reported && posted && <GameStatus state="setup">Not started</GameStatus>}
                </div>
              </div>
              {reported&&<p className="subtle">{resultText(players)}</p>}
              {board.canManage&&match.started_at&&!bye&&<RoomDialog title={tableName(match)+' · '+matchup} label={reported?'Correct result':'Report result'} kind={reported?'correct':'report'}><MatchReporter matchId={match.id} tournament showGamesWon consequence={row.status==='completed'?'Standings update immediately. Places clear; review and Finish again.':board.matches.some(m=>m.tournament_id===id&&(m.round_number||0)>(match.round_number||0)&&m.started_at)?'Standings update immediately. Started later-round pairings stay fixed.':'Standings update immediately. Unstarted next-round pairings may change.'} players={players.filter(p=>p.profile_id).map(p=>({id:p.profile_id!,name:p.name,result:p.result,gamesWon:p.games_won}))}/></RoomDialog>}

            </article>
          );
        })}
        </div>
        {board.canManage && row.status !== 'completed' && !posted && (round.round === 0 || round.matches.every((match) => matchPlayers(board, match.id).every((seat) => seat.result))) && round.round < (row.max_rounds || 1) && (
          <div className="flex flex-wrap gap-2">
            <ActButton disabled={joined.length<2||(round.round===0&&needsSeats(row.format)&&joined.some(p=>!p.draft_seat))} label={round.round ? 'Post next round' : 'Post pairings'} action={postPairings.bind(null, id)} />
          </div>
        )}
        {posted && round.round === 1 && !needsSeats(row.format) && board.canManage && (
          <SealedSwap
            tournamentId={id}
            players={joined.map((person) => ({ id: person.id, name: nameOf(board, person.profile_id) }))}
          />
        )}
      </section>}

</>);
  const finalSection=(<>      {finalMatch && (
        <section id="final" className="space-y-3 rounded-xl border border-primary/30 p-4">
          <h2 className="font-heading text-2xl">Final</h2>
          <p>{matchPlayers(board, finalMatch.id).map((player) => player.name).join(' vs ')}</p>
          <p className="text-sm text-muted-foreground">{matchPlayers(board, finalMatch.id).every(player => player.result) ? resultText(matchPlayers(board, finalMatch.id)) : 'Awaiting final result'}</p>
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

</>);
  const standingsSection=(<>      {round.round>0&&<>
      <section className="space-y-3">
        <h2 className="font-heading text-2xl">Swiss standings</h2>
        <details className="disclosure standings-key"><summary>How ties are ranked</summary><p>Match points, then opponent match-win percentage, then head-to-head when two tied players met. Game scores do not change the order.</p></details>
        <div className="overflow-x-auto">
          <table className="tournament-standings-table w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2">Position</th>
                <th>Player</th>
                <th>Match points</th>
                <th>W–L–D</th>
                <th>Game wins</th>
                <th>Opponent win %</th>
              </tr>
            </thead>
            <tbody>
              {swissStandings.map((player, index) => (
                <tr key={player.id} className="border-t border-border">
                  <td className="py-2 font-heading">{index + 1}</td>
                  <td>{player.name}{player.dropped ? ' · dropped' : ''}</td>
                  <td>{player.points}</td>
                  <td>{player.wins}–{player.losses}–{player.draws}</td>
                  <td>{gamesWonFor(board, id, player.id)}</td>
                  <td>{player.wins+player.losses+player.draws-player.byes>0?Math.round(player.omw*1000)/10+'%':'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      </>}
</>);
  return (
    <><EventNav id={tournament.event_id} name={board.event.name} house={board.house} /><main className="page tournament-player-page arena-tournament-detail">

      <header className="tournament-live-head">
        <div className="tournament-live-copy">
          <Link href={`/events/${tournament.event_id}`} className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Event</Link>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-link">{tournamentLabel(row.format)}{finalWaiting ? ' · Final' : round.round ? ` · Round ${round.round}` : ''}</p>
          <h1 className="font-heading text-4xl">{row.name}</h1>
          <GameStatus state={finalWaiting?'live':statusState}>{statusLabel}</GameStatus>
          <p className="text-sm text-muted-foreground">
            {joined.length} players · {row.max_rounds} {row.max_rounds===1?'round':'rounds'}
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
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-link">Round {round.round}</p>
            <p className="text-sm text-muted-foreground">Pairings are posted. Start when tables are ready.</p>
            <div className="flex flex-wrap gap-2">
              <ActButton label="Start round" action={startRound.bind(null, id)} />
              <ActButton label="Clear pairings" variant="outline" action={clearPairings.bind(null, id)} />
            </div>
          </div>
        )}
      </header>

      {board.canManage && row.status !== 'completed' && readyToFinish && (
        <section className="room-finish" aria-label="Finish tournament">
          <h3>Finish tournament</h3>
          <p className="subtle mb-4">Round {round.round} results are in. Lock places from the standings below.</p>
          <FinishForm
            allowFinal={!finalMatch}
            tournamentId={id}
            ranked={standings.map((player) => ({ id: player.id, name: player.name }))}
            tieGroups={ties}
            prizes={[row.prize_1st, row.prize_2nd, row.prize_3rd]}
            finalResult={finalPlayers.map((player) => ({ id: player.participant_id || '', result: player.result }))}
          />
        </section>
      )}

      {row.status!=='completed'&&<PersonalGames board={board} tournamentId={id}/>}<TournamentPlaces board={board} tournamentId={id}/>


      {board.joined && !mine && !row.field_locked && row.status !== 'completed' && (
        <ActButton label="Join tournament" action={joinTournament.bind(null, id)} />
      )}
      {board.userId && row.field_locked && !mine && <p className="text-sm text-muted-foreground">The field locked when round 1 started.</p>}


      {!posted && !started && settings}

      {board.canManage && !row.field_locked && row.status !== 'completed' && (
        <AddPlayers key={id} kind="tournament" players={board.members.filter(member => !joined.some(player => player.profile_id === member.id)).map(member => ({ id:member.id, name:member.name }))} action={addTournamentPlayer.bind(null,id)} />
      )}

      {needsSeats(row.format) && round.round === 0 && row.status !== 'completed' && (
        <section id="seating" className="space-y-4">
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
                  <OrientationLabel tournamentId={id} pod={pod} label={(row.pod_orientations as Record<string,string>)?.[String(pod)]||''} canControl={board.canManage}/>
                  <SeatChart
                      canControl={board.canManage}
                    tournamentId={id}
                    seats={podSeats.map((number) => {
                      const holder = roster.find((person) => person.draft_seat === number);
                      const member = board.members.find((person) => person.id === holder?.profile_id);
                      return {
                        number,
                        isYou:holder?.profile_id===board.userId,
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

      {round.round===0&&<section className="panel"><h2>Setup readiness</h2><p>{joined.length} joined{needsSeats(row.format)?` · ${joined.filter(p=>p.draft_seat).length} seated`:null} · {row.max_rounds} rounds · {row.round_duration_minutes||50} minutes</p>{needsSeats(row.format)&&joined.some(p=>!p.draft_seat)&&<p>Needs a draft seat: {joined.filter(p=>!p.draft_seat).map(p=>nameOf(board,p.profile_id)).join(', ')}</p>}{!needsSeats(row.format)&&<p>Sealed has no draft seats. Round 1 pairs randomly.</p>}<p>{joined.length>=2&&<>Suggested rounds for {joined.length} players: {suggestedRounds(joined.length)}.</>}</p>{joined.length>=2&&board.canManage&&row.max_rounds!==suggestedRounds(joined.length)&&<ActButton variant="outline" label={"Use "+suggestedRounds(joined.length)+" rounds"} action={setTournamentSetup.bind(null,{tournamentId:id,maxRounds:suggestedRounds(joined.length)})}/>} {joined.length<2&&<p>Add at least two players before posting pairings.</p>}</section>}
      {row.status==='completed'?<>{finalSection}{standingsSection}{roundsSection}</>:<>{roundsSection}{finalSection}{standingsSection}</>}
      {board.canManage && row.status !== 'completed' && row.field_locked && !readyToFinish && (
        <details className="disclosure">
          <summary>End tournament early</summary>
          <div className="space-y-4">
            <FinishForm
            allowFinal={!finalMatch}
              tournamentId={id}
              ranked={standings.map((player) => ({ id: player.id, name: player.name }))}
              tieGroups={ties}
              prizes={[row.prize_1st, row.prize_2nd, row.prize_3rd]}
              finalResult={finalPlayers.map((player) => ({ id: player.participant_id || '', result: player.result }))}
              early
            />
          </div>
        </details>
      )}

      {board.canManage && round.round === 0 && row.status !== 'completed' && (
        <ActButton label="Delete tournament" variant="ghost" action={deleteTournament.bind(null, id)} />
      )}

      {(posted || started) && settings}
      {deckMemoriesEnabled() && board.userId && roster.some(person => person.profile_id === board.userId) && (
        <Link href={`/tournament/${id}/deck`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">Save your deck</Link>
      )}
      {round.round>0&&<Suspense fallback={<p className="subtle" role="status">Loading deck memories…</p>}><LimitedMemoryList tournamentId={id} /></Suspense>}
    </main></>
  );
}

export default withLiveSnapshot(TournamentPage);
