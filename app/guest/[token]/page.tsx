import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { guestInvitationSchema, guestToken } from '@/lib/guest-access';
import { GuestClaimForm } from '@/components/guest/claim-form';
import { Brand } from '@/components/layout/brand';
import { Button } from '@/components/ui/button';
import { joinEventById } from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your weekend spot · ProxyCon', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function GuestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await createClient();
  const { data } = guestToken.safeParse(token).success
    ? await db.rpc('read_weekend_guest_invitation', { p_token: token }) : { data: null };
  const parsed = guestInvitationSchema.safeParse(data);
  if (!parsed.success) return <main className="page form-page"><Brand /><section className="panel"><h1 className="font-sans text-3xl font-semibold tracking-tight">Ask for a new guest link</h1><p className="subtle mt-4">This link is unavailable or has expired. Your admin can share a new one.</p><Button asChild variant="outline" className="mt-6"><Link href="/login">Sign in with an account</Link></Button></section></main>;
  const invitation = parsed.data;
  const current = await getCurrentUser();
  return <main className="page form-page"><Brand /><header><p className="eyebrow mt-6">{invitation.eventName}</p><h1 className="font-sans text-3xl font-semibold tracking-tight">Your weekend spot</h1><p className="subtle mt-3">Pick your name and get to the table.</p></header>
    {current?.profile ? <section className="panel space-y-4"><h2 className="text-2xl">You’re signed in as {current.profile.display_name || current.profile.username}.</h2><p className="subtle">Your profile and decks are ready. Join the event using this account.</p><ActButton label="Join event" action={joinEventById.bind(null, invitation.eventId)} /><Button asChild variant="outline"><Link href={`/events/${invitation.eventId}`}>Open event</Link></Button></section>
      : <GuestClaimForm invitation={invitation} token={token} />}
  </main>;
}
