'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Play, Trophy } from 'lucide-react';

interface QuickActionsProps {
  eventId?: string;
}

export default function QuickActions({ eventId }: QuickActionsProps) {
  const newTournamentHref = eventId 
    ? `/tournament/new?eventId=${eventId}` 
    : '/tournament/new';

  const casualGameHref = eventId 
    ? `/play/casual?eventId=${eventId}` 
    : '/play/casual';

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          asChild
          className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
        >
          <Link href={newTournamentHref}>
            <Plus className="w-5 h-5 mr-2" />
            New Tournament
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full h-12 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
        >
          <Link href={casualGameHref}>
            <Play className="w-5 h-5 mr-2" />
            Log Casual Game
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full h-12 border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          <Link href="/tournaments">
            <Trophy className="w-4 h-4 mr-2" />
            Manage
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

