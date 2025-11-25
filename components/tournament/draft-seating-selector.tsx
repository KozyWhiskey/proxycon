'use client';

import { useState } from 'react';
import { selectSeat, startDraft } from '@/app/tournament/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Player {
  id: string;
  name: string;
  nickname: string | null;
}

interface Participant {
  id: string;
  player_id: string;
  draft_seat: number | null;
  players: Player | null;
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

  // Calculate participants with seats assigned
  const participantsWithSeats = localParticipants.filter((p) => p.draft_seat !== null);
  const allSeatsAssignedLocal = participantsWithSeats.length === numPlayers;

  // Create seat map
  const seatMap = new Map<number, Participant>();
  localParticipants.forEach((p) => {
    if (p.draft_seat !== null) {
      seatMap.set(p.draft_seat, p);
    }
  });

  // Calculate table layout
  // For N players, seats go clockwise around the table:
  // Top row: 1, 2, 3... (left to right)
  // Bottom row: (N/2+1) to N, but displayed right to left for clockwise
  // Example for 6 players: Top [1,2,3], Bottom [4,5,6] displayed as [6,5,4]
  const seatsPerSide = Math.ceil(numPlayers / 2);
  const topRowSeats = Array.from({ length: seatsPerSide }, (_, i) => i + 1);
  const bottomRowSeats = Array.from(
    { length: numPlayers - seatsPerSide },
    (_, i) => i + seatsPerSide + 1
  ).reverse(); // Reverse to display right to left (clockwise continuation)

  const handleSeatClick = (seatNumber: number) => {
    setSelectedSeat(seatNumber);
    setIsDialogOpen(true);
  };

  const handleAssignPlayer = async (playerId: string) => {
    if (!selectedSeat) return;

    setIsSubmitting(true);

    try {
      const result = await selectSeat(tournamentId, playerId, selectedSeat);

      if (!result.success) {
        toast.error(result.message || 'Failed to assign seat');
        setIsSubmitting(false);
        return;
      }

      // Update local state
      const updatedParticipants = localParticipants.map((p) =>
        p.player_id === playerId
          ? { ...p, draft_seat: selectedSeat }
          : p.draft_seat === selectedSeat && p.player_id !== playerId
            ? { ...p, draft_seat: null }
            : p
      );
      setLocalParticipants(updatedParticipants);
      setIsDialogOpen(false);
      setSelectedSeat(null);
      
      const player = localParticipants.find((p) => p.player_id === playerId);
      const playerName = player?.players?.nickname || player?.players?.name || 'Player';
      toast.success(`${playerName} assigned to seat ${selectedSeat}`);
    } catch (error) {
      console.error('Error assigning seat:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearSeat = async (playerId: string) => {
    setIsSubmitting(true);

    try {
      const result = await selectSeat(tournamentId, playerId, null);

      if (!result.success) {
        toast.error(result.message || 'Failed to clear seat');
        setIsSubmitting(false);
        return;
      }

      // Update local state
      const updatedParticipants = localParticipants.map((p) =>
        p.player_id === playerId
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

      // Redirect will happen via server action
      router.push(`/tournament/${tournamentId}`);
    } catch (error) {
      // Check if this is a redirect error (expected behavior)
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

  // Get available players (those without seats)
  const availablePlayers = localParticipants.filter((p) => p.draft_seat === null);
  
  // Get player currently in selected seat
  const currentSeatPlayer = selectedSeat ? seatMap.get(selectedSeat) : null;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Assign Seats</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 mb-4">
            Click on a seat to assign a player. Seats are numbered 1 through {numPlayers}.
            In Round 1, players will be paired with the player across from them.
          </p>
          <p className="text-slate-400 text-sm">
            {participantsWithSeats.length} of {numPlayers} seats assigned
          </p>
        </CardContent>
      </Card>

      {/* Table Visualization */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Draft Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Top row (seats 1 to N/2, left to right) */}
            <div className="flex flex-wrap justify-center gap-4">
              {topRowSeats.map((seatNum) => {
                const { status, participant } = getSeatStatus(seatNum);
                const isAvailable = status === 'available';
                const isTaken = status === 'taken';

                return (
                  <button
                    key={seatNum}
                    onClick={() => handleSeatClick(seatNum)}
                    disabled={isSubmitting}
                    className={`w-24 h-24 rounded-lg border-2 transition-all ${
                      isTaken
                        ? 'bg-yellow-500/20 border-yellow-500'
                        : 'bg-slate-800 border-slate-700 hover:border-yellow-500/50 hover:bg-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-2xl font-bold text-slate-100">{seatNum}</span>
                      {isTaken && participant && (
                        <span className="text-xs text-slate-400 truncate w-full px-1">
                          {participant.players?.nickname || participant.players?.name || 'Player'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Table center (visual separator) */}
            <div className="flex items-center justify-center">
              <div className="h-1 w-full bg-slate-700 rounded"></div>
            </div>

            {/* Bottom row (seats N to N/2+1, right to left, clockwise) */}
            <div className="flex flex-wrap justify-center gap-4">
              {bottomRowSeats.map((seatNum) => {
                const { status, participant } = getSeatStatus(seatNum);
                const isAvailable = status === 'available';
                const isTaken = status === 'taken';

                return (
                  <button
                    key={seatNum}
                    onClick={() => handleSeatClick(seatNum)}
                    disabled={isSubmitting}
                    className={`w-24 h-24 rounded-lg border-2 transition-all ${
                      isTaken
                        ? 'bg-yellow-500/20 border-yellow-500'
                        : 'bg-slate-800 border-slate-700 hover:border-yellow-500/50 hover:bg-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-2xl font-bold text-slate-100">{seatNum}</span>
                      {isTaken && participant && (
                        <span className="text-xs text-slate-400 truncate w-full px-1">
                          {participant.players?.nickname || participant.players?.name || 'Player'}
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

      {/* Start Draft Button */}
      {allSeatsAssignedLocal && (
        <Card className="bg-slate-900 border-yellow-500/20">
          <CardContent className="pt-6">
            <Button
              onClick={handleStartDraft}
              disabled={isSubmitting}
              className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold disabled:opacity-50"
            >
              {isSubmitting ? 'Starting Draft...' : 'Start Draft'}
            </Button>
            <p className="text-sm text-slate-400 text-center mt-2">
              All players have selected their seats. Click to start Round 1.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress indicator */}
      {!allSeatsAssignedLocal && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-center">
              {participantsWithSeats.length} of {numPlayers} seats assigned
            </p>
          </CardContent>
        </Card>
      )}

      {/* Player Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              Assign Seat {selectedSeat}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {currentSeatPlayer
                ? `${currentSeatPlayer.players?.nickname || currentSeatPlayer.players?.name || 'Player'} is currently in this seat.`
                : 'Select a player to assign to this seat.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Clear seat option if seat is taken */}
            {currentSeatPlayer && (
              <Button
                onClick={() => handleClearSeat(currentSeatPlayer.player_id)}
                disabled={isSubmitting}
                className="w-full bg-red-500/10 border-2 border-red-500 text-red-500 hover:bg-red-500/20"
              >
                Clear Seat
              </Button>
            )}

            {/* Available players */}
            {availablePlayers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-400 font-semibold">Available Players:</p>
                {availablePlayers.map((participant) => (
                  <Button
                    key={participant.id}
                    onClick={() => handleAssignPlayer(participant.player_id)}
                    disabled={isSubmitting}
                    className="w-full bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
                  >
                    {participant.players?.nickname || participant.players?.name || 'Player'}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center">
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

