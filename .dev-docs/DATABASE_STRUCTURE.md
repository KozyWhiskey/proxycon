# Database Structure

**Last Updated:** December 2024 - Streaming Dashboard Simplification  
**Database:** Supabase (PostgreSQL)

---

## Overview

This document outlines the complete database schema for the ProxyCon 2025 companion application. The schema supports tournament management, match reporting with game win tracking, player tracking, and tournament prizes.

**Note:** The prize wall, ledger, and ticket currency features have been removed to simplify the application into a streaming dashboard focused on drafts and tournaments.

---

## Core Tables

### 1. `players`

Stores player information and statistics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique player identifier |
| `name` | TEXT | NOT NULL | Player's full name |
| `nickname` | TEXT | NULLABLE | Player's nickname/display name |
| `avatar_url` | TEXT | NULLABLE | URL to player's avatar image |
| `wins` | INTEGER | DEFAULT 0 | Total weekend wins (casual + tournament) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `name` for quick lookups

**Notes:**
- The `tickets` column has been removed (no longer used)

---

### 2. `tournaments`

Stores tournament information, configuration, and prizes.

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

**Indexes:**
- Primary key on `id`
- Index on `status` for filtering active tournaments
- Index on `created_at` for chronological sorting

**Constraints:**
- `status` must be one of: 'pending', 'active', 'completed'
  - `'pending'`: Tournament created but Round 1 hasn't started yet (seats not assigned or draft not started)
  - `'active'`: Tournament is in progress (Round 1 matches have been created)
  - `'completed'`: Tournament has finished (max_rounds reached)
- `format` must be one of: 'draft', 'sealed'
- `max_rounds` must be between 1 and 10
- `round_duration_minutes` must be positive (typically 50 for MTG draft)

**Notes:**
- Tournaments are created with status `'pending'` and become `'active'` when Round 1 matches are created (when "Start Draft" is clicked)
- Only tournaments with status `'active'` appear on the dashboard
- Pending tournaments can be managed or deleted from the tournament management page
- Prize columns are optional and displayed when tournament is completed

---

### 3. `tournament_participants`

Tracks which players are in each tournament and their draft seat assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique participant record identifier |
| `tournament_id` | UUID | NOT NULL, FK → tournaments.id | Tournament this participant belongs to |
| `player_id` | UUID | NOT NULL, FK → players.id | Player participating |
| `draft_seat` | INTEGER | NULLABLE | Draft seat number (1-N, where N is number of players, or NULL if not yet assigned) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**Indexes:**
- Primary key on `id`
- Unique constraint on `(tournament_id, player_id)` - a player can only be in a tournament once
- Unique constraint on `(tournament_id, draft_seat)` - each seat number is unique per tournament
- Index on `tournament_id` for quick tournament lookups
- Index on `player_id` for player history queries

**Constraints:**
- `draft_seat` must be positive (>= 1) when not NULL
- `draft_seat` must be unique within a tournament when not NULL
- Multiple participants can have NULL `draft_seat` (seats not yet assigned)

**Notes:**
- Draft seats are assigned on the seating page (not during tournament creation)
- Seats are numbered 1 through N (where N = number of players)
- For 8 players, seats are arranged clockwise around a table: 1-3 on top (left to right), 6-4 on bottom (right to left)
- First round pairings: Seat K (where K <= N/2) pairs with seat (K + N/2) across the table
- When all seats are assigned and "Start Draft" is clicked, Round 1 matches are created and tournament status changes to 'active'

---

### 4. `matches`

Stores individual match records for tournaments and casual play.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique match identifier |
| `tournament_id` | UUID | NULLABLE, FK → tournaments.id | Tournament this match belongs to (null for casual) |
| `round_number` | INTEGER | NULLABLE | Round number (1, 2, 3, etc.) - null for casual matches |
| `game_type` | TEXT | NOT NULL | Game type ('draft', 'sealed', 'commander', etc.) |
| `started_at` | TIMESTAMP | NULLABLE | When the round timer was started (set when "Start Round" is clicked) |
| `paused_at` | TIMESTAMP | NULLABLE | When the timer was paused (NULL = running, set = paused) |
| `total_paused_seconds` | INTEGER | DEFAULT 0 | Cumulative time the timer has been paused (in seconds) |
| `notes` | TEXT | NULLABLE | Optional match notes |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Match creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `tournament_id` for tournament match queries
- Index on `(tournament_id, round_number)` for round-specific queries
- Index on `started_at` for timer calculations

**Constraints:**
- If `tournament_id` is not null, `round_number` must also be not null
- If `tournament_id` is null, `round_number` should be null (casual matches)
- `round_number` must be positive (>= 1) when not null

