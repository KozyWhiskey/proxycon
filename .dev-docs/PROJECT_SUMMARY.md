# Project Specification: Proxycon 2025 Companion App

## Role

Senior Full-Stack Engineer and Lead UX Designer.

## Goal

Build a complete, mobile-first streaming dashboard web application for a 3-day Magic: The Gathering weekend, focused on draft tournaments and match tracking.

## Target Audience

10 slightly intoxicated nerds in a rental house, plus viewers watching the tournament stream.

## Critical Constraint

The app must be "One-Thumb" usable. Interactions must be frictionless (no passwords, big buttons, instant feedback). The UI should also look great on a stream display.

---

## 1. Tech Stack & Architecture

### Core Framework

-   **Framework:** Next.js 16 (App Router)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS + Shadcn UI (Default Theme: Slate, Dark Mode forced)
-   **Icons:** `lucide-react`

### Backend & Data

-   **Database:** Supabase (Cloud Instance)
-   **Auth:** Custom "No-Auth" Auth (Cookie-based user selection, no passwords)
-   **ORM/Querying:** Supabase JS Client (`@supabase/supabase-js`, `@supabase/ssr`)
-   **AI:** Vercel AI SDK (`ai`, `@ai-sdk/google`) using Gemini models for commentary.

### Key Libraries

-   `tournament-pairings`: For Swiss bracket logic.
-   `zod`: For form validation.
-   `canvas-confetti`: For visual feedback.
-   `sonner`: For toast notifications (success/error).

---

## 2. Design System & UX Guidelines

### A. Visual Language ("The Dark Basement Aesthetic")

-   **Theme:** Dark Mode Only. Backgrounds should be `bg-slate-950`, Cards `bg-slate-900`.
-   **Typography:** Sans-serif (Inter/Geist). Large headers for readability.
-   **Touch Targets:** All interactive elements (Buttons, Inputs) must be at least `h-12` (48px).
-   **Color Coding:**
    -   **Tournament Mode:** Gold/Yellow accents (`text-yellow-500`, `border-yellow-500`).
    -   **Casual Mode:** Green/Emerald accents.
    -   **Errors:** Red/Rose.

### B. Navigation Structure

-   **Mobile Bottom Bar:** Sticky footer with 3 icons:
    -   Home: Dashboard & Live Feed.
    -   Play: Match Reporter (FAB - Floating Action Button style).
    -   Menu: Settings, User Switch.

### C. "One-Thumb" Interactions

-   **Inputs:** Avoid typing where possible. Use `<Select>` or `<RadioGroup>` cards.
-   **Match Reporting:** Use game score inputs (+/-) for intuitive score entry.
-   **Feedback:** Every action (Score Report) triggers a toast notification and visual feedback.

---

## 3. Database Schema (Supabase)

### Tables:

-   **`players`**: `id` (UUID), `name` (Text), `nickname` (Text), `avatar_url` (Text), `wins` (Int).
-   **`tournaments`**: `id` (UUID), `name` (Text), `format` (Text), `status` (Text - 'pending', 'active', 'completed'), `max_rounds` (Int), `round_duration_minutes` (Int), `prize_1st` (Text), `prize_2nd` (Text), `prize_3rd` (Text).
-   **`tournament_participants`**: `id` (UUID), `tournament_id` (UUID), `player_id` (UUID), `draft_seat` (Int, nullable).
-   **`matches`**: `id` (UUID), `tournament_id` (UUID - Nullable), `round_number` (Int), `game_type` (Text), `started_at` (Timestamp), `paused_at` (Timestamp), `total_paused_seconds` (Int), `notes` (Text), `created_at` (Timestamp).
-   **`match_participants`**: `id` (UUID), `match_id` (UUID), `player_id` (UUID), `result` (Text), `games_won` (Int), `deck_archetype` (Text).

### Removed Tables (Streaming Dashboard Simplification):
- ~~`prize_wall`~~ - Replaced by tournament-level prizes
- ~~`ledger`~~ - Feature removed

---

## 4. Detailed Feature Specifications

### Feature A: Zero-Friction Auth

-   **Component:** `LoginScreen.tsx`
-   **Logic:** Fetch all players. Render a grid of Avatars/Names.
-   **Action:** Clicking a user sets a long-lived cookie (`proxycon_user`) and redirects to Dashboard.
-   **Middleware:** Checks for cookie. If missing, redirect to `/login`.

### Feature B: The Dashboard (Home)

-   **Layout:** Single column scrollable.
-   **Section 1: "My Stats":** Card showing Weekend Wins.
-   **Section 2: "Active Tournaments":** Shows all active tournaments (status = 'active'). Each tournament card shows current round pairing for the logged-in user. Cards are clickable to view tournament bracket. Button: "Enter Result" for pending matches.
-   **Section 3: "The Feed":** List of last 10 matches.
-   **AI Integration:** Use Gemini to generate a 1-sentence "Roast" of the loser for each match item. Display this text in italicized `text-muted-foreground`.

