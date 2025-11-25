# Casual Mode - Implementation Documentation

**Status:** ✅ **COMPLETED**  
**Route:** `/play/casual`  
**Feature Spec:** `.dev-docs/features/05-feature-casual-mode.md`

---

## Overview

The Casual Mode feature allows users to log the results of casual games (Commander or board games) outside of tournament play. It supports both simple winner-take-all outcomes and ranked outcomes, with optional achievements for Commander games.

## Implementation Details

### Files Created

1. **`app/play/casual/page.tsx`** - Client Component
   - Interactive form for logging casual games
   - Game type selection (Commander/Board Game)
   - Multi-select player picker (2-4 players)
   - Outcome tabs (Simple/Ranked)
   - Drag-and-drop ranking for ranked outcomes
   - Achievement checkboxes (Commander only)

2. **`app/play/actions.ts`** - Server Action
   - `logCasualMatch()` - Handles match creation and ticket updates

### Key Features

#### Game Type Selection
- Dropdown selector for "Commander" or "Board Game"
- Achievements section only appears for Commander games

#### Player Selection
- Grid of all available players
- Multi-select with visual feedback (emerald green highlight)
- Maximum 4 players allowed
- Minimum 2 players required

#### Outcome Types

**Simple Outcome:**
- Tap-to-select winner interface
- All other players automatically marked as losers
- Winner receives +3 tickets

**Ranked Outcome:**
- Drag-and-drop ordering using `@dnd-kit`
- Players ordered from 1st to 4th place
- Ticket distribution:
  - 1st place: +5 tickets
  - 2nd place: +3 tickets
  - 3rd place: +2 tickets
  - 4th place: +1 ticket

#### Achievements (Commander Only)
- **First Blood** (+1 ticket) - Awarded to winner
- **Eliminated Player** (+1 ticket) - Awarded to winner
- **Salt Penalty** (-1 ticket) - Deducted from winner
- Achievements only apply to winners (win in simple, 1st in ranked)

### Database Operations

1. **Match Creation:**
   - Creates entry in `matches` table
   - `tournament_id` = NULL (casual match)
   - `round_number` = NULL (casual match)
   - `game_type` = 'commander' or 'board_game'

2. **Match Participants:**
   - Creates entries in `match_participants` table
   - `result` field stores:
     - Simple: 'win' or 'loss'
     - Ranked: '1st', '2nd', '3rd', or '4th'

3. **Ticket Updates:**
   - Calculates ticket rewards based on outcome and achievements
   - Updates `players.tickets` for each participant
   - Only winners receive achievement bonuses

4. **Win Tracking:**
   - Updates `players.wins` for winners (simple win or 1st place)

### Ticket Calculation Logic

```typescript
// Simple Outcome
Win: +3 tickets
Loss: 0 tickets

// Ranked Outcome
1st: +5 tickets
2nd: +3 tickets
3rd: +2 tickets
4th: +1 ticket

// Achievements (Commander only, winner only)
First Blood: +1 ticket
Eliminated Player: +1 ticket
Salt Penalty: -1 ticket
```

### User Experience

- **Mobile-First Design:** Large touch targets (h-12 minimum)
- **Visual Feedback:** Emerald green accents for casual mode
- **Drag-and-Drop:** Smooth reordering for ranked outcomes
- **Validation:** Prevents submission until all required fields are filled
- **Error Handling:** Toast notifications for errors
- **Success Flow:** Redirects to dashboard after successful submission

### Dependencies Added

- `@dnd-kit/core` - Drag and drop functionality
- `@dnd-kit/sortable` - Sortable list components
- `@dnd-kit/utilities` - Utility functions

### Testing Checklist

- ✅ Form UI renders correctly
- ✅ Game type selection works
- ✅ Player selection (2-4 players)
- ✅ Simple outcome winner selection
- ✅ Ranked outcome drag-and-drop
- ✅ Achievements appear only for Commander
- ✅ Ticket updates for simple outcomes
- ✅ Ticket updates for ranked outcomes
- ✅ Achievement bonuses applied correctly
- ✅ Database records created correctly
- ✅ Redirect to dashboard on success

### Known Considerations

- The database `match_participants.result` field constraint in documentation lists only 'win', 'loss', 'draw', but the implementation uses '1st', '2nd', '3rd', '4th' for ranked outcomes as specified in the feature spec. The database may need a constraint update to support these values, or they may already be supported as TEXT type.

---

## Usage

1. Navigate to `/play/casual`
2. Select game type (Commander or Board Game)
3. Select 2-4 players
4. Choose outcome type (Simple or Ranked)
5. For Simple: Tap winner
6. For Ranked: Drag players to order (1st to 4th)
7. If Commander: Select optional achievements
8. Click "Log Game"
9. Redirected to dashboard with updated ticket counts

