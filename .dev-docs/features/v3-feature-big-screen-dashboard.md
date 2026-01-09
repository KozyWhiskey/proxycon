# Feature: Big Screen Tournament Dashboard (V3)

**Status:** Planned
**Role:** UX & Engineering
**Goal:** Create a high-visibility, read-only dashboard for tournaments, optimized for casting to TVs or large displays.

---

## 1. Problem Statement
The current dashboard (`/tournament/[id]/dashboard`) is a functional clone of the mobile view but lacks the "Big Screen" presence required for tournament play. Users have reported data accuracy issues, likely due to complex client-side state management.

## 2. Target Experience
A "Flight Arrival Board" style display that serves as the single source of truth during a tournament.

**Key Elements:**
1.  **The Timer:** Massive, centralized, and color-coded (Green -> Yellow -> Red).
2.  **Current Pairings:** The most important info for active players. "Who am I playing and where do I sit?"
3.  **Standings:** Live leaderboard with key stats (Points, OMW%).
4.  **Ticker/Feed:** (Optional) Recent results.

**Design Constraints:**
-   **Readability:** Font sizes must be legible from 10ft away.
-   **Theme:** "The Mythic" (Dark/Gold/Glass).
-   **Stability:** Must recover from connection drops and always show the latest server state.

---

## 3. Technical Implementation

### A. Data Architecture
To ensure accuracy, we will simplify the data flow.

1.  **Server-Side Initial Load:**
    -   Fetch `Tournament` (Metadata, Status).
    -   Fetch `Matches` (All matches for history, current round for pairings).
    -   Fetch `Participants` (Profiles).
    -   **Calculation:** Compute initial standings on the server (or simpler: pass raw data and use the shared `swiss-pairing` lib on client to ensure consistency with live updates).

2.  **Client-Side "Smart" Hooks:**
    -   `useTournamentSync(tournamentId, initialData)`:
        -   Subscribes to `matches` and `match_participants` changes.
        -   On *any* change event, triggers a full data refresh (re-fetch) rather than trying to patch local state. This ensures 100% consistency.
    -   `useRoundTimer`:
        -   Re-uses the robust hook from `components/tournament/use-round-timer.ts`.

### B. Component Structure (`BigScreenDashboard`)

```tsx
<DashboardContainer>
  <DashboardHeader>
    <TournamentTitle />
    <BigTimer /> {/* 72px+ Font */}
    <RoundInfo />
  </DashboardHeader>
  
  <Grid className="grid-cols-1 lg:grid-cols-3">
    <PairingsPanel className="lg:col-span-2">
       {/* Large cards for P1 vs P2 */}
    </PairingsPanel>
    
    <StandingsPanel className="lg:col-span-1">
       {/* High contrast table */}
    </StandingsPanel>
  </Grid>
</DashboardContainer>
```

### C. Logic Simplifications
-   **No Match Reporting:** The dashboard is for *viewing*. Players report on their phones. This removes complex UI logic.
-   **Auto-Refresh:** In addition to Realtime, a 30s polling interval will act as a safety net.

## 4. Execution Plan
1.  Create `BigScreenDashboard` component.
2.  Implement `useTournamentSync` hook.
3.  Design "Large Card" components for Pairings.
4.  Replace `app/tournament/[id]/dashboard/page.tsx` content.
