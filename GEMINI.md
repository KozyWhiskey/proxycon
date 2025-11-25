# Gemini Project: Proxycon 2025 Companion App

This document provides essential context for interacting with the Proxycon 2025 codebase. It outlines the project's architecture, key commands, and critical development conventions.

## 1. Project Overview

Proxycon 2025 is a mobile-first web application built to serve as a companion app for a 10-person Magic: The Gathering weekend. The app's core purpose is to manage tournament brackets, track casual games, handle a digital "Prize Wall" currency, and track shared expenses.

The user experience is paramount, with a "One-Thumb Drunk" design philosophy: big buttons, frictionless interactions, and a default dark mode aesthetic.

**Key Technologies:**

*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **Database:** Supabase (Cloud Instance)
*   **Styling:** Tailwind CSS with Shadcn UI
*   **Authentication:** Custom "No-Auth" system using a simple cookie to identify the user from a pre-defined list.
*   **AI:** Vercel AI SDK (Google Gemini provider) for generating sarcastic match commentary.
*   **Core Logic:** `tournament-pairings` for Swiss brackets, `zod` for validation.

## 2. Building and Running

All necessary commands are defined in `package.json`.

*   **Run the development server:**
    ```bash
    npm run dev
    ```

*   **Create a production build:**
    ```bash
    npm run build
    ```

*   **Run the production server:**
    ```bash
    npm run start
    ```

*   **Run the linter:**
    ```bash
    npm run lint
    ```

## 3. Development Conventions

Adhering to these conventions is critical for maintaining the project's stability and intended architecture.

### Supabase & Authentication (CRITICAL)

This project uses a modern and specific pattern for Supabase Server-Side Rendering (SSR) with Next.js 16. **Failure to follow this will break authentication and data fetching.**

1.  **Async Cookies (`/utils/supabase/server.ts`):** When creating the Supabase server client for use in Server Components, you **MUST** `await` the `cookies()` function from `next/headers`.

    ```typescript
    // ✅ CORRECT
    import { cookies } from 'next/headers'
    
    export async function createClient() {
      const cookieStore = await cookies() // Must use await!
      // ...
    }
    ```

2.  **Proxy Middleware (`/proxy.ts`):** All requests are routed through this file. It uses the `updateSession` function from `/utils/supabase/middleware.ts` to refresh the user's auth state on every navigation, ensuring the session is always fresh.

3.  **Client Types:**
    *   Use the **server client** (`/utils/supabase/server.ts`) inside `async` Server Components for data fetching.
    *   Use the **browser client** (`/utils/supabase/client.ts`) inside Client Components (marked with `'use client'`) for interactive logic.

### "No-Auth" Login

The authentication system is intentionally insecure. It relies on a user selecting their name from a list, which sets a `proxycon_user_id` cookie. All subsequent operations are based on this cookie. The `proxy.ts` middleware redirects to `/login` if this cookie is not present.

### UI/UX: The "Dark Basement Aesthetic"

*   **Dark Mode Only:** The app is designed exclusively for dark mode.
*   **One-Thumb Usability:** All interactive elements must have a minimum height of `h-12` (48px) to be easily tappable on mobile.
*   **Frictionless Feedback:** Actions should provide immediate feedback using `sonner` toasts and, where appropriate, `canvas-confetti`.

### Database Schema

The canonical database schema is documented in `.dev-docs/PROJECT_SUMMARY.md`. Refer to it before creating or modifying queries to understand table structures and relationships.

### Server Actions & Error Handling

*   Business logic should be encapsulated in Next.js Server Actions.
*   Server Actions that can fail should be wrapped in a `try/catch` block and return a consistent object shape to the client for handling toasts: `{ success: boolean, message: string }`.
