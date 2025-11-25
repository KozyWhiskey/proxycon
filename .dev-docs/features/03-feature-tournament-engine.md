# Feature: Tournament Engine

## Objective
Build the server-side logic and UI to create and manage Swiss-style tournaments. This involves creating a setup page, generating pairings for the first round, and providing a view to see the current bracket.

## Implementation Steps

1.  **Create Tournament Setup Page (`app/tournament/new/page.tsx`):**
    -   This page will contain a form to start a new tournament.
    -   **Tournament Name:** A simple `<Input />` field.
    -   **Participants:** Fetch all players from the database and render them in a multi-select component. A checkbox list or a component like Shadcn's `DataTable` with row selection can work well.
    -   **Start Button:** A `<Button />` to submit the form.

2.  **Create `createTournament` Server Action (`app/tournament/actions.ts`):**
    -   This action will be called when the setup form is submitted.
    -   It will accept the tournament name and a list of selected player IDs.
    -   **Step 1 (DB):** Create a new entry in the `tournaments` table with the given name and a status of 'active'.
    -   **Step 2 (Pairing):** Use the `tournament-pairings` library to generate the first round of matches. The library will likely require an array of player IDs and will return an array of pairings (e.g., `[[player1Id, player2Id], [player3Id, player4Id]]`).
    -   **Step 3 (DB):** For each pairing generated, create a new entry in the `matches` table. Each match should have the `tournament_id` from Step 1 and `round_number` set to 1.
    -   **Step 4 (DB):** For each player in a match, create a corresponding entry in the `match_participants` table, linking them to the correct `match_id`.
    -   **Step 5 (Redirect):** After successfully creating the tournament and matches, redirect the user to the tournament bracket page, e.g., `/tournament/[id]`.

3.  **Create Tournament Bracket Page (`app/tournament/[id]/page.tsx`):**
    -   This is a dynamic route that will display the status of a specific tournament.
    -   It's a Server Component that takes `params.id` as the tournament ID.
    -   Fetch all matches for the given tournament ID, grouped by `round_number`.
    -   Display the matches for the current round. Each match should be displayed as a "Player A vs. Player B" card.
    -   The card should also show the match status (e.g., "Waiting for Result" or "Player A Won").
    -   Include a button on each match card that links to the match reporting UI.

## Testing Plan

1.  **Test Tournament Creation Form:**
    -   Navigate to `/tournament/new`.
    -   **Expected Outcome:** The page should display a form with a text input for the name and a list of all players from the database.

2.  **Test `createTournament` Action:**
    -   Fill out the form: give the tournament a name and select an even number of players (e.g., 4 or 6).
    -   Click the "Start Tournament" button.
    -   **Expected Outcome:**
        -   You should be redirected to the new tournament's bracket page (`/tournament/[new_id]`).
        -   Check the Supabase database:
            -   A new row exists in the `tournaments` table.
            -   The correct number of rows exist in the `matches` table for round 1.
            -   The correct number of rows exist in the `match_participants` table.

3.  **Test Bracket Display:**
    -   Navigate directly to the URL of the tournament you just created.
    -   **Expected Outcome:**
        -   The page should display the tournament name and the current round number (Round 1).
        -   It should show a list of all the matches for the first round, with a "Waiting for Result" status on each.

4.  **Edge Case: Odd Number of Players:**
    -   Go back to the setup page and create a new tournament with an odd number of players.
    -   The `tournament-pairings` library should handle this by giving one player a "bye" (a free win).
    -   **Expected Outcome:** The action should successfully create the matches, and one player should have a match against a null or "bye" opponent, which should be marked as a win for them automatically. Verify how the library handles this and adjust the logic accordingly.
