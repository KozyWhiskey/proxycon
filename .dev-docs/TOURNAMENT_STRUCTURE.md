# Tournament Structure & Implementation Guide

**Last Updated:** December 2024 - Streaming Dashboard with Game Win Tracking  
**Next.js Version:** 16.0.4  
**Library:** `tournament-pairings@2.0.1`

---

## Overview

The ProxyCon tournament system uses **Swiss-style pairings** for tournament brackets with **draft seat-based Round 1 pairings** and a **points-based ranking system**. This allows players to continue playing even after a loss, with pairings based on point totals. The system supports multiple rounds, automatic next-round generation, round timers, game win tracking for tiebreakers, and handles edge cases like odd numbers of players (byes).

**Key Features:**
- **Tournament Status Workflow:** Tournaments start as 'pending', become 'active' when Round 1 starts
- **Tournament Prizes:** Configure 1st, 2nd, 3rd place prizes during tournament creation
- **Draft Seat Selection:** Players select their seats on a visual seating page before the draft starts
- **Round 1 Pairing:** Players face the person directly across from them (seat 1 vs seat 5 in 8-player draft)
- **Points System:** Win = 3 points, Draw = 2 points, Loss = 1 point
- **Game Win Tracking:** Track individual game wins for tiebreaker purposes (e.g., 2-1 match)
- **Tiebreaker System:** Total games won used as secondary tiebreaker
- **Standings Display:** Real-time standings with points, wins, losses, draws, and games won
- **Round Timers:** Track time remaining in each round (default: 50 minutes)
- **Timer Controls:** Manual start/pause/resume functionality
- **Informational Only:** Timer is for tracking only - no automatic actions
- **Tournament Management:** View, manage, and delete tournaments from management page

---

## Database Structure

### Tables Involved

1. **`tournaments`**
   - `id` (UUID) - Primary key
   - `name` (Text) - Tournament name
   - `format` (Text) - 'draft' or 'sealed'
   - `status` (Text) - 'pending', 'active', or 'completed'
   - `max_rounds` (Integer) - Maximum number of rounds for this tournament (default: 3)
   - `round_duration_minutes` (Integer) - Duration of each round in minutes (default: 50)
   - `prize_1st` (Text, nullable) - 1st place prize description
   - `prize_2nd` (Text, nullable) - 2nd place prize description
   - `prize_3rd` (Text, nullable) - 3rd place prize description
   - `created_at` (Timestamp)

2. **`tournament_participants`**
   - `id` (UUID) - Primary key
   - `tournament_id` (UUID) - Foreign key to tournaments
   - `player_id` (UUID) - Foreign key to players
   - `draft_seat` (Integer, nullable) - Draft seat number (1-N, where N is number of players, or NULL if not yet assigned)
   - `created_at` (Timestamp)

3. **`matches`**
   - `id` (UUID) - Primary key
   - `tournament_id` (UUID) - Foreign key to tournaments
   - `round_number` (Int) - Which round this match belongs to (1, 2, 3, etc.)
   - `game_type` (Text) - Usually matches tournament format
   - `started_at` (Timestamp, nullable) - When the round/match started (for timer tracking)
   - `paused_at` (Timestamp, nullable) - When timer was paused
   - `total_paused_seconds` (Integer) - Cumulative paused time
   - `notes` (Text, nullable)
   - `created_at` (Timestamp)

4. **`match_participants`**
   - `id` (UUID) - Primary key
   - `match_id` (UUID) - Foreign key to matches
   - `player_id` (UUID) - Foreign key to players
   - `result` (Text, nullable) - 'win', 'loss', 'draw', or null (pending)
   - `games_won` (Integer, default 0) - Number of games won in this match ⭐ NEW
   - `deck_archetype` (Text, nullable)

### Relationships

- One tournament has many participants (via `tournament_participants`)
- One tournament has many matches (one-to-many)
- One match has 1-2 participants (one-to-many)
- Each participant links to one player

---

## Tournament Lifecycle

### 1. Tournament Creation

**Route:** `/tournament/new`  
**Server Action:** `createTournament(name, playerIds, format, maxRounds, roundDurationMinutes, prize1st, prize2nd, prize3rd)`

**Process:**
1. Validate input (name required, minimum 2 players, maxRounds between 1-10, roundDurationMinutes positive)
2. Create tournament entry with status **'pending'**, max_rounds, round_duration_minutes, and prizes
3. Create tournament participants **without draft seats** (draft_seat = NULL)
4. Redirect to draft seating page (`/tournament/[id]/seating`)