**Notes:**
- Tournament matches: `tournament_id` and `round_number` are required
- Casual matches: `tournament_id` and `round_number` are null
- `started_at` is set when "Start Round" button is clicked (not automatically)
- `paused_at` tracks when timer was paused (NULL = running, set = paused)
- `total_paused_seconds` tracks cumulative paused time across pause/resume cycles
- Timer calculation: `round_duration_minutes - ((now - started_at - total_paused_seconds) / 60)`
- Timer is informational only - no automatic actions when it expires

---

### 5. `match_participants`

Tracks which players participated in each match, their results, and game wins.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique participant record identifier |
| `match_id` | UUID | NOT NULL, FK → matches.id | Match this participant belongs to |
| `player_id` | UUID | NOT NULL, FK → players.id | Player participating |
| `result` | TEXT | NULLABLE | Match result ('win', 'loss', 'draw', or null for pending) |
| `games_won` | INTEGER | DEFAULT 0 | Number of games won in this match (for tiebreaker) |
| `deck_archetype` | TEXT | NULLABLE | Player's deck archetype (optional) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `match_id` for match lookups
- Index on `player_id` for player history
- Index on `(match_id, player_id)` for unique participant per match

**Constraints:**
- `result` must be one of: 'win', 'loss', 'draw', or NULL
- `games_won` must be non-negative (>= 0)
- Unique constraint on `(match_id, player_id)` - a player can only participate once per match
- Tournament matches typically have 1-2 participants (2 for normal, 1 for bye)
- Casual matches can have 2-4 participants

**Notes:**
- `result` is NULL when match is pending
- `games_won` tracks individual game wins within a match (e.g., 2-1 means winner has 2, loser has 1)
- For byes in tournaments, the single participant gets `result = 'win'` and `games_won = 2` (standard bye score)
- Points are calculated from results:
  - Win = 3 points
  - Draw = 2 points
  - Loss = 1 point
- Total games won is used as a tiebreaker when players have equal points

---

## Removed Tables

The following tables have been removed in the streaming dashboard simplification:

### ~~`prize_wall`~~ (REMOVED)
Previously stored prizes for purchase with tickets. Replaced by tournament-level prizes (`prize_1st`, `prize_2nd`, `prize_3rd` columns).

### ~~`ledger`~~ (REMOVED)
Previously tracked shared expenses. This feature has been removed entirely.

---

## Relationships

### Tournament Flow
```
tournaments (1) ──→ (N) tournament_participants
tournaments (1) ──→ (N) matches
matches (1) ──→ (N) match_participants
players (1) ──→ (N) tournament_participants
players (1) ──→ (N) match_participants
```

### Key Relationships
- **Tournament → Participants:** One tournament has many participants (via `tournament_participants`)
- **Tournament → Matches:** One tournament has many matches
- **Match → Participants:** One match has 1-4 participants (via `match_participants`)
- **Player → Tournaments:** Many-to-many via `tournament_participants`
- **Player → Matches:** Many-to-many via `match_participants`

---

## Data Integrity Rules

### Tournament Creation
1. Tournament must have at least 2 participants
2. Tournament is created with status `'pending'` (not 'active')
3. Participants are created without `draft_seat` (NULL initially)
4. Draft seats are assigned on the seating page (`/tournament/[id]/seating`)
5. When all seats are assigned and "Start Draft" is clicked:
   - Round 1 matches are created based on draft seat positions (across-table pairing)
   - Tournament status changes from `'pending'` to `'active'`
6. First round pairings are based on draft seat positions (across-table pairing, NOT Swiss)

### Match Reporting
1. Tournament matches must have 1-2 participants
2. Casual matches can have 2-4 participants
3. All participants must have a result before a match is considered complete
4. Bye matches have 1 participant with `result = 'win'` and `games_won = 2`
5. Game scores are recorded for each participant (e.g., 2-1 win)

### Round Generation
1. Next round is only generated when ALL matches in current round are complete
2. Round generation checks `max_rounds` limit before creating new round
3. Standings are calculated from all previous rounds using points:
   - Win = 3 points
   - Draw = 2 points
   - Loss = 1 point
4. Total games won is used as secondary tiebreaker
5. Pairings for Round 2+ use Swiss algorithm based on standings

### Tournament Status Workflow
1. Tournament is created with status `'pending'` (not 'active')
2. Participants are created without `draft_seat` (NULL initially)
3. Seats are assigned on the seating page (`/tournament/[id]/seating`)
4. When "Start Draft" is clicked and Round 1 matches are created:
   - Tournament status changes from `'pending'` to `'active'`
   - Tournament appears on dashboard
