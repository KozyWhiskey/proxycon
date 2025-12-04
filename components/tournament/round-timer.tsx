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
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Edit Round Duration</DialogTitle>
          <DialogDescription className="text-slate-400">
            Change the duration for this round.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-slate-300">
              Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100"
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
            className="bg-yellow-500 hover:bg-yellow-600 text-slate-950"
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
    if (status === 'initial') return 'text-green-400';
    if (status === 'expired') return 'text-red-400';
    const minutes = timeValue / 60;
    if (minutes > 10) return 'text-green-400';
    if (minutes > 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border-2 border-yellow-500/30 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Round {roundNumber} Timer</h3>
          <p className="text-sm text-slate-400">Duration: {currentDuration} minutes</p>
        </div>
        <EditDurationDialog
          currentDuration={currentDuration}
          onUpdate={actions.handleUpdateDuration}
          isLoading={isLoading}
        />
      </div>

      <div className="text-center mb-6">
        <div className={`text-6xl font-mono font-bold ${getTimeColor()} mb-2`}>
          {displayTime}
        </div>
        {status === 'expired' && (
          <p className="text-red-400 text-sm font-medium">Time Expired</p>
        )}
        {status === 'running' && timeValue > 0 && timeValue <= 300 && (
          <p className="text-yellow-400 text-sm">Less than 5 minutes remaining</p>
        )}
        {status === 'initial' && (
          <p className="text-slate-400 text-sm mt-2">Timer not started</p>
        )}
        {status === 'paused' && (
          <p className="text-yellow-400 text-sm mt-2">Paused</p>
        )}
      </div>

      <div className="flex gap-2">
        {status === 'initial' && (
          <Button
            onClick={actions.handleStart}
            disabled={isLoading}
            className="flex-1 h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Round
          </Button>
        )}
        
        {status === 'running' && (
          <Button
            onClick={actions.handlePause}
            disabled={isLoading}
            className="flex-1 h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
          >
            <Pause className="w-5 h-5 mr-2" />
            Pause
          </Button>
        )}
        
        {status === 'paused' && (
          <Button
            onClick={actions.handleResume}
            disabled={isLoading}
            className="flex-1 h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
          >
            <Play className="w-5 h-5 mr-2" />
            Resume
          </Button>
        )}
      </div>
    </div>
  );
}

