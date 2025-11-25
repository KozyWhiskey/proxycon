# Tournament Structure & Implementation Guide

**Last Updated:** Based on Tournament Status Workflow & Management implementation  
**Next.js Version:** 16.0.4  
**Library:** `tournament-pairings@2.0.1`

---

## Overview

The ProxyCon tournament system uses **Swiss-style pairings** for tournament brackets with **draft seat-based Round 1 pairings** and a **points-based ranking system**. This allows players to continue playing even after a loss, with pairings based on point totals. The system supports multiple rounds, automatic next-round generation, round timers, and handles edge cases like odd numbers of players (byes).

**Key Features:**
- **Tournament Status Workflow:** Tournaments start as 'pending', become 'active' when Round 1 starts
- **Draft Seat Selection:** Players select their seats on a visual seating page before the draft starts
- **Round 1 Pairing:** Players face the person directly across from them (seat 1 vs seat 5 in 8-player draft)
- **Points System:** Win = 3 points, Draw = 2 points, Loss = 1 point
- **Standings Display:** Real-time standings with points, wins, losses, draws on tournament page
- **Draw Support:** Match reporting supports win/loss/draw with simplified single-click UI
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
   - `created_at` (Timestamp)

2. **`tournament_participants`** ⭐ **NEW**
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
   - `notes` (Text, nullable)
   - `created_at` (Timestamp)

4. **`match_participants`**
   - `id` (UUID) - Primary key
   - `match_id` (UUID) - Foreign key to matches
   - `player_id` (UUID) - Foreign key to players
   - `result` (Text, nullable) - 'win', 'loss', 'draw', or null (pending)
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
**Server Action:** `createTournament(name, playerIds, format, maxRounds, roundDurationMinutes)`

**Process:**
1. Validate input (name required, minimum 2 players, maxRounds between 1-10, roundDurationMinutes positive)
2. Create tournament entry with status **'pending'**, max_rounds, and round_duration_minutes
3. Create tournament participants **without draft seats** (draft_seat = NULL)
4. Redirect to draft seating page (`/tournament/[id]/seating`)

**Key Parameters:**
- `maxRounds` (default: 3) - Maximum number of rounds. When this limit is reached, the tournament is marked as 'completed' and no further rounds are generated.
- `roundDurationMinutes` (default: 50) - Duration of each round in minutes. Used for round timer tracking.

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
   - Create match_participants entries (result = null for normal matches, 'win' for byes)
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
- For odd numbers, the last seat gets a bye

**Round Timer:**
- `round_duration_minutes` is set at **tournament creation** (defines round length)
- `started_at` is set when **"Start Round" button is clicked** (not automatically)
- Timer can be paused/resumed using controls
- Timer is **informational only** - no automatic draws when time expires
- Time remaining: `round_duration_minutes - ((now - started_at - total_paused_seconds) / 60)`

### 3. Match Reporting

**Route:** `/tournament/[id]/match/[matchId]`  
**Server Actions:** 
- `submitResult(matchId, winnerId, loserId, tournamentId)` - Report win/loss
- `submitDraw(matchId, playerIds, tournamentId)` - Report draw
- `startRoundTimer(tournamentId, roundNumber)` - Start the round timer
- `pauseRoundTimer(tournamentId, roundNumber)` - Pause the timer
- `resumeRoundTimer(tournamentId, roundNumber)` - Resume the timer

**Match Reporting UI:**
- Simplified single-click interface with 3 buttons:
  - Player 1 name button (click to record Player 1 win)
  - Player 2 name button (click to record Player 2 win)
  - Draw button (click to record draw)
- After selection, a "Submit Result" button appears for confirmation
- Points information displayed as fine print: "Win: 3 points • Draw: 2 points each • Loss: 1 point"

**Process:**
1. Update match_participants:
   - For win/loss: set winner to 'win' (3 points), loser to 'loss' (1 point)
   - For draw: set both players to 'draw' (2 points each)
