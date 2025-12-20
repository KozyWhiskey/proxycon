'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// V3 Interfaces (aligned with lib/types.ts and fetched data)
interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
}

interface MatchParticipant {
  id: string; // match_participant_id
  profile_id: string;
  result: 'win' | 'loss' | 'draw' | null;
  profile: Profile; // Nested profile object
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
  status: string; // 'pending', 'active', 'completed'
}

interface ActiveTournamentProps {
  tournament: Tournament | null;
  currentMatch: Match | null;
  currentProfileId: string; // Changed from currentUserId
}

export default function ActiveTournament({
  tournament,
  currentMatch,
  currentProfileId,
}: ActiveTournamentProps) {
  const router = useRouter();

  if (!tournament) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="font-heading">Active Tournament</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground italic">No tournament currently active.</p>
        </CardContent>
      </Card>
    );
  }

  // Find the opponent (the participant who is not the current user)
  const opponent = currentMatch?.participants.find(
    (p) => p.profile_id !== currentProfileId
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
      className="glass-panel border-primary/40 hover:border-primary transition-all duration-300 cursor-pointer group"
      onClick={handleCardClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading tracking-wide">
          <span className="text-primary text-glow group-hover:drop-shadow-[0_0_8px_rgba(231,153,9,0.5)] transition-all">
            {isPending ? 'Tournament Pending' : 'Active Tournament'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-heading">Tournament</p>
          <p className="text-lg font-semibold text-foreground font-heading tracking-wide">{tournament.name}</p>
          {!isPending && currentMatch && (
            <p className="text-xs text-primary mt-1 font-mono uppercase tracking-wider">Round {currentMatch.round_number}</p>
          )}
        </div>
        
        {isPending && (
           <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-heading">Status</p>
            <p className="text-lg text-foreground font-heading">Drafting / Setup</p>
          </div>
        )}

        {!isPending && !currentMatch && (
           <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-heading">Status</p>
            <p className="text-lg text-foreground font-heading">Waiting for next round</p>
          </div>
        )}

        {!isPending && currentMatch && opponent && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-heading">Your Match</p>
            <p className="text-lg text-foreground font-heading">
              You <span className="text-muted-foreground/40 font-sans mx-1">vs.</span> {opponent.profile.display_name || opponent.profile.username}
            </p>
          </div>
        )}
        
        {!isPending && currentMatch && !isCompleted && (
          <Button 
            onClick={handleButtonClick}
            className="w-full h-12 font-heading tracking-widest"
            variant="default"
          >
            Enter Result
          </Button>
        )}

        {isPending && (
           <Button 
            onClick={handleButtonClick}
            className="w-full h-12 font-heading tracking-widest"
            variant="default"
          >
            Go to Lobby
          </Button>
        )}

        {isCompleted && (
          <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest">Match completed</p>
        )}
      </CardContent>
    </Card>
  );
}
