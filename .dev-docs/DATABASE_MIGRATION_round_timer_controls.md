# Database Migration: Round Timer Controls (Start/Pause)

## Overview
This migration adds start/pause functionality to round timers. The timer is manually started when a round begins (not automatically), and can be paused/resumed by tournament organizers.

## Changes

1. **Timer is set at round start** (not tournament creation)
   - `round_duration_minutes` is set at tournament creation (defines how long each round lasts)
   - `started_at` is set when "Start Round" button is clicked (not automatically)
   
2. **Add pause/resume functionality**
   - Add `paused_at` timestamp to track when timer was paused
   - Add `total_paused_seconds` to track cumulative paused time across pause/resume cycles

3. **Remove automatic draw functionality**
   - Timer is informational only - no automatic actions when timer expires
   - Players can still manually report draws if needed

## SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- ============================================
-- Step 1: Add pause tracking columns to matches
-- ============================================
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS total_paused_seconds INTEGER DEFAULT 0;

-- Add index for timer queries
CREATE INDEX IF NOT EXISTS idx_matches_timer_state 
  ON matches(tournament_id, round_number, started_at, paused_at) 
  WHERE started_at IS NOT NULL;

-- ============================================
-- Step 2: Update existing matches
-- ============================================
-- Set total_paused_seconds to 0 for existing matches
UPDATE matches 
SET total_paused_seconds = 0 
WHERE total_paused_seconds IS NULL;
```

## Column Details

### matches.paused_at

| Column | Type | Description |
|--------|------|-------------|
| `paused_at` | TIMESTAMP | When the timer was paused (NULL = timer is running, set = timer is paused) |

**Notes:**
- NULL = timer is currently running
- Set to timestamp = timer is currently paused
- When resuming, calculate paused duration and add to `total_paused_seconds`, then clear `paused_at`

### matches.total_paused_seconds

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `total_paused_seconds` | INTEGER | 0 | Cumulative time the timer has been paused (in seconds) |

**Notes:**
- Tracks total paused time across multiple pause/resume cycles
- Used in time remaining calculation: `round_duration_minutes - ((now - started_at - total_paused_seconds) / 60)`
- Incremented when timer is resumed (adds current pause duration)

## Timer Calculation Logic

### Time Remaining Formula

```typescript
// If timer is running (paused_at is null):
const elapsedSeconds = (now - started_at) - total_paused_seconds;
const timeRemaining = round_duration_minutes - (elapsedSeconds / 60);

