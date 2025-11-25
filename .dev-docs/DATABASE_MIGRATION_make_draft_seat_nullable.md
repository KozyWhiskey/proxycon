# Database Migration: Make draft_seat Nullable

## Overview
This migration makes the `draft_seat` column nullable in `tournament_participants` to allow players to select their seats before the draft starts.

## SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- ============================================
-- Step 1: Drop the NOT NULL constraint on draft_seat
-- ============================================
ALTER TABLE tournament_participants
ALTER COLUMN draft_seat DROP NOT NULL;

-- ============================================
-- Step 2: Update the CHECK constraint to allow NULL
-- ============================================
-- Drop the existing check constraint
ALTER TABLE tournament_participants
DROP CONSTRAINT IF EXISTS tournament_participants_draft_seat_check;

-- Add new check constraint that allows NULL or positive values
ALTER TABLE tournament_participants
ADD CONSTRAINT tournament_participants_draft_seat_check 
  CHECK (draft_seat IS NULL OR draft_seat >= 1);

-- ============================================
-- Step 3: Update unique constraint to allow multiple NULLs
-- ============================================
-- PostgreSQL allows multiple NULLs in a unique constraint by default
-- But we need to ensure the constraint works correctly
-- The existing UNIQUE(tournament_id, draft_seat) will work with NULLs
-- However, we may want to add a partial unique index to ensure only one NULL per tournament
-- Actually, we want multiple NULLs (one per player without a seat), so the default behavior is fine
```

## Column Details

### tournament_participants.draft_seat

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `draft_seat` | INTEGER | NULLABLE, UNIQUE per tournament (when not NULL) | Draft seat number (1-N, or NULL if not yet assigned) |

**Notes:**
- `draft_seat` can now be NULL when a player hasn't selected their seat yet
- Once assigned, `draft_seat` must be >= 1 and unique within the tournament
- Multiple players can have NULL seats (they haven't selected yet)
- Once a seat is selected, it must be unique within the tournament

## Rollback

If you need to rollback this migration:

```sql
-- Update all NULL draft_seats to temporary values (if needed)
-- Then restore NOT NULL constraint
ALTER TABLE tournament_participants
ALTER COLUMN draft_seat SET NOT NULL;

-- Restore original check constraint
ALTER TABLE tournament_participants
DROP CONSTRAINT IF EXISTS tournament_participants_draft_seat_check;
ALTER TABLE tournament_participants
ADD CONSTRAINT tournament_participants_draft_seat_check 
  CHECK (draft_seat >= 1);
```

## Testing

After running the migration, verify:

1. ✅ `draft_seat` can be NULL
2. ✅ Multiple NULL values are allowed per tournament
3. ✅ When `draft_seat` is set, it must be >= 1 and unique within the tournament
4. ✅ Existing tournaments with assigned seats continue to work

