# Feature: Polish and Admin

**Status:** ✅ **IMPLEMENTED** (Simplified)

## Objective
Refine the application's UI/UX for a better mobile experience and create a hidden "God Mode" admin page for correcting mistakes.

## Implementation Steps

### Part 1: UI/UX Polish

1.  **Mobile Optimization:**
    -   Review every page on a mobile device or in browser developer tools' mobile view.
    -   Increase font sizes where text is too small.
    -   Increase padding on all buttons and interactive elements to ensure they are easy to tap (`h-12` minimum).
    -   Ensure no horizontal overflow occurs on any page.

2.  **Dark Mode Check:**
    -   Thoroughly check every component to ensure there are no "white flashes" or components that do not respect the dark mode theme. This is especially important for dialogs, toasts, and select dropdowns.

3.  **Animations & Feedback:**
    -   Use `framer-motion` to add subtle entry animations to lists and grids (e.g., the dashboard feed).
    -   Ensure all critical actions provide feedback via `sonner` toasts.

4.  **Bottom Navigation Bar:**
    -   Implement the sticky bottom navigation bar as specified in the project summary.
    -   It should contain three icons (`lucide-react`) linking to: Home, Play, and Menu.
    -   This should be part of the main `app/layout.tsx`.

### Part 2: "God Mode" Admin Page

1.  **Create Admin Page (`app/admin/page.tsx`):**
    -   Create a new route that is not linked anywhere in the main UI.
    -   This page will be a "dashboard of actions" for fixing common mistakes.

2.  **Build "Fix Match Result" Component:**
    -   UI: A dropdown to select a recent match, followed by a simple form showing the current winner.
    -   Action: A server action `fixMatchResult(matchId, newWinnerId)` that re-calculates the results for that match and updates the `match_participants` table.

3.  **Build "Manage Players" Component:**
    -   UI: A list of players with ability to add new players.
    -   Action: A server action `addPlayer(name, nickname)` to add new players to the system.

## Removed Features (Streaming Dashboard Simplification)

The following admin features were removed:
- **Adjust Tickets:** No longer needed since ticket economy was removed
- **Cancel Last Expense:** No longer needed since ledger was removed

## Testing Plan

1.  **Test Mobile Polish:**
    -   Use Chrome DevTools to simulate different mobile device sizes (e.g., iPhone SE, Galaxy S21).
    -   Navigate through the entire application.
    -   **Expected Outcome:** All text is legible, all buttons are easily tappable, and there is no horizontal scroll.

2.  **Test Admin: Fix Match Result:**
    -   Log a tournament match with an incorrect winner.
    -   Navigate to `/admin`.
    -   Use the "Fix Match Result" tool to select that match and change the winner.
    -   **Expected Outcome:** The database should be updated. The `wins` and `losses` should be corrected for the two players involved.

3.  **Test Admin: Manage Players:**
    -   Navigate to `/admin`.
    -   Add a new player with name and nickname.
    -   **Expected Outcome:** The player appears in the players list and can be selected in tournament creation.
