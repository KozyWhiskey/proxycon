'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { guestToken } from '@/lib/guest-access';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
export function GuestLinkEntry() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  function open(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = value.trim().split(/[?#]/)[0].replace(/\/$/, '').split('/').pop() || '';
    if (!guestToken.safeParse(token).success) { setError('Paste the full guest link your admin shared.'); return; }
    router.push(`/guest/${token}`);
  }
  return <form onSubmit={open} className="space-y-4"><label className="grid gap-2 text-sm">Guest link<Input value={value} onChange={event => {setValue(event.target.value);setError('');}} placeholder="Paste your weekend guest link" required autoCapitalize="none" autoCorrect="off" /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" className="w-full">Find my spot</Button></form>;
}
