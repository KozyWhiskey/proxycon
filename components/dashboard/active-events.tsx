'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, ArrowRight, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  role?: string;
}

interface ActiveEventsProps {
  events: Event[];
}

export default function ActiveEvents({ events }: ActiveEventsProps) {
  const router = useRouter();

  if (!events || events.length === 0) {
    return null; // Don't show if no active events (reduces clutter)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Ongoing';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="glass-panel border-primary/40 hover:border-primary transition-all duration-300 group">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading tracking-wide">
          <Calendar className="w-5 h-5 text-primary" />
          <span className="text-primary text-glow group-hover:drop-shadow-[0_0_8px_rgba(231,153,9,0.5)] transition-all">Active Events</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.map((event) => (
          <div 
            key={event.id}
            className="group/item flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer border border-white/5 hover:border-primary/20"
            onClick={() => router.push(`/events/${event.id}`)}
          >
            <div className="flex flex-col gap-1 min-w-0">
              <h4 className="font-heading font-semibold text-foreground group-hover/item:text-primary transition-colors truncate tracking-wide">
                {event.name}
              </h4>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDate(event.start_date)}
                  {event.end_date ? ` - ${formatDate(event.end_date)}` : ''}
                </span>
                {event.role === 'owner' && (
                  <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                    Owner
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover/item:text-primary transition-all translate-x-0 group-hover/item:translate-x-1 flex-shrink-0 ml-2" />
          </div>
        ))}
        
        <Button 
          variant="outline" 
          className="w-full text-[10px] h-9 text-muted-foreground hover:text-foreground font-heading uppercase tracking-widest bg-white/5 border-white/10"
          asChild
        >
          <Link href="/events">
            View All Events
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}