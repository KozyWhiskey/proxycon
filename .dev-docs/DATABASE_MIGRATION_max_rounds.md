# Database Migration: Add max_rounds to tournaments table

## Overview
This migration adds a `max_rounds` column to the `tournaments` table to limit the number of rounds in a tournament.

## SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add max_rounds column to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS max_rounds INTEGER DEFAULT 3;

-- Update existing tournaments to have a default of 3 rounds
UPDATE tournaments
SET max_rounds = 3
WHERE max_rounds IS NULL;
```

## Column Details

- **Column Name:** `max_rounds`
- **Type:** `INTEGER`
- **Default:** `3`
- **Nullable:** `NO` (after migration)
- **Description:** Maximum number of rounds for this tournament. When this limit is reached, the tournament will be marked as 'completed' and no further rounds will be generated.

## Notes

- Existing tournaments will default to 3 rounds
- New tournaments will require specifying max_rounds during creation
- The application code handles missing max_rounds gracefully (defaults to 3)

