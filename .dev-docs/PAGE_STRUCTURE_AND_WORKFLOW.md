# Page Structure and User Experience Workflow

**Last Updated:** December 2025
**Platform:** V2 (Multi-Event Architecture)

This document provides a comprehensive overview of the application's page structure and the intended user experience workflows.

---

## 1. Site Map

### Authentication & Onboarding
- **`/login`**: The entry point for unauthenticated users. Supports Email/Password login and account creation.
- **`/onboarding`**: Mandatory setup flow for new users to create their profile (Username, Avatar).
- **`app/login/page.tsx`, `app/onboarding/page.tsx`**

### Global Context (The "Player Status Sheet")
- **`/` (Home)**: The personal hub for the logged-in user. Displays total career wins, a link to the currently active event, and quick action buttons.
- **`app/page.tsx`**

### Event Management
- **`/events`**: A list of all events the user has joined or created.
- **`/events/new`**: A form to create a new event (e.g., "ProxyCon 2025") or join an existing one via invite code.
- **`/events/[id]`**: The **Event Dashboard**. This is the main hub during a tournament weekend. It shows event-specific stats, active tournaments, and a live feed of match results.
- **`app/events/page.tsx`, `app/events/new/page.tsx`, `app/events/[id]/page.tsx`**

### Tournament Engine
- **`/tournament/new`**: Form to configure a new tournament (Format, Rounds, Prizes). Usually accessed via the Event Dashboard to link it automatically.
- **`/tournament/[id]/seating`**: Interactive draft table visualization. Players select their seats here before the tournament starts.
- **`/tournament/[id]`**: The main Tournament Bracket view. Shows pairings, round timer, standings, and match status.
- **`/tournament/[id]/match/[matchId]`**: Match reporting interface. Users enter game scores (e.g., 2-1) here.
- **`/tournament/[id]/dashboard`**: A read-only, auto-refreshing "Big Screen" view designed to be cast to a TV.
- **`/tournaments`**: A global list of all tournaments (active and past).
- **`app/tournament/...`**

### Casual Play
- **`/play/casual`**: The logger for non-tournament games. Supports formats like Commander, 1v1, 2HG, FFA, and Limited. Can be linked to an event via query parameter (e.g., `?eventId=...`).
- **`app/play/casual/page.tsx`**

### Player Resources
- **`/decks`**: Personal deck library. Users can create and manage their decks here to track performance stats.
- **`/profile`**: User settings and profile management (Name, Avatar).
- **`/stats`**: Detailed personal statistics, history, and analytics.
- **`app/decks/page.tsx`, `app/profile/page.tsx`, `app/stats/page.tsx`**

### Community & Players
- **`/players`**: The Global Player Directory. Lists all registered users with summary stats (Win %, Title Count).
- **`/players/[id]`**: Public Player Profile. Shows detailed stats, deck library, and recent match history.
- **`app/players/page.tsx`, `app/players/[id]/page.tsx`**

### Admin & System
- **`/admin`**: System-wide administration ("God Mode"). Fix match results, manage global settings, and override data.
- **`app/admin/page.tsx`**

---

## 2. Core UX Workflows

### A. The "Weekend Event" Workflow
*This is the primary flow for a group using the app during a trip.*

1.  **Setup (Day 0):**
    -   Admin creates an Event via **`/events/new`**.
    -   Admin shares the Invite Code.
    -   Players log in and Join the Event via **`/events/new`**.
    -   Everyone navigates to the **Event Dashboard (`/events/[id]`)**.

2.  **Starting a Tournament:**
    -   On the Event Dashboard, click **"New Tournament"** (Quick Action).
    -   Fill in details (e.g., "Friday Night Draft") and select players.
    -   **Redirects to Seating:** Players pass the phone around or use their own devices to tap their seat on the digital table (**`/tournament/[id]/seating`**).
    -   Admin clicks **"Start Draft"**.