2. Check if all matches in current round are complete
3. If complete, automatically generate next round
4. Revalidate tournament page and redirect

**Points System:**
- **Win:** 3 points
- **Draw:** 2 points
- **Loss:** 1 point
- Standings are sorted by: points (descending), wins (descending), losses (ascending)

**Round Completion Logic:**
- Fetch all matches for the current round
- For each match, check that ALL participants have non-null results
- A match is complete when: `participants_with_results === total_participants`
- Only when ALL matches are complete, generate the next round

**Time-Based Draws:**
- When round timer expires (time remaining <= 0), automatically set incomplete matches to draws
- Both players in a drawn match receive 2 points
- Timer expiry triggers round completion check and next round generation if needed

### 4. Tournament Management

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

### 5. Next Round Generation

**Server Action:** `generateNextRound(tournamentId, currentRound)` (internal)

**Process:**
1. Fetch tournament format, max_rounds, and round_duration_minutes
2. **Check max_rounds limit:** If `currentRound >= max_rounds`, mark tournament as 'completed' and return (no new round)
3. Calculate standings from all previous rounds:
   - Count wins, losses, draws for each player
   - **Calculate points:** wins × 3 + draws × 2 + losses × 1
   - Create standings array: `[{ id, wins, losses, draws, points }, ...]`
   - Sort by: points (descending), wins (descending), losses (ascending)
4. Generate pairings using `Swiss` constructor with standings (based on wins/losses/draws for Swiss algorithm)
5. Create matches for next round (round_number = currentRound + 1) with `started_at` timestamp
6. Create match_participants entries

**Max Rounds Logic:**
- Before generating a new round, check if `currentRound >= max_rounds`
- If limit reached: Update tournament status to 'completed' and stop
- If not reached: Generate next round as normal
- Handles missing `max_rounds` gracefully (defaults to 3 for existing tournaments)

**Standings Calculation:**
- Query all matches up to and including current round
- Query all participants for those matches
- Group by player_id and count results
- Convert to array format for Swiss pairing

---

## Swiss Pairing Library Usage

### Import
```typescript
import { Swiss } from 'tournament-pairings';
```

### Round 1 (Draft Seat-Based Pairings)
```typescript
// Round 1 does NOT use Swiss pairings - it pairs based on draft seats
// This happens in startDraft() after all seats are assigned
// For 8 players: seat 1 vs 5, seat 2 vs 6, seat 3 vs 7, seat 4 vs 8

// Fetch participants with their assigned seats
const { data: participants } = await supabase
  .from('tournament_participants')
  .select('player_id, draft_seat')
  .eq('tournament_id', tournamentId)
  .order('draft_seat', { ascending: true });

const numPlayers = participants.length;
const pairings: Array<{ player1: string; player2?: string }> = [];

for (let i = 0; i < Math.floor(numPlayers / 2); i++) {
  const seat1 = i + 1;
  const seat2 = i + 1 + Math.floor(numPlayers / 2);
  
  const player1 = participants.find((p) => p.draft_seat === seat1);
  const player2 = participants.find((p) => p.draft_seat === seat2);
  
  if (player1 && player2) {
    pairings.push({ player1: player1.player_id, player2: player2.player_id });
  }
}

// Handle bye for odd number of players
if (numPlayers % 2 === 1) {
  const byeSeat = numPlayers;
  const byePlayer = participants.find((p) => p.draft_seat === byeSeat);
  if (byePlayer) {
    pairings.push({ player1: byePlayer.player_id });
  }
}
```

