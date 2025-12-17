# Database Structure

**Last Updated:** December 15, 2025 - V2 Platform Upgrade  
**Database:** Supabase (PostgreSQL)

---

## Overview

This document outlines the complete database schema for the ProxyCon 2025 companion application. The schema supports tournament management, match reporting with game win tracking, player tracking, and the new V2 multi-event platform features.

---

## V2 Platform Tables (New)

### 1. `profiles`

Extends Supabase `auth.users` to store user profile information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, FK → auth.users.id | Unique user identifier |
| `username` | TEXT | UNIQUE | Unique username |
| `avatar_url` | TEXT | NULLABLE | URL to user's avatar image |
| `favorite_card_image` | TEXT | NULLABLE | URL to favorite card image |
| `bio` | TEXT | NULLABLE | User biography |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**RLS Policies:**
- Public read access.
- Users can insert/update their own profile.

### 2. `events`

The core container for tournaments and matches (e.g., "ProxyCon 2025").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique event identifier |
| `owner_id` | UUID | FK → profiles.id | User who created the event |
| `name` | TEXT | NOT NULL | Event name |
| `start_date` | DATE | NULLABLE | Event start date |
| `end_date` | DATE | NULLABLE | Event end date |
| `is_active` | BOOLEAN | DEFAULT TRUE | Whether the event is currently active |
| `invite_code` | TEXT | UNIQUE | Code for inviting users to the event |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**RLS Policies:**
- Public read access.
- Authenticated users can create events.
- Owners can update their events.

### 3. `event_participants`

Links profiles to events with specific roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `event_id` | UUID | PK, FK → events.id | The event |
| `profile_id` | UUID | PK, FK → profiles.id | The user profile |
| `nickname` | TEXT | NULLABLE | Event-specific display name |
| `role` | TEXT | CHECK ('admin', 'player', 'spectator') | User's role in the event |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**RLS Policies:**
- Public read access.
- Users can join events (insert their own record).

### 4. `decks`

Global library of user decks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique deck identifier |
| `owner_id` | UUID | FK → profiles.id | User who owns the deck |
| `name` | TEXT | NOT NULL | Deck name |
| `format` | TEXT | NOT NULL | Deck format ('commander', 'modern', etc.) |
| `colors` | TEXT[] | NULLABLE | Array of colors ['W', 'U', 'B', 'R', 'G'] |
| `commander_name` | TEXT | NULLABLE | Name of the commander (if applicable) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**RLS Policies:**
- Public read access.
- Users can insert/update/delete their own decks.

---

## Core Tables (V1 Legacy & Updated)

### 5. `players`

Legacy table storing player information. **Updated to link with `profiles`**.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique player identifier |
| `profile_id` | UUID | NULLABLE, FK → profiles.id | **NEW:** Link to authenticated user profile |
| `name` | TEXT | NOT NULL | Player's full name |
| `nickname` | TEXT | NULLABLE | Player's nickname/display name |
| `avatar_url` | TEXT | NULLABLE | URL to player's avatar image |
| `color` | TEXT | NULLABLE | Player color theme |
| `wins` | INTEGER | DEFAULT 0 | Total weekend wins (casual + tournament) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Notes:**
- `profile_id` serves as the bridge between V1 legacy data and V2 authenticated users.
- When a user "Claims Profile", this `profile_id` is set to their `auth.uid()`.

### 6. `tournaments`

Stores tournament information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique tournament identifier |
| `name` | TEXT | NOT NULL | Tournament name |
| `format` | TEXT | NOT NULL | Tournament format ('draft', 'sealed') |
| `status` | TEXT | NOT NULL | Tournament status ('pending', 'active', 'completed') |
| `max_rounds` | INTEGER | DEFAULT 3 | Maximum number of rounds (1-10) |
| `round_duration_minutes` | INTEGER | DEFAULT 50 | Duration of each round in minutes |
| `prize_1st` | TEXT | NULLABLE | 1st place prize description |
| `prize_2nd` | TEXT | NULLABLE | 2nd place prize description |
| `prize_3rd` | TEXT | NULLABLE | 3rd place prize description |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Tournament creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

### 7. `tournament_participants`

Tracks which players are in each tournament and their draft seat assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique participant record identifier |
| `tournament_id` | UUID | NOT NULL, FK → tournaments.id | Tournament this participant belongs to |
| `player_id` | UUID | NOT NULL, FK → players.id | Player participating |
| `draft_seat` | INTEGER | NULLABLE | Draft seat number (1-N) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

### 8. `matches`

Stores individual match records. **Updated to link with `events`**.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique match identifier |
| `event_id` | UUID | NULLABLE, FK → events.id | **NEW:** Event context for this match |
| `tournament_id` | UUID | NULLABLE, FK → tournaments.id | Tournament this match belongs to |
| `round_number` | INTEGER | NULLABLE | Round number |
| `game_type` | TEXT | NOT NULL | Game type |
| `started_at` | TIMESTAMP | NULLABLE | When round timer started |
| `paused_at` | TIMESTAMP | NULLABLE | When timer paused |
| `total_paused_seconds` | INTEGER | DEFAULT 0 | Cumulative paused time |
| `notes` | TEXT | NULLABLE | Optional match notes |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Match creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

### 9. `match_participants`

Tracks match results. **Updated to link with `decks`**.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique participant record identifier |
| `match_id` | UUID | NOT NULL, FK → matches.id | Match context |
| `player_id` | UUID | NOT NULL, FK → players.id | Player participating |
| `deck_id` | UUID | NULLABLE, FK → decks.id | **NEW:** Deck used in this match |
| `result` | TEXT | NULLABLE | 'win', 'loss', 'draw' |
| `games_won` | INTEGER | DEFAULT 0 | Number of games won |
| `deck_archetype` | TEXT | NULLABLE | Legacy deck archetype field |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

---

## Migration History

### V2 Platform Upgrade (Current)
- Created `profiles`, `events`, `event_participants`, `decks` tables.
- Added `profile_id` to `players` table.
- Added `event_id` to `matches` table.
- Added `deck_id` to `match_participants` table.
- See: `.dev-docs/DATABASE_MIGRATION_V2_INIT.md`

### Simplify for Streaming Dashboard
- Dropped `prize_wall` and `ledger`.
- Added prize columns to `tournaments`.
- Added `games_won` to `match_participants`.

---

## References

- **V2 Migration Script:** `.dev-docs/DATABASE_MIGRATION_V2_INIT.md`
- **Tournament Rules:** `.dev-docs/TOURNAMENT_RULES.md`