import Link from 'next/link';
import { loadAgenda } from '@/lib/agenda';
import { chicagoToday } from '@/lib/weekend';
export async function AgendaPreview({ eventId }: {
    eventId: string;
}) { const { items, error } = await loadAgenda(eventId); const today = chicagoToday(); const next = items.find(i => i.day >= today); return <section className="panel"><h2>Today / next plan</h2><p>{error || (next ? next.day + ' · ' + next.title + (next.timing ? ' · ' + next.timing : '') : 'No upcoming plans.')}</p><Link className="text-link" href={'/events/' + eventId + '/agenda'}>Open agenda →</Link></section>; }
