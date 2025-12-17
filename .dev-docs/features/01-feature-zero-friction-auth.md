# Feature: Zero-Friction Auth (Deprecated)

**Status:** ⚠️ **DEPRECATED** (Replaced by V2 Auth)

## Overview
This feature originally implemented a "Who Are You?" passwordless login system where users selected their identity from a grid of players. This has been superseded by the V2 Authentication system using Supabase Auth (Email/Password).

## Superseded By
- **Feature:** V2 Platform Authentication
- **Implementation:** `app/login/page.tsx` (Login Form), `app/user/actions.ts` (Auth Actions)

## Legacy Implementation Steps (For Reference)

1.  **Create Login Page (`app/login/page.tsx`):**
    -   This will be a Server Component.
    -   Use the Supabase server client (`await createClient()`) to fetch all entries from the `players` table.
    -   Render a simple grid of player names. Use Shadcn UI `Card` and `Avatar` components for styling.

2.  **Create Login Action (`app/login/actions.ts`):**
    -   Create a new file for server actions related to login.
    -   Define an async function `login(userId: string)`.
    -   This function will use the `cookies()` function from `next/headers` to set a persistent cookie named `proxycon_user_id` with the value of the selected user's ID.
    -   After setting the cookie, it will use `redirect('/')` from `next/navigation` to send the user to the dashboard.

3.  **Update Login Page Client Component:**
    -   The login page will need a client component (`'use client'`) to handle the click events.
    -   Create a component, e.g., `PlayerSelectionGrid`, that takes the list of players as a prop.
    -   For each player card, attach an `onClick` handler that calls the `login` server action.

4.  **Update Middleware (`proxy.ts`):**
    -   Modify the `updateSession` function in `utils/supabase/middleware.ts` or the main `proxy.ts` logic.
    -   Check for the presence of the `proxycon_user_id` cookie on incoming requests.
    -   If the cookie is **missing** and the user is **not** already on the `/login` page, redirect them to `/login`.
    -   If the cookie **is present**, allow the request to proceed.

## Testing Plan (Legacy)

1.  **Test New User Experience:**
    -   Clear all cookies for the site in your browser.
    -   Navigate to the root URL (`/`).
    -   **Expected Outcome:** You should be automatically redirected to the `/login` page.
    -   The login page should display a grid of all players fetched from the database.

2.  **Test User Selection:**
    -   Click on a player's name/card.
    -   **Expected Outcome:**
        -   The `login` server action is called.
        -   A `proxycon_user_id` cookie is set in your browser.
        -   You are redirected to the home page (`/`).

3.  **Test Returning User Experience:**
    -   With the cookie still set, close the browser tab and navigate to the root URL (`/`) again.
    -   **Expected Outcome:** You should land directly on the home page without being redirected to `/login`.

4.  **Test Middleware Protection:**
    -   With the cookie still set, try to manually navigate to `/login`.
    -   **Expected Outcome:** While not a strict requirement, the ideal behavior is to be redirected away from the login page (e.g., back to `/`) if you're already "logged in". This can be a polish step.