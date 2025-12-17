# Feature: Deck Tracker (V2 Phase 3)

## Objective
Implement a personal deck tracking system, allowing users to record and manage their Magic: The Gathering decks. Integrate deck selection into the match reporting process.

## Background
The V2 schema introduces a `decks` table linked to `profiles`. This feature leverages that new table to provide a dedicated "My Decks" page and enhance match reporting.

## Implementation Steps

### 1. Database Actions for Decks
**Goal:** Create server actions for managing user decks.
-   Create `app/decks/actions.ts` (or add to `app/user/actions.ts` if appropriate for user-specific data).
-   **`createDeck(name, format, colors, commanderName)`**:
    -   Requires authentication.
    -   Inserts a new record into the `decks` table with `owner_id = auth.uid()`.
-   **`getUsersDecks(profileId)`**:
    -   Fetches all decks owned by a specific profile.
-   **`updateDeck(deckId, name, format, colors, commanderName)`**:
    -   Requires authentication and ownership check.
    -   Updates an existing deck record.
-   **`deleteDeck(deckId)`**:
    -   Requires authentication and ownership check.
    -   Deletes a deck record.

### 2. My Decks Page UI
**Goal:** Provide a user interface to view and manage personal decks.
-   **Route:** Create `app/decks/page.tsx`.
-   **Data Fetching:** Fetch all decks owned by the current user's profile.
-   **Display:**
    -   List each deck, showing its name, format, and color identity (using mana symbols or color blocks).
    -   Display a placeholder for win rate (to be implemented later).
-   **Actions:**
    -   "Create New Deck" button to open a form for creating a new deck.
    -   "Edit" and "Delete" actions for each listed deck.

### 3. Deck Creation/Editing Form
**Goal:** Allow users to input deck details.
-   **Component:** Create a client component (e.g., `components/decks/deck-form.tsx`).
-   **Fields:**
    -   Deck Name (Text Input)
    -   Format (Dropdown: Commander, Modern, Standard, etc.)
    -   Colors (Multi-select checkboxes for WUBRG)
    -   Commander Name (Text Input, conditional on format being Commander)
-   **Submission:** Calls `createDeck` or `updateDeck` server actions.

### 4. Integrate Deck Selection into Match Reporting
**Goal:** Allow users to specify which deck they played in a match.
-   **Modify `MatchReportingForm`**: Update `components/tournament/match-reporting-form.tsx`.
-   **Deck Selection:**
    -   When a player is selected (or if it's the current user reporting), add a dropdown (`<Select>`) to choose from their owned decks.
    -   The dropdown should list decks owned by the current reporting user (for their side of the match) and perhaps a limited selection for their opponent (or a "N/A" / "Unknown Deck" option).
-   **Update Server Actions:** Modify `submitResultWithGames` and `submitDrawWithGames` in `app/tournament/actions.ts` to accept and store `deck_id` in `match_participants`.

## Testing Plan

1.  **Deck Creation:**
    -   Navigate to `/decks`.
    -   Create a new deck. Verify it appears in the list and in the database.
    -   Test different formats and color combinations.

2.  **Deck Editing/Deletion:**
    -   Edit an existing deck. Verify changes are saved.
    -   Delete a deck. Verify it's removed.

3.  **Match Reporting with Deck Selection:**
    -   Go to a match reporting page.
    -   Verify the deck selection dropdown appears.
    -   Select a deck for the current user and submit results.
    -   Verify `match_participants.deck_id` is populated correctly in the database.

4.  **Security:**
    -   Attempt to edit/delete a deck not owned by the current user. Verify it fails.

## Key Files to Modify

-   `app/decks/actions.ts` (New)
-   `app/decks/page.tsx` (New)
-   `components/decks/deck-form.tsx` (New)
-   `components/tournament/match-reporting-form.tsx` (Modify)
-   `app/tournament/actions.ts` (Modify)
-   `lib/types.ts` (Ensure `Deck` interface is complete)
