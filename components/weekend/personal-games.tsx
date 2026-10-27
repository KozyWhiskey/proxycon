import Link from 'next/link';
import {personalAssignments} from '@/lib/weekend-view';
import type {EventBoard} from '@/lib/event-board';
import {LiveSlip} from './live-slip';
export function PersonalGames({board,tournamentId,scope='current'}:{board:EventBoard;tournamentId?:string;scope?:'current'|'past'|'all'}){
 const items=personalAssignments(board).filter(a=>(!tournamentId||a.id===tournamentId)&&(scope==='all'||(scope==='current'?a.inFlight:!a.inFlight)));
 return items.length?<section className={scope==='past'?'past-personal-games':'personal-games'} aria-label={scope==='past'?'Your past games':'Your games'}>{items.map(a=>a.table?<LiveSlip key={a.id} href={a.href} kicker={a.table} title={a.title} detail={a.detail} context={a.context} actionLabel={a.action}/>:<Link className="panel personal-status" key={a.id} href={a.href}><small>{a.context}</small><h2>{a.title}</h2><p>{a.detail}</p><span className="text-link">{a.action} →</span></Link>)}</section>:null;
}