### Round 2+ (Based on Points & Records)
```typescript
// Calculate standings with points from previous rounds
const standingsMap = new Map<string, { wins: number; losses: number; draws: number; points: number }>();

allParticipants?.forEach((p) => {
  if (!standingsMap.has(p.player_id)) {
    standingsMap.set(p.player_id, { wins: 0, losses: 0, draws: 0, points: 0 });
  }

  const standing = standingsMap.get(p.player_id)!;
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

// Convert to array and sort by points (Swiss uses wins/losses/draws internally)
const standings = Array.from(standingsMap.entries())
  .map(([id, stats]) => ({ id, wins: stats.wins, losses: stats.losses, draws: stats.draws }))
  .sort((a, b) => {
    // Sort by points for display, but Swiss algorithm uses wins/losses/draws
    const pointsA = a.wins * 3 + a.draws * 2 + a.losses * 1;
    const pointsB = b.wins * 3 + b.draws * 2 + b.losses * 1;
    if (pointsB !== pointsA) return pointsB - pointsA;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });

const pairings = new Swiss(standings);
```

### Pairing Object Structure
```typescript
{
  player1: string,  // Player ID
  player2: string | undefined,  // Player ID or undefined for bye
  round: undefined,  // Not used in our implementation
  match: number     // Match number in the round
}
```

### Handling Byes
```typescript
if (!pairing.player2) {
  // This is a bye - single participant gets automatic win
  // Create match with one participant, result = 'win'
} else {
  // Normal match - two participants, both start with result = null
}
```

---

## Critical Do's and Don'ts

### ✅ DO's

1. **Create tournaments with 'pending' status**
   ```typescript
   status: 'pending', // ✅ Not 'active' - becomes active when Round 1 starts
   ```

2. **Update status to 'active' when Round 1 starts**
   ```typescript
   // In startDraft() after creating Round 1 matches:
   await supabase
     .from('tournaments')
     .update({ status: 'active' })
     .eq('id', tournamentId);
   ```

3. **Redirect pending tournaments to seating page**
   ```typescript
   if (tournament.status === 'pending') {
     redirect(`/tournament/${id}/seating`);
   }
   ```

4. **Always use `await cookies()` in server actions**
   ```typescript
   const cookieStore = await cookies(); // Next.js 16 requirement
   ```

2. **Handle redirect errors properly**
   - `redirect()` throws a special error to perform the redirect
   - Check for `NEXT_REDIRECT` in error digest
   - Re-throw redirect errors, don't catch them as failures
   ```typescript
   if (error && typeof error === 'object' && 'digest' in error) {
     const digest = (error as { digest?: string }).digest;
     if (digest?.startsWith('NEXT_REDIRECT')) {
       throw error; // Re-throw redirect errors
     }
   }
   ```

3. **Check round completion correctly**
   - A match is complete when ALL participants have results
   - Don't assume a match is complete just because one participant has a result
   - Count participants with results vs. total participants per match

4. **Use `revalidatePath()` before redirecting**
   ```typescript
   revalidatePath(`/tournament/${tournamentId}`);
   redirect(`/tournament/${tournamentId}`);
   ```

5. **Handle database errors explicitly**
   - Check for errors on every Supabase operation
   - Return meaningful error messages to the client
   - Log errors for debugging

6. **Validate input before database operations**
   - Check tournament name is not empty
   - Ensure minimum 2 players
   - Verify match exists before updating

### ❌ DON'Ts

1. **Don't create tournaments with 'active' status**
   ```typescript
   status: 'active', // ❌ Should be 'pending' until Round 1 starts
   ```

2. **Don't show pending tournaments on dashboard**
   ```typescript
   .eq('status', 'active') // ✅ Only show active tournaments
   // ❌ Don't include 'pending' tournaments
   ```

3. **Don't assign draft seats during tournament creation**
   ```typescript
   draft_seat: i + 1, // ❌ Seats assigned on seating page, not during creation
   ```

4. **Don't create matches during tournament creation**
   ```typescript
   // ❌ Matches created when "Start Draft" is clicked, not during creation
   ```

5. **Don't use `pair()` function - it doesn't exist**
   - ❌ `import { pair } from 'tournament-pairings'` - WRONG
   - ✅ `import { Swiss } from 'tournament-pairings'` - CORRECT
   - ✅ `const pairings = new Swiss(standings)` - CORRECT

