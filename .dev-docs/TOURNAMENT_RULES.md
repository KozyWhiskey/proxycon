# Tournament Development Rules

**CRITICAL:** Follow these rules when working on tournament-related features. Violating these rules will cause bugs.

**Last Updated:** Based on Tournament Status Workflow & Management implementation

## Library Usage

### ✅ CORRECT
```typescript
import { Swiss } from 'tournament-pairings';

// Round 1: All players start with 0 wins/losses/draws
const standings = playerIds.map(id => ({ id, wins: 0, losses: 0, draws: 0 }));
const pairings = new Swiss(standings);

// Round 2+: Use calculated standings
const pairings = new Swiss(calculatedStandings);

// Pairings are objects with player1 and player2 properties
for (const pairing of pairings) {
  if (!pairing.player2) {
    // Bye - single participant
  } else {
    // Normal match - two participants
  }
}
```

### ❌ WRONG
```typescript
// DON'T: pair() function doesn't exist
import { pair } from 'tournament-pairings';
const pairings = pair(playerIds);

// DON'T: Pairings are not arrays of arrays
const player1 = pairing[0];
const player2 = pairing[1];
```

## Round Completion Logic

### ✅ CORRECT
```typescript
// A match is complete when ALL participants have results
const allMatchesComplete = roundMatches.every((match) => {
  const participants = getParticipantsForMatch(match.id);
  const withResults = participants.filter(p => p.result !== null).length;
  return withResults === participants.length; // ALL must have results
});
```

### ❌ WRONG
```typescript
// DON'T: Check if ANY participant has a result
const matchComplete = participants.some(p => p.result !== null);

// DON'T: Check if match exists in "completed" set
const matchComplete = completedMatches.has(match.id);
```

## Redirect Error Handling

### ✅ CORRECT
```typescript
// Server Actions
try {
  // ... do work ...
  redirect('/path');
} catch (error) {
  // Re-throw redirect errors (they're expected)
  if (error && typeof error === 'object' && 'digest' in error) {
    const digest = (error as { digest?: string }).digest;
    if (digest?.startsWith('NEXT_REDIRECT')) {
      throw error; // Re-throw, don't catch as failure
    }
  }
  // Handle actual errors
}

// Client Components
try {
  await serverAction();
} catch (error) {
  // Check for redirect error
  if (error && typeof error === 'object' && 'digest' in error) {
    const digest = (error as { digest?: string }).digest;
    if (digest?.startsWith('NEXT_REDIRECT')) {
      return; // Don't show error toast
    }
  }
  // Show error for actual failures
  toast.error('Error message');
}
```

### ❌ WRONG
```typescript
// DON'T: Catch redirect errors as failures
catch (error) {
  toast.error('An error occurred'); // Shows error even on successful redirect
}

// DON'T: Ignore redirect errors in server actions
catch (error) {
  return { success: false }; // Redirect will fail
}
```

## Database Operations

### ✅ CORRECT
```typescript
// Always check for errors
const { data: match, error: matchError } = await supabase
  .from('matches')
  .insert({ ... })
  .select()
  .single();

if (matchError || !match) {
  return { success: false, message: matchError?.message || 'Failed' };
}

// Fetch tournament data including format and max_rounds
const { data: tournament } = await supabase
  .from('tournaments')
  .select('format, max_rounds, status')
  .eq('id', tournamentId)
  .single();

// Use tournament.format, not hardcoded values
await supabase.from('matches').insert({
  game_type: tournament.format, // ✅ Use from database
});

// Handle missing max_rounds gracefully (for existing tournaments)
const maxRounds = tournament.max_rounds || 3; // ✅ Default fallback
```

### ❌ WRONG
```typescript
// DON'T: Ignore errors
await supabase.from('matches').insert({ ... });

// DON'T: Hardcode game_type
await supabase.from('matches').insert({
  game_type: 'draft', // ❌ Should use tournament.format
});

// DON'T: Assume max_rounds always exists
if (currentRound >= tournament.max_rounds) { // ❌ May be null/undefined
  // ...
}
```

## Next Round Generation

