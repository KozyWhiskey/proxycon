import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { joinEvent } from '@/app/events/actions';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from('events')
    .select('id, name, start_date, end_date')
    .eq('invite_code', code.toUpperCase())
    .single();

  if (error || !event) {
    notFound();
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="glass-panel w-full max-w-md border-white/10">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-4 text-primary">
              <Calendar className="w-8 h-8" />
            </div>
            <CardTitle className="font-heading text-2xl">{event.name}</CardTitle>
            <CardDescription>
              Sign in to join this weekend.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full h-12 font-heading" variant="default">
              <Link href={`/login?next=/invite/${code}`}>
                Login / Sign Up
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const result = await joinEvent(code);

  if (!result.success || !result.eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="glass-panel w-full max-w-md border-white/10">
          <CardHeader>
            <CardTitle>Could not join</CardTitle>
            <CardDescription>{result.message || 'Try the code again from the house group.'}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/">Return home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  redirect(`/events/${result.eventId}`);
}
