# Tournament Development Rules

**CRITICAL:** Follow these rules when working on tournament-related features. Violating these rules will cause bugs.

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

## See Also

- **Detailed Documentation:** `.dev-docs/TOURNAMENT_STRUCTURE.md`
- **Implementation:** `app/tournament/actions.ts`
- **Feature Specs:** 
  - `.dev-docs/features/03-feature-tournament-engine.md`
  - `.dev-docs/features/04-feature-match-reporting.md`