### ✅ CORRECT
```typescript
// Only generate next round when ALL matches are complete
if (allMatchesComplete) {
  await generateNextRound(tournamentId, currentRound);
}

// In generateNextRound: Check max_rounds BEFORE generating
const { data: tournament } = await supabase
  .from('tournaments')
  .select('format, max_rounds, status')
  .eq('id', tournamentId)
  .single();

const maxRounds = tournament.max_rounds || 3; // Default for existing tournaments
if (currentRound >= maxRounds) {
  // Mark tournament as completed
  await supabase
    .from('tournaments')
    .update({ status: 'completed' })
    .eq('id', tournamentId);
  return; // Don't generate next round
}

// Calculate standings from ALL previous rounds
const { data: allMatches } = await supabase
  .from('matches')
  .select('id')
  .eq('tournament_id', tournamentId)
  .lte('round_number', currentRound); // ✅ Include current round

// Use calculated standings for pairing
const standings = calculateStandings(allParticipants);
const pairings = new Swiss(standings);
```

### ❌ WRONG
```typescript
// DON'T: Generate next round when some matches complete
if (someMatchesComplete) {
  await generateNextRound(); // ❌ Wait for ALL matches
}

// DON'T: Generate next round without checking max_rounds
await generateNextRound(tournamentId, currentRound); // ❌ May exceed limit

// DON'T: Use initial standings for round 2+
const pairings = new Swiss(initialStandings); // ❌ Must calculate from results

// DON'T: Hardcode max rounds check
if (currentRound >= 3) { // ❌ Should use tournament.max_rounds
  // ...
}
```

## Bye Handling

### ✅ CORRECT
```typescript
// Check for bye using player2 property
if (!pairing.player2) {
  // Bye - create match with one participant, result = 'win'
  await supabase.from('match_participants').insert({
    match_id: match.id,
    player_id: pairing.player1,
    result: 'win', // ✅ Automatic win for bye
  });
}
```

### ❌ WRONG
```typescript
// DON'T: Check array length (pairings are objects, not arrays)
if (pairing.length === 1) { // ❌ pairing is an object
  // ...
}

// DON'T: Set bye result to null
result: null, // ❌ Bye should be 'win'
```

## Path Revalidation

### ✅ CORRECT
```typescript
// Always revalidate before redirecting
revalidatePath(`/tournament/${tournamentId}`);
redirect(`/tournament/${tournamentId}`);
```

### ❌ WRONG
```typescript
// DON'T: Redirect without revalidation
redirect(`/tournament/${tournamentId}`); // ❌ Page won't update
```

## Max Rounds & Tournament Completion

### ✅ CORRECT
```typescript
// Check max_rounds before generating next round
const { data: tournament } = await supabase
  .from('tournaments')
  .select('max_rounds, status')
  .eq('id', tournamentId)
  .single();

const maxRounds = tournament.max_rounds || 3; // Default for existing tournaments
if (currentRound >= maxRounds) {
  // Mark as completed and stop
  await supabase
    .from('tournaments')
    .update({ status: 'completed' })
    .eq('id', tournamentId);
  return; // Don't generate next round
}

// Store max_rounds when creating tournament
await supabase.from('tournaments').insert({
  name,
  format,
  status: 'active',
  max_rounds: maxRounds, // ✅ Store the limit
});
```

### ❌ WRONG
```typescript
// DON'T: Generate rounds without checking max_rounds
await generateNextRound(tournamentId, currentRound); // ❌ May exceed limit

// DON'T: Hardcode round limit
if (currentRound >= 3) { // ❌ Should use tournament.max_rounds

// DON'T: Assume max_rounds exists
if (currentRound >= tournament.max_rounds) { // ❌ May be null
  // ...
}

// DON'T: Forget to mark tournament as completed
// When max rounds reached, must update status
```

## Tournament Status Workflow

### ✅ CORRECT
```typescript
// Create tournament with 'pending' status
const { data: tournament } = await supabase
  .from('tournaments')
  .insert({
    name,
    format,
    status: 'pending', // ✅ Not 'active' - becomes active when Round 1 starts
    max_rounds: maxRounds,
    round_duration_minutes: roundDurationMinutes,
  })
  .select()
  .single();

// Create participants without draft seats
for (const playerId of playerIds) {
  await supabase.from('tournament_participants').insert({
    tournament_id: tournament.id,
    player_id: playerId,
    // draft_seat is NULL initially
  });
}

// Redirect to seating page
redirect(`/tournament/${tournament.id}/seating`);

// When "Start Draft" is clicked (after seats assigned):
// 1. Update status to 'active'
await supabase
  .from('tournaments')
  .update({ status: 'active' })
  .eq('id', tournamentId);

// 2. Then create Round 1 matches
```

