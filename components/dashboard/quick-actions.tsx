'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Play, Trophy, CalendarPlus, List, Users } from 'lucide-react';

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

  if (eventId) {
    // EVENT CONTEXT - Focused on adding content to the current event
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Event Actions</CardTitle>
          <CardDescription>Add games to this event.</CardDescription>
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
        </CardContent>
      </Card>
    );
  }

  // GLOBAL CONTEXT - Focused on creating events or one-shots
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        
        {/* Primary Workflow: Create Event */}
        <div className="space-y-2">
            <Button
            asChild
            className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
            >
            <Link href="/events/new">
                <CalendarPlus className="w-5 h-5 mr-2" />
                Create New Event
            </Link>
            </Button>
            <p className="text-xs text-slate-500 text-center">
            Best for weekends or tracked leagues.
            </p>
        </div>

        <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-500">Or One-Shot</span>
            </div>
        </div>

        {/* One-Shot Actions */}
        <div className="grid grid-cols-2 gap-3">
            <Button
            asChild
            variant="outline"
            className="w-full h-12 border-slate-700 text-slate-300 hover:bg-slate-800"
            >
            <Link href={newTournamentHref}>
                <Plus className="w-4 h-4 mr-2" />
                Tournament
            </Link>
            </Button>
            <Button
            asChild
            variant="outline"
            className="w-full h-12 border-emerald-900/50 text-emerald-500 hover:bg-emerald-900/20"
            >
            <Link href={casualGameHref}>
                <Play className="w-4 h-4 mr-2" />
                Casual
            </Link>
            </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            asChild
            variant="ghost"
            className="w-full h-10 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <Link href="/tournaments">
              <List className="w-4 h-4 mr-2" />
              Tournaments
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full h-10 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <Link href="/players">
              <Users className="w-4 h-4 mr-2" />
              Community
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

