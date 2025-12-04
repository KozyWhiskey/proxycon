# Gemini Project: ProxyCon 2025 Companion App

This document provides a comprehensive overview of the ProxyCon 2025 Companion App project, designed to be used as instructional context for Gemini.

## 1. Project Overview

**ProxyCon 2025** is a mobile-first companion web application for a 3-day Magic: The Gathering tournament. The app is built for a small, casual group with a strong emphasis on "one-thumb" usability, zero-friction interactions, and instant feedback. It manages tournament brackets, match reporting, player stats, and more, all within a dark-mode, basement aesthetic.

### Core Features

-   **Zero-Friction Auth**: Passwordless login using a player selection grid.
-   **Tournament Engine**: Swiss-style tournament management with draft seating, automatic round generation, and real-time standings.
-   **Match Reporting**: Simplified, thumb-friendly interface for reporting wins, losses, and draws.
-   **Dashboard**: A central hub for personal stats, active tournament information, and a live feed of recent matches.
-   **AI Commentary**: AI-generated "roasts" for match results, powered by the Vercel AI SDK and Google Gemini.
-   **Casual Mode**: Tracking for non-tournament games.
-   **Prize Wall & Ledger**: Planned features for managing ticket-based prizes and shared expenses.

### Tech Stack & Architecture

-   **Framework**: Next.js 16 (App Router)
-   **Language**: TypeScript
-   **Database**: Supabase (Cloud PostgreSQL) with Row Level Security.
-   **Authentication**: Custom cookie-based session management (no passwords).
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
    -   `app/page.tsx`: The main dashboard page.
    -   `app/login/page.tsx`: The player selection screen for authentication.
    -   `app/tournament/`: Contains pages for creating, managing, and viewing tournaments.
        -   `app/tournament/[id]/seating/page.tsx`: The visual draft seating selection page.
        -   `app/tournament/[id]/match/[matchId]/page.tsx`: The match reporting interface.
    -   `app/play/casual/page.tsx`: The interface for logging non-tournament games.
-   `components/`: Reusable React components, organized by feature (dashboard, tournament, shop).
    -   `components/ui/`: Core Shadcn UI components.
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
