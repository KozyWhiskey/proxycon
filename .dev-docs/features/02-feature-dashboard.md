# Feature: Dashboard (Refactored for V2)

## Objective
The dashboard has been split into two distinct views to support the V2 Multi-Event architecture:
1.  **Global Home (`/`):** A "Player Status Sheet" focusing on the individual user.
2.  **Event Dashboard (`/events/[id]`):** A hub for a specific event (e.g., "ProxyCon 2025").

## Implementation Steps

### 1. Global Home (`app/page.tsx`)
-   **Goal:** Provide a high-level overview of the player's career and quick access to active contexts.
-   **Components:**
    -   **User Header:** Sticky header with avatar and name.
    -   **Player Stats Card:** Shows total wins (Global).
    -   **Active Event Banner:** If the user is part of an active event, show a prominent banner linking to it.
    -   **Quick Actions:** "New Tournament" (Global or Event-linked), "Log Casual Game", "Manage Decks".

### 2. Event Dashboard (`app/events/[id]/page.tsx`)
-   **Goal:** The main interface used *during* an event.
-   **Components:**
    -   **Event Stats:** Wins/Losses specific to this event.
    -   **Active Tournaments:** List of 'active' or 'pending' tournaments for this event.
        -   Includes "Go to Lobby" for pending tournaments.
        -   Includes "Enter Result" for active matches.
    -   **The Feed:** Real-time list of matches (Tournament & Casual) linked to this event.

### 3. Navigation
-   **Bottom Nav:**
    -   **Home:** Links to `/`.
    -   **Events:** Links to `/events` (List of user's events).
    -   **Play:** Links to `/play/casual`.
    -   **Decks:** Links to `/decks`.
    -   **Profile:** Links to `/profile`.

## Testing Plan

1.  **Home Page:** Verify stats load and Active Event banner appears if applicable.
2.  **Event Dashboard:** Verify only event-specific data (matches, tournaments) is shown.
3.  **Feed:** Ensure the feed on the Event Dashboard updates when new matches are reported in that event.