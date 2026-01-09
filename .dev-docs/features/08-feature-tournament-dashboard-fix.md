# Feature: Tournament Stats & Dashboard Fixes

**Status:** Active
**Role:** Engineering & Analytics
**Goal:** Ensure statistics (MyStats) and the Tournament Dashboard correctly reflect tournament results, standings, and pairings.

---

## 1. Problem Statement

### A. MyStats (Event Page)
-   **Issue:** The "Tournament Victories" (1st, 2nd, 3rd place) counts are hardcoded to `0` or missing logic.
-   **Root Cause:** The `EventDashboard` component (`app/events/[id]/page.tsx`) does not calculate these stats. It has placeholders.
-   **Requirement:** We need to analyze all *completed* tournaments for the event, calculate the standings for each using the Swiss algorithm, determine the user's rank, and aggregate the counts.

### B. Tournament Dashboard (`/tournament/[id]/dashboard`)
-   **Issue:** Users report missing Round Pairings, Match Results, and incorrect Standings metrics (Record, Points, OMW%) even when player names are correct.
-   **Root Cause:** 
    -   Data fetching logic in `fetchDashboardData` might be handling empty states better now, but we need to ensure the *data mapping* for existing matches is correct.
    -   Specifically, `calculateStandings` depends on a complete match history. If `match_participants` are loaded but not correctly associated with round numbers or results, the stats will be zero.
    -   The `pairingsDisplay` logic relies on `currentRoundMatches`. If `currentRound` calculation is off (e.g., max(round_number) is null), no pairings show.

---

## 2. Implementation Plan

### Phase 1: Fix MyStats (Event Page)
**File:** `app/events/[id]/page.tsx`

1.  **Fetch Completed Tournaments:** Query `tournaments` table for `event_id` where `status = 'completed'`.
2.  **Calculate Standings per Tournament:**
    -   For each tournament, fetch all `matches` and `match_participants`.
    -   Use `calculateStandings` (from `lib/swiss-pairing`) to generate the final leaderboard.
    -   Sort the standings.
3.  **Aggregate User Placements:**
    -   Find the current user's `profile_id` in the sorted standings.
    -   If Rank 1 -> `tournamentFirstPlace++`
    -   If Rank 2 -> `tournamentSecondPlace++`
    -   If Rank 3 -> `tournamentThirdPlace++`
4.  **Optimization:** Since this is a server component, we can do this calculation efficiently. For V4 scaling, we should consider storing `winner_id` on the `tournaments` table, but calculation is fine for now.

### Phase 2: Fix Tournament Dashboard
**File:** `app/tournament/[id]/dashboard/page.tsx`

1.  **Verify Round Calculation:**
    -   Ensure `currentRound` is correctly derived from the latest match `round_number`.
    -   If no matches exist, default to 1 (which I already fixed).
2.  **Verify Match History Mapping:**
    -   Ensure `convertDbMatchToMatchResult` is receiving the correct `result` enums ('win', 'loss', 'draw').
3.  **Verify Pairings Display:**
    -   Ensure `pairingsDisplay` correctly groups participants by `match_id`.
    -   Debug why "Match Results" might be hidden (check `status` logic).

---

## 3. Execution Steps

1.  **Update `app/events/[id]/page.tsx`:** Implement the "MyStats" calculation logic.
2.  **Update `app/tournament/[id]/dashboard/page.tsx`:** Review and refine the `pairings` and `standings` data mapping.
3.  **Verification:** Check a completed tournament's dashboard and the event page stats.