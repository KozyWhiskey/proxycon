'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Brand } from '@/components/layout/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ManaIdentity } from '@/components/ui/mana-identity';
import { chooseHouse, chooseProfile, createPlaygroupProfile } from '@/app/who/actions';

export interface PickerPlayer {
  id: string;
  name: string;
  color: string | null;
}

function ContinueButton({ name, color }: { name: string; color: string | null }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="outline" className="w-full justify-start min-h-12 text-base" disabled={pending}><ManaIdentity color={color} /><span className="min-w-0 break-words">{pending ? 'Opening…' : name}</span></Button>;
}

export function NamePicker({ players, next = "/", houseNext = "/", eventName }: { players: PickerPlayer[]; next?: string; houseNext?: string; eventName?: string }) {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const shown = players.filter((player) => player.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  return (
    <main className="page form-page name-picker task-page">
      <Brand />
      <header>
        <p className="eyebrow mt-6">Your playgroup</p>
        <h1 className="font-sans text-3xl font-semibold tracking-tight">{eventName ? <>Choose your name<span className="invite-event-context">to join {eventName}</span></> : "Who are you?"}</h1>
        <p className="subtle mt-4">Pick your name. Decks and results stay with that player.</p>
      </header>
      <form action={async () => { const result = await chooseHouse(houseNext); if (result?.message) setMessage(result.message); }}><Button type="submit" variant="outline" className="w-full">Use the house screen</Button></form>
      <section className="panel space-y-4">
        <Label htmlFor="player-search">Find your name</Label>
        <Input id="player-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Scott, Chris…" autoComplete="off" />
        <div className="name-choices">
          {shown.map((player) => (
            <form key={player.id} action={async (formData) => { const result=await chooseProfile(formData);if(result?.message)setMessage(result.message); }} className="flex items-center gap-3">
              <input type="hidden" name="next" value={next} /><input type="hidden" name="profileId" value={player.id} />
              <ContinueButton name={player.name} color={player.color} />
            </form>
          ))}
          {!shown.length && <p className="subtle">No name matches. Add yours below.</p>}
        </div>
      </section>
      <section className="panel space-y-4">
        <h2 className="text-xl">Don&apos;t see your name?</h2>
        <form action={async (formData) => {
          const result = await createPlaygroupProfile(formData);
          if (result?.message) setMessage(result.message);
        }} className="space-y-3">
          <input type="hidden" name="next" value={next} /><input type="hidden" name="bind" value="1" />
          <Label htmlFor="new-player">Play name</Label>
          <Input id="new-player" name="name" required maxLength={60} placeholder="Your name" autoComplete="nickname" />
          <Button type="submit" className="w-full">Add me and continue</Button>
          {message && <p role="status" className="text-sm">{message}</p>}
        </form>
      </section>
      <Link className="text-link text-sm" href={`/login?next=${encodeURIComponent(next)}`}>Sign in with an existing account →</Link>
    </main>
  );
}