3.  **Playing the Tournament:**
    -   The app redirects to the **Bracket Page (`/tournament/[id]`)**.
    -   **Round 1:** Players find their pairing. Admin starts the **Round Timer**.
    -   **Match Reporting:** When a game finishes, a player clicks "Report Result", enters the game score (e.g., "I won 2-0"), and submits.
    -   **Next Round:** When all matches are reported, the app automatically generates Round 2 based on Swiss pairings.
    -   **Conclusion:** After the final round, the tournament is marked complete, and prizes are displayed for the top 3.

### B. Casual Play Workflow
*For Commander games or pickup games between rounds.*

1.  **From Event Dashboard:**
    -   Click **"Log Casual Game"**.
    -   Select Format (e.g., "Commander").
    -   Select Players (Multi-select grid).
    -   (Optional) Select Decks used.
    -   Select the Winner(s).
    -   **Submit:** The game is logged to the Event Feed, and the winners get +1 Win on the Event stats.

### C. Personal Tracking Workflow
*For maintaining a persistent record across events.*

1.  **Deck Management:**
    -   Go to **`/decks`**.
    -   Create a new deck (e.g., "Ur-Dragon").
    -   During match reporting (Casual or Tournament), select this deck.
    -   Over time, view stats for that deck (future feature).

2.  **Global Stats:**
    -   Go to **Home (`/`)**.
    -   View total career wins across *all* events.

### D. Quick Actions & Context Awareness
*Understanding where your games go.*

The Home Screen (`/`) provides **Quick Actions**, but their behavior depends on whether you are in a specific **Event Context** or the **Global Context**.

1.  **Global Context (Home Screen):**
    -   **"Create New Event":** (Primary Action) The recommended flow for a group gathering. Creates a container for multiple tournaments and games.
    -   **"New Tournament" (One-Shot):** Creates a standalone tournament *not* linked to any event. Useful for a quick draft night with no broader tracking.
    -   **"Log Casual Game" (One-Shot):** Logs a single game to your personal history, but it won't appear on any Event Leaderboard.
    -   **"View All Tournaments":** Links to `/tournaments` to see history.
    -   **"Community":** Links to `/players` to browse the player directory.

2.  **Event Context (Event Dashboard):**
    -   **"New Tournament":** Automatically links the tournament to the current Event.
    -   **"Log Casual Game":** Automatically links the game to the current Event (contributing to Event stats).

### E. Community Exploration
*Discovering other players and their stats.*

1.  **Global Directory:**
    -   Accessible via "Quick Actions" on Home or "Directory" button on Stats page.
    -   View leaderboard-style summary of all players.
2.  **Player Deep Dive:**
    -   Click a player card to view their full profile.
    -   See their career "box score" (Wins/Losses/Streaks).
    -   Browse their public Deck Library.
    -   Analyze their recent form via Match History.

---

## 3. Navigation Structure (Bottom Bar)

The app uses a sticky bottom navigation bar for quick access to top-level contexts:

1.  **Home (`/`)**: Player Status & Quick Actions.
2.  **Events (`/events`)**: Event Switching.
3.  **Play (`/play/casual`)**: Quick access to log a casual game.
4.  **Decks (`/decks`)**: Library management.
5.  **Profile (`/profile`)**: Settings.

---

## 4. UI Design Patterns

**See Full Standards:** `.dev-docs/UX_UI_STANDARDS.md`

-   **Philosophy:** Mobile-First, Desktop-Optimized.
    -   **Mobile:** "One-Thumb" usability. Sticky bottom nav. Stacked layouts.
    -   **Desktop:** Expanded grids (`max-w-7xl`), Split-view modals, and side-by-side forms.
-   **Dark Mode:** The UI is permanently dark mode (Slate/Gray palette) with specific accent colors:
    -   **Yellow/Gold**: Tournament actions, buttons, and highlights.
    -   **Emerald/Green**: Casual play actions.
    -   **Cyan**: Information/Timers.
-   **Standard Headers:** All pages use a standardized top bar with a Back button, Title, Subtitle, and optional Action button (right-aligned).
-   **Dialogs:** Desktop dialogs expand to `max-w-5xl` or `max-w-6xl` to utilize screen space.
