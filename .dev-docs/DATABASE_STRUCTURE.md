# Database Structure (V3/V4 Architecture)

**Last Updated:** December 29, 2025 - V4 "Guilds" Architecture
**Database:** Supabase (PostgreSQL)

---

## Overview

This document outlines the complete database schema for the Upkeep platform. This schema implements a scalable, normalized architecture designed for multi-tenancy via "Guilds" and multi-event support.

**Key Changes in V4 (Guilds):**
- **New Layer:** Introduced `organizations` (Guilds) as the top-level container for communities.
- **Hierarchy:** Users belong to Guilds; Events belong to Guilds (or are standalone).
- **Access Control:** `organization_members` manages RBAC (Owner, Admin, Member) and Invite status.

**Key Changes from V3:**
- **Global Identity:** All users have a `profile` linked to `auth.users`.
- **Unified Match System:** Matches link to `profiles` (via `match_participants`).

---

## 1. Core Identity & Auth

### `public.profiles`
Extends Supabase `auth.users`. This is the "Global User".

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, FK → auth.users.id | Unique user identifier |
| `username` | TEXT | UNIQUE | Global handle (e.g., "@jace") |
| `role` | TEXT | DEFAULT 'user', CHECK ('user', 'admin') | RBAC Role |
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

## 2. Organizations (Guilds)

### `public.organizations`
The root entity for a gaming group/community.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique Guild ID |
| `owner_id` | UUID | FK → profiles.id | The Guild Master (Creator) |
| `name` | TEXT | NOT NULL | Display Name (e.g., "Ravnica High Rollers") |
| `slug` | TEXT | UNIQUE, NOT NULL | URL-friendly identifier |
| `description` | TEXT | NULLABLE | Guild manifesto or bio |
| `logo_url` | TEXT | NULLABLE | Branding image |
| `banner_url` | TEXT | NULLABLE | Hero image for Guild dashboard |
| `theme_color` | TEXT | DEFAULT 'gold' | UI Accent Color preference |
| `invite_code` | TEXT | UNIQUE, NULLABLE | Code for joining via link |
| `is_public` | BOOLEAN | DEFAULT FALSE | Searchable in directory? |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation date |

### `public.organization_members`
Manages membership and RBAC within a Guild.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `organization_id` | UUID | PK, FK → organizations.id | The Guild |
| `profile_id` | UUID | PK, FK → profiles.id | The Member |
| `role` | TEXT | CHECK ('owner', 'admin', 'member') | Permissions level |
| `status` | TEXT | CHECK ('active', 'invited', 'requested') | Membership status |
| `title` | TEXT | NULLABLE | Flavor text (e.g., "Grand Arbiter") |
| `invited_by` | UUID | FK → profiles.id, NULLABLE | User who sent the invite |
| `joined_at` | TIMESTAMP | DEFAULT NOW() | Membership start date |

---

## 3. Event System (Multi-Tenancy)

### `public.events`
The container for specific weekends, leagues, or game nights.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique event identifier |
| `organization_id` | UUID | FK → organizations.id, NULLABLE | Parent Guild (Null = Personal Event) |
| `owner_id` | UUID | FK → profiles.id | User who created the event |
| `name` | TEXT | NOT NULL | Event name (e.g., "Upkeep") |
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

## 4. Game Assets

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
| `mana_cost` | TEXT | NULLABLE | Mana cost string (e.g., '{3}{U}{U}') |
| `type_line` | TEXT | NULLABLE | Full type line (e.g., 'Legendary Creature — Human Wizard') |
| `oracle_text` | TEXT | NULLABLE | Card rules text |
| `image_url` | TEXT | NULLABLE | URL to deck art (legacy/primary display) |
| `image_uris` | JSONB | NULLABLE | JSON object containing full Scryfall image URIs (normal, art_crop, large) |
| `set_code` | TEXT | NULLABLE | Scryfall set code (e.g., 'mh3') |
| `set_name` | TEXT | NULLABLE | Full expansion name (e.g., 'Modern Horizons 3') |
| `description` | TEXT | NULLABLE | Deck description/notes |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

---

## 5. Competition Engine

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

## 6. Achievements & Badges

### `public.badges`
Catalog of all available achievements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique badge identifier |
| `slug` | TEXT | UNIQUE, NOT NULL | Programmatic identifier (e.g., 'hot-hand') |
| `name` | TEXT | NOT NULL | Display name |
| `description` | TEXT | NOT NULL | Badge description |
| `icon_url` | TEXT | NULLABLE | Emoji or URL for badge icon |
| `category` | TEXT | CHECK ('automated', 'manual', 'event') | Badge category |
| `generated_by` | TEXT | CHECK ('system', 'ai') | Origin of the badge |
| `metadata` | JSONB | NULLABLE | Stores context (commander_name, etc.) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

### `public.profile_badges`
Badges awarded to users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique record identifier |
| `profile_id` | UUID | FK → profiles.id | Recipient of the badge |
| `badge_id` | UUID | FK → badges.id | The badge awarded |
| `event_id` | UUID | FK → events.id, NULLABLE | Optional event context |
| `is_unique` | BOOLEAN | DEFAULT FALSE | If true, this is a one-off "God Mode" feat |
| `custom_title` | TEXT | NULLABLE | Override title for unique feats |
| `custom_description` | TEXT | NULLABLE | Override description for unique feats |
| `awarded_at` | TIMESTAMP | DEFAULT NOW() | When the badge was earned |

---

## Migration History

### V4 "Guilds" (December 2025)
- **Goal:** Add Organization layer for communities.
- **Actions:**
    - Created `organizations` and `organization_members`.
    - Added `organization_id` to `events` table.

### V3 "Fresh Start" (December 17, 2025)
- **Goal:** Full normalization and removal of legacy dependencies.
- **Actions:**
    - Dropped `players`, `legacy_tournaments`, etc.
    - Created `profiles`, `events`, `event_members`.
    - Recreated `tournaments`, `matches`, `match_participants` with foreign keys to `profiles`.
    - Added `tournament_participants` for draft seating logic.

---

## References

- **Migration Scripts:** `reset_and_init_v3.sql`, `add_tournament_participants_v3.sql`
- **Tournament Rules:** `.dev-docs/TOURNAMENT_RULES.md`