5. Only tournaments with status `'active'` appear on the dashboard
6. Pending tournaments can be managed or deleted from `/tournaments` page

### Tournament Completion
1. Tournament is marked 'completed' when `max_rounds` is reached
2. Winner is determined by highest point total
3. Tiebreakers (in order):
   - Total games won
   - Round wins
   - Round losses (fewer is better)
4. Completed tournaments display prizes if defined

---

## Query Patterns

### Get Tournament Standings with Game Wins
```sql
SELECT 
  p.id,
  p.name,
  COUNT(CASE WHEN mp.result = 'win' THEN 1 END) * 3 +
  COUNT(CASE WHEN mp.result = 'draw' THEN 1 END) * 2 +
  COUNT(CASE WHEN mp.result = 'loss' THEN 1 END) * 1 AS total_points,
  SUM(COALESCE(mp.games_won, 0)) AS total_games_won,
  COUNT(CASE WHEN mp.result = 'win' THEN 1 END) AS wins,
  COUNT(CASE WHEN mp.result = 'loss' THEN 1 END) AS losses,
  COUNT(CASE WHEN mp.result = 'draw' THEN 1 END) AS draws
FROM tournament_participants tp
JOIN players p ON tp.player_id = p.id
LEFT JOIN matches m ON m.tournament_id = tp.tournament_id
LEFT JOIN match_participants mp ON mp.match_id = m.id AND mp.player_id = p.id
WHERE tp.tournament_id = $1
GROUP BY p.id, p.name
ORDER BY total_points DESC, total_games_won DESC, wins DESC;
```

### Get Current Round Matches with Scores
```sql
SELECT m.*, mp.player_id, mp.result, mp.games_won
FROM matches m
LEFT JOIN match_participants mp ON mp.match_id = m.id
WHERE m.tournament_id = $1
  AND m.round_number = (
    SELECT MAX(round_number) 
    FROM matches 
    WHERE tournament_id = $1
  )
ORDER BY m.created_at;
```

---

## Migration History

### Initial Schema
- Core tables: `players`, `tournaments`, `matches`, `match_participants`, `prize_wall`, `ledger`

### Migration: max_rounds
- Added `max_rounds` column to `tournaments` table (default: 3)
- See: `.dev-docs/DATABASE_MIGRATION_max_rounds.md`

### Migration: Draft Seats & Round Timers
- Added `tournament_participants` table for draft seat tracking
- Added `round_duration_minutes` to `tournaments` table (default: 50)
- Added `started_at` to `matches` table for timer tracking
- See: `.dev-docs/DATABASE_MIGRATION_draft_seats_and_timers.md`

### Migration: Round Timer Controls
- Added `paused_at` to `matches` table for pause tracking
- Added `total_paused_seconds` to `matches` table for cumulative paused time
- Timer is manually started (not automatic)
- Timer can be paused/resumed
- Timer is informational only (no automatic draws)
- See: `.dev-docs/DATABASE_MIGRATION_round_timer_controls.md`

### Migration: Add Timestamps & Fixes
- Added `updated_at` columns to `players`, `tournaments`, `matches` tables
- Added `created_at` and `updated_at` to `match_participants` tables
- Added `created_at` to `players` table
- Created automatic `updated_at` triggers for all tables
- See: `.dev-docs/DATABASE_MIGRATION_add_timestamps.md`

### Migration: Make draft_seat Nullable
- Changed `draft_seat` from NOT NULL to NULLABLE in `tournament_participants` table
- Allows tournaments to be created before seats are assigned
- Seats are assigned on the seating page before Round 1 starts
- See: `.dev-docs/DATABASE_MIGRATION_make_draft_seat_nullable.md`

### Migration: Simplify for Streaming Dashboard ⭐ NEW
- **Dropped** `prize_wall` table
- **Dropped** `ledger` table
- **Removed** `tickets` column from `players` table
- **Added** `prize_1st`, `prize_2nd`, `prize_3rd` columns to `tournaments` table
- **Added** `games_won` column to `match_participants` table
- See: `.dev-docs/DATABASE_MIGRATION_simplify_streaming_dashboard.md`

---

## References

- **Project Summary:** `.dev-docs/PROJECT_SUMMARY.md`
- **Tournament Structure:** `.dev-docs/TOURNAMENT_STRUCTURE.md`
- **Tournament Rules:** `.dev-docs/TOURNAMENT_RULES.md`
- **Migration Scripts:** `.dev-docs/DATABASE_MIGRATION_*.md`
