import { createClient } from '@/utils/supabase/server';
import { requireProfile } from '@/lib/get-current-user';
import ProfileForm from '@/components/profile/profile-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/logout-button';
import { PageIntro } from '@/components/layout/page-intro';
import { ArrowUpRight, Layers } from 'lucide-react';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { user, profile } = await requireProfile();
  const { count: deckCount } = await supabase
    .from('decks')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', profile.id);
  return (
    <main className="page collection-page profile-settings">
      <PageIntro
        compact
        eyebrow="PLAYER SETTINGS"
        title="Your profile"
        actions={
          <Button asChild variant="outline">
            <Link href={`/players/${profile.id}`}>View player profile</Link>
          </Button>
        }
      />
      <div className="profile-settings-grid">
        <section className="panel profile-form-panel">
          <ProfileForm
            userName={profile.username}
            userNickname={profile.display_name}
            userColor={profile.color}
            userAvatarUrl={profile.avatar_url}
          />
        </section>
        <aside className="stack">
          <Link className="utility-link" href="/decks">
            <Layers size={23} />
            <span>
              <strong>Your deckbox</strong>
              <small>{deckCount || 0} saved decks</small>
            </span>
            <ArrowUpRight size={18} />
          </Link>
          {user.is_anonymous && (
            <section className="profile-phone-note">
              <h2>Switching players</h2>
              <p>Choose another name on this phone. Your decks and results stay with your player.</p>
              <LogoutButton isGuest variant="outline" />
            </section>
          )}
          <Link className="arena-text-action" href="/players">
            Browse the playgroup →
          </Link>
          {!user.is_anonymous && <LogoutButton isGuest={false} variant="ghost" />}
          {profile.role === 'admin' && (
            <Button asChild variant="outline">
              <Link href="/admin">Administration</Link>
            </Button>
          )}
        </aside>
      </div>
    </main>
  );
}
