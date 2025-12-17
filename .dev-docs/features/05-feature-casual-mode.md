# Feature: Casual Mode

**Status:** ✅ **IMPLEMENTED** (V2 with Event Linking)

## Objective
Build the interface for logging the results of casual games (Commander, 1v1, 2HG) outside of tournament play. **Crucially, these games can now be linked to an active Event.**

## Implementation Steps

1.  **Casual Game Form (`app/play/casual/page.tsx`):**
    -   **Input:** Accepts an optional `eventId` query parameter.
    -   **UI:**
        -   **Format:** Select "Commander", "1v1", "2HG".
        -   **Players:** Multi-select grid.
        -   **Decks:** Optional deck selection for the current user.
        -   **Outcome:** Select Winner(s).

2.  **Server Action (`logCasualMatch`):**
    -   Accepts `eventId` in the payload.
    -   Creates a `matches` record with `tournament_id = NULL` and `event_id = eventId` (if provided).
    -   Creates `match_participants` records with `deck_id`.
    -   Updates player global win counts.

3.  **Event Integration:**
    -   When accessed from the **Event Dashboard**, the `eventId` is passed to the form.
    -   On success, redirects back to the **Event Dashboard**.
    -   When accessed from **Home**, `eventId` is null, and it redirects to **Home**.

## Testing Plan

1.  **Global Casual Game:**
    -   Go to `/play/casual`. Log a game.
    -   Verify it appears in global stats but NOT on a specific event feed.

2.  **Event Casual Game:**
    -   Go to an Event Dashboard. Click "Log Casual Game".
    -   Verify URL is `/play/casual?eventId=...`.
    -   Log a game.
    -   Verify redirect back to Event Dashboard.
    -   Verify match appears in the Event Feed.