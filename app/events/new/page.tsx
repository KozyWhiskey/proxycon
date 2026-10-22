import Link from 'next/link';
import { requireProfile } from '@/lib/get-current-user';
import NewEventForm from '@/components/events/new-event-form';
export default async function NewEventPage() {
 await requireProfile();
 return <main className="page form-page"><Link href="/" className="subtle">← All events</Link><header className="page-heading"><div><p className="eyebrow">Bring everyone together</p><h1>Create event</h1><p className="subtle">A single game night or the whole weekend. Add tournaments and quick matches after creating the event.</p></div></header><NewEventForm /></main>;
}
