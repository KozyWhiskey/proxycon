import type { EventBoard } from './event-board';
import { rankPlayers, chicagoToday, needsSeats, type HistoryMatch, type Result } from './weekend';
export function nameOf(board: EventBoard, profileId: string | null | undefined) {
    if (!profileId)
        return 'Open seat';
    return board.names.get(profileId) || 'Player';
}
export function matchPlayers(board: EventBoard, matchId: string) {
    return board.seats
        .filter((seat) => seat.match_id === matchId)
        .map((seat) => ({
        ...seat,
        name: nameOf(board, seat.profile_id),
        result: (seat.result as Result | null) || null,
    }));
}
export function currentRound(board: EventBoard, tournamentId: string) {
    const rounds = board.matches.filter((match) => match.tournament_id === tournamentId && !match.is_final);
    const round = rounds.reduce((max, match) => Math.max(max, match.round_number || 0), 0);
    return { round, matches: rounds.filter((match) => (match.round_number || 0) === round && round > 0) };
}
export function standingsFor(board: EventBoard, tournamentId: string, official = true) {
    const roster = board.roster.filter((person) => person.tournament_id === tournamentId && person.profile_id);
    const history: HistoryMatch[] = [];
    for (const match of board.matches.filter((row) => row.tournament_id === tournamentId && !row.is_final)) {
        const seats = matchPlayers(board, match.id).filter((seat) => seat.participant_id && seat.result);
        if (seats.length === 1) {
            history.push({ player1: seats[0].participant_id!, player2: null, result1: 'win', result2: null });
        }
        else if (seats.length >= 2) {
            history.push({
                player1: seats[0].participant_id!,
                player2: seats[1].participant_id!,
                result1: seats[0].result || 'draw',
                result2: seats[1].result,
            });
        }
    }
    const ranked = rankPlayers(roster.map((person) => person.id), history);
    const standings = ranked.map((row) => {
        const person = roster.find((seat) => seat.id === row.id);
        return {
            ...row,
            profileId: person?.profile_id || '',
            name: nameOf(board, person?.profile_id),
            place: person?.place || null,
            dropped: Boolean(person?.dropped),
            seat: person?.draft_seat || null,
        };
    });
    if (official && board.tournaments.find(tournament => tournament.id === tournamentId)?.status === 'completed') {
        standings.sort((a, b) => (a.place ?? Infinity) - (b.place ?? Infinity));
    }
    return standings;
}
export function myOpenMatches(board: EventBoard) {
    if (!board.userId)
        return [];
    return board.matches.filter((match) => {
        const seats = matchPlayers(board, match.id);
        const mine = seats.some((seat) => seat.profile_id === board.userId && !seat.result);
        if (!mine)
            return false;
        if (!match.tournament_id)
            return true;
        return Boolean(match.started_at) || seats.length > 0;
    });
}
export function liveOrSetup(board: EventBoard) {
    return board.matches.filter((match) => {
        const seats = matchPlayers(board, match.id);
        const open = seats.length === 0 || seats.some((seat) => !seat.result);
        return open;
    });
}
export { chicagoToday, needsSeats };
export function gamesWonFor(board: EventBoard, tournamentId: string, participantId: string) {
    const matchIds = new Set(board.matches.filter(match => match.tournament_id === tournamentId && !match.is_final && board.seats.filter(seat => seat.match_id === match.id).length > 1).map(match => match.id));
    return board.seats.filter(seat => seat.participant_id === participantId && matchIds.has(seat.match_id)).reduce((sum, seat) => sum + (seat.games_won || 0), 0);
}
