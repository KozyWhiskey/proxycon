import type { EventBoard } from '@/lib/event-board';
import { standingsFor } from '@/lib/event-board';
import { placeLabel } from '@/lib/weekend';
export function TournamentPlaces({ board, tournamentId }: {
    board: EventBoard;
    tournamentId: string;
}) { const t = board.tournaments.find(t => t.id === tournamentId); if (!t || t.status !== 'completed')
    return null; const players = standingsFor(board, t.id).filter(p => p.place); const winner = players.find(p => p.place === 1); const final = board.matches.some(m => m.tournament_id === t.id && m.is_final); return <section className="panel tournament-places"><p className="eyebrow">Tournament winner</p><h2 className="font-heading text-3xl">{winner?.name || 'Places pending'}</h2>{final && <p>The final determined first place. Swiss match points are shown separately below.</p>}<h3>Final placing & prizes</h3>{players.map(p => { const prize = p.place === 1 ? t.prize_1st : p.place === 2 ? t.prize_2nd : p.place === 3 ? t.prize_3rd : null; return <p className="game-row" key={p.id}><strong>{placeLabel(p.place!)} · {p.name}</strong>{prize && <span>{prize}</span>}</p>; })}</section>; }
