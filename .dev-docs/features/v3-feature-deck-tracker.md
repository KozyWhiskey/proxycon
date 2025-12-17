# Feature: Deck Tracker (V3)

## Objective
Allow users to catalogue their Magic: The Gathering decks and track their performance across tournaments and casual play.

## Architecture
-   **Table:** `public.decks`.
-   **Linkage:** `match_participants.deck_id` links a result to a specific deck.

## Components
1.  **Deck Library (`app/decks/page.tsx`):** View all owned decks.
2.  **Deck Creation:** Add Name, Format, Colors, Commander.
3.  **Match Integration:** Select a deck when reporting a result.

## Metrics
-   **Win Rate:** Calculated by counting `match_participants` records with `result='win'` vs total played.
-   **Color Identity:** Visualized using mana symbols.

## Best Practices
-   **Ownership:** Users can only edit/delete their own decks (enforced by RLS).
-   **Persistence:** Decks persist across events (Global Assets).
