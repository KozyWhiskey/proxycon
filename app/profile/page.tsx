import { createClient } from '@/utils/supabase/server';
import { requireProfile } from '@/lib/get-current-user';
import ProfileForm from '@/components/profile/profile-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/logout-button';
import { PageIntro, FeaturePanel } from '@/components/layout/page-intro';
import { PlayerAvatar } from '@/components/events/arena-ui';
import { UserRound } from 'lucide-react';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { user, profile } = await requireProfile();
  const { count: deckCount } = await supabase.from('decks').select('*', { count:'exact', head:true }).eq('owner_id',profile.id);
  const name = profile.display_name || profile.username || 'Player';
  return <main className="page collection-page profile-settings"><PageIntro eyebrow="YOUR SEAT AT THE TABLE" title={<>Make it<br /><em>your name.</em></>} description="Your play name and colors follow you to every table." actions={<Button asChild variant="outline"><Link href={`/players/${profile.id}`}>View player profile</Link></Button>} />
    <div className="profile-settings-grid"><section className="panel profile-form-panel"><div className="profile-form-heading"><PlayerAvatar name={name} color={profile.color} /><div><h2>{name}</h2><p className="arena-caption">PLAYER DETAILS</p></div><UserRound size={20} /></div><ProfileForm userName={profile.username} userNickname={profile.display_name} userColor={profile.color} userAvatarUrl={profile.avatar_url} /></section>
    <aside className="stack"><FeaturePanel icon="decks" eyebrow={`${deckCount || 0} DECKS / YOUR COLLECTION`} title={<>Bring your<br />own style.</>} description="Build a collection that feels like you. Your saved commanders are ready at your next game." href="/decks" action="Open the deckbox" />{user.is_anonymous && <section className="profile-phone-note"><h2>This phone, your player.</h2><p>Switch player to pick a different name. Decks and results stay with the player, so you can pick that name again.</p><LogoutButton isGuest variant="outline" /></section>}<Link className="arena-text-action" href="/players">Browse the playgroup →</Link>{!user.is_anonymous && <LogoutButton isGuest={false} variant="ghost" />}{profile.role === 'admin' && <Button asChild variant="outline"><Link href="/admin">Administration</Link></Button>}</aside></div>
  </main>;
}
