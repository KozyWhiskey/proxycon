# Feature: Match Reporting

## Objective
Build the UI and logic for users to report the results of their matches. This includes a dedicated page for reporting, a server action to process the result, and logic to trigger the generation of the next round if all matches in the current round are complete.

## Implementation Steps

1.  **Create Match Reporting Page (`app/match/[id]/page.tsx`):**
    -   This is a dynamic route that will display the reporting UI for a specific match.
    -   It's a Server Component that fetches the details for `params.id`, including the two participants.
    -   The UI should be simple and thumb-friendly. Instead of small radio buttons, use two large, clickable `Card` components, one for each player.
    -   The page should have a clear header, e.g., "Who Won? - Dave vs. Steve".

2.  **Create `submitResult` Server Action (`app/tournament/actions.ts`):**
    -   This action will be called when a user clicks on a player's card to declare them the winner.
    -   It will accept `matchId`, `winnerId`, and `loserId`.
    -   **Step 1 (DB Update):** Update the `match_participants` table. Set `result` to 'win' for the `winnerId` and 'loss' for the `loserId` for the given `matchId`.
    -   **Step 2 (Check for Round Completion):** After updating the result, query the database to see if all matches for the current round of the tournament are now complete.
    -   **Step 3 (Trigger Next Round):** If all matches are complete, call a new server action, `generateNextRound(tournamentId)`.

3.  **Create `generateNextRound` Server Action (`app/tournament/actions.ts`):**
    -   This action takes a `tournamentId`.
    -   **Step 1 (Fetch Standings):** Fetch all players and their current win/loss records for the tournament.
    -   **Step 2 (Pairing):** Use the `tournament-pairings` library to generate the next round's pairings based on the current standings.
    -   **Step 3 (DB Create):** Just like in the `createTournament` action, create the new `matches` and `match_participants` entries for the new round.
    -   **Step 4 (Notifications):** (Optional Polish) Use `sonner` to show a toast notification that the next round has been generated.

4.  **Integrate with UI:**
    -   The `PlayerCard` components on the match reporting page will call the `submitResult` action `onClick`.
    -   After the action completes, it should `revalidatePath` for the tournament bracket page and then `redirect` the user back to `/tournament/[id]` to see the updated bracket.

## Testing Plan

1.  **Test Match Reporting UI:**
    -   Start a tournament and navigate to the bracket page.
    -   Click the "Report Result" button for a specific match.
    -   **Expected Outcome:** You should be taken to the `app/match/[id]` page, which displays two large clickable cards for the participating players.

2.  **Test `submitResult` Action:**
    -   On the match reporting page, click on one of the players to declare them the winner.
    -   **Expected Outcome:**
        -   The `submitResult` action is called.
        -   You are redirected back to the tournament bracket page.
        -   The match you just reported should now show the result (e.g., "Dave Won").
        -   In the database, the `match_participants` table should be updated with 'win' and 'loss' for the respective players.

3.  **Test Next Round Generation:**
    -   Report results for all but one of the matches in the current round. The next round should not be generated yet.
    -   Report the result for the final match of the round.
    -   **Expected Outcome:**
        -   The `generateNextRound` action should be triggered automatically.
        -   The bracket page, upon reloading, should now display the pairings for Round 2.
        -   Verify the new `matches` have been created in the database for the new round number.

4.  **Test Final Round:**
    -   Complete all matches for the final round of a tournament.
    -   **Expected Outcome:** The system should not try to generate a next round. The tournament can be marked as 'completed' in the database.
