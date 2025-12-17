'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  if (!tournament) {
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
  const opponent = currentMatch?.participants.find(
    (p) => p.player_id !== currentUserId
  );

  // Check if match is already completed
  const isCompleted = currentMatch?.participants.some((p) => p.result === 'win');

  const handleCardClick = () => {
    router.push(`/tournament/${tournament.id}`);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMatch) {
      router.push(`/tournament/${tournament.id}/match/${currentMatch.id}`);
    } else {
      router.push(`/tournament/${tournament.id}`);
    }
  };

  const isPending = tournament.status === 'pending';

  return (
    <Card 
      className="bg-slate-900 border-slate-800 border-yellow-500/20 hover:border-yellow-500/40 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <span className="text-yellow-500">
            {isPending ? 'Tournament Pending' : 'Active Tournament'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-slate-400 mb-1">Tournament</p>
          <p className="text-lg font-semibold text-slate-100">{tournament.name}</p>
          {!isPending && currentMatch && (
            <p className="text-sm text-slate-400 mt-1">Round {currentMatch.round_number}</p>
          )}
        </div>
        
        {isPending && (
           <div>
            <p className="text-sm text-slate-400 mb-1">Status</p>
            <p className="text-lg text-slate-100">Drafting / Setup</p>
          </div>
        )}

        {!isPending && !currentMatch && (
           <div>
            <p className="text-sm text-slate-400 mb-1">Status</p>
            <p className="text-lg text-slate-100">Waiting for next round</p>
          </div>
        )}

        {!isPending && currentMatch && opponent && (
          <div>
            <p className="text-sm text-slate-400 mb-1">Your Match</p>
            <p className="text-lg text-slate-100">
              You vs. {opponent.player.nickname || opponent.player.name}
            </p>
          </div>
        )}
        
        {!isPending && currentMatch && !isCompleted && (
          <Button 
            onClick={handleButtonClick}
            className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950"
          >
            Enter Result
          </Button>
        )}

        {isPending && (
           <Button 
            onClick={handleButtonClick}
            className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950"
          >
            Go to Lobby
          </Button>
        )}

        {isCompleted && (
          <p className="text-sm text-slate-400">Match completed</p>
        )}
      </CardContent>
    </Card>
  );
}

