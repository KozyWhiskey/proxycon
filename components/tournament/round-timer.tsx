'use client';

import { useState, useEffect } from 'react';
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
import { startRoundTimer, pauseRoundTimer, resumeRoundTimer, updateRoundDuration } from '@/app/tournament/actions';
import { toast } from 'sonner';

interface RoundTimerProps {
  tournamentId: string;
  roundNumber: number;
  roundDurationMinutes: number;
  startedAt: string | null;
  pausedAt: string | null;
  totalPausedSeconds: number;
}

export default function RoundTimer({
  tournamentId,
  roundNumber,
  roundDurationMinutes: initialRoundDurationMinutes,
  startedAt,
  pausedAt,
  totalPausedSeconds,
}: RoundTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roundDurationMinutes, setRoundDurationMinutes] = useState(initialRoundDurationMinutes);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDuration, setEditDuration] = useState(roundDurationMinutes.toString());

  // Calculate initial state and update when props change
  useEffect(() => {
    setRoundDurationMinutes(initialRoundDurationMinutes);
    setEditDuration(initialRoundDurationMinutes.toString());
    
    if (!startedAt) {
      setTimeRemaining(roundDurationMinutes * 60);
      setIsRunning(false);
      return;
    }

    if (pausedAt) {
      // Timer is paused
      setIsRunning(false);
      const startTime = new Date(startedAt).getTime();
      const pauseTime = new Date(pausedAt).getTime();
      const elapsedSeconds = Math.floor((pauseTime - startTime) / 1000) - totalPausedSeconds;
      const remaining = roundDurationMinutes * 60 - elapsedSeconds;
      setTimeRemaining(Math.max(0, remaining));
    } else {
      // Timer is running
      setIsRunning(true);
      // Calculate initial time remaining when running
      const startTime = new Date(startedAt).getTime();
      const now = new Date().getTime();
      const elapsedSeconds = Math.floor((now - startTime) / 1000) - totalPausedSeconds;
      const remaining = roundDurationMinutes * 60 - elapsedSeconds;
      setTimeRemaining(Math.max(0, remaining));
    }
  }, [startedAt, pausedAt, totalPausedSeconds, roundDurationMinutes, initialRoundDurationMinutes]);

  // Update timer every second when running
  useEffect(() => {
    if (!isRunning || !startedAt || pausedAt) {
      return;
    }

    const interval = setInterval(() => {
      const startTime = new Date(startedAt).getTime();
      const now = new Date().getTime();
      const elapsedSeconds = Math.floor((now - startTime) / 1000) - totalPausedSeconds;
      const remaining = roundDurationMinutes * 60 - elapsedSeconds;
      setTimeRemaining(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startedAt, pausedAt, totalPausedSeconds, roundDurationMinutes]);

  const formatTime = (seconds: number): string => {
    if (seconds < 0) return '00:00';
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (): string => {
    if (timeRemaining === null) return 'text-green-400';
    const minutes = timeRemaining / 60;
    if (minutes > 10) return 'text-green-400';
    if (minutes > 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const result = await startRoundTimer(tournamentId, roundNumber);
      if (result.success) {
        toast.success('Round timer started');
        window.location.reload();
      } else {
        toast.error(result.message || 'Failed to start timer');
      }
    } catch (error) {
      toast.error('Failed to start timer');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    setIsLoading(true);
    try {
      const result = await pauseRoundTimer(tournamentId, roundNumber);
      if (result.success) {
        toast.success('Timer paused');
        window.location.reload();
      } else {
        toast.error(result.message || 'Failed to pause timer');
      }
    } catch (error) {
      toast.error('Failed to pause timer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      const result = await resumeRoundTimer(tournamentId, roundNumber);
      if (result.success) {
        toast.success('Timer resumed');
        window.location.reload();
      } else {
        toast.error(result.message || 'Failed to resume timer');
      }
    } catch (error) {
      toast.error('Failed to resume timer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDuration = async () => {
    const newDuration = parseInt(editDuration, 10);
    if (isNaN(newDuration) || newDuration < 1) {
      toast.error('Please enter a valid duration (minimum 1 minute)');
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateRoundDuration(tournamentId, newDuration);
      if (result.success) {
        toast.success('Round duration updated');
        setRoundDurationMinutes(newDuration);
        setEditDialogOpen(false);
        window.location.reload();
      } else {
        toast.error(result.message || 'Failed to update duration');
      }
    } catch (error) {
      toast.error('Failed to update duration');
    } finally {
      setIsLoading(false);
    }
  };

  const displayTime = timeRemaining !== null ? formatTime(timeRemaining) : formatTime(roundDurationMinutes * 60);
  const isExpired = timeRemaining !== null && timeRemaining <= 0;

  return (
    <div className="bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border-2 border-yellow-500/30 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Round {roundNumber} Timer</h3>
          <p className="text-sm text-slate-400">Duration: {roundDurationMinutes} minutes</p>
        </div>
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-100"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Edit Round Duration</DialogTitle>
              <DialogDescription className="text-slate-400">
                Change the duration for this round. This will affect the timer countdown.
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
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setEditDialogOpen(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateDuration}
                disabled={isLoading}
                className="bg-yellow-500 hover:bg-yellow-600 text-slate-950"
              >
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Large Timer Display */}
      <div className="text-center mb-6">
        <div className={`text-6xl font-mono font-bold ${getTimeColor()} mb-2`}>
          {isExpired ? '00:00' : displayTime}
        </div>
        {isExpired && (
          <p className="text-red-400 text-sm font-medium">Time Expired</p>
        )}
        {!isExpired && timeRemaining !== null && timeRemaining <= 300 && timeRemaining > 0 && (
          <p className="text-yellow-400 text-sm">Less than 5 minutes remaining</p>
        )}
        {!startedAt && (
          <p className="text-slate-400 text-sm mt-2">Timer not started</p>
        )}
        {startedAt && pausedAt && (
          <p className="text-yellow-400 text-sm mt-2">Paused</p>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        {!startedAt && (
          <Button
            onClick={handleStart}
            disabled={isLoading}
            className="flex-1 h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Round
          </Button>
        )}
        
        {startedAt && !pausedAt && (
          <Button
            onClick={handlePause}
            disabled={isLoading}
            className="flex-1 h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
          >
            <Pause className="w-5 h-5 mr-2" />
            Pause
          </Button>
        )}
        
        {startedAt && pausedAt && (
          <Button
            onClick={handleResume}
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

