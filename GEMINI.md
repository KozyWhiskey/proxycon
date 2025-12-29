# Gemini Project: MTG League Platform

This document provides a comprehensive overview of the MTG League Platform project, designed to be used as instructional context for Gemini.

## 1. Project Overview

**Goal**: Transition the application from a single-event "weekend companion" to a persistent Magic: The Gathering League Platform.
**Current State**: The app is in **V3 Development** and has achieved **Stable V3 Architecture**.
**Target State**: A persistent platform supporting multiple Events (e.g., "Upkeep", "Weekly Draft"), real User Accounts via Supabase Auth, Deck Tracking with Scryfall data, and expanded Game Modes.

### Core Features (V3)

-   **Auth & Onboarding**: Secure identity via Supabase Auth (Email/Password) linked to a `public.profiles` table. Includes a mandatory onboarding flow (`/onboarding`).
-   **Events & Dashboard**: Support for multiple concurrent events.
    -   **Global Dashboard**: Personal career stats and "One-Shot" quick actions.
    -   **Event Dashboard**: Hub for a specific tournament weekend/league.
    -   **Workflow**: Distinct flows for Creating vs. Joining events (via Invite Code).
-   **Tournament Engine**: Swiss-style tournament management with draft seating, automatic round generation, and real-time standings.
-   **Deck Tracker**: Catalogue decks with performance tracking.
    -   **Scryfall Integration**: Search cards, auto-populate details, and **select specific art/prints**.
-   **UX/UI Standards**: "Mobile-First, Desktop-Optimized".
    -   Responsive grids (`max-w-7xl` on desktop).
    -   Split-view forms for complex inputs (Deck Editor).
    -   Context-aware Quick Actions (Global vs. Event).
-   **Casual Mode**: Flexible logging for non-tournament games (Commander, 1v1).

### Tech Stack & Architecture

-   **Framework**: Next.js 16 (App Router)
-   **Language**: TypeScript
-   **Database**: Supabase (Cloud PostgreSQL) with Row Level Security.
-   **Authentication**: Supabase Auth (Email/Password) + `public.profiles`.
-   **Styling**: Tailwind CSS with Shadcn UI (Slate dark theme).
-   **AI**: Vercel AI SDK with Google Gemini.
-   **External APIs**: Scryfall API (Card data & Art).

## 2. Building and Running

### Prerequisites

-   Node.js 18+ and npm
-   A Supabase project
-   A `.env.local` file with Supabase and Google AI credentials.

### Key Commands

-   **Install Dependencies**: `npm install`
-   **Run Dev Server**: `npm run dev` (http://localhost:3000)
-   **Build**: `npm run build`
-   **Lint**: `npm run lint`

## 3. Development Conventions

-   **Next.js 16 Async Cookies**: Always use `await cookies()`.
-   **Supabase SSR**: Use `createServerClient`.
-   **Database Schema**: V3 Schema uses `event_members` (NOT `event_participants`). Use `verify_and_update_v3_schema.sql` to sync.
-   **Styling**: Follow `.dev-docs/UX_UI_STANDARDS.md`.
    -   Forms/Dialogs on Desktop: `sm:max-w-5xl` or `sm:max-w-6xl`.
    -   Page Containers: `max-w-7xl mx-auto`.

## 4. Key Files and Directories

-   `app/`: App Router.
    -   `app/page.tsx`: Global Dashboard (Context-aware Quick Actions).
    -   `app/events/page.tsx`: Event List + Join/Create Actions.
    -   `app/events/[id]/page.tsx`: Event Dashboard.
    -   `app/decks/`: Deck library.
-   `components/`: React components.
    -   `components/dashboard/quick-actions.tsx`: Context-aware action buttons.
    -   `components/decks/deck-form.tsx`: Scryfall search & Art selection.
    -   `components/events/join-event-dialog.tsx`: Client-side join modal.
-   `.dev-docs/`: Project documentation.
    -   `UX_UI_STANDARDS.md`: **NEW** Design system and responsive rules.
    -   `DATABASE_STRUCTURE.md`: V3 Schema definition.
    -   `PAGE_STRUCTURE_AND_WORKFLOW.md`: updated workflows.
-   `verify_and_update_v3_schema.sql`: SQL script to ensure DB consistency.