'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Player {
  id: string;
  name: string;
  nickname: string | null;
}

interface MatchParticipant {
  id: string;
  player_id: string;
  result: string | null;
  player: Player;
}

export interface FeedMatch {
  type: 'match';
  id: string;
  tournament_id: string | null;
  round_number: number | null;
  game_type: string | null;
  created_at: string;
  participants: MatchParticipant[];
}

export interface FeedBadge {
  type: 'badge';
  id: string;
  awarded_at: string;
  badge: {
    name: string;
    description: string;
    icon_url: string;
  };
  profile: {
    display_name: string;
  };
}

export type FeedItem = FeedMatch | FeedBadge;

interface FeedProps {
  items: FeedItem[];
}

export default function Feed({ items }: FeedProps) {
  if (items.length === 0) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="font-heading">Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground italic">No recent activity. Start playing to see updates here!</p>
        </CardContent>
      </Card>
    );
  }

  const formatMatchResult = (match: FeedMatch): string => {
    const winners = match.participants.filter((p) => p.result === 'win' || p.result === '1st');
    const losers = match.participants.filter((p) => p.result === 'loss' || ['2nd', '3rd', '4th'].includes(p.result || ''));

    if (winners.length === 0 || losers.length === 0) {
      return 'Match in progress';
    }

    const winnerNames = winners.map((w) => w.player.nickname || w.player.name).join(' & ');
    const loserNames = losers.map((l) => l.player.nickname || l.player.name).join(' & ');
    const gameType = match.game_type || (match.tournament_id ? 'Tournament' : 'Casual');

    return `${winnerNames} beat ${loserNames} in ${gameType}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 36000000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="glass-panel">
      <CardHeader className="border-b border-white/5 mb-4">
        <CardTitle className="font-heading tracking-wide">Activity Feed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <motion.div
            key={`${item.type}-${item.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="pb-4 border-b border-white/5 last:border-0 last:pb-0"
          >
            {item.type === 'match' ? (
              <>
                <p className="text-foreground mb-1 text-sm font-medium">{formatMatchResult(item)}</p>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">{formatDate(item.created_at)}</p>
                  {item.round_number && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-bold uppercase">Round {item.round_number}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">
                  <TooltipProvider>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                         <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-lg cursor-default">
                           {item.badge.icon_url?.startsWith('http') ? (
                             // eslint-disable-next-line @next/next/no-img-element
                             <img src={item.badge.icon_url} alt={item.badge.name} className={`w-full h-full object-contain ${item.badge.icon_url.includes('svg') ? 'invert opacity-80' : 'rounded-full'}`} />
                           ) : (
                             <span>{item.badge.icon_url || '🏆'}</span>
                           )}
                         </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="font-bold text-primary">{item.badge.name}</p>
                        <p className="text-xs text-zinc-300 max-w-[200px]">{item.badge.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex-1">
                  <p className="text-foreground text-sm font-medium">
                    <span className="text-primary font-bold">{item.profile.display_name}</span> earned <span className="text-amber-200 font-bold">{item.badge.name}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mt-1">{formatDate(item.awarded_at)}</p>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}