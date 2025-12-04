# Feature: Casual Mode

**Status:** ✅ **IMPLEMENTED** (Simplified)

## Objective
Build the interface for logging the results of casual games, such as Commander or board games. This mode supports different outcome types (winner-take-all vs. ranked).

**Note:** The achievement/ticket system has been removed as part of the streaming dashboard simplification.

## Implementation Steps

1.  **Create Casual Game Form Page (`app/play/casual/page.tsx`):**
    -   This page will house the form for submitting a casual game result.
    -   It should be a Client Component (`'use client'`) to handle the interactive form state.
    -   **Game Type:** A `<Select>` or RadioGroup to choose between "Commander" or "Board Game".
    -   **Players:** A multi-select component to choose the players involved (typically 4 for Commander).
    -   **Outcome:**
        -   Use a `Tabs` component for "Simple" vs. "Ranked".
        -   **Simple:** A simple list of the selected players, where you tap one to declare them the winner.
        -   **Ranked:** A drag-and-drop list to order players from 1st to 4th. Libraries like `react-beautiful-dnd` or `dnd-kit` can be used here.
    -   **Submit Button:** A button to log the game.

2.  **Create `logCasualMatch` Server Action (`app/play/actions.ts`):**
    -   This action will process the form data.
    -   It will accept a payload containing players, outcome type, and results.
    -   **Step 1 (DB Create Match):** Create a new entry in the `matches` table. The `tournament_id` will be `NULL`, and the `game_type` will be 'commander' or 'board_game'.
    -   **Step 2 (DB Create Participants):** For each player, create an entry in `match_participants`. The `result` field will store 'win'/'loss' for simple outcomes, or '1st', '2nd', etc., for ranked outcomes.
    -   **Step 3 (DB Update Wins):** Update the `wins` count for the winner in the `players` table.
    -   **Step 4 (Redirect/Toast):** After success, show a success toast with `sonner` and redirect the user back to the main dashboard.

## Removed Features (Streaming Dashboard Simplification)

The following features were removed:
- **Achievements:** "First Blood", "Eliminated Player", "Salt Penalty" achievements have been removed
- **Ticket Economy:** Casual games no longer award tickets

## Testing Plan

1.  **Test Form UI:**
    -   Navigate to `/play/casual`.
    -   **Expected Outcome:**
        -   The form with all its inputs (Game Type, Players, Outcome tabs) should render correctly.

2.  **Test Simple Outcome:**
    -   Fill out the form for a 4-player Commander game.
    -   Select the "Simple" outcome tab and click a winner.
    -   Click "Log Game".
    -   **Expected Outcome:**
        -   A success toast appears.
        -   You are redirected to the dashboard.
        -   Check the database:
            -   A new `matches` row exists with `tournament_id` as NULL.
            -   Four new `match_participants` rows exist, one with `result` = 'win' and three with `result` = 'loss'.
            -   The winning player's `wins` in the `players` table has increased by 1.

3.  **Test Ranked Outcome:**
    -   Fill out the form for a 4-player Commander game.
    -   Select the "Ranked" outcome tab.
    -   Drag and drop the players into a 1st, 2nd, 3rd, 4th order.
    -   Click "Log Game".
    -   **Expected Outcome:**
        -   The database should reflect the ranked results in the `match_participants` table (`result` = '1st', '2nd', etc.).
