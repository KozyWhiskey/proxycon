# Feature: Event Management (V2 Phase 2)

## Objective
Transition the application from a single-tenant "global" dashboard to a multi-event platform. This involves creating an "Event Dashboard" that displays data specific to a selected event (e.g., "ProxyCon 2025") and a "Global Landing" page for selecting events.

## Implementation Steps

### 1. Database Migration: Link Tournaments to Events
**Goal:** Establish a direct relationship between `tournaments` and `events`.
-   Create a new migration file `.dev-docs/DATABASE_MIGRATION_link_tournaments_to_events.md`.
-   Add an `event_id` column to the `tournaments` table (Foreign Key to `events.id`, Non-Nullable for new records, Nullable for legacy).
-   Update existing tournaments to link to a default "Legacy Event" (if needed) or leave null for now.

### 2. Create Event Context & Switcher
**Goal:** Allow users to easily switch between different events.
-   **Server Action:** Create `app/events/actions.ts` with:
    -   `createEvent(name, startDate, endDate)`: Creates a new event.
    -   `joinEvent(inviteCode)`: Adds the current user to an event.
-   **UI Component:** Update `components/dashboard/user-header.tsx` or create `components/navigation/event-switcher.tsx`.
    -   Fetch the user's participating events.
    -   Provide a dropdown to switch the current context (navigates to `/events/[id]`).

### 3. Refactor Dashboard Architecture
**Goal:** Move the current dashboard logic to a dynamic event-specific route.
-   **Move Logic:** Move the data fetching and layout from `app/page.tsx` to `app/events/[id]/page.tsx`.
    -   Update all queries to filter by `event_id` (e.g., `where tournament.event_id = params.id`).
-   **New Landing Page:** Rewrite `app/page.tsx` to be the "Your Events" list.
    -   Fetch events where the user is a participant.
    -   Display cards for each event.
    -   "Create Event" button (if authorized) or "Join Event" input.

### 4. Update Event Creation UI
-   Create a page `app/events/new/page.tsx` for creating new events.
    -   Form: Name, Start Date, End Date.
    -   Action: `createEvent`.

## Testing Plan

1.  **Database Migration:**
    -   Run the SQL migration.
    -   Verify `tournaments` table has `event_id`.

2.  **Event Creation:**
    -   Create a new event "Test Event 2025".
    -   Verify it appears in the `events` table.
    -   Verify the creator is added to `event_participants` as 'admin'.

3.  **Dashboard Refactor:**
    -   Navigate to `/`. Expect to see the new "Your Events" list.
    -   Click on an event. Expect to be taken to `/events/[uuid]`.
    -   Verify the dashboard loads correctly for that specific event.

4.  **Tournament Creation (Updated):**
    -   Inside an event context, create a new tournament.
    -   Verify the new tournament has the correct `event_id`.
