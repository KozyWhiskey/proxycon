# Feature: Expanded Game Modes (V2 Phase 4)

## Objective
Expand the platform's capabilities to support more complex Magic: The Gathering formats, specifically **Team Sealed**, and refactor the **Casual Mode** to focus strictly on MTG formats (moving board games out or categorizing them differently).

## Background
The current system assumes 1v1 matches for tournaments and a generic "Casual Mode" that mixes Commander and Board Games. Phase 4 aims to specialize the casual experience and introduce team-based tournament logic.

## Implementation Steps

### 1. Team Sealed Support
**Goal:** Allow tournaments to run in a "Team Sealed" format (3v3).
-   **Database Migration:**
    -   Update `tournaments.format` to allow `'team_sealed'`.
    -   Update `match_participants` to potentially group players (or just use logic).
    -   *Design Decision:* For simplicity in V2, we will treat Team Sealed as a series of 1v1 matches that contribute to a team score, or a single match record where `match_participants` contains 6 players (Team A vs Team B).
    -   *Chosen Approach:* **Team Entity is Virtual.**
        -   In `tournament_participants`, add `team_id` (UUID or Text) to group players.
        -   Pairings logic needs to pair Team A vs Team B.
        -   Match Reporting needs to record the overall Team Result (Win/Loss) or individual seat results.
        -   *Simplified V2 Approach:* We will implement **"2-Headed Giant" / "Team"** support in Casual Mode first. Full Tournament Team Sealed is complex (requires custom pairing algorithm). We will focus on **Casual Team Games** for now.

### 2. Casual Mode Refactor
**Goal:** Split "Casual Play" into dedicated "MTG" and "Board Games" sections, or focus purely on MTG.
-   **Route:** Refactor `app/play/casual/page.tsx`.
-   **New UI:**
    -   **Format Selector:** "Commander (4-Player)", "1v1", "Two-Headed Giant (2v2)".
    -   **Deck Selection:** Integrate the Deck Tracker. Users should select which deck they are playing.
    -   **Board Games:** Move to a separate tab or remove if out of scope (Project Summary says "Focus strictly on MTG formats"). *Decision: We will deprioritize Board Games to focus on the MTG League aspect.*

### 3. Database Updates for Casual
-   **Matches Table:** Ensure `game_type` correctly stores 'commander', '1v1', '2hg'.
-   **Match Participants:** Ensure `deck_id` is captured in casual games.

### 4. Implementation Details
-   **`app/play/casual/page.tsx`**:
    -   Fetch user's decks.
    -   Fetch all players.
    -   UI for "Who played?" -> Select Players -> Select Decks -> Select Winner.
    -   Support "2HG" (Select Team A Players, Select Team B Players).

-   **`app/play/actions.ts`**:
    -   Update `logCasualMatch` to accept `deck_ids`.
    -   Handle 2HG logic (if Team A wins, both players get a win).

## Testing Plan

1.  **Casual Commander Game:**
    -   Log a 4-player game.
    -   Select decks for each player.
    -   Verify `deck_id` is saved.
    -   Verify wins are updated.

2.  **Casual 1v1 Game:**
    -   Log a standard 1v1 game.
    -   Verify decks and results.

3.  **Two-Headed Giant (2HG):**
    -   Select "2HG".
    -   Select 4 players (2 per team).
    -   Log result.
    -   Verify all 4 players get a match record (2 winners, 2 losers).

## Key Files to Modify
-   `app/play/casual/page.tsx` (Complete Rewrite)
-   `app/play/actions.ts`
-   `components/casual/casual-game-form.tsx` (New component)
