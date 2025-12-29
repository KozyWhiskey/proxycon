import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { joinGuild } from '@/app/guilds/actions';
import { requireProfile } from '@/lib/get-current-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;
  const supabase = await createClient();

  // 1. Fetch Guild Info (Publicly Viewable)
  const { data: guild, error } = await supabase
    .from('organizations')
    .select('id, name, slug, owner:profiles!owner_id(display_name)')
    .eq('invite_code', code.toUpperCase())
    .single();

  if (error || !guild) {
    notFound();
  }

  // 2. Check Auth Status
  const { data: { user } } = await supabase.auth.getUser();

  // If not logged in, show "Login to Join"
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="glass-panel w-full max-w-md border-white/10">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-4 text-primary shadow-[0_0_15px_rgba(186,147,43,0.2)]">
               <Shield className="w-8 h-8" />
            </div>
            <CardTitle className="font-heading text-2xl">You've been summoned.</CardTitle>
            <CardDescription>
              To join <b>{guild.name}</b>, you must identify yourself first.
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

  // 3. Auto-Join Logic (Server Action)
  // We call the server action directly here to attempt the join
  const result = await joinGuild(code);

  if (!result.success) {
     return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="glass-panel w-full max-w-md border-white/10 border-red-500/50">
                <CardHeader>
                    <CardTitle className="text-red-500">Summoning Failed</CardTitle>
                    <CardDescription>{result.message}</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild variant="secondary" className="w-full">
                        <Link href="/">Return Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
     )
  }

  // 4. Success View
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="glass-panel w-full max-w-md border-white/10">
          <CardHeader className="text-center">
             <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500">
               <CheckCircle2 className="w-8 h-8" />
            </div>
            <CardTitle className="font-heading text-2xl">Welcome, Planeswalker.</CardTitle>
            <CardDescription>
              You have successfully joined <b>{guild.name}</b>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="bg-black/20 p-4 rounded-lg text-sm text-center">
                <p className="text-muted-foreground">Guildmaster</p>
                <p className="font-medium text-foreground">{(guild.owner as any)?.display_name || 'Unknown'}</p>
             </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full h-12 font-heading" variant="default">
              <Link href={`/guilds/${result.slug}`}>
                Enter Sanctuary <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
  );
}