2. **Don't assume pairings are arrays of arrays**
   - The `Swiss` constructor returns an array of objects
   - Each object has `player1` and `player2` properties
   - Don't do: `pairing[0]` and `pairing[1]`
   - Do: `pairing.player1` and `pairing.player2`

3. **Don't create tournaments with no matches**
   - If match creation fails, return an error
   - Don't use `continue` to skip failed matches silently
   - Ensure at least some matches are created successfully

4. **Don't generate next round prematurely**
   - Only generate next round when ALL matches in current round are complete
   - Check every match, not just some matches
   - Verify all participants have results

5. **Don't hardcode game_type**
   - Fetch the tournament format from the database
   - Use `tournament.format` when creating matches
   - Don't assume all tournaments are 'draft'

6. **Don't ignore bye matches**
   - Byes are valid matches with one participant
   - The participant gets an automatic 'win' result
   - Still create a match entry for byes

7. **Don't catch redirect errors as failures**
   - Redirect errors are expected behavior
   - Don't show error toasts for redirects
   - Handle them in both server actions and client components

---

## Common Patterns

### Creating a Tournament
```typescript
// 1. Validate
if (playerIds.length < 2) {
  return { success: false, message: 'At least 2 players required' };
}

if (maxRounds < 1 || maxRounds > 10) {
  return { success: false, message: 'Number of rounds must be between 1 and 10' };
}

if (roundDurationMinutes < 1) {
  return { success: false, message: 'Round duration must be positive' };
}

// 2. Create tournament with status 'pending' (not 'active')
const { data: tournament, error } = await supabase
  .from('tournaments')
  .insert({ 
    name, 
    format, 
    status: 'pending', // ✅ Will become 'active' when Round 1 starts
    max_rounds: maxRounds,
    round_duration_minutes: roundDurationMinutes || 50
  })
  .select()
  .single();

// 3. Create tournament participants WITHOUT draft seats (seats assigned on seating page)
for (const playerId of playerIds) {
  await supabase.from('tournament_participants').insert({
    tournament_id: tournament.id,
    player_id: playerId,
    // draft_seat will be NULL initially, set when player selects seat
  });
}

// 4. Redirect to seating page (not tournament bracket)
redirect(`/tournament/${tournament.id}/seating`);
```

### Starting the Draft (After Seat Selection)
```typescript
// In startDraft() action, after all seats are assigned:

// 1. Update tournament status to 'active'
await supabase
  .from('tournaments')
  .update({ status: 'active' })
  .eq('id', tournamentId);

// 2. Generate Round 1 pairings based on draft seats (NOT Swiss)
const numPlayers = participants.length;
const pairings: Array<{ player1: string; player2?: string }> = [];

for (let i = 0; i < Math.floor(numPlayers / 2); i++) {
  const seat1 = i + 1;
  const seat2 = i + 1 + Math.floor(numPlayers / 2);
  
  const player1 = participants.find((p) => p.draft_seat === seat1);
  const player2 = participants.find((p) => p.draft_seat === seat2);
  
  if (player1 && player2) {
    pairings.push({ player1: player1.player_id, player2: player2.player_id });
  }
}

// 3. Create matches (without started_at - set when "Start Round" is clicked)
for (const pairing of pairings) {
  const { data: match } = await supabase.from('matches').insert({
    tournament_id: tournamentId,
    round_number: 1,
    game_type: tournament.format,
    // started_at is NOT set here - set when "Start Round" button is clicked
  }).select().single();
  
  // Create participants
}
```

### Submitting a Result
```typescript
// For win/loss:
// 1. Update participants
await supabase.from('match_participants')
  .update({ result: 'win' })
  .eq('match_id', matchId)
  .eq('player_id', winnerId);

await supabase.from('match_participants')
  .update({ result: 'loss' })
  .eq('match_id', matchId)
  .eq('player_id', loserId);

// For draw:
await supabase.from('match_participants')
  .update({ result: 'draw' })
  .eq('match_id', matchId)
  .in('player_id', playerIds);

// 2. Check round completion
const allMatchesComplete = /* check logic */;

// 3. Generate next round if needed
if (allMatchesComplete) {
  await generateNextRound(tournamentId, currentRound);
}

// 4. Revalidate and redirect
revalidatePath(`/tournament/${tournamentId}`);
redirect(`/tournament/${tournamentId}`);
```

