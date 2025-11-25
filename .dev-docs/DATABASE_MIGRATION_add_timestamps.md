# Database Migration: Add Timestamp Columns

## Overview
This migration adds missing `created_at` and `updated_at` timestamp columns to tables that are missing them, ensuring consistent timestamp tracking across all tables.

## SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- ============================================
-- Step 1: Add updated_at to players table
-- ============================================
ALTER TABLE players
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for players
DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Step 2: Add updated_at to tournaments table
-- ============================================
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create trigger for tournaments
DROP TRIGGER IF EXISTS update_tournaments_updated_at ON tournaments;
CREATE TRIGGER update_tournaments_updated_at
    BEFORE UPDATE ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Step 3: Add updated_at to matches table
-- ============================================
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create trigger for matches
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Step 4: Add created_at and updated_at to match_participants
-- ============================================
ALTER TABLE match_participants
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE match_participants
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create trigger for match_participants
DROP TRIGGER IF EXISTS update_match_participants_updated_at ON match_participants;
CREATE TRIGGER update_match_participants_updated_at
    BEFORE UPDATE ON match_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Step 5: Add created_at and updated_at to prize_wall
-- ============================================
ALTER TABLE prize_wall
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE prize_wall
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create trigger for prize_wall
DROP TRIGGER IF EXISTS update_prize_wall_updated_at ON prize_wall;
CREATE TRIGGER update_prize_wall_updated_at
    BEFORE UPDATE ON prize_wall
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Step 6: Fix prize_wall.stock default (change from 1 to 0)
-- ============================================
ALTER TABLE prize_wall
ALTER COLUMN stock SET DEFAULT 0;

-- Update existing rows that have stock = 1 to 0 (if you want to reset)
-- Uncomment the line below if you want to reset existing stock values:
-- UPDATE prize_wall SET stock = 0 WHERE stock = 1;

-- ============================================
-- Step 7: Fix ledger.payer_id to be NOT NULL
-- ============================================
-- First, ensure no NULL values exist
UPDATE ledger SET payer_id = (SELECT id FROM players LIMIT 1) WHERE payer_id IS NULL;

-- Then add NOT NULL constraint
ALTER TABLE ledger
ALTER COLUMN payer_id SET NOT NULL;

-- ============================================
-- Step 8: Update existing rows with current timestamp
-- ============================================
-- Set updated_at for existing rows to current time
UPDATE players SET updated_at = timezone('utc'::text, now()) WHERE updated_at IS NULL;
UPDATE tournaments SET updated_at = timezone('utc'::text, now()) WHERE updated_at IS NULL;
UPDATE matches SET updated_at = timezone('utc'::text, now()) WHERE updated_at IS NULL;
UPDATE match_participants SET created_at = timezone('utc'::text, now()) WHERE created_at IS NULL;
UPDATE match_participants SET updated_at = timezone('utc'::text, now()) WHERE updated_at IS NULL;
UPDATE prize_wall SET created_at = timezone('utc'::text, now()) WHERE created_at IS NULL;
UPDATE prize_wall SET updated_at = timezone('utc'::text, now()) WHERE updated_at IS NULL;
```

## Changes Summary

### Added Columns

1. **`players.updated_at`** - Tracks when player records are updated
2. **`tournaments.updated_at`** - Tracks when tournament records are updated
3. **`matches.updated_at`** - Tracks when match records are updated
4. **`match_participants.created_at`** - Tracks when participant records are created
5. **`match_participants.updated_at`** - Tracks when participant records are updated
6. **`prize_wall.created_at`** - Tracks when prize records are created
7. **`prize_wall.updated_at`** - Tracks when prize records are updated

### Automatic Updates

All `updated_at` columns will automatically update when rows are modified thanks to the `update_updated_at_column()` trigger function.

### Fixed Issues

1. **`prize_wall.stock`** - Default changed from `1` to `0` to match documentation
2. **`ledger.payer_id`** - Changed from nullable to NOT NULL to match documentation

## Notes

- The `update_updated_at_column()` function is reusable across all tables
- Triggers automatically update `updated_at` on any UPDATE operation
- Existing rows will have their timestamps set to the current time during migration
- All timestamps use UTC timezone for consistency

## Rollback

If you need to rollback this migration:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS update_players_updated_at ON players;
DROP TRIGGER IF EXISTS update_tournaments_updated_at ON tournaments;
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
DROP TRIGGER IF EXISTS update_match_participants_updated_at ON match_participants;
DROP TRIGGER IF EXISTS update_prize_wall_updated_at ON prize_wall;

-- Remove function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remove columns (optional - only if you want to completely remove)
ALTER TABLE players DROP COLUMN IF EXISTS updated_at;
ALTER TABLE tournaments DROP COLUMN IF EXISTS updated_at;
ALTER TABLE matches DROP COLUMN IF EXISTS updated_at;
ALTER TABLE match_participants DROP COLUMN IF EXISTS created_at;
ALTER TABLE match_participants DROP COLUMN IF EXISTS updated_at;
ALTER TABLE prize_wall DROP COLUMN IF EXISTS created_at;
ALTER TABLE prize_wall DROP COLUMN IF EXISTS updated_at;

-- Revert prize_wall.stock default
ALTER TABLE prize_wall ALTER COLUMN stock SET DEFAULT 1;

-- Revert ledger.payer_id (make nullable again)
ALTER TABLE ledger ALTER COLUMN payer_id DROP NOT NULL;
```

## Testing

After running the migration, verify:

1. ✅ All tables have `created_at` and/or `updated_at` columns
2. ✅ `updated_at` automatically updates when rows are modified
3. ✅ `prize_wall.stock` default is 0
4. ✅ `ledger.payer_id` is NOT NULL
5. ✅ Existing rows have timestamps set

## See Also

- **Database Structure:** `.dev-docs/DATABASE_STRUCTURE.md`
- **Previous Migrations:**
  - `.dev-docs/DATABASE_MIGRATION_max_rounds.md`
  - `.dev-docs/DATABASE_MIGRATION_draft_seats_and_timers.md`

