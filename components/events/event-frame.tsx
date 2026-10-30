'use client';
import { useState, type ReactNode } from 'react';
import { EventNav } from './event-nav';
import { RememberEvent } from './remember-event';

type Context = { fetchedAt: string; userId: string | null; house: boolean; event: { id: string; name: string } };
export function EventFrame({ eventId, context, children }: { eventId: string; context: Context | null; children: ReactNode }) {
  const [saved, setSaved] = useState(context);
  if (context && context.fetchedAt !== saved?.fetchedAt) setSaved(context);
  const shell = context || (saved?.event.id === eventId ? saved : null);
  return <>{shell && (shell.userId || shell.house) && <RememberEvent eventId={eventId} identity={shell.house ? 'house' : shell.userId || 'unbound'} />}<EventNav id={eventId} house={shell?.house} name={shell?.event.name} />{children}</>;
}
