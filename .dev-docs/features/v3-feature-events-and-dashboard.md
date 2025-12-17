# Feature: Events & Dashboard (V3)

## Objective
Provide a "Global" dashboard for personal stats and an "Event" dashboard for specific tournament weekends.

## Architecture
-   **Events Table:** `public.events` stores metadata (Name, Dates, Owner).
-   **Membership:** `public.event_members` links profiles to events with roles.
-   **Context Switching:** Users can be part of multiple events.

## Components
1.  **Global Dashboard (`app/page.tsx`):**
    -   Shows total career wins (aggregated from `match_participants`).
    -   Lists active events user is part of.
    -   Quick actions for creating tournaments.
2.  **Event Dashboard (`app/events/[id]/page.tsx`):**
    -   Scoped to a specific `event_id`.
    -   Shows event-specific standings and match feed.
3.  **Event Creation (`app/events/new/page.tsx`):**
    -   Allows creating a new event container.

## Best Practices
-   **Event Awareness:** Most actions (creating tournaments, logging matches) should optionally accept an `eventId`.
-   **Stats:** Calculate stats dynamically or use a materialized view (future optimization) to avoid slow `count(*)` queries.
