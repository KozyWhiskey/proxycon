# Feature: Tournament Engine (V3)

## Objective
A comprehensive Swiss-style tournament manager supporting Draft, Sealed, and Constructed formats.

## Architecture
-   **Tables:** `tournaments`, `tournament_participants`, `matches`, `match_participants`.
-   **Logic:** Uses `tournament-pairings` library (or custom Swiss implementation) to generate rounds.

## Workflow
1.  **Setup:**
    -   `app/tournament/new`: Create tournament, set format/rounds.
    -   Select **Profiles** (from `event_members` or global list).
2.  **Seating (Draft Only):**
    -   `app/tournament/[id]/seating`: Visual table layout.
    -   Round 1 pairings are based on seat position (Cross-table pairing).
3.  **Execution:**
    -   **Pairing:** Swiss logic generates rounds based on Points > OMW% > Game Win %.
    -   **Match Reporting:** Users enter game scores (2-1, 2-0).
    -   **Timers:** Server-side synchronized round timer.
4.  **Completion:**
    -   Tournament ends when `max_rounds` reached.
    -   Prizes displayed for Top 3.

## Technical Details
-   **Points:** Win=3, Draw=1, Loss=0 (MTG Standard).
-   **Byes:** Assigns a "Bye" match (Win 2-0) to the odd player out.
-   **Timers:** `started_at` and `paused_at` timestamps in `matches` table handle state.

## Best Practices
-   **Round Completion:** Next round generates ONLY when ALL matches in current round have results.
-   **Draft Seating:** Round 1 does NOT use Swiss; it uses seat logic.
