'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge as UiBadge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trophy } from 'lucide-react';
import type { Badge } from '@/lib/badges';

interface TrophyCaseProps {
  badges: (Badge & { awarded_at: string; event_name?: string })[];
  variant?: 'full' | 'dashboard';
}

export function TrophyCase({ badges, variant = 'full' }: TrophyCaseProps) {
  const isDashboard = variant === 'dashboard';

  if (!badges || badges.length === 0) {
    if (isDashboard) return null; // Don't show empty trophy case on dashboard

    return (
      <Card className="glass-panel opacity-80">
        <CardHeader className="border-b border-white/5 pb-6">
          <CardTitle className="text-xl text-foreground font-heading tracking-wide flex items-center gap-2">
            <Trophy className="w-5 h-5 text-muted-foreground" />
            Trophy Case
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 text-center text-muted-foreground py-12">
          <p>No badges earned yet.</p>
          <p className="text-xs mt-2">Play matches to unlock achievements!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel">
      <CardHeader className={`border-b border-white/5 ${isDashboard ? 'pb-4' : 'pb-6'}`}>
        <CardTitle className={`${isDashboard ? 'text-lg' : 'text-xl'} text-foreground font-heading tracking-wide flex items-center gap-2`}>
          <Trophy className={`${isDashboard ? 'w-4 h-4' : 'w-5 h-5'} text-primary`} />
          Trophy Case
        </CardTitle>
        {!isDashboard && (
          <CardDescription className="text-muted-foreground/60 text-xs uppercase tracking-widest">
            {badges.length} Achievements Unlocked
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={`${isDashboard ? 'pt-4' : 'pt-8'}`}>
        <div className={`grid gap-4 ${isDashboard ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
          {badges.map((badge) => {
            const isUrl = badge.icon_url?.startsWith('http');
            const rarity = badge.metadata?.rarity;
            
            let rarityClass = 'border-white/10 bg-white/5 hover:border-primary/30';
            
            if (rarity === 'mythic') {
              rarityClass = 'border-orange-500/50 bg-orange-500/5 hover:border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.1)]';
            } else if (rarity === 'rare') {
              rarityClass = 'border-amber-400/50 bg-amber-400/5 hover:border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.1)]';
            } else if (rarity === 'uncommon') {
              rarityClass = 'border-blue-400/50 bg-blue-400/5 hover:border-blue-400/80 shadow-[0_0_15px_rgba(96,165,250,0.1)]';
            }
            
            return (
              <TooltipProvider key={`${badge.id}-${badge.awarded_at}`}>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div 
                      className={`group relative flex flex-col items-center rounded-xl border transition-all text-center cursor-default ${rarityClass} ${
                        isDashboard ? 'p-2' : 'p-4'
                      }`}
                    >
                      <div className={`${isDashboard ? 'h-8 w-8 mb-1' : 'h-16 w-16 mb-3'} flex items-center justify-center drop-shadow-md transform group-hover:scale-110 transition-transform duration-300`}>
                        {isUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={badge.icon_url} 
                            alt={badge.name}
                            className={`object-contain w-full h-full ${badge.icon_url.includes('svg') ? 'invert opacity-80' : 'rounded-full border-2 border-primary/20'}`}
                          />
                        ) : (
                          <span className={isDashboard ? 'text-2xl' : 'text-4xl'}>{badge.icon_url || '🏆'}</span>
                        )}
                      </div>
                      <h3 className={`font-bold text-foreground group-hover:text-primary transition-colors ${
                        isDashboard ? 'text-xs line-clamp-1' : 'text-sm'
                      }`}>
                        {badge.name}
                      </h3>
                      {!isDashboard && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {badge.description}
                        </p>
                      )}
                      {!isDashboard && badge.event_name && (
                        <UiBadge variant="outline" className="mt-3 text-[10px] border-white/10 text-muted-foreground">
                          {badge.event_name}
                        </UiBadge>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-center p-3">
                    <div className="flex items-center justify-center gap-2 mb-1">
                       <p className="font-bold text-primary">{badge.name}</p>
                       {rarity && <span className={`text-[10px] uppercase tracking-widest px-1 rounded border ${
                         rarity === 'mythic' ? 'border-orange-500 text-orange-500' : 
                         rarity === 'rare' ? 'border-amber-400 text-amber-400' : 
                         'border-blue-400 text-blue-400'
                       }`}>{rarity}</span>}
                    </div>
                    <p className="text-zinc-300">{badge.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
