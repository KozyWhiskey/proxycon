'use client';

import { useState, type ReactNode } from 'react';
import { Maximize, Minimize, ClipboardPenLine, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';

export function RoomDialog({ title, label, children, kind }: { title: string; label: string; children: ReactNode; kind?: 'report' | 'correct' }) {
  return <Dialog><DialogTrigger asChild><Button variant="outline" className={`room-dialog-trigger${kind ? ` room-result-trigger is-${kind}` : ''}`}>{kind === 'report' && <ClipboardPenLine size={17} aria-hidden="true" />}{kind === 'correct' && <Pencil size={16} aria-hidden="true" />}{label}</Button></DialogTrigger><DialogContent className="arena-dialog"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription className="sr-only">{label}. Close this window to return to the tournament room.</DialogDescription></DialogHeader>{children}</DialogContent></Dialog>;
}

/** Server-rendered match cards stay on the server; only their paging is interactive. */
export function MatchPages({ children }: { children: ReactNode }) {
  return <div className="match-pages"><div className="room-tables">{children}</div></div>;
}

export function RoomFocus() {
  const [focus, setFocus] = useState(true);
  return <Button variant="outline" aria-pressed={focus} data-room-focus={focus ? 'true' : 'false'} onClick={() => setFocus(!focus)}>{focus ? <Minimize size={15} /> : <Maximize size={15} />}{focus ? 'Exit focus' : 'Focus room'}</Button>;
}

export function StandingsPages({ children, headings }: { children: ReactNode; headings: ReactNode }) {
  return <><div className="room-standings-scroll"><table>{headings}<tbody>{children}</tbody></table></div><details className="standings-key"><summary>How ties are ranked</summary><p>Match points, then opponent match-win percentage, then head-to-head when two tied players met. Game scores do not change the order.</p></details></>;
}
