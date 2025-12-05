// lib/types.ts

/**
 * Represents the data structure for the round timer's state.
 * This is used for communication between server actions and client components.
 * 
 * Simplified timer logic:
 * - remainingSeconds is the single source of truth for countdown value
 * - When running: display = remainingSeconds - (now - startedAt)
 * - When paused: display = remainingSeconds (exact value)
 * - When initial: display = roundDurationMinutes * 60
 */
export interface TimerData {
  roundDurationMinutes: number;
  startedAt: string | null;
  pausedAt: string | null;
  remainingSeconds: number | null;
}

/**
 * Defines the result object returned by timer control server actions.
 */
export interface TimerControlResult {
  success: boolean;
  message?: string;
  updatedTimerData?: TimerData;
}
