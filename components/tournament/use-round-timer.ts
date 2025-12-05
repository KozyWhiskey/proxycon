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

interface UseRoundTimerProps {
  tournamentId: string;
  roundNumber: number;
  initialTimerData: TimerData;
}

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

/**
 * Simplified timer hook using remaining_seconds as the single source of truth.
 * 
 * States:
 * - Initial: startedAt is null -> display roundDurationMinutes * 60
 * - Running: startedAt set, pausedAt null -> display remainingSeconds - elapsed
 * - Paused: pausedAt set -> display remainingSeconds (exact value from server)
 * - Expired: calculated time <= 0
 */
export function useRoundTimer({
  tournamentId,
  roundNumber,
  initialTimerData,
}: UseRoundTimerProps): UseRoundTimerReturn {
  const [timerData, setTimerData] = useState<TimerData>(initialTimerData);
  const [displaySeconds, setDisplaySeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const { roundDurationMinutes, startedAt: rawStartedAt, pausedAt: rawPausedAt, remainingSeconds } = timerData;
  
  // Fix timezone issue: database stores timestamps without timezone info
  // We need to treat them as UTC by appending 'Z' if missing
  const ensureUTC = (timestamp: string | null): string | null => {
    if (!timestamp) return null;
    // If the timestamp doesn't end with 'Z' or a timezone offset, treat it as UTC
    if (!timestamp.endsWith('Z') && !timestamp.match(/[+-]\d{2}:\d{2}$/)) {
      return timestamp + 'Z';
    }
    return timestamp;
  };
  
  const startedAt = ensureUTC(rawStartedAt);
  const pausedAt = ensureUTC(rawPausedAt);

  // Calculate the display time based on current state
  useEffect(() => {
    console.log('[useRoundTimer] Effect running with:', {
      startedAt,
      pausedAt,
      remainingSeconds,
      roundDurationMinutes,
    });
    
    // State 1: Timer not started - show full duration
    if (!startedAt) {
      const display = roundDurationMinutes * 60;
      console.log('[useRoundTimer] State: initial, display:', display);
      setDisplaySeconds(display);
      return;
    }

    // State 2: Timer is paused - show exact remaining seconds from server
    if (pausedAt) {
      const display = Math.max(0, remainingSeconds ?? 0);
      console.log('[useRoundTimer] State: paused, display:', display);
      setDisplaySeconds(display);
      return;
    }

    // State 3: Timer is running - calculate and count down
    const calculateRemaining = () => {
      const now = Date.now();
      const started = new Date(startedAt).getTime();
      const elapsed = Math.floor((now - started) / 1000);
      const remaining = Math.max(0, (remainingSeconds ?? 0) - elapsed);
      return remaining;
    };

    // Set initial value
    const initialRemaining = calculateRemaining();
    console.log('[useRoundTimer] State: running, initial remaining:', initialRemaining);
    setDisplaySeconds(initialRemaining);

    // Set up countdown interval
    const interval = setInterval(() => {
      setDisplaySeconds(calculateRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, pausedAt, remainingSeconds, roundDurationMinutes]);

  // Determine the current status
  const status = !startedAt
    ? 'initial'
    : pausedAt
    ? 'paused'
    : displaySeconds > 0
    ? 'running'
    : 'expired';

  // --- ACTION HANDLERS ---
  const handleStart = async () => {
    setIsLoading(true);
    try {
      const result = await startRoundTimer(tournamentId, roundNumber);
      console.log('[handleStart] Server response:', result);
      if (result.success && result.updatedTimerData) {
        console.log('[handleStart] Setting timerData:', result.updatedTimerData);
        toast.success('Round timer started');
        setTimerData(result.updatedTimerData);
      } else {
        toast.error(result.message || 'Failed to start timer');
      }
    } catch (error) {
      console.error('[handleStart] Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    setIsLoading(true);
    try {
      const result = await pauseRoundTimer(tournamentId, roundNumber);
      console.log('[handlePause] Server response:', result);
      if (result.success && result.updatedTimerData) {
        console.log('[handlePause] Setting timerData:', result.updatedTimerData);
        toast.success('Timer paused');
        setTimerData(result.updatedTimerData);
      } else {
        toast.error(result.message || 'Failed to pause timer');
      }
    } catch (error) {
      console.error('[handlePause] Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      const result = await resumeRoundTimer(tournamentId, roundNumber);
      console.log('[handleResume] Server response:', result);
      if (result.success && result.updatedTimerData) {
        console.log('[handleResume] Setting timerData:', result.updatedTimerData);
        toast.success('Timer resumed');
        setTimerData(result.updatedTimerData);
      } else {
        toast.error(result.message || 'Failed to resume timer');
      }
    } catch (error) {
      console.error('[handleResume] Error:', error);
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

  // --- FORMATTING ---
  const formatTime = (seconds: number): string => {
    if (seconds < 0) return '00:00';
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    status,
    displayTime: formatTime(displaySeconds),
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
