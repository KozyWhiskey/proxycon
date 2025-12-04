// lib/types.ts

/**
 * Represents the data structure for the round timer's state.
 * This is used for communication between server actions and client components.
 */
export interface TimerData {
  roundDurationMinutes: number;
  startedAt: string | null;
  pausedAt: string | null;
  totalPausedSeconds: number;
}

/**
 * Defines the result object returned by timer control server actions.
 */
export interface TimerControlResult {
  success: boolean;
  message?: string;
  updatedTimerData?: TimerData;
}
