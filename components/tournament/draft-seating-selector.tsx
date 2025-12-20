'use client';

import { useState, useEffect } from 'react';
import { selectSeat, startDraft, randomizeSeating } from '@/app/tournament/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Shuffle } from 'lucide-react';

// V3 Interfaces
interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
}

interface Participant {
  id: string;
  profile_id: string;
  draft_seat: number | null;
  profile: Profile | null;
}

interface DraftSeatingSelectorProps {
  tournamentId: string;
  participants: Participant[];
  numPlayers: number;
  allSeatsAssigned: boolean;
}

export default function DraftSeatingSelector({
  tournamentId,
  participants,
  numPlayers,
  allSeatsAssigned,
}: DraftSeatingSelectorProps) {
  const router = useRouter();
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localParticipants, setLocalParticipants] = useState(participants);

  // Sync local state with props when they change
  useEffect(() => {
    setLocalParticipants(participants);
  }, [participants]);

  const participantsWithSeats = localParticipants.filter((p) => p.draft_seat !== null);
  const allSeatsAssignedLocal = participantsWithSeats.length === numPlayers;

  const seatMap = new Map<number, Participant>();
  localParticipants.forEach((p) => {
    if (p.draft_seat !== null) {
      seatMap.set(p.draft_seat, p);
    }
  });

  const seatsPerSide = Math.ceil(numPlayers / 2);
  const topRowSeats = Array.from({ length: seatsPerSide }, (_, i) => i + 1);
  const bottomRowSeats = Array.from(
    { length: numPlayers - seatsPerSide },
    (_, i) => i + seatsPerSide + 1
  ).reverse();

  const handleSeatClick = (seatNumber: number) => {
    setSelectedSeat(seatNumber);
    setIsDialogOpen(true);
  };

  const handleAssignPlayer = async (profileId: string) => {
    if (!selectedSeat) return;

    setIsSubmitting(true);

    try {
      // Note: Action still uses variable name 'playerId' but expects profile_id
      const result = await selectSeat(tournamentId, profileId, selectedSeat);

      if (!result.success) {
        toast.error(result.message || 'Failed to assign seat');
        setIsSubmitting(false);
        return;
      }

      const updatedParticipants = localParticipants.map((p) =>
        p.profile_id === profileId
          ? { ...p, draft_seat: selectedSeat }
          : p.draft_seat === selectedSeat && p.profile_id !== profileId
            ? { ...p, draft_seat: null }
            : p
      );
      setLocalParticipants(updatedParticipants);
      setIsDialogOpen(false);
      setSelectedSeat(null);
      
      const p = localParticipants.find((p) => p.profile_id === profileId);
      const name = p?.profile?.display_name || p?.profile?.username || 'Player';
      toast.success(`${name} assigned to seat ${selectedSeat}`);
    } catch (error) {
      console.error('Error assigning seat:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearSeat = async (profileId: string) => {
    setIsSubmitting(true);

    try {
      const result = await selectSeat(tournamentId, profileId, null);

      if (!result.success) {
        toast.error(result.message || 'Failed to clear seat');
        setIsSubmitting(false);
        return;
      }

      const updatedParticipants = localParticipants.map((p) =>
        p.profile_id === profileId
          ? { ...p, draft_seat: null }
          : p
      );
      setLocalParticipants(updatedParticipants);
      setIsDialogOpen(false);
      setSelectedSeat(null);
      toast.success('Seat cleared');
    } catch (error) {
      console.error('Error clearing seat:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartDraft = async () => {
    if (!allSeatsAssignedLocal) {
      toast.error('All players must select their seats before starting the draft');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await startDraft(tournamentId);

      if (!result.success) {
        toast.error(result.message || 'Failed to start draft');
        setIsSubmitting(false);
        return;
      }
      // Redirect happens via server action
    } catch (error) {
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = (error as { digest?: string }).digest;
        if (digest?.startsWith('NEXT_REDIRECT')) {
          return;
        }
      }
      console.error('Error starting draft:', error);
      toast.error('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleRandomize = async () => {
    if (participantsWithSeats.length > 0) {
      if (!confirm('This will overwrite existing seat assignments. Are you sure?')) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await randomizeSeating(tournamentId);
      if (result.success) {
        toast.success('Seating randomized');
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to randomize');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeatStatus = (seatNumber: number) => {
    const participant = seatMap.get(seatNumber);
    if (!participant) {
      return { status: 'available', participant: null };
    }
    return {
      status: 'taken',
      participant,
    };
  };

  const availablePlayers = localParticipants.filter((p) => p.draft_seat === null);
  const currentSeatPlayer = selectedSeat ? seatMap.get(selectedSeat) : null;

  return (
    <div className="space-y-6">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Assign Seats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-muted-foreground mb-1">
                Click on a seat to assign a player. Seats are numbered 1 through {numPlayers}.
                In Round 1, players will be paired with the player across from them.
              </p>
              <p className="text-muted-foreground text-sm">
                {participantsWithSeats.length} of {numPlayers} seats assigned
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRandomize} 
              disabled={isSubmitting}
              className="shrink-0"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Randomize
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Draft Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="flex flex-wrap justify-center gap-4">
              {topRowSeats.map((seatNum) => {
                const { status, participant } = getSeatStatus(seatNum);
                const isTaken = status === 'taken';

                return (
                  <button
                    key={seatNum}
                    onClick={() => handleSeatClick(seatNum)}
                    disabled={isSubmitting}
                    className={`w-24 h-24 rounded-lg border-2 transition-all ${
                      isTaken
                        ? 'bg-primary/20 border-primary border-glow'
                        : 'bg-white/5 border-white/10 hover:border-primary/50 hover:bg-white/10 cursor-pointer'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-2xl font-bold font-heading text-foreground">{seatNum}</span>
                      {isTaken && participant && (
                        <span className="text-xs text-muted-foreground truncate w-full px-1">
                          {participant.profile?.display_name || participant.profile?.username || 'Player'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-center">
              <div className="h-1 w-full bg-white/10 rounded"></div>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {bottomRowSeats.map((seatNum) => {
                const { status, participant } = getSeatStatus(seatNum);
                const isTaken = status === 'taken';

                return (
                  <button
                    key={seatNum}
                    onClick={() => handleSeatClick(seatNum)}
                    disabled={isSubmitting}
                    className={`w-24 h-24 rounded-lg border-2 transition-all ${
                      isTaken
                        ? 'bg-primary/20 border-primary border-glow'
                        : 'bg-white/5 border-white/10 hover:border-primary/50 hover:bg-white/10 cursor-pointer'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-2xl font-bold font-heading text-foreground">{seatNum}</span>
                      {isTaken && participant && (
                        <span className="text-xs text-muted-foreground truncate w-full px-1">
                          {participant.profile?.display_name || participant.profile?.username || 'Player'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {allSeatsAssignedLocal && (
        <Card className="glass-panel border-primary/50">
          <CardContent className="pt-6">
            <Button
              onClick={handleStartDraft}
              disabled={isSubmitting}
              className="w-full h-12 font-semibold disabled:opacity-50"
              variant="default"
            >
              {isSubmitting ? 'Starting Draft...' : 'Start Draft'}
            </Button>
            <p className="text-sm text-muted-foreground text-center mt-2">
              All players have selected their seats. Click to start Round 1.
            </p>
          </CardContent>
        </Card>
      )}

      {!allSeatsAssignedLocal && (
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              {participantsWithSeats.length} of {numPlayers} seats assigned
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign Seat {selectedSeat}
            </DialogTitle>
            <DialogDescription>
              {currentSeatPlayer
                ? `${currentSeatPlayer.profile?.display_name || currentSeatPlayer.profile?.username || 'Player'} is currently in this seat.`
                : 'Select a player to assign to this seat.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {currentSeatPlayer && (
              <Button
                onClick={() => handleClearSeat(currentSeatPlayer.profile_id)}
                disabled={isSubmitting}
                className="w-full"
                variant="destructive"
              >
                Clear Seat
              </Button>
            )}

            {availablePlayers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-semibold">Available Players:</p>
                {availablePlayers.map((participant) => (
                  <Button
                    key={participant.id}
                    onClick={() => handleAssignPlayer(participant.profile_id)}
                    disabled={isSubmitting}
                    className="w-full"
                    variant="outline"
                  >
                    {participant.profile?.display_name || participant.profile?.username || 'Player'}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">
                {currentSeatPlayer
                  ? 'All other players are already assigned to seats.'
                  : 'All players are already assigned to seats.'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
