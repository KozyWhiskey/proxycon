# Database Migration: Draft Seats & Round Timers

## Overview
This migration adds support for draft seat assignments and round timer tracking to the tournament system. This enables MTG draft tournaments with proper seat-based first round pairings and time management.

## SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- ============================================
-- Step 1: Create tournament_participants table
-- ============================================
-- This table tracks which players are in each tournament and their draft seat assignments
CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  draft_seat INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tournament_id, player_id),  -- A player can only be in a tournament once
  UNIQUE(tournament_id, draft_seat), -- Each seat number is unique per tournament
  CHECK(draft_seat >= 1)            -- Seat numbers must be positive
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament 
  ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_player 
  ON tournament_participants(player_id);

-- ============================================
-- Step 2: Add round_duration_minutes to tournaments
-- ============================================
-- Default to 50 minutes (standard MTG draft round duration)
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS round_duration_minutes INTEGER DEFAULT 50;

-- Add constraint to ensure positive duration
ALTER TABLE tournaments
ADD CONSTRAINT check_round_duration_positive 
  CHECK (round_duration_minutes > 0);

-- ============================================
-- Step 3: Add started_at to matches
-- ============================================
-- This timestamp tracks when a round/match started for timer calculations
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;

-- Create index for timer queries
CREATE INDEX IF NOT EXISTS idx_matches_started_at 
  ON matches(started_at) 
  WHERE started_at IS NOT NULL;

-- ============================================
-- Step 4: Update existing tournaments (optional)
-- ============================================
-- Set default round duration for existing tournaments
UPDATE tournaments
SET round_duration_minutes = 50
WHERE round_duration_minutes IS NULL;

-- ============================================
-- Step 5: Migrate existing tournament data (if needed)
-- ============================================
-- If you have existing tournaments, you may want to backfill tournament_participants
-- This query creates tournament_participants entries based on existing match_participants
-- NOTE: This assigns draft seats arbitrarily - you may want to adjust this logic

-- First, get all unique player-tournament combinations from existing matches
INSERT INTO tournament_participants (tournament_id, player_id, draft_seat)
SELECT DISTINCT
  m.tournament_id,
  mp.player_id,
  ROW_NUMBER() OVER (PARTITION BY m.tournament_id ORDER BY mp.created_at) AS draft_seat
FROM matches m
JOIN match_participants mp ON mp.match_id = m.id
WHERE m.tournament_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM tournament_participants tp 
    WHERE tp.tournament_id = m.tournament_id 
      AND tp.player_id = mp.player_id
  )
ON CONFLICT (tournament_id, player_id) DO NOTHING;
```

## Column Details

### tournament_participants Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tournament_id` | UUID | Foreign key to tournaments table |
| `player_id` | UUID | Foreign key to players table |
| `draft_seat` | INTEGER | Draft seat number (1-N, where N is number of players) |
| `created_at` | TIMESTAMP | Record creation timestamp |

**Constraints:**
- `(tournament_id, player_id)` must be unique (player can only be in tournament once)
- `(tournament_id, draft_seat)` must be unique (each seat number unique per tournament)
- `draft_seat >= 1` (seat numbers start at 1)

### tournaments.round_duration_minutes

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `round_duration_minutes` | INTEGER | 50 | Duration of each round in minutes |

**Notes:**
- Default is 50 minutes (standard MTG draft round)
- Must be positive (> 0)
- Used for round timer calculations

### matches.started_at

| Column | Type | Description |
|--------|------|-------------|
| `started_at` | TIMESTAMP | When the round/match started |

**Notes:**
- Set when a round begins (all matches in a round share the same `started_at`)
- Used to calculate time remaining: `round_duration_minutes - (now - started_at)`
- Can be NULL for casual matches or matches without timers

## Draft Seat Pairing Logic

For Round 1 pairings, players are paired based on their draft seat positions:

**8-Player Draft:**
- Seat 1 pairs with Seat 5 (across the table)
- Seat 2 pairs with Seat 6
- Seat 3 pairs with Seat 7
- Seat 4 pairs with Seat 8

**General Formula:**
- For N players, seat K (where K <= N/2) pairs with seat (K + N/2)
- For odd numbers, the last seat gets a bye

**Example (8 players):**
```typescript
// Seats arranged around table:
// Side 1: 1, 2, 3, 4
// Side 2: 5, 6, 7, 8
// Pairings: 1↔5, 2↔6, 3↔7, 4↔8
```

## Migration Notes

1. **Backward Compatibility:**
   - Existing tournaments will work with default `round_duration_minutes = 50`
   - Existing matches will have `started_at = NULL` (no timer tracking)
   - Existing tournaments can be backfilled with `tournament_participants` if needed

2. **Data Migration:**
   - The optional Step 5 creates `tournament_participants` entries from existing match data
   - Draft seats are assigned arbitrarily based on match creation order
   - You may want to manually adjust draft seats for existing tournaments

3. **Rollback:**
   - To rollback, drop the new table and columns:
   ```sql
   DROP TABLE IF EXISTS tournament_participants;
   ALTER TABLE tournaments DROP COLUMN IF EXISTS round_duration_minutes;
   ALTER TABLE matches DROP COLUMN IF EXISTS started_at;
   ```

## Testing

After running the migration:

1. ✅ Verify `tournament_participants` table exists
2. ✅ Verify `round_duration_minutes` column added to `tournaments`
3. ✅ Verify `started_at` column added to `matches`
4. ✅ Create a new tournament - verify draft seats are assigned
5. ✅ Verify Round 1 pairings use draft seat logic
6. ✅ Verify round timer calculations work correctly

## See Also

- **Database Structure:** `.dev-docs/DATABASE_STRUCTURE.md`
- **Feature Spec:** `.dev-docs/features/04.5-feature-tournament-ranking-draft-seats.md`
- **Tournament Structure:** `.dev-docs/TOURNAMENT_STRUCTURE.md`

