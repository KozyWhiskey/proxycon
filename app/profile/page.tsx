import { createClient } from '@/utils/supabase/server';
import { requireProfile } from '@/lib/get-current-user';
import PageHeader from '@/components/ui/page-header';
import ProfileForm from '@/components/profile/profile-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Swords, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/logout-button';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { user, profile } = await requireProfile();

  // Fetch deck count for a quick stat
  const { count: deckCount } = await supabase
    .from('decks')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', profile.id);

  return (
    <main className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Play name"
        subtitle="The name on every table"
        backHref="/"
        backLabel="Home"
        actions={<LogoutButton isGuest={Boolean(user.is_anonymous)} />}
      />

      <div className="max-w-3xl mx-auto p-4 space-y-8 mt-4 md:mt-8">
        <div className="action-row"><Button asChild variant="outline"><Link href={`/players/${profile.id}`}>View my player profile</Link></Button><Button asChild variant="outline"><Link href="/players">Browse all players</Link></Button></div>
        {user.is_anonymous && <section className="panel"><h2 className="text-xl">This phone</h2><p className="subtle mt-2">Switch player to pick a different name. Decks and results stay with the player, so you can choose that name again.</p></section>}
        {/* Profile Settings */}
        <Card className="glass-panel">
          <CardHeader className="border-b border-border pb-6">
            <CardTitle className="text-xl text-foreground font-heading tracking-wide">Personal Details</CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest">Update how you appear to others.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <ProfileForm
              userName={profile.username}
              userNickname={profile.display_name}
              userColor={profile.color}
              userAvatarUrl={profile.avatar_url}
            />
          </CardContent>
        </Card>

        {/* Decks Section */}
        <Card className="glass-panel">
          <CardHeader className="border-b border-border pb-6">
            <CardTitle className="text-xl text-foreground font-heading tracking-wide">My Decks</CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest">Manage your library of {deckCount || 0} decks.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <Button asChild variant="outline" className="w-full h-14 bg-muted border-border hover:bg-muted justify-between px-6 group">
              <Link href="/decks">
                <span className="flex items-center gap-3">
                  <Swords className="w-5 h-5 text-primary group-hover:drop-shadow-[0_0_8px_rgba(186,147,43,0.5)] transition-all" />
                  <span className="font-heading font-bold uppercase tracking-widest text-sm">Manage Decks</span>
                </span>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {profile.role === 'admin' && <Button asChild variant="outline"><Link href="/admin">Administration</Link></Button>}
      </div>
    </main>
  );
}