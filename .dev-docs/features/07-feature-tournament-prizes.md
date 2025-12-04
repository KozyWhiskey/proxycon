# Feature: Tournament Prizes & Game Win Tracking

**Status:** ✅ **COMPLETED**

## Objective

Replace the complex "Prize Wall" feature with a simplified system for defining prizes when a tournament is created. Additionally, track individual game wins (e.g., 2-1, 2-0) to use as a tiebreaker in tournament standings.

## Background

The original Prize Wall concept, with a dedicated shop page, stock management, ticket currency, and purchasing logic, was overly complex for the intended use case of a casual weekend app. This feature:
1. Simplifies prizes by allowing tournament organizers to define prizes for the top 3 finishers
2. Adds game win tracking for better tiebreaker logic in close tournaments

## Implementation Summary

### Part 1: Tournament Prizes

#### Database Changes

Added three nullable columns to the `tournaments` table:
- `prize_1st` (TEXT) - Description of 1st place prize
- `prize_2nd` (TEXT) - Description of 2nd place prize  
- `prize_3rd` (TEXT) - Description of 3rd place prize

#### Files Modified

1. **`components/tournament/tournament-setup-form.tsx`**
   - Added three optional input fields for 1st, 2nd, 3rd place prizes
   - Prizes are passed to `createTournament` action

2. **`app/tournament/actions.ts`**
   - Updated `createTournament` to accept `prize1st`, `prize2nd`, `prize3rd` parameters
   - Stores prizes in the database when tournament is created

3. **`app/tournament/[id]/page.tsx`**
   - Fetches prize columns from tournaments table
   - Displays prize card when tournament is completed and has prizes
   - Shows winner names alongside their prizes with visual distinction

### Part 2: Game Win Tracking

#### Database Changes

Added `games_won` column to the `match_participants` table:
- `games_won` (INTEGER, DEFAULT 0) - Number of games won in this match

#### Files Modified

1. **`components/tournament/match-reporting-form.tsx`**
   - Completely redesigned to use game score inputs
   - Shows +/- buttons for each player's game count
   - Displays result preview (e.g., "Player A wins 2-1")
   - Submits both result and game scores

2. **`app/tournament/actions.ts`**
   - Added `submitResultWithGames(matchId, winnerId, loserId, winnerGames, loserGames, tournamentId)`
   - Added `submitDrawWithGames(matchId, playerIds, gamesWon, tournamentId)`
   - Updated `generateNextRound` to include `games_won` in standings calculation
   - Updated `startDraft` to set `games_won: 2` for bye matches

3. **`app/tournament/[id]/page.tsx`**
   - Fetches `games_won` from match_participants
   - Calculates `totalGamesWon` for each player in standings
   - Displays games won column in standings table
   - Uses games won as secondary tiebreaker (after points)
   - Displays game scores in match result details (e.g., "Won 2-1")

### Files Deleted (in Phase 2)

- `app/shop/` directory and all contents
- `components/shop/` directory and all contents
- `components/admin/adjust-tickets.tsx`
- `components/admin/cancel-last-expense.tsx`
- Navigation shop link removed

## User Experience

### Tournament Creation
1. Navigate to `/tournament/new`
2. Fill in tournament details (name, format, rounds, duration)
3. Optionally add prizes for 1st, 2nd, and/or 3rd place
4. Select players and start tournament

### Match Reporting (Game Scores)
1. Navigate to match reporting page
2. Use +/- buttons to adjust game scores for each player
3. See result preview showing who won (or if it's a draw)
4. Submit result

**Example Results:**
- 2-0 → Player A wins
- 2-1 → Player A wins (loser still gets 1 game in tiebreaker)
- 1-1 → Draw

### Standings Display
- Shows Points, Wins, Losses, Draws, Games columns
- Sorted by: Points → Games Won → Wins → Losses
- Games won serves as tiebreaker for equal points

### Prize Display
- Prizes are displayed on the tournament page when the tournament is completed
- Shows a golden "Tournament Prizes" card with:
  - 🥇 1st place winner and their prize
  - 🥈 2nd place winner and their prize
  - 🥉 3rd place winner and their prize

## Technical Details

### Tiebreaker Logic
```typescript
standings.sort((a, b) => {
  // 1. Points (primary)
  if (b.points !== a.points) return b.points - a.points;
  // 2. Total games won (secondary tiebreaker)
  if (b.totalGamesWon !== a.totalGamesWon) return b.totalGamesWon - a.totalGamesWon;
  // 3. Round wins
  if (b.wins !== a.wins) return b.wins - a.wins;
  // 4. Round losses (fewer is better)
  return a.losses - b.losses;
});
```

### Bye Handling
When a player receives a bye:
- `result` = 'win'
- `games_won` = 2 (standard bye score)

This ensures bye players get a fair games_won count for tiebreaker purposes.

## Testing Checklist

### Tournament Prizes
- ✅ Tournament creation form shows prize input fields
- ✅ Prizes can be left blank (optional)
- ✅ Prizes are saved to database when tournament is created
- ✅ Tournament page fetches prize data
- ✅ Prizes are displayed when tournament is completed
- ✅ Correct winners are shown with their prizes based on final standings

### Game Win Tracking
- ✅ Match reporting shows game score inputs
- ✅ +/- buttons adjust game counts correctly
- ✅ Result preview shows correct winner/draw
- ✅ Games won saved to match_participants table
- ✅ Standings display shows games column
- ✅ Tiebreaker works correctly (same points, different games won)
- ✅ Bye matches get games_won = 2

## Future Enhancements

- Add ability to edit prizes after tournament creation
- Add prize images/icons
- Send notifications to prize winners
- Support different game win formats (best of 5, etc.)
