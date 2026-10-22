import { redirect } from 'next/navigation';

export default async function CasualPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { eventId } = await searchParams;
  if (eventId) redirect(`/events/${eventId}/play`);
  redirect('/');
}
