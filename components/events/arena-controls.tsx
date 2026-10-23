'use client';

import { Children, useState, useEffect, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Minimize, ClipboardPenLine, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';

export function RoomDialog({ title, label, children, kind }: { title: string; label: string; children: ReactNode; kind?: 'report' | 'correct' }) {
  return <Dialog><DialogTrigger asChild><Button variant="outline" className={`room-dialog-trigger${kind ? ` room-result-trigger is-${kind}` : ''}`}>{kind === 'report' && <ClipboardPenLine size={17} aria-hidden="true" />}{kind === 'correct' && <Pencil size={16} aria-hidden="true" />}{label}</Button></DialogTrigger><DialogContent className="arena-dialog"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription className="sr-only">{label}. Close this window to return to the tournament room.</DialogDescription></DialogHeader>{children}</DialogContent></Dialog>;
}

/** Server-rendered match cards stay on the server; only their paging is interactive. */
export function MatchPages({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / 4));
  const current = Math.min(page, pages - 1);
  return <div className="match-pages"><div className="room-tables">{items.slice(current * 4, current * 4 + 4)}</div>{pages > 1 && <nav className="arena-pagination" aria-label="Pairing pages"><Button variant="ghost" size="icon" aria-label="Previous pairings" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft size={16} /></Button><span aria-live="polite">Tables {current * 4 + 1}–{Math.min(items.length, current * 4 + 4)} of {items.length}</span><Button variant="ghost" size="icon" aria-label="Next pairings" disabled={current === pages - 1} onClick={() => setPage(current + 1)}><ChevronRight size={16} /></Button></nav>}</div>;
}

export function RoomFocus() {
  const [focus, setFocus] = useState(true);
  useEffect(() => { document.documentElement.classList.add('room-focus'); return () => document.documentElement.classList.remove('room-focus'); }, []);
  return <Button variant="outline" aria-pressed={focus} onClick={() => { setFocus(!focus); document.documentElement.classList.toggle('room-focus', !focus); }}>{focus ? <Minimize size={15} /> : <Maximize size={15} />}{focus ? 'Exit focus' : 'Focus room'}</Button>;
}

export function StandingsPages({ children, headings }: { children: ReactNode; headings: ReactNode }) {
  const rows = Children.toArray(children);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / 8));
  const current = Math.min(page, pages - 1);
  return <><div className="room-standings-scroll"><table>{headings}<tbody>{rows.slice(current * 8, current * 8 + 8)}</tbody></table></div>{pages > 1 && <nav className="arena-pagination" aria-label="Standings pages"><Button variant="ghost" size="icon" aria-label="Previous standings" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft size={16} /></Button><span aria-live="polite">{current * 8 + 1}–{Math.min(rows.length, current * 8 + 8)} of {rows.length}</span><Button variant="ghost" size="icon" aria-label="Next standings" disabled={current === pages - 1} onClick={() => setPage(current + 1)}><ChevronRight size={16} /></Button></nav>}<details className="standings-key"><summary>How ties are ranked</summary><p>Match points, then opponent match-win percentage, then head-to-head when two tied players met. Game scores do not change the order.</p></details></>;
}
