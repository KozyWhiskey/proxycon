// lib/types.ts

// --- V3 Schema Definitions ---

export interface Profile {
  id: string; // references auth.users.id
  username: string | null; // @handle
  display_name: string | null; // "Jace Beleren"
  role: 'user' | 'admin'; // RBAC role
  avatar_url: string | null;
  bio: string | null;
  favorite_card_image: string | null;
  created_at: string;
  updated_at: string;
}

// --- V4 Organization (Guild) Definitions ---

export interface Organization {
  id: string;
  owner_id: string; // references profiles.id
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  theme_color: string | null; // e.g., 'gold'
  invite_code: string | null;
  is_public: boolean;
  created_at: string;
}

export interface OrganizationMember {
  organization_id: string;
  profile_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'invited' | 'requested';
  title: string | null; // Flavor text
  joined_at: string;
}

export interface Event {
  id: string;
  organization_id: string | null; // V4: Link to Guild
  owner_id: string | null; // references profiles.id
  name: string;
  slug: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  invite_code: string | null;
  created_at: string;
}

export interface EventMember {
  event_id: string;
  profile_id: string;
  role: 'owner' | 'admin' | 'player' | 'spectator';
  display_name_override: string | null;
  joined_at: string;
}

export interface Deck {
  id: string;
  owner_id: string;
  name: string;
  format: string;
  colors: string[] | null;
  commander_name: string | null;
  mana_cost?: string | null;
  type_line?: string | null;
  oracle_text?: string | null;
  image_url: string | null;
  image_uris?: {
    normal?: string;
    art_crop?: string;
    large?: string;
    png?: string;
    border_crop?: string;
  } | null;
  set_code?: string | null;
  set_name?: string | null;
  description: string | null;
  created_at: string;
}

export interface Tournament {
  id: string;
  event_id: string | null;
  name: string;
  format: string;
  status: 'pending' | 'active' | 'completed';
  max_rounds: number;
  round_duration_minutes: number;
  set_code?: string | null;
  set_name?: string | null;
  created_at: string;
}

// "Universal" Match type
export interface Match {
  id: string;
  event_id: string | null;
  tournament_id: string | null;
  round_number: number | null;
  table_number: number | null;
  game_type: string;
  started_at: string | null;
  completed_at: string | null;
  ai_commentary: string | null;
  created_at: string;
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  profile_id: string; // Changed from player_id to profile_id
  deck_id: string | null;
  result: 'win' | 'loss' | 'draw' | null;
  games_won: number;
  created_at: string;
}

// Timer Data for UI
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
  updatedTimerData?: TimerData | null;
}
