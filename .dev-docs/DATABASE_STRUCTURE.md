# Database Structure (V3 Architecture)

**Last Updated:** December 19, 2025 - V3 "Fresh Start" Architecture
**Database:** Supabase (PostgreSQL)

---

## Overview

This document outlines the complete V3 database schema for the ProxyCon platform. This schema implements a scalable, normalized architecture designed for multi-event support ("Global Identity, Local Context").

**Key Changes from V2:**
- **Removed Legacy Tables:** `players` table is gone. Identity is now strictly handled by `profiles`.
- **Global Identity:** All users have a `profile` linked to `auth.users`.
- **Local Context:** Users join events via `event_members`.
- **Unified Match System:** Matches link to `profiles` (via `match_participants`) and optionally to `tournaments` and `decks`.

---

## 1. Core Identity & Auth

### `public.profiles`
Extends Supabase `auth.users`. This is the "Global User".

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, FK → auth.users.id | Unique user identifier |
| `username` | TEXT | UNIQUE | Global handle (e.g., "@jace") |
| `display_name` | TEXT | NULLABLE | Public name (e.g., "Jace Beleren") |
| `avatar_url` | TEXT | NULLABLE | Profile picture |
| `favorite_card_image` | TEXT | NULLABLE | URL to favorite card image |
| `bio` | TEXT | NULLABLE | Short biography |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**RLS Policies:**
- Public read access.
- Users can insert/update their own profile.

---

## 2. Event System (Multi-Tenancy)

### `public.events`
The container for specific weekends, leagues, or game nights.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique event identifier |
| `owner_id` | UUID | FK → profiles.id | User who created the event |
| `name` | TEXT | NOT NULL | Event name (e.g., "ProxyCon 2025") |
| `slug` | TEXT | UNIQUE, NULLABLE | URL-friendly identifier |
| `start_date` | DATE | NULLABLE | Event start date |
| `end_date` | DATE | NULLABLE | Event end date |
| `is_active` | BOOLEAN | DEFAULT TRUE | Whether the event is currently active |
| `invite_code` | TEXT | UNIQUE, NULLABLE | Code for inviting users |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

### `public.event_members`
The "Join Table". Links a Profile to an Event.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `event_id` | UUID | PK, FK → events.id | The event |
| `profile_id` | UUID | PK, FK → profiles.id | The user profile |
| `role` | TEXT | CHECK ('owner', 'admin', 'player', 'spectator') | User's role in the event |
| `display_name_override` | TEXT | NULLABLE | Event-specific display name |
| `joined_at` | TIMESTAMP | DEFAULT NOW() | Timestamp of joining |

---

## 3. Game Assets

### `public.decks`
Global library of user decks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique deck identifier |
| `owner_id` | UUID | FK → profiles.id | User who owns the deck |
| `name` | TEXT | NOT NULL | Deck name |
| `format` | TEXT | NOT NULL | Deck format ('commander', 'modern', etc.) |
| `colors` | TEXT[] | NULLABLE | Array of colors ['W', 'U', 'B', 'R', 'G'] |
| `commander_name` | TEXT | NULLABLE | Name of the commander |
| `image_url` | TEXT | NULLABLE | URL to deck art/image |
| `description` | TEXT | NULLABLE | Deck description/notes |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

---

## 4. Competition Engine

### `public.tournaments`
Stores tournament information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique tournament identifier |
| `event_id` | UUID | FK → events.id, NULLABLE | Parent event |
| `name` | TEXT | NOT NULL | Tournament name |
| `format` | TEXT | NOT NULL | Tournament format ('draft', 'sealed') |
| `status` | TEXT | CHECK ('pending', 'active', 'completed') | Tournament status |
| `max_rounds` | INTEGER | DEFAULT 3 | Maximum number of rounds |
| `round_duration_minutes` | INTEGER | DEFAULT 50 | Duration of each round |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

### `public.tournament_participants`
Tracks participation in a tournament (Roster & Seating).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique record identifier |
| `tournament_id` | UUID | FK → tournaments.id | The tournament |
| `profile_id` | UUID | FK → profiles.id | The participating user |
| `draft_seat` | INTEGER | NULLABLE | Draft seat number (1-N) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

### `public.matches`
The atomic unit of gameplay. Used for BOTH Tournaments and Casual play.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique match identifier |
| `event_id` | UUID | FK → events.id, NULLABLE | Required for event stats |
| `tournament_id` | UUID | FK → tournaments.id, NULLABLE | Null if casual game |
| `round_number` | INTEGER | NULLABLE | Round number (if tournament) |
| `table_number` | INTEGER | NULLABLE | Table number for the match |
| `game_type` | TEXT | NOT NULL | Game type ('commander', 'draft_1v1') |
| `started_at` | TIMESTAMP | NULLABLE | Timer start / Match start |
| `completed_at` | TIMESTAMP | NULLABLE | Match completion time |
| `paused_at` | TIMESTAMP | NULLABLE | Timer paused timestamp |
| `remaining_seconds` | INTEGER | NULLABLE | Timer state |
| `total_paused_seconds` | INTEGER | DEFAULT 0 | Total time paused in seconds |
| `ai_commentary` | TEXT | NULLABLE | AI-generated match summary |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Match creation timestamp |

### `public.match_participants`
Who played in the match and what happened.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique record identifier |
| `match_id` | UUID | FK → matches.id | The match |
| `profile_id` | UUID | FK → profiles.id | The participating user |
| `deck_id` | UUID | FK → decks.id, NULLABLE | Deck played |
| `result` | TEXT | CHECK ('win', 'loss', 'draw') | Match result |
| `games_won` | INTEGER | DEFAULT 0 | Number of games won (e.g. 2 in a 2-1 win) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

---

## Migration History

### V3 "Fresh Start" (December 17, 2025)
- **Goal:** Full normalization and removal of legacy dependencies.
- **Actions:**
    - Dropped `players`, `legacy_tournaments`, etc.
    - Created `profiles`, `events`, `event_members`.
    - Recreated `tournaments`, `matches`, `match_participants` with foreign keys to `profiles`.
    - Added `tournament_participants` for draft seating logic.

### V2 Platform Upgrade (Legacy)
- *Superseded by V3.*

---

## References

- **Migration Scripts:** `reset_and_init_v3.sql`, `add_tournament_participants_v3.sql`
- **Tournament Rules:** `.dev-docs/TOURNAMENT_RULES.md`
