import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { joinActivity } from '@/app/tournament/actions';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinSittingPage({ params }: PageProps) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-panel w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-heading">Check in</CardTitle>
            <CardDescription>Sign in, then you will be added to this sitting.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/login?next=/join/sitting/${code}`}>Sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const result = await joinActivity(code);
  if (result.success && result.href) {
    redirect(result.href);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="glass-panel w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading">Could not check in</CardTitle>
          <CardDescription>{result.message || 'Ask the host for a new code.'}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/">Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