**Key Parameters:**
- `maxRounds` (default: 3) - Maximum number of rounds. When this limit is reached, the tournament is marked as 'completed' and no further rounds are generated.
- `roundDurationMinutes` (default: 50) - Duration of each round in minutes. Used for round timer tracking.
- `prize1st`, `prize2nd`, `prize3rd` (optional) - Prize descriptions for top 3 finishers

**Tournament Status:**
- **'pending'**: Tournament created but Round 1 hasn't started (seats not assigned or draft not started)
- **'active'**: Tournament is in progress (Round 1 matches have been created)
- **'completed'**: Tournament has finished (max_rounds reached)

### 2. Draft Seating

**Route:** `/tournament/[id]/seating`  
**Server Actions:** 
- `selectSeat(tournamentId, playerId, seatNumber)` - Assign a player to a seat
- `startDraft(tournamentId)` - Start Round 1 and create matches

**Process:**
1. Display visual table representation with numbered seats (1-N)
2. Any user can click a seat to assign a player to it
3. Seats are arranged clockwise: top row 1-3 (left to right), bottom row 6-4 (right to left)
4. When all seats are assigned, "Start Draft" button appears
5. When "Start Draft" is clicked:
   - Generate Round 1 pairings based on draft seats (across-table pairing, NOT Swiss)
   - Create matches for each pairing (without `started_at` - set when "Start Round" is clicked)
   - Create match_participants entries (result = null for normal matches, 'win' and games_won = 2 for byes)
   - **Update tournament status from 'pending' to 'active'**
   - Redirect to tournament bracket page

**Draft Seat Selection:**
- Players select their seats on the seating page (not randomly assigned)
- Any user can assign seats (allows single organizer to manage all seats)
- Seats can be reassigned or cleared before starting the draft
- Visual feedback shows which seats are taken and by whom

**Round 1 Pairing Logic:**
- **Round 1 does NOT use Swiss pairings** - it pairs based on draft seat positions
- Seats arranged clockwise: top row 1-3 (left to right), bottom row 6-4 (right to left)
- For 8-player draft:
  - Seat 1 pairs with Seat 5 (across the table)
  - Seat 2 pairs with Seat 6
  - Seat 3 pairs with Seat 7
  - Seat 4 pairs with Seat 8
- General formula: For N players, seat K (where K <= N/2) pairs with seat (K + N/2)
- For odd numbers, the last seat gets a bye (games_won = 2 automatically)

**Round Timer:**
- `round_duration_minutes` is set at **tournament creation** (defines round length)
- `started_at` is set when **"Start Round" button is clicked** (not automatically)
- Timer can be paused/resumed using controls
- Timer is **informational only** - no automatic draws when time expires
- Time remaining: `round_duration_minutes - ((now - started_at - total_paused_seconds) / 60)`

### 3. Match Reporting (Game Score Based) ⭐ UPDATED

**Route:** `/tournament/[id]/match/[matchId]`  
**Server Actions:** 
- `submitResultWithGames(matchId, winnerId, loserId, winnerGames, loserGames, tournamentId)` - Report win/loss with game scores ⭐ NEW
- `submitDrawWithGames(matchId, playerIds, gamesWon, tournamentId)` - Report draw with game scores ⭐ NEW
- `startRoundTimer(tournamentId, roundNumber)` - Start the round timer
- `pauseRoundTimer(tournamentId, roundNumber)` - Pause the timer
- `resumeRoundTimer(tournamentId, roundNumber)` - Resume the timer

**Match Reporting UI (Game Score Input):**
- Game score inputs for each player using +/- buttons
- Player 1 score selector (0, 1, 2)
- Player 2 score selector (0, 1, 2)
- Result preview showing: "Player 1 wins X-Y" or "Draw X-X"
- Submit button to confirm result

**Example Results:**
- 2-0 → Winner has 2 games won, loser has 0
- 2-1 → Winner has 2 games won, loser has 1
- 1-1 → Draw, both players have 1 game won

**Process:**
1. User adjusts game scores for each player
2. UI shows result preview (win/loss/draw based on scores)
3. On submit, update match_participants:
   - Set `result` ('win', 'loss', or 'draw')
   - Set `games_won` to the actual games won
4. Check if all matches in current round are complete
5. If complete, automatically generate next round
6. Revalidate tournament page and redirect

**Points System:**
- **Win:** 3 points
- **Draw:** 2 points
- **Loss:** 1 point

