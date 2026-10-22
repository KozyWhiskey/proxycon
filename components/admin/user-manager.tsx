'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserRole } from '@/app/admin/actions';
import { AddPlayerForm } from '@/components/who/add-player-form';
import type { Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function UserManager({ users, guestProfileIds = [], currentUserId }: {
  users: Profile[];
  guestProfileIds?: string[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const shown = users.filter(user => `${user.display_name || ''} ${user.username || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  function changeRole(user: Profile) {
    start(async () => {
      try {
        const result = await updateUserRole(user.id, user.role === 'admin' ? 'user' : 'admin');
        if (!result.success) { toast.error(result.message || 'Could not change this role.'); return; }
        toast.success('Player role updated.');
        router.refresh();
      } catch { toast.error('Could not change this role. Check your connection and try again.'); }
    });
  }

  return <section className="panel space-y-5">
    <AddPlayerForm heading="Add a player" />
    <div><h2 className="text-2xl">Players</h2><p className="subtle mt-2">Browse profiles and manage administrator access. Your own admin role stays protected.</p></div>
    <Input aria-label="Find a player account" placeholder="Find a player" className="max-w-md" value={search} onChange={event => setSearch(event.target.value)} />
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Player</th><th>Account</th><th className="text-right">Access</th></tr></thead><tbody>{shown.map(user => {
      const guest = guestProfileIds.includes(user.id);
      const self = user.id === currentUserId;
      const name = user.display_name?.trim() || user.username || 'Player';
      return <tr key={user.id}><td><Link href={`/players/${user.id}`} className="flex items-center gap-3"><Avatar><AvatarImage src={user.avatar_url || undefined} alt="" /><AvatarFallback>{name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar><span><strong className="font-medium">{name}{self ? ' (you)' : ''}</strong>{user.username && <small className="block text-muted-foreground">@{user.username.replace(/^@/,'').trim()}</small>}</span></Link></td><td className="text-muted-foreground">{guest ? 'Weekend guest' : user.role === 'admin' ? 'Administrator' : 'Player'}</td><td className="text-right"><Button variant="outline" size="sm" disabled={pending || guest || self} onClick={() => changeRole(user)}>{self ? 'Your admin account' : guest ? 'Player access' : user.role === 'admin' ? 'Revoke admin' : 'Make admin'}</Button></td></tr>;
    })}</tbody></table></div>
    {!shown.length && <p role="status" className="subtle">No players found.</p>}
  </section>;
}
