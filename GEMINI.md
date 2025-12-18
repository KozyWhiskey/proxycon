# Gemini Project: MTG League Platform

This document provides a comprehensive overview of the MTG League Platform project, designed to be used as instructional context for Gemini.

## 1. Project Overview

**Goal**: Transition the application from a single-event "weekend companion" to a persistent Magic: The Gathering League Platform.
**Current State**: The app is currently in **V3 Development**, implementing robust Auth, Multi-Event support, and advanced features like Scryfall integration.
**Target State**: A persistent platform supporting multiple Events (e.g., "ProxyCon 2025", "Weekly Draft"), real User Accounts via Supabase Auth, Deck Tracking with Scryfall data, and expanded Game Modes. It manages tournament brackets, match reporting, player stats, and more, all within a dark-mode, basement aesthetic.

### Core Features (V3)

-   **Auth & Onboarding**: Secure identity via Supabase Auth (Email/Password) linked to a `public.profiles` table. Includes a mandatory onboarding flow (`/onboarding`) for new users to set usernames and preferences.
-   **Events & Dashboard**: Support for multiple concurrent events. Users have a "Global Dashboard" for career stats and an "Event Dashboard" for specific tournament contexts.
-   **Tournament Engine**: Swiss-style tournament management with draft seating, automatic round generation (using `tournament-pairings`), and real-time standings.
-   **Match Reporting**: Simplified, thumb-friendly interface for reporting wins, losses, and draws.
-   **Casual Mode**: Flexible logging for non-tournament games (Commander, 1v1) to track stats without affecting tournament brackets.
-   **Deck Tracker**: Catalogue decks with performance tracking. Integrates with **Scryfall API** to auto-populate Commander details, card art, and oracle text.
-   **Admin & Polish**: Dedicated `/admin` route for fixing match results and managing the system. Focus on "Dark Basement" aesthetic and mobile-first UX.
-   **AI Commentary**: AI-generated "roasts" for match results, powered by the Vercel AI SDK and Google Gemini.

### Tech Stack & Architecture

-   **Framework**: Next.js 16 (App Router)
-   **Language**: TypeScript
-   **Database**: Supabase (Cloud PostgreSQL) with Row Level Security.
-   **Authentication**: Supabase Auth (Email/Password) + `public.profiles`.
-   **Styling**: Tailwind CSS with Shadcn UI (Slate dark theme).
-   **AI**: Vercel AI SDK with Google Gemini.
-   **External APIs**: Scryfall API (Card data).
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
-   **User Data**: Always fetch user data via `getCurrentUser()` or `supabase.auth.getUser()`. Never rely on legacy tables.

## 4. Key Files and Directories

-   `app/`: The core of the Next.js application using the App Router.
    -   `app/page.tsx`: Global Landing / Dashboard.
    -   `app/login/page.tsx`: Standard Supabase Auth login.
    -   `app/onboarding/page.tsx`: New user onboarding flow.
    -   `app/admin/`: Admin tools (Fix Match, etc.).
    -   `app/tournament/`: Tournament management.
        -   `app/tournament/[id]/seating/page.tsx`: Draft seating.
        -   `app/tournament/[id]/match/[matchId]/page.tsx`: Match reporting.
    -   `app/play/casual/page.tsx`: Casual game logging.
    -   `app/events/`: Event management.
        -   `app/events/new`: Create new events.
        -   `app/events/[id]/page.tsx`: Event-specific dashboard.
    -   `app/decks/`: Deck tracking and Scryfall search.
        -   `app/decks/page.tsx`: Deck library.
-   `components/`: Reusable React components.
    -   `components/ui/`: Core Shadcn UI components.
    -   `components/decks/deck-form.tsx`: Includes Scryfall search integration.
-   `utils/supabase/`: Supabase client configuration.
    -   `client.ts`: Client-side client.
    -   `server.ts`: Server-side client.
    -   `middleware.ts`: Session management.
-   `app/tournament/actions.ts`: Tournament Server Actions.
-   `.dev-docs/`: Project documentation.
    -   `features/`: V3 Feature specifications.
-   `proxy.ts`: Next.js 16 middleware workaround.
-   `package.json`: Project dependencies.
-   `README.md`: High-level overview.
