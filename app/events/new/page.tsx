import { requireProfile } from '@/lib/get-current-user';
import NewEventForm from '@/components/events/new-event-form';
import Link from 'next/link';
import { PageIntro } from '@/components/layout/page-intro';

export default async function NewEventPage() {
  await requireProfile();

  return (
    <main className="page collection-page task-page">
      <Link href="/" className="subtle">← Events</Link>
      <PageIntro compact eyebrow="THE PLAYGROUP" title="Create event" description="Set the dates for your next gathering, then invite the playgroup." />
      <NewEventForm />
    </main>
  );
}
