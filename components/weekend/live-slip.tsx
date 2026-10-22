import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export function LiveSlip({ href, kicker, title, detail }: { href: string; kicker: string; title: string; detail: string }) {
  return <Link href={href} className="match-slip"><div className="slip-table"><span>YOUR TABLE</span><strong>{kicker}</strong></div><div className="slip-opponent"><span className="live-label"><i />{detail}</span><h2>{title}</h2><span>Open match <ArrowUpRight size={16} /></span></div></Link>;
}
