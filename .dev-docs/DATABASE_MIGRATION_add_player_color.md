# Database Migration: Add Player Color Column

## Overview
This migration adds a `color` column to the `players` table to allow administrators to assign specific colors to players for display on the login screen and throughout the application.

## SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- ============================================
-- Add color column to players table
-- ============================================
ALTER TABLE players
ADD COLUMN IF NOT EXISTS color TEXT;

-- Add comment to document the column
COMMENT ON COLUMN players.color IS 'Player color theme: MTG single colors (white, blue, black, red, green) or guilds (azorius, dimir, rakdos, gruul, selesnya, orzhov, izzet, golgari, boros, simic) for avatar display';
```

## Changes Summary

### Added Columns

1. **`players.color`** - Stores the player's assigned color theme (nullable)
   - **Single Colors:** `'white'`, `'blue'`, `'black'`, `'red'`, `'green'`
   - **Guilds (Two-Color):** `'azorius'` (W/U), `'dimir'` (U/B), `'rakdos'` (B/R), `'gruul'` (R/G), `'selesnya'` (G/W), `'orzhov'` (W/B), `'izzet'` (U/R), `'golgari'` (B/G), `'boros'` (R/W), `'simic'` (G/U)
   - Guilds display as gradients combining their two colors
   - If NULL, the application will use a hash-based color assignment based on the player's name (backward compatible)

## Notes

- The column is nullable to maintain backward compatibility
- Existing players will have NULL color and will continue using hash-based color assignment
- New players can have colors assigned via the admin interface
- The application will fall back to hash-based colors if color is NULL

## Rollback

If you need to rollback this migration:

```sql
ALTER TABLE players DROP COLUMN IF EXISTS color;
```

## Testing

After running the migration, verify:

1. ✅ `players` table has `color` column
2. ✅ Existing players have NULL color (backward compatible)
3. ✅ Admin interface can assign colors to players
4. ✅ Login screen displays assigned colors correctly

## See Also

- **Database Structure:** `.dev-docs/DATABASE_STRUCTURE.md`
