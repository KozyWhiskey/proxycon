import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/ui/page-header';
import ProfileForm from '@/components/profile/profile-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Swords, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function ProfilePage() {
  const supabase = await createClient();
  const authData = await getCurrentUser();

  if (!authData || !authData.user) {
    redirect('/login');
  }

  // Fetch the LINKED player record for compatibility
  const { data: linkedPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('profile_id', authData.user.id)
    .single();

  if (!linkedPlayer) {
    // Should not happen if they are on this page via normal flow, 
    // but redirect to home to claim/create profile if so.
    redirect('/');
  }

  // Fetch deck count for a quick stat
  const { count: deckCount } = await supabase
    .from('decks')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', authData.user.id);

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="My Profile"
        subtitle="Manage your identity and decks"
        backHref="/"
        backLabel="Home"
      />

      <div className="max-w-2xl mx-auto p-4 space-y-8">
        {/* Profile Settings */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl text-slate-100">Personal Details</CardTitle>
            <CardDescription>Update how you appear to others.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              userName={linkedPlayer.name}
              userNickname={linkedPlayer.nickname}
              userColor={linkedPlayer.color}
              userAvatarUrl={linkedPlayer.avatar_url}
            />
          </CardContent>
        </Card>

        {/* Decks Section */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl text-slate-100">My Decks</CardTitle>
            <CardDescription>Manage your library of {deckCount} decks.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 justify-between px-4">
              <Link href="/decks">
                <span className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-yellow-500" />
                  Manage Decks
                </span>
                <ArrowRight className="w-5 h-5 text-slate-500" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
