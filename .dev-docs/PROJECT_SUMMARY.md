# Project Specification: Proxycon 2025 Companion App (V3 Platform)

## Role

Senior Full-Stack Engineer and Lead UX Designer.

## Goal

Build a complete, mobile-first streaming dashboard web application for Magic: The Gathering weekends. The application has been upgraded to a **multi-event platform ("V3")** supporting persistent user profiles, multiple events (e.g., "ProxyCon 2025", "Weekly Draft"), deck tracking, tournament management, and a dynamic AI-powered achievement system.

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
-   **Auth (V3):** Supabase Auth (Email/Password) with Profile linking.
-   **ORM/Querying:** Supabase JS Client (`@supabase/ssr`)
-   **AI:** OpenAI (GPT-4o) for dynamic achievements and roasts.

---

## 2. Design System & UX Guidelines

### A. Navigation Structure (V3)

-   **Mobile Bottom Bar:** Sticky footer with 5 icons:
    1.  **Home:** Global Player Status Sheet (Wins, Active Event Link, Trophy Case).
    2.  **Events:** List of your events. Access to Event Dashboards.
    3.  **Play:** Casual Game Logger.
    4.  **Decks:** Personal Deck Tracker.
    5.  **Profile:** User Settings & Achievements.

### B. "One-Thumb" Interactions

-   **Inputs:** Avoid typing where possible. Use `<Select>` or `<RadioGroup>` cards.
-   **Match Reporting:** Use game score inputs (+/-) for intuitive score entry.

---

## 3. Database Schema (Supabase V3)

### Platform Tables:
-   **`profiles`**: User identities linked to Auth.
-   **`events`**: Core container for a weekend/tournament series.
-   **`event_members`**: Users joined to an event with specific roles (owner, player).
-   **`decks`**: User card decks with Scryfall integration.
-   **`badges`**: Global and AI-generated achievements.
-   **`profile_badges`**: Link table for earned achievements.

### Game Tables:
-   **`tournaments`**: Linked to `events`.
-   **`matches`**: Linked to `events` and optionally `tournaments`.
-   **`match_participants`**: Results linked to `decks` and game win scores.

---

## 4. Detailed Feature Specifications

### Feature A: Authentication & Onboarding

-   Standard Email/Password login.
-   Mandatory onboarding flow to establish global identity.

### Feature B: Dual Dashboard Strategy

1.  **Global Home (`/`)**: "Player Status Sheet". Shows total wins, link to current active event, quick actions, and your latest badges.
2.  **Event Dashboard (`/events/[id]`)**: The hub for a specific gathering. Shows active tournaments, event-specific stats, and the match feed.

### Feature C: Tournament Engine

-   **Setup:** Linked to an Event. Configurable rounds and prizes.
-   **Drafting:** Visual seating chart.
-   **Execution:** Swiss pairings, Round Timers, Game Score tracking (2-1, etc.).
-   **Automated Winner Badge**: Tournament winner receives the 'Champion' badge.

### Feature D: Deck Tracker & Scryfall

-   Create and manage decks.
-   Select specific art/prints for Commanders.
-   Rich oracle text and mana symbol rendering.

### Feature E: Casual Mode

-   Log non-tournament games (Commander, 1v1, 2HG).
-   **Event Linking:** Casual games associated with the active event.

### Feature F: The Snarky AI Director

-   Dynamic achievement generation using OpenAI.
-   Unique "Commander Roasts" for first-time wins with a specific deck.
-   Instant feedback via Toast notifications when a badge is unlocked.

---

## 5. Critical Technical Directives

### 1. Next.js 16 Async Cookies:

You **MUST** use `await cookies()` in all Server Components.

### 2. Event Awareness:

Almost all data creation (Tournaments, Matches) should be linked to an `event_id` if one is active.