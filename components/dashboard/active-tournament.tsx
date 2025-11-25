'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface MatchParticipant {
  id: string;
  player_id: string;
  result: string | null;
  player: {
    id: string;
    name: string;
    nickname: string | null;
  };
}

interface Match {
  id: string;
  round_number: number;
  participants: MatchParticipant[];
}

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
}

interface ActiveTournamentProps {
  tournament: Tournament | null;
  currentMatch: Match | null;
  currentUserId: string;
}

export default function ActiveTournament({
  tournament,
  currentMatch,
  currentUserId,
}: ActiveTournamentProps) {
  if (!tournament || !currentMatch) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Active Tournament</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">No tournament currently active.</p>
        </CardContent>
      </Card>
    );
  }

  // Find the opponent (the participant who is not the current user)
  const opponent = currentMatch.participants.find(
    (p) => p.player_id !== currentUserId
  );

  // Check if match is already completed
  const isCompleted = currentMatch.participants.some((p) => p.result === 'win');

  return (
    <Card className="bg-slate-900 border-slate-800 border-yellow-500/20">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <span className="text-yellow-500">Active Tournament</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-slate-400 mb-1">Tournament</p>
          <p className="text-lg font-semibold text-slate-100">{tournament.name}</p>
          <p className="text-sm text-slate-400 mt-1">Round {currentMatch.round_number}</p>
        </div>
        {opponent && (
          <div>
            <p className="text-sm text-slate-400 mb-1">Your Match</p>
            <p className="text-lg text-slate-100">
              You vs. {opponent.player.nickname || opponent.player.name}
            </p>
          </div>
        )}
        {!isCompleted && (
          <Button asChild className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950">
            <Link href={`/tournament/${tournament.id}/match/${currentMatch.id}`}>
              Enter Result
            </Link>
          </Button>
        )}
        {isCompleted && (
          <p className="text-sm text-slate-400">Match completed</p>
        )}
      </CardContent>
    </Card>
  );
}

