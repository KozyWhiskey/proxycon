'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

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

interface Match {
  id: string;
  tournament_id: string | null;
  round_number: number | null;
  game_type: string | null;
  created_at: string;
  participants: MatchParticipant[];
}

interface FeedProps {
  matches: Match[];
}

export default function Feed({ matches }: FeedProps) {
  if (matches.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">The Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">No recent matches. Start playing to see activity here!</p>
        </CardContent>
      </Card>
    );
  }

  const formatMatchResult = (match: Match): string => {
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
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">The Feed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {matches.map((match, index) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="pb-4 border-b border-slate-800 last:border-0 last:pb-0"
          >
            <p className="text-slate-100 mb-1">{formatMatchResult(match)}</p>
            <p className="text-xs text-slate-500">{formatDate(match.created_at)}</p>
            {/* Placeholder for AI-generated roast */}
            <p className="text-sm text-muted-foreground italic mt-2">
              {/* AI roast will go here */}
            </p>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

