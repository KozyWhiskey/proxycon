# Database Migration: Simplify for Streaming Dashboard

**Migration Name:** `simplify_for_streaming_dashboard`  
**Date:** December 4, 2025  
**Status:** ✅ Applied

---

## Purpose

Transform ProxyCon from a full companion app with currency/shop mechanics into a streamlined **streaming dashboard** focused on **drafts and tournaments**.

---

## Changes Summary

### Tables Dropped

| Table | Reason |
|-------|--------|
| `prize_wall` | Shop/prize purchasing feature removed |
| `ledger` | Expense tracking feature removed |

### Columns Removed

| Table | Column | Reason |
|-------|--------|--------|
| `players` | `tickets` | No more ticket currency system |

### Columns Added

| Table | Column | Type | Default | Reason |
|-------|--------|------|---------|--------|
| `tournaments` | `prize_1st` | TEXT | NULL | 1st place prize description |
| `tournaments` | `prize_2nd` | TEXT | NULL | 2nd place prize description |
| `tournaments` | `prize_3rd` | TEXT | NULL | 3rd place prize description |
| `match_participants` | `games_won` | INTEGER | 0 | Track individual game wins for tiebreakers |

---

## Migration SQL

```sql
-- Migration: simplify_for_streaming_dashboard
-- Purpose: Transform ProxyCon from full companion app to streaming dashboard

-- Step 1: Drop the prize_wall table
DROP TABLE IF EXISTS prize_wall CASCADE;

-- Step 2: Drop the ledger table
DROP TABLE IF EXISTS ledger CASCADE;

-- Step 3: Remove tickets column from players table
ALTER TABLE players DROP COLUMN IF EXISTS tickets;

-- Step 4: Add tournament prize columns
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS prize_1st TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS prize_2nd TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS prize_3rd TEXT DEFAULT NULL;

-- Step 5: Add games_won to match_participants for game win tracking
ALTER TABLE match_participants 
ADD COLUMN IF NOT EXISTS games_won INTEGER DEFAULT 0;
```

---

## Rollback SQL (if needed)

```sql
-- WARNING: This will recreate tables but NOT restore data

-- Restore prize_wall table
CREATE TABLE IF NOT EXISTS prize_wall (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cost INTEGER NOT NULL,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore ledger table
CREATE TABLE IF NOT EXISTS ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID NOT NULL REFERENCES players(id),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore tickets column
ALTER TABLE players ADD COLUMN IF NOT EXISTS tickets INTEGER DEFAULT 0;

-- Remove new columns
ALTER TABLE tournaments 
DROP COLUMN IF EXISTS prize_1st,
DROP COLUMN IF EXISTS prize_2nd,
DROP COLUMN IF EXISTS prize_3rd;

ALTER TABLE match_participants DROP COLUMN IF EXISTS games_won;
```

---

## Impact on Application Code

### Files to Delete (Phase 2)
- `app/shop/page.tsx`
- `app/shop/actions.ts`
- `components/shop/prize-card.tsx`
- `components/shop/prize-grid.tsx`
- `components/admin/adjust-tickets.tsx`
- `components/admin/cancel-last-expense.tsx`

### Files to Modify (Phase 2-4)
- `components/navigation/bottom-nav.tsx` - Remove shop link
- `components/dashboard/my-stats.tsx` - Remove tickets display
- `app/page.tsx` - Remove tickets prop
- `app/admin/page.tsx` - Remove ticket/expense components
- `app/play/casual/page.tsx` - Remove achievements
- `app/play/actions.ts` - Remove ticket logic
- `components/tournament/tournament-setup-form.tsx` - Add prize inputs
- `components/tournament/match-reporting-form.tsx` - Add game score input
- `app/tournament/actions.ts` - Add game win tracking
- `app/tournament/[id]/page.tsx` - Display prizes and game wins

---

## New Features Enabled

1. **Tournament Prizes** - Define 1st, 2nd, 3rd place prizes when creating a tournament
2. **Game Win Tracking** - Record game scores (e.g., "2-1") instead of just win/loss
3. **Game Win Tiebreaker** - Total games won breaks ties when round points are equal

---

## References

- **Plan:** This migration is part of the "Streaming Dashboard Simplification" plan
- **Related Docs:** 
  - `.dev-docs/DATABASE_STRUCTURE.md` (needs update)
  - `.dev-docs/PROJECT_SUMMARY.md` (needs update)

