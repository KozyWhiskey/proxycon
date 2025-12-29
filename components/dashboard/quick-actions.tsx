'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Play, CalendarPlus, List, Users, Shield } from 'lucide-react';
import { CreateGuildDialog } from '@/components/guilds/create-guild-dialog';

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
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="font-heading">Event Actions</CardTitle>
          <CardDescription>Add games to this event.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            asChild
            className="w-full h-12 font-heading tracking-wide"
            variant="default"
          >
            <Link href={newTournamentHref}>
              <Plus className="w-5 h-5 mr-2" />
              New Tournament
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full h-12 text-muted-foreground hover:text-foreground bg-white/5 border-white/10 hover:bg-white/10 font-heading tracking-wide"
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
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="font-heading tracking-wide">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Create Guild (New Primary Action) */}
        <div className="space-y-2">
          <CreateGuildDialog>
            <Button
              className="w-full h-12 font-heading tracking-wide bg-gradient-to-r from-amber-700 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 border-none text-white shadow-lg shadow-amber-900/20"
            >
              <Shield className="w-5 h-5 mr-2" />
              Create Guild
            </Button>
          </CreateGuildDialog>
          <p className="text-[10px] text-muted-foreground/60 text-center uppercase tracking-widest font-heading">
            Establish a permanent home for your group.
          </p>
        </div>

        <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
            <span className="bg-[#09090b] px-3 text-muted-foreground/40 font-heading">Events</span>
            </div>
        </div>
        
        {/* Primary Workflow: Create Event */}
        <div className="space-y-2">
            <Button
            asChild
            className="w-full h-12 font-heading tracking-wide"
            variant="secondary"
            >
            <Link href="/events/new">
                <CalendarPlus className="w-5 h-5 mr-2" />
                Create Weekend Event
            </Link>
            </Button>
        </div>

        <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
            <span className="bg-[#09090b] px-3 text-muted-foreground/40 font-heading">Or One-Shot</span>
            </div>
        </div>

        {/* One-Shot Actions */}
        <div className="grid grid-cols-2 gap-3">
            <Button
            asChild
            variant="outline"
            className="w-full h-12 text-muted-foreground hover:text-foreground bg-white/5 border-white/10 hover:bg-white/10 font-heading tracking-wide"
            >
            <Link href={newTournamentHref}>
                <Plus className="w-4 h-4 mr-2" />
                Tournament
            </Link>
            </Button>
            <Button
            asChild
            variant="outline"
            className="w-full h-12 text-muted-foreground hover:text-foreground bg-white/5 border-white/10 hover:bg-white/10 font-heading tracking-wide"
            >
            <Link href={casualGameHref}>
                <Play className="w-4 h-4 mr-2" />
                Casual
            </Link>
            </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            asChild
            variant="ghost"
            className="w-full h-10 text-muted-foreground hover:text-primary hover:bg-white/5 font-heading tracking-wide text-xs"
          >
            <Link href="/tournaments">
              <List className="w-4 h-4 mr-2" />
              History
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full h-10 text-muted-foreground hover:text-primary hover:bg-white/5 font-heading tracking-wide text-xs"
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