import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function SeatingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('tournaments').select('event_id').eq('id', id).maybeSingle();
  if (data?.event_id) redirect(`/tournament/${id}`);
  redirect('/');
}
