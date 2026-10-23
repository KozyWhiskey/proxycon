import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export function LiveSlip({ href, kicker, title, detail, record, actionLabel = 'View match' }: { href: string; kicker: string; title: string; detail: string; record?: string; actionLabel?: string }) {
  return <Link href={href} className="match-slip"><div className="slip-table"><span>YOUR GAME</span><strong>{kicker}</strong></div><div className="slip-opponent"><span className="live-label">{detail}</span><h2>{title !== 'You have the bye' && <span className="slip-versus">vs </span>}{title}</h2>{record && <p className="slip-record">{record}</p>}<span className="slip-action">{actionLabel} <ArrowUpRight size={16} /></span></div></Link>;
}
