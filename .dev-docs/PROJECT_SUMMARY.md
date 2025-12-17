# Project Specification: Proxycon 2025 Companion App (V2 Platform)

## Role

Senior Full-Stack Engineer and Lead UX Designer.

## Goal

Build a complete, mobile-first streaming dashboard web application for Magic: The Gathering weekends. The application has been upgraded to a **multi-event platform ("V2")** supporting persistent user profiles, multiple events (e.g., "ProxyCon 2025", "Weekly Draft"), deck tracking, and tournament management.

## Target Audience

Groups of friends playing MTG, plus potential viewers via streaming dashboard features.

## Critical Constraint

The app must be "One-Thumb" usable. Interactions must be frictionless, big buttons, instant feedback.

---

## 1. Tech Stack & Architecture

### Core Framework

-   **Framework:** Next.js 16 (App Router)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS + Shadcn UI (Default Theme: Slate, Dark Mode forced)
-   **Icons:** `lucide-react`

### Backend & Data

-   **Database:** Supabase (Cloud Instance)
-   **Auth (V2):** Supabase Auth (Email/Password) with Profile linking.
-   **ORM/Querying:** Supabase JS Client (`@supabase/ssr`)

---

## 2. Design System & UX Guidelines

### A. Navigation Structure (V2)

-   **Mobile Bottom Bar:** Sticky footer with 5 icons:
    1.  **Home:** Global Player Status Sheet (Wins, Active Event Link).
    2.  **Events:** List of your events. Access to Event Dashboards.
    3.  **Play:** Casual Game Logger.
    4.  **Decks:** Personal Deck Tracker.
    5.  **Profile:** User Settings.

### B. "One-Thumb" Interactions

-   **Inputs:** Avoid typing where possible. Use `<Select>` or `<RadioGroup>` cards.
-   **Match Reporting:** Use game score inputs (+/-) for intuitive score entry.

---

## 3. Database Schema (Supabase V2)

### Platform Tables:
-   **`profiles`**: User identities linked to Auth.
-   **`events`**: Core container for a weekend/tournament series.
-   **`event_participants`**: Users joined to an event.
-   **`decks`**: User card decks.

### Game Tables:
-   **`players`**: Legacy/Display profile info.
-   **`tournaments`**: Linked to `events`.
-   **`matches`**: Linked to `events` and optionally `tournaments`.
-   **`match_participants`**: Results linked to `decks`.

---

## 4. Detailed Feature Specifications

### Feature A: Authentication (V2)

-   Standard Email/Password login.
-   "Claim Profile" flow for legacy data migration.

### Feature B: Dual Dashboard Strategy

1.  **Global Home (`/`)**: "Player Status Sheet". Shows total wins, link to current active event, and quick actions.
2.  **Event Dashboard (`/events/[id]`)**: The hub for a specific gathering. Shows active tournaments, event-specific stats, and the match feed.

### Feature C: Tournament Engine

-   **Setup:** Linked to an Event. Configurable rounds and prizes.
-   **Drafting:** Visual seating chart.
-   **Execution:** Swiss pairings, Round Timers, Game Score tracking (2-1, etc.).

### Feature D: Deck Tracker

-   Create and manage decks.
-   Select decks during match reporting (Casual & Tournament).

### Feature E: Casual Mode

-   Log non-tournament games (Commander, 1v1, 2HG).
-   **Event Linking:** Casual games can now be associated with the active event.

---

## 5. Critical Technical Directives

### 1. Next.js 16 Async Cookies:

You **MUST** use `await cookies()` in all Server Components.

### 2. Event Awareness:

Almost all data creation (Tournaments, Matches) should be linked to an `event_id` if one is active.