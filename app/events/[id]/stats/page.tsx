import { notFound } from 'next/navigation';
import { loadEventBoard, matchPlayers } from '@/lib/event-board';
import { commanderKey, type Result, type StatGame } from '@/lib/weekend';
import { EventStatistics } from '@/components/events/event-statistics';

export default async function EventStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await loadEventBoard(id);
  if (!board) notFound();

  const deckById = new Map(board.decks.map((deck) => [deck.id, deck]));
  const games: StatGame[] = [];
  for (const match of board.matches) {
    const allSeats = matchPlayers(board, match.id);
    // An unfinished table is not a completed game, or a bye, just because one seat has a result.
    if (!allSeats.length || allSeats.some(seat => !seat.result)) continue;
    const seats = allSeats.filter((seat) => seat.profile_id && seat.result);
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
        bye: Boolean(match.tournament_id) && allSeats.length === 1,
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

  return <EventStatistics event={board.event} members={board.members} games={games} places={places} tournaments={board.tournaments.map(t => ({ id: t.id, name: t.name, status: t.status }))} decks={board.decks} matchTournaments={Object.fromEntries(board.matches.filter(m => m.tournament_id).map(m => [m.id, m.tournament_id!]))} />;
}