// If timer is paused (paused_at is set):
const elapsedSeconds = (paused_at - started_at) - total_paused_seconds;
const timeRemaining = round_duration_minutes - (elapsedSeconds / 60);
```

### Timer States

1. **Not Started:** `started_at` is NULL
   - Timer shows: "Not Started" or "00:00"
   - "Start Round" button is enabled

2. **Running:** `started_at` is set, `paused_at` is NULL
   - Timer counts down: `round_duration_minutes - ((now - started_at - total_paused_seconds) / 60)`
   - "Pause" button is enabled

3. **Paused:** `started_at` is set, `paused_at` is set
   - Timer shows paused time: `round_duration_minutes - ((paused_at - started_at - total_paused_seconds) / 60)`
   - "Resume" button is enabled

## Server Actions

### Start Round Timer

```typescript
export async function startRoundTimer(
  tournamentId: string,
  roundNumber: number
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  
  // Get all matches for this round
  const { data: matches } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('round_number', roundNumber);
  
  if (!matches || matches.length === 0) {
    return { success: false, message: 'No matches found for this round' };
  }
  
  const now = new Date().toISOString();
  
  // Update all matches in the round with started_at
  const { error } = await supabase
    .from('matches')
    .update({
      started_at: now,
      paused_at: null,
      total_paused_seconds: 0,
    })
    .eq('tournament_id', tournamentId)
    .eq('round_number', roundNumber);
  
  if (error) {
    return { success: false, message: error.message };
  }
  
  revalidatePath(`/tournament/${tournamentId}`);
  return { success: true };
}
```

### Pause Round Timer

```typescript
export async function pauseRoundTimer(
  tournamentId: string,
  roundNumber: number
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  
  // Get current timer state
  const { data: matches } = await supabase
    .from('matches')
    .select('started_at, paused_at, total_paused_seconds')
    .eq('tournament_id', tournamentId)
    .eq('round_number', roundNumber)
    .limit(1)
    .single();
  
  if (!matches || !matches.started_at) {
    return { success: false, message: 'Timer not started' };
  }
  
  if (matches.paused_at) {
    return { success: false, message: 'Timer already paused' };
  }
  
  const now = new Date().toISOString();
  
  // Set paused_at on all matches in the round
  const { error } = await supabase
    .from('matches')
    .update({ paused_at: now })
    .eq('tournament_id', tournamentId)
    .eq('round_number', roundNumber);
  
  if (error) {
    return { success: false, message: error.message };
  }
  
  revalidatePath(`/tournament/${tournamentId}`);
  return { success: true };
}
```

### Resume Round Timer

```typescript
export async function resumeRoundTimer(
  tournamentId: string,
  roundNumber: number
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  
  // Get current timer state
  const { data: matches } = await supabase
    .from('matches')
    .select('started_at, paused_at, total_paused_seconds')
    .eq('tournament_id', tournamentId)
    .eq('round_number', roundNumber)
    .limit(1)
    .single();
  
  if (!matches || !matches.started_at) {
    return { success: false, message: 'Timer not started' };
  }
  
  if (!matches.paused_at) {
    return { success: false, message: 'Timer not paused' };
  }
  
  // Calculate how long timer was paused
  const pausedDuration = Math.floor(
    (new Date(matches.paused_at).getTime() - new Date(matches.started_at).getTime()) / 1000
  ) - (matches.total_paused_seconds || 0);
  
  const newTotalPaused = (matches.total_paused_seconds || 0) + pausedDuration;
  
  // Clear paused_at and update total_paused_seconds
  const { error } = await supabase
    .from('matches')
    .update({
      paused_at: null,
      total_paused_seconds: newTotalPaused,
    })
    .eq('tournament_id', tournamentId)
    .eq('round_number', roundNumber);
  
  if (error) {
    return { success: false, message: error.message };
  }
  
  revalidatePath(`/tournament/${tournamentId}`);
  return { success: true };
}
```

## UI Flow

1. **Round Created:** Matches are created with `started_at = NULL`
   - Timer shows "Not Started"
   - "Start Round" button is visible

2. **Start Round:** Admin/TO clicks "Start Round"
   - Sets `started_at` to current time
   - Timer begins counting down
   - "Pause" button becomes available

3. **Pause Timer:** Admin/TO clicks "Pause"
   - Sets `paused_at` to current time
   - Timer stops counting down
   - "Resume" button becomes available

4. **Resume Timer:** Admin/TO clicks "Resume"
   - Calculates paused duration
   - Adds to `total_paused_seconds`
   - Clears `paused_at`
   - Timer resumes counting down

5. **Timer Expires:** Timer reaches 0
   - Timer shows "00:00" or "Time Expired"
   - **No automatic action** - just informational
   - Players can still report results manually

## Notes

- Timer is per-round (all matches in a round share the same timer)
- Timer state is stored on the `matches` table (using the first match of each round for queries)
- `round_duration_minutes` is set at tournament creation and applies to all rounds
- `started_at` is set manually when "Start Round" is clicked (not automatically)
- No automatic draws - timer is informational only

## Rollback

If you need to rollback:

```sql
ALTER TABLE matches DROP COLUMN IF EXISTS paused_at;
ALTER TABLE matches DROP COLUMN IF EXISTS total_paused_seconds;
DROP INDEX IF EXISTS idx_matches_timer_state;
```

## See Also

- **Database Structure:** `.dev-docs/DATABASE_STRUCTURE.md`
- **Feature Spec:** `.dev-docs/features/04.5-feature-tournament-ranking-draft-seats.md`
- **Tournament Structure:** `.dev-docs/TOURNAMENT_STRUCTURE.md`

