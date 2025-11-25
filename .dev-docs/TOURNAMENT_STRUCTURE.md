# Tournament Structure & Implementation Guide

**Last Updated:** Based on Tournament Engine and Match Reporting implementation  
**Next.js Version:** 16.0.4  
**Library:** `tournament-pairings@2.0.1`

---

## Overview

The ProxyCon tournament system uses **Swiss-style pairings** for tournament brackets. This allows players to continue playing even after a loss, with pairings based on win/loss records. The system supports multiple rounds, automatic next-round generation, and handles edge cases like odd numbers of players (byes).

---

## Database Structure

### Tables Involved

1. **`tournaments`**
   - `id` (UUID) - Primary key
   - `name` (Text) - Tournament name
   - `format` (Text) - 'draft' or 'sealed'
   - `status` (Text) - 'active' or 'completed'
   - `max_rounds` (Integer) - Maximum number of rounds for this tournament (default: 3)
   - `created_at` (Timestamp)

2. **`matches`**
   - `id` (UUID) - Primary key
   - `tournament_id` (UUID) - Foreign key to tournaments
   - `round_number` (Int) - Which round this match belongs to (1, 2, 3, etc.)
   - `game_type` (Text) - Usually matches tournament format
   - `notes` (Text, nullable)
   - `created_at` (Timestamp)

3. **`match_participants`**
   - `id` (UUID) - Primary key
   - `match_id` (UUID) - Foreign key to matches
   - `player_id` (UUID) - Foreign key to players
   - `result` (Text, nullable) - 'win', 'loss', 'draw', or null (pending)
   - `deck_archetype` (Text, nullable)

### Relationships

- One tournament has many matches (one-to-many)
- One match has 1-2 participants (one-to-many)
- Each participant links to one player

---

## Tournament Lifecycle

### 1. Tournament Creation

**Route:** `/tournament/new`  
**Server Action:** `createTournament(name, playerIds, format, maxRounds)`

**Process:**
1. Validate input (name required, minimum 2 players, maxRounds between 1-10)
2. Create tournament entry with status 'active' and max_rounds
3. Generate Round 1 pairings using `Swiss` constructor
4. Create matches for each pairing
5. Create match_participants entries (result = null for normal matches, 'win' for byes)
6. Redirect to tournament bracket page

**Key Parameters:**
- `maxRounds` (default: 3) - Maximum number of rounds. When this limit is reached, the tournament is marked as 'completed' and no further rounds are generated.

**Key Implementation Details:**
- Uses `tournament-pairings` library's `Swiss` class
- For Round 1, all players start with `{ wins: 0, losses: 0, draws: 0 }`
- The `Swiss` constructor returns an array of pairing objects
- Each pairing has `player1` and `player2` properties
- If `player2` is undefined/null, it's a bye (single participant gets automatic win)

### 2. Match Reporting

**Route:** `/tournament/[id]/match/[matchId]`  
**Server Action:** `submitResult(matchId, winnerId, loserId, tournamentId)`

**Process:**
1. Update match_participants: set winner to 'win', loser to 'loss'
2. Check if all matches in current round are complete
3. If complete, automatically generate next round
4. Revalidate tournament page and redirect

**Round Completion Logic:**
- Fetch all matches for the current round
- For each match, check that ALL participants have non-null results
- A match is complete when: `participants_with_results === total_participants`
- Only when ALL matches are complete, generate the next round

### 3. Next Round Generation

**Server Action:** `generateNextRound(tournamentId, currentRound)` (internal)

**Process:**
1. Fetch tournament format and max_rounds
2. **Check max_rounds limit:** If `currentRound >= max_rounds`, mark tournament as 'completed' and return (no new round)
3. Calculate standings from all previous rounds:
   - Count wins, losses, draws for each player
   - Create standings array: `[{ id, wins, losses, draws }, ...]`
4. Generate pairings using `Swiss` constructor with standings
5. Create matches for next round (round_number = currentRound + 1)
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

### Round 1 (Random Pairings)
```typescript
const standings = playerIds.map(id => ({ id, wins: 0, losses: 0, draws: 0 }));
const pairings = new Swiss(standings);
```

### Round 2+ (Based on Records)
```typescript
// Calculate standings from previous rounds
const standings = [
  { id: 'player1', wins: 2, losses: 0, draws: 0 },
  { id: 'player2', wins: 1, losses: 1, draws: 0 },
  // ... etc
];
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

1. **Always use `await cookies()` in server actions**
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

1. **Don't use `pair()` function - it doesn't exist**
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

// 2. Create tournament with max_rounds
const { data: tournament, error } = await supabase
  .from('tournaments')
  .insert({ 
    name, 
    format, 
    status: 'active',
    max_rounds: maxRounds // ✅ Store the round limit
  })
  .select()
  .single();

// 3. Generate pairings
const standings = playerIds.map(id => ({ id, wins: 0, losses: 0, draws: 0 }));
const pairings = new Swiss(standings);

// 4. Create matches and participants
for (const pairing of pairings) {
  // Create match, then participants
}
```

### Submitting a Result
```typescript
// 1. Update participants
await supabase.from('match_participants')
  .update({ result: 'win' })
  .eq('match_id', matchId)
  .eq('player_id', winnerId);

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

### Calculating Standings
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

// 3. Calculate standings
const standingsMap = new Map();
participants.forEach(p => {
  // Count wins, losses, draws per player
});

// 4. Convert to array
const standings = Array.from(standingsMap.entries())
  .map(([id, stats]) => ({ id, ...stats }));
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
- Tournaments are marked as 'completed' when max_rounds is reached
- No further rounds are generated after completion
- Completed tournaments still display their final bracket
- Status changes from 'active' to 'completed' automatically

---

## Testing Checklist

When testing tournament functionality:

1. ✅ Create tournament with even number of players
2. ✅ Create tournament with odd number of players (test bye)
3. ✅ Report result for a match
4. ✅ Verify next round generates when all matches complete
5. ✅ Verify standings are calculated correctly
6. ✅ Test multiple rounds (3+ rounds)
7. ✅ Verify redirects work without error toasts
8. ✅ Test error handling (invalid match, missing players, etc.)

---

## Future Enhancements

Potential improvements for the tournament system:

1. **Tournament Completion** ✅ **IMPLEMENTED**
   - Automatically marks tournament as 'completed' when max_rounds is reached
   - Max rounds is set during tournament creation (default: 3)
   - No further rounds generated after completion

2. **Standings Display**
   - Show current standings on tournament bracket page
   - Display win/loss records per player

3. **Draw Support**
   - Currently only 'win' and 'loss' are used
   - Could add 'draw' result handling

4. **Tournament Settings** ✅ **PARTIALLY IMPLEMENTED**
   - ✅ Configurable number of rounds (3-6 options in UI, 1-10 supported)
   - ⏳ Different pairing algorithms (currently only Swiss)
   - ⏳ Custom scoring systems

5. **Match History**
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
- **Feature Specs:** 
  - `.dev-docs/features/03-feature-tournament-engine.md`
  - `.dev-docs/features/04-feature-match-reporting.md`
- **Implementation:**
  - `app/tournament/actions.ts` - Server actions
  - `app/tournament/[id]/page.tsx` - Tournament bracket page
  - `app/tournament/[id]/match/[matchId]/page.tsx` - Match reporting page