### Calculating Standings with Points
```typescript
// 1. Get all matches up to current round
const { data: matches } = await supabase
  .from('matches')
  .select('id')
  .eq('tournament_id', tournamentId)
  .lte('round_number', currentRound);

// 2. Get all participants
const { data: participants } = await supabase
  .from('match_participants')
  .select('player_id, result')
  .in('match_id', matchIds);

// 3. Calculate standings with points
const standingsMap = new Map<string, { 
  wins: number; 
  losses: number; 
  draws: number;
  points: number;
}>();

participants.forEach(p => {
  if (!standingsMap.has(p.player_id)) {
    standingsMap.set(p.player_id, { wins: 0, losses: 0, draws: 0, points: 0 });
  }
  
  const standing = standingsMap.get(p.player_id)!;
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

// 4. Convert to array and sort by points
const standings = Array.from(standingsMap.entries())
  .map(([id, stats]) => ({ id, ...stats }))
  .sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points; // Points descending
    if (b.wins !== a.wins) return b.wins - a.wins; // Wins descending
    return a.losses - b.losses; // Losses ascending
  });
```

---

## Edge Cases

### Odd Number of Players
- The `Swiss` constructor handles this automatically
- One player gets a bye (pairing with only `player1`)
- Bye participant gets automatic 'win' result
- Still create a match entry for tracking

### Empty Rounds
- Should not happen in normal flow
- Validate that matches exist before displaying bracket
- Show appropriate message if no matches found

### Already Completed Matches
- Check `result !== null` before allowing reporting
- Redirect or show message if match already has result
- Prevent duplicate result submissions

### Tournament Status
- Tournaments are created with status 'pending' (not 'active')
- Status changes from 'pending' to 'active' when Round 1 matches are created (when "Start Draft" is clicked)
- Tournaments are marked as 'completed' when max_rounds is reached
- No further rounds are generated after completion
- Completed tournaments still display their final bracket
- Status changes from 'active' to 'completed' automatically
- Only tournaments with status 'active' appear on the dashboard
- Pending tournaments can be managed or deleted from the tournament management page (`/tournaments`)

---

## Testing Checklist

When testing tournament functionality:

1. ✅ Create tournament (should have 'pending' status)
2. ✅ Navigate to seating page and assign seats
3. ✅ Start draft (should change status to 'active' and create Round 1 matches)
4. ✅ Verify tournament appears on dashboard (only 'active' tournaments)
5. ✅ Create tournament with even number of players
6. ✅ Create tournament with odd number of players (test bye)
7. ✅ Report result for a match (win/loss/draw)
8. ✅ Verify next round generates when all matches complete
9. ✅ Verify standings are calculated correctly with points
10. ✅ Verify standings display on tournament page
11. ✅ Test multiple rounds (3+ rounds)
12. ✅ Verify redirects work without error toasts
13. ✅ Test error handling (invalid match, missing players, etc.)
14. ✅ Test tournament management page (view/delete tournaments)
15. ✅ Verify pending tournaments redirect to seating page
16. ✅ Test seat selection and reassignment
17. ✅ Verify clockwise seat arrangement

---

## Future Enhancements

Potential improvements for the tournament system:

1. **Tournament Completion** ✅ **IMPLEMENTED**
   - Automatically marks tournament as 'completed' when max_rounds is reached
   - Max rounds is set during tournament creation (default: 3)
   - No further rounds generated after completion

2. **Standings Display** ✅ **IMPLEMENTED**
   - Show current standings on tournament bracket page
   - Display points, wins, losses, draws per player
   - Sort by points (primary), wins (secondary), losses (tertiary)

