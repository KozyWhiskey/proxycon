'use client';
import { Button } from '@/components/ui/button';
export default function PlayersError({ reset }: { reset: () => void }) {
  return <main className="page"><section className="panel space-y-4"><h1 className="text-3xl">Could not load the playgroup</h1><p className="subtle">Check your connection and try again.</p><Button onClick={reset}>Try again</Button></section></main>;
}

