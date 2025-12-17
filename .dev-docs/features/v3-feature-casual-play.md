# Feature: Casual Play (V3)

## Objective
Log non-tournament games (Commander, 1v1, 2HG) to track stats without the structure of a tournament bracket.

## Architecture
-   **Matches Table:** Casual matches are stored in `matches` with `tournament_id = NULL`.
-   **Event Linking:** Can be linked to an `event_id` to contribute to event leaderboards.

## Workflow
1.  **Route:** `/play/casual` (optionally with `?eventId=...`).
2.  **Form:**
    -   Select Format (Commander, 1v1, etc).
    -   Select Players (Multi-select profiles).
    -   Select Decks (Optional).
    -   Select Winner(s).
3.  **Submission:** Creates a match record and updates stats.

## Best Practices
-   **Flexible Inputs:** Allow 2-6 players for Commander/Multiplayer.
-   **Deck Tracking:** Encourage deck selection to build data for the Deck Tracker.