**Tiebreaker System:**
1. **Primary:** Total points (wins × 3 + draws × 2 + losses × 1)
2. **Secondary:** Total games won (sum of `games_won` across all matches) ⭐ NEW
3. **Tertiary:** Round wins (more is better)
4. **Quaternary:** Round losses (fewer is better)

**Round Completion Logic:**
- Fetch all matches for the current round
- For each match, check that ALL participants have non-null results
- A match is complete when: `participants_with_results === total_participants`
- Only when ALL matches are complete, generate the next round

### 4. Tournament Completion & Prizes

When a tournament is completed (max_rounds reached):
- Tournament status changes to 'completed'
- Final standings are calculated using points and tiebreakers
- If prizes were defined, they are displayed on the tournament page:
  - 1st place: Shows winner's name + prize
  - 2nd place: Shows runner-up's name + prize
  - 3rd place: Shows third place's name + prize

**Display:**
- Tournament page shows "Tournament Prizes" card for completed tournaments
- Each prize line shows position, player name, and prize description
- Only shows prizes that were defined (skips empty prize slots)

### 5. Tournament Management

**Route:** `/tournaments`  
**Server Actions:**
- `deleteTournament(tournamentId)` - Delete a tournament and all related records

**Process:**
1. Fetch all tournaments grouped by status (pending, active, completed)
2. Display tournaments in sections:
   - **Pending Tournaments:** Tournaments that haven't started yet
     - "Continue Setup" button links to seating page
     - "Delete" button to remove tournament
   - **Active Tournaments:** Tournaments currently in progress
     - "View Tournament" button links to bracket page
     - "Delete" button to remove tournament
   - **Completed Tournaments:** Finished tournaments
     - "View Tournament" button links to bracket page
     - "Delete" button to remove tournament

**Features:**
- View all tournaments regardless of status
- Delete any tournament (with confirmation)
- Quick access to continue setup for pending tournaments
- Quick access to view active/completed tournaments

### 6. Next Round Generation

**Server Action:** `generateNextRound(tournamentId, currentRound)` (internal)

**Process:**
1. Fetch tournament format, max_rounds, and round_duration_minutes
2. **Check max_rounds limit:** If `currentRound >= max_rounds`, mark tournament as 'completed' and return (no new round)
3. Calculate standings from all previous rounds:
   - Count wins, losses, draws for each player
   - **Calculate points:** wins × 3 + draws × 2 + losses × 1
   - **Calculate total games won** for tiebreaker ⭐ NEW
   - Create standings array: `[{ id, wins, losses, draws, points, totalGamesWon }, ...]`
   - Sort by: points (desc), totalGamesWon (desc), wins (desc), losses (asc)
4. Generate pairings using `Swiss` constructor with standings (based on wins/losses/draws for Swiss algorithm)
5. Create matches for next round (round_number = currentRound + 1) with `started_at` timestamp
6. Create match_participants entries

**Max Rounds Logic:**
- Before generating a new round, check if `currentRound >= max_rounds`
- If limit reached: Update tournament status to 'completed' and stop
- If not reached: Generate next round as normal
- Handles missing `max_rounds` gracefully (defaults to 3 for existing tournaments)

**Standings Calculation with Games Won:**
- Query all matches up to and including current round
- Query all participants for those matches including `games_won`
- Group by player_id and count results + sum games won
- Convert to array format for Swiss pairing

---

## Swiss Pairing Library Usage

### Import
```typescript
import { Swiss } from 'tournament-pairings';
```

### Round 2+ (Based on Points & Records with Games Won Tiebreaker)
```typescript
// Calculate standings with points from previous rounds
const standingsMap = new Map<string, { 
  wins: number; 
  losses: number; 
  draws: number; 
  points: number;
  totalGamesWon: number; // ⭐ NEW
}>();

allParticipants?.forEach((p) => {
  if (!standingsMap.has(p.player_id)) {
    standingsMap.set(p.player_id, { 
      wins: 0, losses: 0, draws: 0, points: 0, totalGamesWon: 0 
    });
  }

  const standing = standingsMap.get(p.player_id)!;
  standing.totalGamesWon += p.games_won || 0; // ⭐ Accumulate games won
  
  if (p.result === 'win') {
    standing.wins++;
    standing.points += 3;
  } else if (p.result === 'loss') {
    standing.losses++;
    standing.points += 1;
  } else if (p.result === 'draw') {
    standing.draws++;
    standing.points += 2;
  }
});

// Convert to array and sort by points, then games won as tiebreaker
const standings = Array.from(standingsMap.entries())
  .map(([id, stats]) => ({ 
    id, 
    wins: stats.wins, 
    losses: stats.losses, 
    draws: stats.draws,
    totalGamesWon: stats.totalGamesWon // ⭐ NEW
  }))
  .sort((a, b) => {
    const pointsA = a.wins * 3 + a.draws * 2 + a.losses * 1;
    const pointsB = b.wins * 3 + b.draws * 2 + b.losses * 1;
    if (pointsB !== pointsA) return pointsB - pointsA;
    if (b.totalGamesWon !== a.totalGamesWon) return b.totalGamesWon - a.totalGamesWon; // ⭐ NEW
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });

const pairings = new Swiss(standings);
```

