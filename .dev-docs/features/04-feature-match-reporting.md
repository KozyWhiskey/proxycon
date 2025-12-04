# Feature: Match Reporting

**Status:** ✅ **IMPLEMENTED** (Game Score Based)

## Objective
Build the UI and logic for users to report the results of their matches using game scores. This includes a dedicated page for reporting with game score inputs, server actions to process the result with games won tracking, and logic to trigger the generation of the next round if all matches in the current round are complete.

## Implementation Steps

1.  **Create Match Reporting Page (`app/tournament/[id]/match/[matchId]/page.tsx`):**
    -   This is a dynamic route that will display the reporting UI for a specific match.
    -   It's a Server Component that fetches the details for the match, including the two participants.
    -   Uses the `MatchReportingForm` client component for interactive input.

2.  **Create Match Reporting Form (`components/tournament/match-reporting-form.tsx`):**
    -   **Game Score Inputs:** +/- buttons for each player to set their game wins (0, 1, 2)
    -   **Result Preview:** Shows "Player A wins X-Y" or "Draw X-X" based on scores
    -   **Submit Button:** Submits the result with game scores
    -   The UI should be simple and thumb-friendly with large tap targets.

3.  **Create Server Actions (`app/tournament/actions.ts`):**
    -   **`submitResultWithGames(matchId, winnerId, loserId, winnerGames, loserGames, tournamentId)`**
        -   Updates `match_participants` with 'win'/'loss' results AND `games_won` for each player
        -   Checks for round completion
        -   Triggers next round generation if all matches complete
    -   **`submitDrawWithGames(matchId, playerIds, gamesWon, tournamentId)`**
        -   Updates all participants with 'draw' result AND their respective `games_won`
        -   Checks for round completion
        -   Triggers next round generation if all matches complete

4.  **`generateNextRound` Server Action Updates:**
    -   Fetches standings including `games_won` from all previous matches
    -   Uses total games won as a tiebreaker in standings calculation
    -   Creates new matches for the next round
    -   For byes, sets `games_won = 2` automatically

## Match Result Logic

### Determining Result from Scores
```typescript
// If scores are equal → Draw
if (player1Games === player2Games) {
  await submitDrawWithGames(matchId, [player1Id, player2Id], [player1Games, player2Games], tournamentId);
}
// If player1 has more games → Player 1 wins
else if (player1Games > player2Games) {
  await submitResultWithGames(matchId, player1Id, player2Id, player1Games, player2Games, tournamentId);
}
// Otherwise → Player 2 wins
else {
  await submitResultWithGames(matchId, player2Id, player1Id, player2Games, player1Games, tournamentId);
}
```

### Common Scenarios
| Player 1 Games | Player 2 Games | Result |
|----------------|----------------|--------|
| 2 | 0 | Player 1 wins 2-0 |
| 2 | 1 | Player 1 wins 2-1 |
| 1 | 2 | Player 2 wins 2-1 |
| 0 | 2 | Player 2 wins 2-0 |
| 1 | 1 | Draw 1-1 |
| 0 | 0 | Draw 0-0 |

## Testing Plan

1.  **Test Match Reporting UI:**
    -   Start a tournament and navigate to the bracket page.
    -   Click the "Report Result" button for a specific match.
    -   **Expected Outcome:** You should be taken to the match reporting page with game score inputs for each player.

2.  **Test Game Score Input:**
    -   Use +/- buttons to adjust scores for each player.
    -   **Expected Outcome:**
        -   Scores should increment/decrement correctly (0-2 range)
        -   Result preview should update dynamically

3.  **Test `submitResultWithGames` Action:**
    -   Set scores to 2-1 and submit.
    -   **Expected Outcome:**
        -   The winner has `result = 'win'` and `games_won = 2`
        -   The loser has `result = 'loss'` and `games_won = 1`
        -   You are redirected back to the tournament bracket page
        -   The match shows "Won 2-1"

4.  **Test `submitDrawWithGames` Action:**
    -   Set scores to 1-1 and submit.
    -   **Expected Outcome:**
        -   Both players have `result = 'draw'` and `games_won = 1`
        -   You are redirected back to the tournament bracket page
        -   The match shows "Draw 1-1"

5.  **Test Next Round Generation:**
    -   Report results for all matches in the current round.
    -   **Expected Outcome:**
        -   The `generateNextRound` action should be triggered automatically.
        -   Next round pairings should appear on the bracket page.
        -   Standings should reflect `totalGamesWon` for tiebreaker purposes.

6.  **Test Tiebreaker:**
    -   Create a scenario where two players have equal points but different games won.
    -   **Expected Outcome:** The player with more total games won ranks higher.

7.  **Test Bye Handling:**
    -   Create a tournament with odd number of players.
    -   **Expected Outcome:** Bye player gets `result = 'win'` and `games_won = 2`.

## Points System

- **Win:** 3 points
- **Draw:** 2 points
- **Loss:** 1 point

## Tiebreaker System (in order)

1. Total points (wins × 3 + draws × 2 + losses × 1)
2. Total games won (sum of `games_won` across all matches)
3. Round wins (more is better)
4. Round losses (fewer is better)
