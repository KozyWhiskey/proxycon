# Feature: Dashboard

## Objective
Build the main dashboard (home page) which serves as the central information hub for the user. It will display the user's current status, information about any active tournaments, and a live feed of recent matches.

## Implementation Steps

1.  **Create User Context:**
    -   Create a new file `app/hooks/use-user.ts` or similar.
    -   This hook will read the `proxycon_user_id` from the cookies and fetch the corresponding player's data from the `players` table.
    -   This provides easy access to the logged-in user's information (name, tickets, etc.) across different components.

2.  **Update Home Page (`app/page.tsx`):**
    -   This will be a Server Component.
    -   Fetch all necessary data for the dashboard server-side. This includes:
        -   The current user's stats (tickets, wins).
        -   Information about the currently active tournament (if any).
        -   A list of the last 10 matches from the `matches` table, joined with `match_participants` and `players` to get names.

3.  **Build "My Stats" Component:**
    -   Create a client component `components/dashboard/my-stats.tsx`.
    -   It will take the user's data (tickets, wins) as props.
    -   Display the ticket count with a large font and the total wins for the weekend. Use a Shadcn UI `Card`.

4.  **Build "Active Tournament" Component:**
    -   Create a client component `components/dashboard/active-tournament.tsx`.
    -   It will take the active tournament data as a prop.
    -   If a tournament is active, display the current round number and the user's current pairing (e.g., "You are playing against Steve").
    -   Include a button styled as a link (`<Button asChild>`) that navigates to the match reporting page for that specific match.
    -   If no tournament is active, this component should render nothing or a message like "No tournament currently active."

5.  **Build "The Feed" Component:**
    -   Create a client component `components/dashboard/feed.tsx`.
    -   It will take the list of recent matches as a prop.
    -   For each match, display the result (e.g., "Dave beat Steve in Commander").
    -   This is where the AI-generated "roast" will eventually be displayed. For now, leave a placeholder for it.

## Testing Plan

1.  **Test Logged-In View:**
    -   Log in as a user.
    -   Navigate to the home page (`/`).
    -   **Expected Outcome:**
        -   The "My Stats" card should display the correct ticket and win count for the logged-in user (initially 0).
        -   The "Active Tournament" section should show the "no active tournament" message.
        -   The "Feed" should be empty or show a message indicating no recent matches.

2.  **Test With Data:**
    -   Manually add a few completed matches to the `matches` and `match_participants` tables in Supabase.
    -   Manually add an active tournament to the `tournaments` table and a corresponding match for the user you are testing with.
    -   Refresh the home page.
    -   **Expected Outcome:**
        -   The "Feed" should now display the recent matches you added.
        -   The "Active Tournament" card should now display the current match information and a link to report the result.

3.  **Test Data Fetching:**
    -   Verify in the terminal running the Next.js dev server that the database queries are being made on the server-side and not in the browser.
    -   Check the browser's network tab to confirm that the page is rendered on the server and sent as HTML.
