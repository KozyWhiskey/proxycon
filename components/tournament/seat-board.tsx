'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { addOpenSeat, assignSeatPerson, startDraft } from '@/app/tournament/actions';
import ClaimSeatButton from './claim-seat-button';
import { toast } from 'sonner';

interface Seat {
  id: string;
  draft_seat: number | null;
  profile_id: string | null;
  name: string;
}

interface Person {
  id: string;
  name: string;
}

export default function SeatBoard({
  tournamentId,
  seats,
  people,
  currentUserId,
  userHasSeat,
  showStart = true,
}: {
  tournamentId: string;
  seats: Seat[];
  people: Person[];
  currentUserId: string;
  userHasSeat: boolean;
  showStart?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function assign(participantId: string, profileId: string) {
    const result = await assignSeatPerson(tournamentId, participantId, profileId || null);
    if (!result.success) {
      toast.error(result.message || 'Could not assign that seat');
      return;
    }
    router.refresh();
  }

  async function addSeat() {
    const result = await addOpenSeat(tournamentId);
    if (!result.success) {
      toast.error(result.message || 'Could not add a seat');
      return;
    }
    router.refresh();
  }

  async function start() {
    setPending(true);
    const result = await startDraft(tournamentId);
    if (!result?.success) {
      toast.error(result?.message || 'Could not start the round');
      setPending(false);
      return;
    }
    router.push(`/tournament/${tournamentId}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Put a name on each seat, or leave it open and let them claim the number later.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {seats.map((seat) => (
          <div key={seat.id} className="space-y-2 rounded-md border border-white/10 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-foreground">Seat {seat.draft_seat}</p>
              {!seat.profile_id && !userHasSeat && (
                <ClaimSeatButton tournamentId={tournamentId} participantId={seat.id} />
              )}
            </div>
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-transparent px-2 text-sm"
              value={seat.profile_id || ''}
              onChange={(event) => assign(seat.id, event.target.value)}
            >
              <option value="">Open</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" onClick={addSeat}>Add a seat</Button>
      {showStart && (
        <Button type="button" className="h-12 w-full" onClick={start} disabled={pending || seats.length < 2}>
          {pending ? 'Starting...' : 'Start round 1'}
        </Button>
      )}
    </div>
  );
}
