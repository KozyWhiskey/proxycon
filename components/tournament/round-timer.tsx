'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Play, Pause, Edit } from 'lucide-react';
import { useRoundTimer } from './use-round-timer';
import { TimerData } from '@/lib/types';
import { toast } from 'sonner';

interface RoundTimerProps {
  tournamentId: string;
  roundNumber: number;
  initialTimerData: TimerData;
}

// A small component to handle the duration editing dialog
function EditDurationDialog({
  currentDuration,
  onUpdate,
  isLoading,
}: {
  currentDuration: number;
  onUpdate: (newDuration: number) => Promise<void>;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [newDuration, setNewDuration] = useState(currentDuration.toString());

  const handleUpdate = async () => {
    const duration = parseInt(newDuration, 10);
    if (isNaN(duration) || duration < 1) {
      toast.error('Please enter a valid duration (minimum 1 minute).');
      return;
    }
    await onUpdate(duration);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Round Duration</DialogTitle>
          <DialogDescription>
            Change the duration for this round.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="duration">
              Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? 'Updating...' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RoundTimer({
  tournamentId,
  roundNumber,
  initialTimerData,
}: RoundTimerProps) {
  const { status, displayTime, isLoading, actions, currentDuration } = useRoundTimer({
    tournamentId,
    roundNumber,
    initialTimerData,
  });

  const timeValue = useMemo(() => {
    const [minutes, seconds] = displayTime.split(':').map(Number);
    return minutes * 60 + seconds;
  }, [displayTime]);

  const getTimeColor = () => {
    if (status === 'initial') return 'text-emerald-500';
    if (status === 'expired') return 'text-rose-500';
    const minutes = timeValue / 60;
    if (minutes > 10) return 'text-emerald-500';
    if (minutes > 5) return 'text-primary';
    return 'text-rose-500';
  };

  return (
    <div className="glass-panel p-6 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground font-heading">Round {roundNumber} Timer</h3>
          <p className="text-sm text-muted-foreground">Duration: {currentDuration} minutes</p>
        </div>
        <EditDurationDialog
          currentDuration={currentDuration}
          onUpdate={actions.handleUpdateDuration}
          isLoading={isLoading}
        />
      </div>

      <div className="text-center mb-6">
        <div className={`text-6xl font-mono font-bold ${getTimeColor()} mb-2 text-glow`}>
          {displayTime}
        </div>
        {status === 'expired' && (
          <p className="text-destructive text-sm font-medium">Time Expired</p>
        )}
        {status === 'running' && timeValue > 0 && timeValue <= 300 && (
          <p className="text-primary text-sm">Less than 5 minutes remaining</p>
        )}
        {status === 'initial' && (
          <p className="text-muted-foreground text-sm mt-2">Timer not started</p>
        )}
        {status === 'paused' && (
          <p className="text-primary text-sm mt-2">Paused</p>
        )}
      </div>

      <div className="flex gap-2">
        {status === 'initial' && (
          <Button
            onClick={actions.handleStart}
            disabled={isLoading}
            className="flex-1 h-12"
            variant="default"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Round
          </Button>
        )}
        
        {status === 'running' && (
          <Button
            onClick={actions.handlePause}
            disabled={isLoading}
            className="flex-1 h-12"
            variant="secondary"
          >
            <Pause className="w-5 h-5 mr-2" />
            Pause
          </Button>
        )}
        
        {status === 'paused' && (
          <Button
            onClick={actions.handleResume}
            disabled={isLoading}
            className="flex-1 h-12"
            variant="default"
          >
            <Play className="w-5 h-5 mr-2" />
            Resume
          </Button>
        )}
      </div>
    </div>
  );
}