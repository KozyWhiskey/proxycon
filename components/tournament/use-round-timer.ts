'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  startRoundTimer,
  pauseRoundTimer,
  resumeRoundTimer,
  updateRoundDuration,
} from '@/app/tournament/actions';
import { TimerData, TimerControlResult } from '@/lib/types';

// Define the shape of the props the hook will receive
interface UseRoundTimerProps {
  tournamentId: string;
  roundNumber: number;
  initialTimerData: TimerData;
}

// Define the shape of the object the hook will return
interface UseRoundTimerReturn {
  status: 'initial' | 'running' | 'paused' | 'expired';
  displayTime: string;
  isLoading: boolean;
  actions: {
    handleStart: () => Promise<void>;
    handlePause: () => Promise<void>;
    handleResume: () => Promise<void>;
    handleUpdateDuration: (newDuration: number) => Promise<void>;
  };
  currentDuration: number;
}

export function useRoundTimer({
  tournamentId,
  roundNumber,
  initialTimerData,
}: UseRoundTimerProps): UseRoundTimerReturn {
  const [timerData, setTimerData] = useState<TimerData>(initialTimerData);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const {
    roundDurationMinutes,
    startedAt,
    pausedAt,
    totalPausedSeconds,
  } = timerData;

  // This is the primary effect for managing the timer's state and countdown.
  useEffect(() => {
    const { startedAt, pausedAt, totalPausedSeconds, roundDurationMinutes } = timerData;

    let remainingSeconds = 0;

    if (!startedAt) {
      // State 1: Timer has not started.
      remainingSeconds = roundDurationMinutes * 60;
      setTimeRemaining(remainingSeconds);
      return; // No interval needed.
    }

    // If we get here, the timer has started.
    const startTime = new Date(startedAt).getTime();
    const durationSecs = roundDurationMinutes * 60;

    if (pausedAt) {
      // State 2: Timer is paused.
      const pauseTime = new Date(pausedAt).getTime();
      const grossElapsedSecs = Math.floor((pauseTime - startTime) / 1000);
      const netElapsedSecs = grossElapsedSecs - totalPausedSeconds;
      remainingSeconds = durationSecs - netElapsedSecs;
      setTimeRemaining(Math.max(0, remainingSeconds));
      return; // No interval needed.
    }
    
    // State 3: Timer is running.
    // Set the initial time remaining for the running state.
    const now = new Date().getTime();
    const grossElapsedSecs = Math.floor((now - startTime) / 1000);
    const netElapsedSecs = grossElapsedSecs - totalPausedSeconds;
    setTimeRemaining(Math.max(0, durationSecs - netElapsedSecs));

    // Set up the one-second tick interval.
    const interval = setInterval(() => {
      setTimeRemaining(prevTime => Math.max(0, prevTime - 1));
    }, 1000);

    // Cleanup function to clear interval when dependencies change (e.g., on pause).
    return () => clearInterval(interval);
    
  }, [timerData]); // This effect re-runs every time server state changes.

  const status = !startedAt
    ? 'initial'
    : pausedAt
    ? 'paused'
    : timeRemaining > 0
    ? 'running'
    : 'expired';

  // --- ACTION HANDLERS ---
  const handleStart = async () => {
    setIsLoading(true);
    try {
      const result = await startRoundTimer(tournamentId, roundNumber);
      if (result.success && result.updatedTimerData) {
        toast.success('Round timer started');
        setTimerData(result.updatedTimerData);
      } else {
        toast.error(result.message || 'Failed to start timer');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    setIsLoading(true);
    try {
      const result = await pauseRoundTimer(tournamentId, roundNumber);
      if (result.success && result.updatedTimerData) {
        toast.success('Timer paused');
        setTimerData(result.updatedTimerData);
      } else {
        toast.error(result.message || 'Failed to pause timer');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      const result = await resumeRoundTimer(tournamentId, roundNumber);
      if (result.success && result.updatedTimerData) {
        toast.success('Timer resumed');
        setTimerData(result.updatedTimerData);
      } else {
        toast.error(result.message || 'Failed to resume timer');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDuration = async (newDuration: number) => {
    setIsLoading(true);
    try {
      const result = await updateRoundDuration(tournamentId, newDuration);
      if (result.success && result.updatedTimerData) {
        toast.success('Round duration updated and timer reset');
        setTimerData(result.updatedTimerData);
      } else {
        toast.error(result.message || 'Failed to update duration');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  // --- END ACTION HANDLERS ---

  // --- FORMATTING ---
  const formatTime = (seconds: number): string => {
    if (seconds < 0) return '00:00';
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayTime = formatTime(timeRemaining);

  return {
    status,
    displayTime,
    isLoading,
    actions: {
      handleStart,
      handlePause,
      handleResume,
      handleUpdateDuration,
    },
    currentDuration: roundDurationMinutes,
  };
}