### ❌ WRONG
```typescript
// DON'T: Create tournament with 'active' status
status: 'active', // ❌ Should be 'pending' until Round 1 starts

// DON'T: Assign draft seats during tournament creation
draft_seat: i + 1, // ❌ Seats assigned on seating page, not during creation

// DON'T: Create matches during tournament creation
// Matches created when "Start Draft" is clicked, not during creation
```

## Draft Seat Assignment & Round 1 Pairing

### ✅ CORRECT
```typescript
// Seats are assigned on the seating page (not during tournament creation)
// Players select their seats visually, then "Start Draft" is clicked

// Round 1: Pair based on draft seats (across-table pairing)
// For 8 players: seat 1 vs 5, seat 2 vs 6, seat 3 vs 7, seat 4 vs 8
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

### ❌ WRONG
```typescript
// DON'T: Use Swiss pairings for Round 1
const standings = playerIds.map(id => ({ id, wins: 0, losses: 0, draws: 0 }));
const pairings = new Swiss(standings); // ❌ Round 1 should use draft seats

// DON'T: Assign draft seats during tournament creation
// Seats are assigned on seating page, not during creation

// DON'T: Create matches during tournament creation
// Matches created when "Start Draft" is clicked

// DON'T: Pair adjacent seats
// Round 1 pairs players across the table, not next to each other
```

## Points System & Standings Calculation

### ✅ CORRECT
```typescript
// Calculate standings with points (3 for win, 2 for draw, 1 for loss)
const standingsMap = new Map<string, { 
  wins: number; 
  losses: number; 
  draws: number;
  points: number;
}>();

allParticipants?.forEach((p) => {
  if (!standingsMap.has(p.player_id)) {
    standingsMap.set(p.player_id, { wins: 0, losses: 0, draws: 0, points: 0 });
  }

  const standing = standingsMap.get(p.player_id)!;
  if (p.result === 'win') {
    standing.wins++;
    standing.points += 3; // ✅ Win = 3 points
  } else if (p.result === 'loss') {
    standing.losses++;
    standing.points += 1; // ✅ Loss = 1 point
  } else if (p.result === 'draw') {
    standing.draws++;
    standing.points += 2; // ✅ Draw = 2 points
  }
});

// Sort standings by points (primary), wins (secondary), losses (tertiary)
const standings = Array.from(standingsMap.entries())
  .map(([id, stats]) => ({ id, ...stats }))
  .sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points; // Points descending
    if (b.wins !== a.wins) return b.wins - a.wins; // Wins descending
    return a.losses - b.losses; // Losses ascending
  });
```

### ❌ WRONG
```typescript
// DON'T: Use only wins/losses for standings
const standings = calculateWinsLosses(participants); // ❌ Must include points

// DON'T: Award same points for win and draw
if (p.result === 'win') {
  standing.points += 2; // ❌ Win should be 3 points
}

// DON'T: Sort only by wins
standings.sort((a, b) => b.wins - a.wins); // ❌ Must sort by points first
```

## Round Timers & Time-Based Draws

### ✅ CORRECT
```typescript
// Set round start time when creating matches
const roundStartTime = new Date().toISOString();
await supabase.from('matches').insert({
  tournament_id: tournament.id,
  round_number: 1,
  game_type: format,
  started_at: roundStartTime, // ✅ Set start time
});

// Calculate time remaining
const { data: tournament } = await supabase
  .from('tournaments')
  .select('round_duration_minutes')
  .eq('id', tournamentId)
  .single();

const { data: match } = await supabase
  .from('matches')
  .select('started_at')
  .eq('tournament_id', tournamentId)
  .eq('round_number', currentRound)
  .limit(1)
  .single();

if (match?.started_at) {
  const startTime = new Date(match.started_at);
  const now = new Date();
  const elapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
  const timeRemaining = tournament.round_duration_minutes - elapsedMinutes;
  
  // Auto-draw when time expires
  if (timeRemaining <= 0) {
    await submitTimeDraw(matchId, tournamentId);
  }
}
```

### ❌ WRONG
```typescript
// DON'T: Forget to set started_at when creating matches
await supabase.from('matches').insert({
  tournament_id: tournament.id,
  round_number: 1,
  // ❌ Missing started_at - timer won't work
});

