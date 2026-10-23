import { requireProfile } from '@/lib/get-current-user';
import NewEventForm from '@/components/events/new-event-form';
import PageHeader from '@/components/ui/page-header';

export default async function NewEventPage() {
  await requireProfile();

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Weekend"
        subtitle="Create the house event"
        backHref="/"
        backLabel="Weekend"
      />

      <div className="max-w-3xl mx-auto p-4 mt-4">
        <NewEventForm />
      </div>
    </main>
  );
}
