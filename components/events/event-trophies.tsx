'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trophy } from 'lucide-react';
import type { Badge } from '@/lib/badges';

interface EventTrophy {
  id: string;
  awarded_at: string;
  badge: Badge;
  profile: {
    id: string;
    display_name: string;
  };
}

interface EventTrophiesProps {
  trophies: EventTrophy[];
}

export default function EventTrophies({ trophies }: EventTrophiesProps) {
  if (!trophies || trophies.length === 0) {
    return (
      <Card className="glass-panel opacity-80">
        <CardHeader className="border-b border-white/5 pb-6">
          <CardTitle className="text-xl text-foreground font-heading tracking-wide flex items-center gap-2">
            <Trophy className="w-5 h-5 text-muted-foreground" />
            Event Trophies
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 text-center text-muted-foreground py-12">
          <p>No trophies awarded in this event yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel">
      <CardHeader className="border-b border-white/5 pb-6">
        <CardTitle className="text-xl text-foreground font-heading tracking-wide flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Awarded Trophies
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {trophies.map((trophy) => (
            <div 
              key={`${trophy.id}`} 
              className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 transition-colors"
            >
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-zinc-900 rounded-full border border-white/10 overflow-hidden cursor-default">
                       {trophy.badge.icon_url?.startsWith('http') ? (
                         // eslint-disable-next-line @next/next/no-img-element
                         <img 
                           src={trophy.badge.icon_url} 
                           alt={trophy.badge.name} 
                           className={`w-full h-full object-contain ${trophy.badge.icon_url.includes('svg') ? 'invert opacity-80' : ''}`} 
                         />
                       ) : (
                         <span className="text-xl">{trophy.badge.icon_url || '🏆'}</span>
                       )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-bold text-primary">{trophy.badge.name}</p>
                    <p className="text-xs max-w-[200px]">{trophy.badge.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {trophy.profile.display_name}
                </p>
                <p className="text-xs text-amber-200/80 truncate">
                  Earned {trophy.badge.name}
                </p>
              </div>
              
              <div className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                {new Date(trophy.awarded_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
