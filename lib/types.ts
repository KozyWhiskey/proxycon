// lib/types.ts

/**
 * Represents the data structure for the round timer's state.
 * This is used for communication between server actions and client components.
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

// --- V2 Schema Definitions ---

export interface Profile {
  id: string; // references auth.users.id
  username: string | null;
  avatar_url: string | null;
  favorite_card_image: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  owner_id: string | null; // references profiles.id
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventParticipant {
  event_id: string;
  profile_id: string;
  nickname: string | null;
  role: 'admin' | 'player' | 'spectator';
  created_at: string;
}

export interface Deck {
  id: string;
  owner_id: string; // references profiles.id
  name: string;
  format: string; // 'commander', 'modern', etc.
  colors: string[] | null; // ['W', 'U', 'B', 'R', 'G']
  commander_name: string | null;
  created_at: string;
  updated_at: string;
}

// Legacy 'Player' type (from V1) - keeping for compatibility during migration
export interface Player {
  id: string;
  name: string;
  nickname: string | null;
  avatar_url: string | null;
  wins: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

// Updated Match type with V2 fields
export interface Match {
  id: string;
  tournament_id: string | null;
  event_id: string | null; // NEW (FK to events.id)
  round_number: number | null;
  game_type: string;
  started_at: string | null;
  paused_at: string | null;
  total_paused_seconds: number;
  notes: string | null;
  ai_commentary: string | null;
  created_at: string;
  updated_at: string;
}

// Updated MatchParticipant type with V2 fields
export interface MatchParticipant {
  id: string;
  match_id: string;
  player_id: string;
  deck_id: string | null; // NEW (FK to decks.id)
  result: string | null; // 'win', 'loss', 'draw'
  games_won: number;
  deck_archetype: string | null;
  created_at: string;
  updated_at: string;
}