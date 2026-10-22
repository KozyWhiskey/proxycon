import { WeekendSnapshot } from '@/components/events/weekend-snapshot';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEventBoard, matchPlayers, nameOf } from '@/lib/event-board';
import { getColorClass } from '@/lib/player-colors';
import { buildEventStats, chicagoWeekday, commanderKey, isCommanderFormat, placeLabel, type Result, type StatGame } from '@/lib/weekend';

export default async function EventStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await loadEventBoard(id);
  if (!board) notFound();

  const deckById = new Map(board.decks.map((deck) => [deck.id, deck]));
  const games: StatGame[] = [];
  for (const match of board.matches) {
    const seats = matchPlayers(board, match.id).filter((seat) => seat.profile_id && seat.result);
    if (seats.length === 0) continue;
    const playedOn = match.played_on || (match.created_at || '').slice(0, 10);
    for (const seat of seats) {
      const deck = seat.deck_id ? deckById.get(seat.deck_id) : undefined;
      games.push({
        matchId: match.id,
        profileId: seat.profile_id!,
        result: seat.result as Result,
        gameType: match.game_type,
        tournament: Boolean(match.tournament_id),
        bye: Boolean(match.tournament_id) && seats.length === 1,
        playedOn,
        createdAt: match.created_at || '',
        commander: deck ? commanderKey(deck.commander_name, deck.partner_name) : null,
        opponents: seats.map((other) => other.profile_id!).filter((profileId) => profileId !== seat.profile_id),
      });
    }
  }

  const places = board.tournaments.flatMap((tournament) => {
    const players = board.roster.filter((person) => person.tournament_id === tournament.id && person.profile_id);
    return players.map((person) => {
      const record = games.filter((game) => {
        if (!game.tournament || game.profileId !== person.profile_id) return false;
        const match = board.matches.find((row) => row.id === game.matchId);
        return Boolean(match && match.tournament_id === tournament.id && !match.is_final);
      });
      return {
        tournamentId: tournament.id,
        profileId: person.profile_id!,
        place: person.place,
        points: record.reduce((sum, game) => sum + (game.bye || game.result === 'win' ? 3 : game.result === 'draw' ? 1 : 0), 0),
        wins: record.filter((game) => game.result === 'win' || game.bye).length,
        losses: record.filter((game) => game.result === 'loss').length,
        draws: record.filter((game) => game.result === 'draw').length,
      };
    });
  });

  const stats = buildEventStats({
    games,
    start: board.event.start_date,
    end: board.event.end_date,
    profiles: board.members.map((member) => member.id),
    tournamentPlaces: places,
  });

  const gamesOn = (day: string) => games.filter((game) => game.playedOn === day);

  return (
    <main className="page stats-page">
      <Link href={`/events/${id}`} className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Event</Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Weekend statistics</p>
          <h1>Weekend statistics</h1>
          <p className="subtle">{board.event.name}. Every number is this event only, from {board.event.start_date || 'the start'} to {board.event.end_date || 'the end'}.</p>
        </div>
      </header>

      <WeekendSnapshot board={board} />

      <section className="stats-lead" aria-label="Headline numbers">
        <StatLead label="Most Commander wins" name={stats.mostCommanderWins ? nameOf(board, stats.mostCommanderWins.profileId) : null} value={stats.mostCommanderWins?.wins} />
        <StatLead label="Most tournament wins" name={stats.mostTournamentWins ? nameOf(board, stats.mostTournamentWins.profileId) : null} value={stats.mostTournamentWins?.wins} />
        <StatLead label="Tournament titles" name={stats.titles ? nameOf(board, stats.titles.profileId) : null} value={stats.titles?.count} />
        <StatLead label="Most games played" name={stats.mostPlayed ? nameOf(board, stats.mostPlayed.profileId) : null} value={stats.mostPlayed?.played} />
      </section>



      <section className="stats-people-wrap">
        <h2>Players</h2>
        <div className="stats-people">
          {board.members.map((member) => {
            const mine = games.filter((game) => game.profileId === member.id);
            const wins = mine.filter((game) => game.result === 'win' || game.bye).length;
            const losses = mine.filter((game) => game.result === 'loss').length;
            const draws = mine.filter((game) => game.result === 'draw').length;
            const rate = mine.length === 0 ? 0 : Math.round((wins / mine.length) * 1000) / 10;
            const commanders = commanderRows(mine);
            const recent = [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
            const placesForPlayer = places.filter((row) => row.profileId === member.id);
            const swatch = getColorClass(member.color);
            return (
              <article id={`player-${member.id}`} key={member.id} className="stats-person">
                <header className="stats-person-top">
                  <h3>{swatch && <span className={`room-swatch ${swatch}`} />}{member.name}</h3>
                  <p className="stats-record">{mine.length ? `${wins}–${losses}–${draws}` : '—'}</p>
                </header>
                <p className="subtle">{mine.length ? `${mine.length} ${mine.length === 1 ? 'game' : 'games'} · ${wins} ${wins === 1 ? 'win' : 'wins'} · ${rate}% win rate` : 'No results yet this event.'}</p>
                {commanders.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Commanders</p>
                    {commanders.map((row) => (
                      <p key={row.name} className="text-sm">{row.name} · {row.wins}–{row.losses}</p>
                    ))}
                  </div>
                )}
                {placesForPlayer.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Tournaments</p>
                    {placesForPlayer.map((row) => {
                      const tournament = board.tournaments.find((item) => item.id === row.tournamentId);
                      return (
                        <p key={row.tournamentId} className="text-sm">
                          {row.place ? `${placeLabel(row.place)} · ` : ''}{tournament?.name || 'Tournament'} · {row.points} pts · {row.wins}–{row.losses}–{row.draws}
                        </p>
                      );
                    })}
                  </div>
                )}
                {recent.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent games</p>
                    {recent.map((game) => {
                      const match = board.matches.find((row) => row.id === game.matchId);
                      const label = match?.table_label || match?.format_label || (game.tournament ? 'Tournament' : 'Game');
                      return (
                        <p key={`${game.matchId}-${game.profileId}`} className="text-sm text-muted-foreground">
                          {game.playedOn} · {label} · {game.bye ? 'bye' : game.result}
                          {!game.tournament && game.commander && isCommanderFormat(game.gameType) ? ` · ${game.commander}` : ''}
                        </p>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel space-y-3">
        <h2 className="font-heading text-2xl">Match-win rate</h2>
        <p className="text-xs text-muted-foreground">Wins divided by results on this event. A draw counts as a result and not as a win.</p>
        {stats.matchRates.length === 0 && <p className="text-sm text-muted-foreground">No results yet.</p>}
        {stats.matchRates.map((row) => (
          <p key={row.profileId} className="text-sm">
            {nameOf(board, row.profileId)} · {Math.round(row.rate * 1000) / 10}% · {row.wins} of {row.played}
          </p>
        ))}
      </section>

      <section className="panel space-y-3">
        <h2 className="font-heading text-2xl">Commander</h2>
        {stats.commanderByCommander.length === 0 && <p className="text-sm text-muted-foreground">No Commander results yet. A draw is neither a win nor a loss.</p>}
        {stats.commanderByCommander.map((row) => (
          <p key={row.name} className="text-sm">{row.name} · {row.wins}–{row.losses}</p>
        ))}
      </section>

      <section className="panel space-y-3">
        <h2 className="font-heading text-2xl">Team games</h2>
        {stats.teamByPlayer.length === 0 && <p className="text-sm text-muted-foreground">No team results yet.</p>}
        {stats.teamByPlayer.map((row) => (
          <p key={row.profileId} className="text-sm">{nameOf(board, row.profileId)} · {row.wins}–{row.losses}</p>
        ))}
      </section>

      <section className="panel space-y-4">
        <h2 className="font-heading text-2xl">Tournaments</h2>
        {board.tournaments.map((tournament) => {
          const block = stats.tournaments.find((item) => item.id === tournament.id);
          return (
            <div key={tournament.id}>
              <h3 className="font-heading text-lg">{tournament.name}</h3>
              {(block?.players || []).map((player) => (
                <p key={player.profileId} className="text-sm">
                  {player.place ? `${placeLabel(player.place)} · ` : ''}{nameOf(board, player.profileId)} · {player.points} pts · {player.wins}–{player.losses}–{player.draws}
                </p>
              ))}
            </div>
          );
        })}
      </section>

      <section className="panel space-y-3">
        <h2 className="font-heading text-2xl">Head to head</h2>
        <p className="text-xs text-muted-foreground">Commander games and tournament matches stay in separate columns.</p>
        {stats.headToHead.length === 0 && <p className="text-sm text-muted-foreground">No head-to-head results yet.</p>}
        {stats.headToHead.map((row) => (
          <p key={`${row.a}-${row.b}`} className="text-sm">
            {nameOf(board, row.a)} vs {nameOf(board, row.b)} · Commander {row.commander} · Tournament {row.tournament}
          </p>
        ))}
      </section>

      <section className="panel space-y-3">
        <h2 className="font-heading text-2xl">Streaks</h2>
        <p className="text-xs text-muted-foreground">A draw ends a streak. A tournament bye counts as a win. A loss ends it.</p>
        {stats.streaks.filter((row) => row.commander.best || row.tournament.best || row.commander.current || row.tournament.current).map((row) => (
          <p key={row.profileId} className="text-sm">
            {nameOf(board, row.profileId)} · Commander {row.commander.current} now, {row.commander.best} best · Tournament {row.tournament.current} now, {row.tournament.best} best
          </p>
        ))}
      </section>

      <section className="panel space-y-4">
        <h2 className="font-heading text-2xl">Days</h2>
        <p className="text-xs text-muted-foreground">America/Chicago. Thursday and Sunday are listed on their own. The event total is every day.</p>
        {stats.days.map((day) => {
          const rows = gamesOn(day);
          const wins = rows.filter((game) => (isCommanderFormat(game.gameType) || game.tournament) && (game.result === 'win' || game.bye)).length;
          return (
            <div key={day}>
              <h3 className="font-heading text-lg">{chicagoWeekday(day)} · {day}</h3>
              <p className="text-sm text-muted-foreground">{rows.length ? `${wins} wins recorded` : 'No games'}</p>
            </div>
          );
        })}
        <p className="text-sm">Event total · {games.length} results</p>
      </section>
    </main>
  );
}

function StatLead({ label, name, value }: { label: string; name: string | null; value?: number }) {
  return (
    <article>
      <p>{label}</p>
      {name == null ? <strong className="stats-empty">—</strong> : (
        <div className="stats-figure">
          <strong>{name}</strong>
          <span>{value}</span>
        </div>
      )}
    </article>
  );
}

function commanderRows(rows: StatGame[]) {
  const counts = new Map<string, { wins: number; losses: number }>();
  for (const game of rows) {
    if (game.tournament || !isCommanderFormat(game.gameType) || game.result === 'draw') continue;
    const name = game.commander || 'No commander';
    const row = counts.get(name) || { wins: 0, losses: 0 };
    if (game.result === 'win') row.wins += 1;
    else row.losses += 1;
    counts.set(name, row);
  }
  return [...counts.entries()]
    .map(([name, row]) => ({ name, ...row }))
    .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
}