### Handling Byes with Games Won
```typescript
if (!pairing.player2) {
  // This is a bye - single participant gets automatic win
  // Create match with one participant:
  // - result = 'win'
  // - games_won = 2 (standard bye score)
} else {
  // Normal match - two participants, both start with:
  // - result = null
  // - games_won = 0
}
```

---

## Critical Do's and Don'ts

### ✅ DO's

1. **Record game scores with match results**
   ```typescript
   // ✅ New way - with game scores
   await submitResultWithGames(matchId, winnerId, loserId, 2, 1, tournamentId);
   // Records: winner.result='win', winner.games_won=2
   //          loser.result='loss', loser.games_won=1
   ```

2. **Include games_won in standings calculation**
   ```typescript
   standing.totalGamesWon += p.games_won || 0; // ✅ For tiebreaker
   ```

3. **Set games_won = 2 for byes**
   ```typescript
   await supabase.from('match_participants').insert({
     match_id: match.id,
     player_id: byePlayerId,
     result: 'win',
     games_won: 2  // ✅ Standard bye score
   });
   ```

4. **Create tournaments with prizes (optional)**
   ```typescript
   await createTournament(
     name, 
     playerIds, 
     format, 
     maxRounds, 
     roundDurationMinutes,
     'Booster Box',      // 1st prize
     '6 Boosters',       // 2nd prize  
     '3 Boosters'        // 3rd prize
   );
   ```

5. **Always use `await cookies()` in server actions**
   ```typescript
   const cookieStore = await cookies(); // Next.js 16 requirement
   ```

### ❌ DON'Ts

1. **Don't use old submitResult without game scores**
   ```typescript
   // ❌ Old way - no game tracking
   await submitResult(matchId, winnerId, loserId, tournamentId);
   
   // ✅ New way - with game scores
   await submitResultWithGames(matchId, winnerId, loserId, 2, 1, tournamentId);
   ```

2. **Don't ignore games_won when calculating standings**
   ```typescript
   // ❌ Missing tiebreaker
   .sort((a, b) => b.points - a.points);
   
   // ✅ Include games won tiebreaker
   .sort((a, b) => {
     if (b.points !== a.points) return b.points - a.points;
     return b.totalGamesWon - a.totalGamesWon; // ✅ Tiebreaker
   });
   ```

3. **Don't forget to display games in standings**
   ```typescript
   // ❌ Missing games column
   <th>Pts</th><th>W</th><th>L</th><th>D</th>
   
   // ✅ Include games won
   <th>Pts</th><th>W</th><th>L</th><th>D</th><th>Games</th>
   ```

---

## Common Patterns

### Creating a Tournament with Prizes
```typescript
// 1. Validate
if (playerIds.length < 2) {
  return { success: false, message: 'At least 2 players required' };
}

// 2. Create tournament with status 'pending' and prizes
const { data: tournament, error } = await supabase
  .from('tournaments')
  .insert({ 
    name, 
    format, 
    status: 'pending',
    max_rounds: maxRounds,
    round_duration_minutes: roundDurationMinutes || 50,
    prize_1st: prize1st || null,  // ⭐ NEW
    prize_2nd: prize2nd || null,  // ⭐ NEW
    prize_3rd: prize3rd || null   // ⭐ NEW
  })
  .select()
  .single();

// 3. Create tournament participants
// 4. Redirect to seating page
```

