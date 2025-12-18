# Feature: Scryfall Integration (V3)

## Objective
Enhance the Deck Tracker by integrating with the Scryfall API. This allows users to search for Magic: The Gathering cards (specifically Commanders) and automatically populate deck details such as the Commander's name, color identity, card art, and full card text.

## Architecture

### External API
-   **Service:** [Scryfall API](https://scryfall.com/docs/api)
-   **Endpoints:**
    -   `GET https://api.scryfall.com/cards/search?q={query}`: For finding multiple matches.
    -   `GET https://api.scryfall.com/cards/named?fuzzy={name}`: For exact/fuzzy matching.

### Database Updates (`public.decks`)
To support this feature, we need to extend the `decks` table:
-   `image_url` (TEXT, NULLABLE): URL to the card art.
-   `description` (TEXT, NULLABLE): Full Oracle text and stats.

### Workflow

1.  **Deck Creation/Edit (`app/decks/page.tsx`):**
    -   User enters a deck name.
    -   User types in "Commander Name" and clicks "Search" (or hits Enter).
    -   **Action:** App queries Scryfall (`/cards/search`).
    -   **UI:** 
        -   If 1 result: Auto-select.
        -   If >1 results: Show a modal with card previews/names.
    -   **Selection:** User clicks a card.
    -   **Auto-Fill:**
        -   `commander_name` -> Card Name.
        -   `colors` -> `color_identity` (mapped to `['W', 'U', 'B', 'R', 'G']`).
        -   `image_url` -> `image_uris.art_crop` (or `normal`).
        -   `description` -> `{mana_cost} — {type_line}

{oracle_text}`.
    -   **Visual:** Display the fetched card image as a preview.

2.  **Saving:**
    -   The form submits the auto-filled data to `createDeck` or `updateDeck` server actions.
    -   Data is stored in `public.decks`.

3.  **Deck List / Details:**
    -   Display the `image_url` as the background.
    -   Show `description` in the deck details (optional/future).

## Technical Implementation

### 1. Scryfall Service (`lib/scryfall.ts`)
Update to support search.
```typescript
export async function searchCards(query: string) {
  // Returns array of cards
}
```

### 2. Deck Form Component (`components/decks/deck-form.tsx`)
-   Add `SearchResultsDialog` to handle multiple matches.
-   Add `Textarea` for `description`.
-   Logic to format card text into description.

### 3. Server Actions (`app/decks/actions.ts`)
-   Update Zod schemas/SQL to include `description`.

## Migration Guide
Run the following SQL in Supabase to update the schema:
```sql
ALTER TABLE public.decks 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;
```