// DON'T: Use hardcoded round duration
const timeRemaining = 50 - elapsedMinutes; // ❌ Should use tournament.round_duration_minutes
```

## Draw Handling

### ✅ CORRECT
```typescript
// Submit draw result
export async function submitDraw(
  matchId: string,
  playerIds: string[],
  tournamentId: string
): Promise<SubmitResultResult> {
  // Set all participants to draw
  for (const playerId of playerIds) {
    await supabase
      .from('match_participants')
      .update({ result: 'draw' })
      .eq('match_id', matchId)
      .eq('player_id', playerId);
  }
  
  // Check round completion and generate next round if needed
  // ... (same logic as submitResult)
}
```

### ❌ WRONG
```typescript
// DON'T: Set only one participant to draw
await supabase
  .from('match_participants')
  .update({ result: 'draw' })
  .eq('match_id', matchId)
  .eq('player_id', player1Id); // ❌ Both players must be set to draw
```

## Tournament Status & Workflow

### ✅ CORRECT
```typescript
// Tournament status workflow:
// 1. Create with 'pending' status
status: 'pending'

// 2. Players select seats on seating page
// 3. When "Start Draft" clicked:
//    - Update status to 'active'
//    - Create Round 1 matches
//    - Tournament appears on dashboard

// 4. When max_rounds reached:
//    - Update status to 'completed'
//    - No further rounds generated
```

### ❌ WRONG
```typescript
// DON'T: Create tournament with 'active' status
status: 'active', // ❌ Should be 'pending' until Round 1 starts

// DON'T: Show pending tournaments on dashboard
// Only 'active' tournaments should appear on dashboard

// DON'T: Allow viewing pending tournament bracket
// Redirect to seating page if tournament is 'pending'
```

## Match Reporting UI

### ✅ CORRECT
```typescript
// Simplified single-click interface:
// - 3 buttons: Player 1, Player 2, Draw
// - Click button to select result
// - "Submit Result" button appears for confirmation
// - Points info shown as fine print
```

### ❌ WRONG
```typescript
// DON'T: Two-step process (select result type, then select player)
// Should be single-click with confirmation

// DON'T: Show points on buttons
// Points shown as fine print, not on buttons
```

## Quick Reference Checklist

When working on tournament features, verify:

- [ ] Using `Swiss` class, not `pair()` function
- [ ] Pairings accessed as `pairing.player1` and `pairing.player2` (not array indices)
- [ ] Round completion checks ALL participants have results
- [ ] Redirect errors are re-thrown, not caught as failures
- [ ] Database errors are checked and returned with messages
- [ ] `tournament.format` is used, not hardcoded 'draft'
- [ ] Byes are detected with `!pairing.player2`
- [ ] Bye participants get `result: 'win'`
- [ ] `revalidatePath()` is called before `redirect()`
- [ ] Standings are calculated from all previous rounds for Round 2+
- [ ] **Max rounds is checked before generating next round**
- [ ] **Tournament is marked 'completed' when max_rounds reached**
- [ ] **Handle missing max_rounds gracefully (default to 3)**
- [ ] **Tournament created with 'pending' status (not 'active')**
- [ ] **Status changes to 'active' when Round 1 matches are created**
- [ ] **Draft seats assigned on seating page (not during creation)**
- [ ] **Round 1 pairings use draft seat positions (across-table)**
- [ ] **Standings calculated with points (3/2/1 for win/draw/loss)**
- [ ] **Standings displayed on tournament page**
- [ ] **Match reporting supports win/loss/draw with simplified UI**
- [ ] **Round timer set when "Start Round" clicked (not automatically)**

## See Also

- **Detailed Documentation:** `.dev-docs/TOURNAMENT_STRUCTURE.md`
- **Database Structure:** `.dev-docs/DATABASE_STRUCTURE.md`
- **Implementation:** `app/tournament/actions.ts`
- **Feature Specs:** 
  - `.dev-docs/features/03-feature-tournament-engine.md`
  - `.dev-docs/features/04-feature-match-reporting.md`
  - `.dev-docs/features/04.5-feature-tournament-ranking-draft-seats.md`

