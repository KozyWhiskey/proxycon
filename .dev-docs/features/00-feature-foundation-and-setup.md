# Feature: Foundation and Setup

## Objective
Ensure the project foundation is solid, all necessary configurations are in place, and all required dependencies are installed. This step also includes seeding the database with initial data.

## Implementation Steps

1.  **Verify Environment Variables:**
    -   Confirm that the `.env.local` file contains the following keys:
        -   `NEXT_PUBLIC_SUPABASE_URL`
        -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
        -   `GOOGLE_API_KEY`
        -   `OPENAI_API_KEY`

2.  **Install Dependencies:**
    -   Run `npm install` to ensure all packages from `package.json` are installed.
    -   Install any missing libraries identified in the project docs:
        -   `@supabase/ssr`
        -   `tournament-pairings`
        -   `zod`
        -   `canvas-confetti`
        -   `sonner`
        -   `@ai-sdk/google`
        -   `framer-motion`

3.  **Verify Supabase Configuration:**
    -   Double-check the three core Supabase files against the documentation in `.dev-docs/SUPABASE_SETUP.md`:
        -   `utils/supabase/client.ts`
        -   `utils/supabase/server.ts`
        -   `utils/supabase/middleware.ts`
    -   Ensure the `proxy.ts` file exists at the root and is correctly configured.

4.  **Seed Initial Data:**
    -   Create a script or manually add the 10 player names to the `players` table in the Supabase dashboard.
    -   Manually add a few items to the `prize_wall` table.

## Testing Plan

1.  **Run the Application:**
    -   Execute `npm run dev`.
    -   The application should start without any errors.

2.  **Test Supabase Connection:**
    -   Create a temporary test page (`app/test-db/page.tsx`).
    -   In this page, use the Supabase server client to fetch the list of players.
    -   Render the player names on the page.
    -   **Expected Outcome:** The page should successfully load and display the names of the players seeded in the database.

3.  **Verify Authentication Flow (Initial):**
    -   With the middleware in place, try accessing the home page (`/`).
    -   Since no user is logged in, the middleware should (in the future) redirect to a login page. For now, we just need to ensure it doesn't crash.