### Feature C: Tournament Engine (Drafts)

-   **Routes:**
    -   `/tournament/new` - Create new tournament
    -   `/tournament/[id]/seating` - Draft seating page (select seats before starting)
    -   `/tournament/[id]` - Tournament bracket page (standings and matches)
    -   `/tournament/[id]/match/[matchId]` - Match reporting page
    -   `/tournaments` - Tournament management page (view/delete all tournaments)
-   **UI:**
    -   **Seating Page:** Visual table representation where players select seats clockwise around table
    -   **Bracket Page:** 
        -   **Header:** Round X of N
        -   **Standings:** Points, wins, losses, draws, games won for each player
        -   **Bracket:** List of Match Cards. Each card shows Player A vs Player B with scores.
        -   **Status:** "Waiting for Result" vs "Player A Won 2-1" vs "Draw 1-1"
        -   **Prizes:** Display 1st/2nd/3rd prizes when tournament is completed
    -   **Match Reporting:** Game score inputs (+/-) for each player with result preview
-   **Logic (Server Actions):**
    -   `createTournament(name, playerIds, format, maxRounds, roundDurationMinutes, prize1st, prize2nd, prize3rd)`: Creates tournament with 'pending' status, redirects to seating page
    -   `selectSeat(tournamentId, playerId, seatNumber)`: Assigns player to seat (any user can assign)
    -   `startDraft(tournamentId)`: Creates Round 1 matches based on draft seats, updates status to 'active'
    -   `submitResultWithGames(matchId, winnerId, loserId, winnerGames, loserGames, tournamentId)`: Updates match with game scores
    -   `submitDrawWithGames(matchId, playerIds, gamesWon, tournamentId)`: Updates match with draw and game scores
    -   `generateNextRound(tournamentId, currentRound)`: Uses `tournament-pairings` to calculate Swiss pairs based on points
    -   `deleteTournament(tournamentId)`: Deletes tournament and related records
-   **Tournament Status:**
    -   **'pending'**: Created but Round 1 hasn't started (seats not assigned or draft not started)
    -   **'active'**: Tournament in progress (Round 1 matches created)
    -   **'completed'**: Tournament finished (max_rounds reached)
-   **Points System:**
    -   Win = 3 points
    -   Draw = 2 points each
    -   Loss = 1 point
-   **Tiebreaker System:**
    -   Primary: Total points
    -   Secondary: Total games won (sum of individual game wins across all matches)
    -   Tertiary: Round wins, then round losses (fewer is better)

### Feature D: Casual Mode (Commander)

-   **Route:** `/play/casual`
-   **Form:**
    -   **Players:** Multi-select (limit 4).
    -   **Outcome:**
        -   Simple: Click Winner.
        -   Ranked: Drag and drop to order 1st -> 4th.
-   **Action:** `logCasualMatch(data)` updates `matches` and increments `players.wins`.

---

## 5. Implementation Roadmap & Prompts

### Step 1: Scaffolding (The Skeleton)

-   Set up the Next.js 16 project structure.
-   Configure `src/utils/supabase` (Client, Server, Middleware) with Async Cookies (**Critical**).
-   Install Shadcn components: `card`, `button`, `dialog`, `input`, `select`, `avatar`, `badge`, `separator`, `tabs`.

### Step 2: Core Actions (The Brain)

-   Create `src/app/actions.ts` to handle:
    -   `login(userId)`
    -   `getLeaderboard()`
    -   `getRecentMatches()`

### Step 3: Feature Build (The Body)

-   **Prompt:** "Build the LoginScreen component using a Grid of Shadcn Cards. On click, call the login server action."
-   **Prompt:** "Build the Dashboard page. Fetch user stats and recent matches. Use the Vercel AI SDK to generate a 'roast' for the latest match server-side."

### Step 4: Tournament Logic (The Muscle)

-   **Prompt:** "Create a TournamentManager component. It needs a function to pair players using the `tournament-pairings` library. Handle the edge case where we have an odd number of players (Bye)."

### Step 5: Polish (The Suit)

-   **Prompt:** "Refine the mobile styling. Ensure the bottom navigation bar is sticky and uses `lucide-react` icons."

---

## 6. Critical Technical Directives

### 1. Next.js 16 Async Cookies:

Do **NOT** use `cookies().get()`. You **MUST** use:

```typescript
const cookieStore = await cookies();
const token = cookieStore.get('name');
```

This applies to `src/utils/supabase/server.ts` and any Server Component page.

### 2. Supabase SSR:

Use `createServerClient` for all server-side operations. Do **NOT** use the generic `createClient` from `supabase-js` in server components.

### 3. Error Handling:

Wrap all Server Actions in `try/catch` blocks. Return `{ success: boolean, message: string }` to the client to trigger Shadcn Toasts.

### 4. Environment Variables:

Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are properly configured.