3. **Draw Support** ✅ **IMPLEMENTED**
   - Draw results supported (2 points each)
   - Simplified match reporting UI with single-click selection

4. **Draft Seats & Round 1 Pairing** ✅ **IMPLEMENTED**
   - Draft seat selection on visual seating page
   - Round 1 pairs players across the table based on draft seats
   - Round 2+ uses Swiss pairings based on points

5. **Round Timers** ✅ **IMPLEMENTED**
   - Round duration configurable at tournament creation (default: 50 minutes)
   - Manual start/pause/resume controls
   - Timer countdown display
   - Informational only - no automatic actions when timer expires

6. **Tournament Status Workflow** ✅ **IMPLEMENTED**
   - Tournaments start as 'pending', become 'active' when Round 1 starts
   - Only active tournaments appear on dashboard
   - Pending tournaments can be managed or deleted

7. **Tournament Management** ✅ **IMPLEMENTED**
   - Tournament management page (`/tournaments`) to view all tournaments
   - Grouped by status: Pending, Active, Completed
   - Delete functionality for all tournaments
   - Continue setup for pending tournaments

8. **Tournament Settings** ✅ **IMPLEMENTED**
   - ✅ Configurable number of rounds (3-6 options in UI, 1-10 supported)
   - ✅ Configurable round duration (default: 50 minutes)
   - ⏳ Different pairing algorithms (currently only Swiss for Round 2+)
   - ⏳ Custom scoring systems

9. **Match History**
   - View previous rounds' results
   - See match history per player

---

## Troubleshooting

### Issue: "Export pair doesn't exist"
**Solution:** Use `Swiss` class, not `pair` function
```typescript
import { Swiss } from 'tournament-pairings';
const pairings = new Swiss(standings);
```

### Issue: Redirect shows error toast
**Solution:** Check for redirect error and don't treat as failure
```typescript
if (digest?.startsWith('NEXT_REDIRECT')) {
  throw error; // Re-throw, don't catch as error
}
```

### Issue: Next round not generating
**Solution:** Verify round completion logic checks ALL matches
- Count participants with results vs. total per match
- Ensure all matches have all participants with results

### Issue: Bye matches not working
**Solution:** Check for `!pairing.player2` not `pairing.length === 1`
- Pairings are objects, not arrays
- Use `pairing.player1` and `pairing.player2`

### Issue: Tournament continues beyond expected rounds
**Solution:** Ensure max_rounds is set and checked
- Add `max_rounds` column to tournaments table (see migration file)
- Check `currentRound >= max_rounds` before generating next round
- Mark tournament as 'completed' when limit reached
- Handle missing max_rounds with default value (3)

---

## References

- **Library:** [tournament-pairings](https://www.npmjs.com/package/tournament-pairings)
- **Database Structure:** `.dev-docs/DATABASE_STRUCTURE.md`
- **Tournament Rules:** `.dev-docs/TOURNAMENT_RULES.md`
- **Feature Specs:** 
  - `.dev-docs/features/03-feature-tournament-engine.md`
  - `.dev-docs/features/04-feature-match-reporting.md`
  - `.dev-docs/features/04.5-feature-tournament-ranking-draft-seats.md`
- **Migrations:**
  - `.dev-docs/DATABASE_MIGRATION_max_rounds.md`
  - `.dev-docs/DATABASE_MIGRATION_draft_seats_and_timers.md`
  - `.dev-docs/DATABASE_MIGRATION_make_draft_seat_nullable.md`
- **Implementation:**
  - `app/tournament/actions.ts` - Server actions
  - `app/tournament/[id]/page.tsx` - Tournament bracket page
  - `app/tournament/[id]/seating/page.tsx` - Draft seating page
  - `app/tournament/[id]/match/[matchId]/page.tsx` - Match reporting page
  - `app/tournaments/page.tsx` - Tournament management page
  - `components/tournament/draft-seating-selector.tsx` - Seat selection component
  - `components/tournament/match-reporting-form.tsx` - Match reporting form

