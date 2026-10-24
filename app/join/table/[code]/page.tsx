import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { joinPod } from '@/app/tournament/actions';
import { isPodFormat } from '@/lib/activity';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinTablePage({ params }: PageProps) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: match } = await supabase
    .from('matches')
    .select('id, tournament_id, game_type, join_code')
    .eq('join_code', code.toUpperCase())
    .maybeSingle();

  if (!match || !match.tournament_id) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-panel w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-sans">Table {code.toUpperCase()}</CardTitle>
            <CardDescription>Sign in to sit down or report this table.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/login?next=/join/table/${code}`}>Sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isPodFormat(match.game_type)) {
    const joined = await joinPod(match.id);
    if (joined.success && joined.href) redirect(joined.href);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-panel w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-heading">Table is closed</CardTitle>
            <CardDescription>{joined.message}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/tournament/${match.tournament_id}/pods`}>Back to pods</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  redirect(`/tournament/${match.tournament_id}/match/${match.id}`);
}
