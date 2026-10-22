import Link from 'next/link';
import { matchPlayers, type EventBoard } from '@/lib/event-board';
export function WeekendSnapshot({ board }: { board: EventBoard }) {
 const results=board.matches.filter(m=> {const people=matchPlayers(board,m.id);return people.length && people.every(p=>p.result);});
 const live=board.matches.filter(m=>{const people=matchPlayers(board,m.id);return people.length && people.some(p=>!p.result);});
 return <section aria-label="Weekend overview" className="stats-highlights">{[
  {label:'Players in the house', value:board.members.length},
  {label:'Games completed',value:results.length},
  {label:'Open tables',value:live.length},
  {label:'Tournaments finished',value:board.tournaments.filter(t=>t.status==='completed').length},
 ].map(item=><div className="stats-highlight" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}<Link className="sr-only" href={`/events/${board.event.id}/stats`}>Full weekend statistics</Link></section>;
}