### Submitting a Result with Game Scores
```typescript
// For win/loss with game scores (e.g., 2-1):
await supabase.from('match_participants')
  .update({ result: 'win', games_won: 2 })  // ⭐ games_won
  .eq('match_id', matchId)
  .eq('player_id', winnerId);

await supabase.from('match_participants')
  .update({ result: 'loss', games_won: 1 })  // ⭐ games_won
  .eq('match_id', matchId)
  .eq('player_id', loserId);

// For draw with game scores (e.g., 1-1):
for (let i = 0; i < playerIds.length; i++) {
  await supabase.from('match_participants')
    .update({ result: 'draw', games_won: gamesWon[i] })  // ⭐ games_won
    .eq('match_id', matchId)
    .eq('player_id', playerIds[i]);
}
```

### Calculating Standings with Games Won Tiebreaker
```typescript
// 1. Get all participants with games_won
const { data: participants } = await supabase
  .from('match_participants')
  .select('player_id, result, games_won')  // ⭐ Include games_won
  .in('match_id', matchIds);

// 2. Calculate standings with games won
const standingsMap = new Map<string, { 
  wins: number; losses: number; draws: number; points: number;
  totalGamesWon: number;  // ⭐ NEW
}>();

participants.forEach(p => {
  if (!standingsMap.has(p.player_id)) {
    standingsMap.set(p.player_id, { 
      wins: 0, losses: 0, draws: 0, points: 0, totalGamesWon: 0 
    });
  }
  
  const standing = standingsMap.get(p.player_id)!;
  standing.totalGamesWon += p.games_won || 0;  // ⭐ Accumulate
  
  if (p.result === 'win') {
    standing.wins++;
    standing.points += 3;
  } else if (p.result === 'loss') {
    standing.losses++;
    standing.points += 1;
  } else if (p.result === 'draw') {
    standing.draws++;
    standing.points += 2;
  }
});

// 3. Sort with games won as tiebreaker
const standings = Array.from(standingsMap.entries())
  .map(([id, stats]) => ({ id, ...stats }))
  .sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.totalGamesWon !== a.totalGamesWon) return b.totalGamesWon - a.totalGamesWon;  // ⭐ NEW
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });
```

---

## Edge Cases

### Odd Number of Players (Bye)
- The `Swiss` constructor handles this automatically
- One player gets a bye (pairing with only `player1`)
- Bye participant gets:
  - `result = 'win'` (automatic)
  - `games_won = 2` (standard bye score) ⭐ NEW
- Still create a match entry for tracking

### Draw Results
- Both players have equal game scores (e.g., 1-1)
- Each player gets `result = 'draw'` and their respective `games_won`
- Both players receive 2 points

### Tournament Completion
- Tournaments are marked as 'completed' when max_rounds is reached
- Final standings use games won as tiebreaker
- Prizes are displayed if defined (1st, 2nd, 3rd place)

---

## Testing Checklist

When testing tournament functionality:

1. ✅ Create tournament with prizes defined
2. ✅ Navigate to seating page and assign seats
3. ✅ Start draft (should change status to 'active' and create Round 1 matches)
4. ✅ Report match result with game scores (e.g., 2-0, 2-1, 1-1 draw)
5. ✅ Verify games won is saved to match_participants
6. ✅ Verify standings show games won column
7. ✅ Verify tiebreaker works (same points, different games won)
8. ✅ Verify bye matches get games_won = 2
9. ✅ Verify prizes display on completed tournament page
10. ✅ Test draw scenarios with equal game scores

---

## References

- **Library:** [tournament-pairings](https://www.npmjs.com/package/tournament-pairings)
- **Database Structure:** `.dev-docs/DATABASE_STRUCTURE.md`
- **Tournament Rules:** `.dev-docs/TOURNAMENT_RULES.md`
- **Feature Specs:** 
  - `.dev-docs/features/03-feature-tournament-engine.md`
  - `.dev-docs/features/04-feature-match-reporting.md`
  - `.dev-docs/features/07-feature-tournament-prizes.md` ⭐ NEW
- **Migrations:**
  - `.dev-docs/DATABASE_MIGRATION_max_rounds.md`
  - `.dev-docs/DATABASE_MIGRATION_draft_seats_and_timers.md`
  - `.dev-docs/DATABASE_MIGRATION_simplify_streaming_dashboard.md` ⭐ NEW
- **Implementation:**
  - `app/tournament/actions.ts` - Server actions
  - `app/tournament/[id]/page.tsx` - Tournament bracket page
  - `app/tournament/[id]/seating/page.tsx` - Draft seating page
  - `app/tournament/[id]/match/[matchId]/page.tsx` - Match reporting page
  - `app/tournaments/page.tsx` - Tournament management page
  - `components/tournament/match-reporting-form.tsx` - Match reporting form (game scores)
