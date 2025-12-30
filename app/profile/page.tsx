import { createClient } from '@/utils/supabase/server';
import { requireProfile } from '@/lib/get-current-user';
import PageHeader from '@/components/ui/page-header';
import ProfileForm from '@/components/profile/profile-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Swords, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { TrophyCase } from '@/components/profile/trophy-case';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { user, profile } = await requireProfile();

  // Fetch deck count for a quick stat
  const { count: deckCount } = await supabase
    .from('decks')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id);

  // Fetch badges
  const { data: rawBadges } = await supabase
    .from('profile_badges')
    .select(`
      awarded_at,
      badges (id, slug, name, description, icon_url, metadata),
      events (name)
    `)
    .eq('profile_id', user.id)
    .order('awarded_at', { ascending: false });

  // Transform for UI
  const badges = rawBadges?.map((item: any) => ({
    ...item.badges,
    awarded_at: item.awarded_at,
    event_name: item.events?.name
  })) || [];

  return (
    <main className="min-h-screen bg-background pb-24">
      <PageHeader
        title="My Profile"
        subtitle="Manage your identity and decks"
        backHref="/"
        backLabel="Home"
      />

      <div className="max-w-3xl mx-auto p-4 space-y-8 mt-4 md:mt-8">
        {/* Profile Settings */}
        <Card className="glass-panel">
          <CardHeader className="border-b border-white/5 pb-6">
            <CardTitle className="text-xl text-foreground font-heading tracking-wide">Personal Details</CardTitle>
            <CardDescription className="text-muted-foreground/60 text-xs uppercase tracking-widest">Update how you appear to others.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <ProfileForm
              userName={profile.username}
              userNickname={profile.display_name}
              userColor={null} // Color theme not yet supported in V3 profiles
              userAvatarUrl={profile.avatar_url}
            />
          </CardContent>
        </Card>

        {/* Decks Section */}
        <Card className="glass-panel">
          <CardHeader className="border-b border-white/5 pb-6">
            <CardTitle className="text-xl text-foreground font-heading tracking-wide">My Decks</CardTitle>
            <CardDescription className="text-muted-foreground/60 text-xs uppercase tracking-widest">Manage your library of {deckCount || 0} decks.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <Button asChild variant="outline" className="w-full h-14 bg-white/5 border-white/10 hover:bg-white/10 justify-between px-6 group">
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

        {/* Trophy Case */}
        <TrophyCase badges={badges} />
      </div>
    </main>
  );
}