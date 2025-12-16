# Gemini Project: MTG League Platform

This document provides a comprehensive overview of the MTG League Platform project, designed to be used as instructional context for Gemini.

## 1. Project Overview

**Goal**: Transition the application from a single-event "weekend companion" to a persistent Magic: The Gathering League Platform.
**Current State**: The app currently serves as a mobile-first companion web application for a 3-day Magic: The Gathering tournament (ProxyCon 2025). It uses a simple cookie-based "impersonation" auth and assumes a single global context for all matches.
**Target State**: The app will support multiple Events (e.g., "ProxyCon 2025", "Weekly Draft"), real User Accounts via Supabase Auth, Deck Tracking, and expanded Game Modes. The app is built for a small, casual group with a strong emphasis on "one-thumb" usability, zero-friction interactions, and instant feedback. It manages tournament brackets, match reporting, player stats, and more, all within a dark-mode, basement aesthetic.

### Core Features

-   **Real User Accounts & Events**: Supports multiple events and real user accounts via Supabase Auth, moving beyond a single global context.
-   **Zero-Friction Auth**: Passwordless login using a player selection grid (will be replaced by standard Email/Password login in V2).
-   **Tournament Engine**: Swiss-style tournament management with draft seating, automatic round generation, and real-time standings.
-   **Match Reporting**: Simplified, thumb-friendly interface for reporting wins, losses, and draws.
-   **Dashboard**: A central hub for personal stats, active tournament information, and a live feed of recent matches.
-   **AI Commentary**: AI-generated "roasts" for match results, powered by the Vercel AI SDK and Google Gemini.
-   **Casual Mode**: Tracking for non-tournament games.
-   **Deck Tracking**: Allows users to track their decks, including colors, format, and win rates.
-   **Prize Wall & Ledger**: Planned features for managing ticket-based prizes and shared expenses.

### Tech Stack & Architecture

-   **Framework**: Next.js 16 (App Router)
-   **Language**: TypeScript
-   **Database**: Supabase (Cloud PostgreSQL) with Row Level Security.
-   **Authentication**: Custom cookie-based session management (no passwords, will transition to Supabase Auth with Email/Password in V2).
-   **Styling**: Tailwind CSS with Shadcn UI (Slate dark theme).
-   **AI**: Vercel AI SDK with Google Gemini.
-   **Key Libraries**: `tournament-pairings` for Swiss logic, `zod` for validation, `sonner` for toast notifications.

## 2. Building and Running

### Prerequisites

-   Node.js 18+ and npm
-   A Supabase project
-   A `.env.local` file with Supabase and Google AI credentials.

### Key Commands

-   **Install Dependencies**:
    ```bash
    npm install
    ```
-   **Run Development Server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

-   **Build for Production**:
    ```bash
    npm run build
    ```
-   **Start Production Server**:
    ```bash
    npm start
    ```
-   **Lint Code**:
    ```bash
    npm run lint
    ```
-   **Seed Database** (Optional):
    ```bash
    npm run seed
    ```

## 3. Development Conventions

This project follows strict development patterns to ensure stability and consistency.

-   **Next.js 16 Async Cookies**: Server components **must** use `await cookies()` to access the cookie store. Direct calls like `cookies().get()` will fail.
-   **Supabase SSR**: All server-side database operations must use the `createServerClient` from `@supabase/ssr` to handle cookie-based authentication correctly. Do not use the standard `createClient`.
-   **Server Actions**: All server actions should be wrapped in `try/catch` blocks and return a `{ success: boolean, message: string }` object to provide clear feedback to the client for toast notifications.
-   **Styling**: Adhere to the "Dark Basement Aesthetic" using Tailwind CSS classes and pre-configured Shadcn UI components. Touch targets must be at least 48px (`h-12`).
-   **State Management**: Favor server-side state and URL-based state management where possible. Client-side state is managed with React hooks (`useState`, `useReducer`).

## 4. Key Files and Directories

-   `app/`: The core of the Next.js application using the App Router.
    -   `app/page.tsx`: The main dashboard page (will be refactored to be the "Global Landing" for events).
    -   `app/login/page.tsx`: The player selection screen for authentication (will be replaced with standard Email/Password login).
    -   `app/tournament/`: Contains pages for creating, managing, and viewing tournaments.
        -   `app/tournament/[id]/seating/page.tsx`: The visual draft seating selection page.
        -   `app/tournament/[id]/match/[matchId]/page.tsx`: The match reporting interface.
    -   `app/play/casual/page.tsx`: The interface for logging non-tournament games.
    -   `app/events/`: New directory for event management.
        -   `app/events/new`: Page for creating new events.
        -   `app/events/[id]/page.tsx`: Event-specific dashboard.
    -   `app/decks/`: New directory for deck tracking.
        -   `app/decks/page.tsx`: List of user's decks.
-   `components/`: Reusable React components, organized by feature (dashboard, tournament, shop).
    -   `components/ui/`: Core Shadcn UI components.
    -   `components/dashboard/user-header.tsx`: Will be updated to add Avatar/Profile link.
    -   `components/tournament/match-reporting-form.tsx`: Will be updated to integrate deck selection.
-   `utils/supabase/`: Supabase client configuration.
    -   `client.ts`: Client-side (browser) Supabase client.
    -   `server.ts`: Server-side Supabase client with async cookie handling.
    -   `middleware.ts`: Middleware for refreshing user sessions.
-   `app/tournament/actions.ts`: Server Actions related to tournament management (creating tournaments, submitting results, etc.).
-   `.dev-docs/`: Contains extensive project documentation.
    -   `PROJECT_SUMMARY.md`: The complete project specification.
    -   `DATABASE_STRUCTURE.md`: Detailed database schema.
    -   `TOURNAMENT_RULES.md`: Critical development rules and patterns.
-   `proxy.ts`: A workaround for Next.js 16 to replace the traditional `middleware.ts` for session management.
-   `package.json`: Project dependencies and scripts.
-   `README.md`: High-level project overview and setup instructions.