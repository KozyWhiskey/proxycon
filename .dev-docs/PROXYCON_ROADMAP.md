# Proxycon 2025 Companion App - Master Roadmap

## 1. Project Vision

A "One-Thumb Drunk" mobile-first companion app for a 10-person Magic: The Gathering weekend. The app manages tournament brackets, tracks casual Commander games, handles a digital "Prize Wall" currency, and tracks shared expenses.

### Core UX Philosophy:

-   **Mobile First:** Big buttons, reachable with one thumb.
-   **Dark Mode:** Default setting.
-   **Zero Friction:** No email/password login. Users select their name from a dropdown list that persists via local storage cookies.
-   **Two-Mode System:** Distinct flows for "Tournament" (Drafts with Swiss pairings) vs. "Casual" (Commander/Board Games).

## 2. Tech Stack & Architecture

-   **Framework:** Next.js 16 (App Router)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS + Shadcn UI
-   **Database:** Supabase (Cloud Instance)
-   **AI:** Vercel AI SDK with OpenAI Provider (gpt-4o) for commentary.

### Key Libraries:

-   `@supabase/ssr`: For secure server-side auth and data fetching.
-   `tournament-pairings`: For generating Swiss brackets.
-   `lucide-react`: For icons.

### Critical Configuration Rule (Next.js 16):

-   All cookie operations in `server.ts` and `middleware.ts` must be asynchronous (`await cookies()`).
-   Do not use the Transaction Pooler connection string; use the standard Supabase REST API URL (`NEXT_PUBLIC_SUPABASE_URL`) and Anon Key.

## 3. Database Schema (Reference)

Use this reference when generating SQL queries or TypeScript interfaces.

-   **`players`**: `id` (UUID), `name` (Text), `nickname` (Text), `avatar_url` (Text), `wins` (Int), `tickets` (Int - Currency).
-   **`tournaments`**: `id` (UUID), `name` (Text), `format` (Text - 'draft', 'sealed'), `status` (Text - 'active', 'completed').
-   **`matches`**: `id` (UUID), `tournament_id` (UUID - Nullable for casual), `round_number` (Int), `game_type` (Text), `notes` (Text).
-   **`match_participants`**: `id` (UUID), `match_id` (UUID), `player_id` (UUID), `result` (Text - 'win', 'loss', '1st', '2nd', '3rd', '4th'), `deck_archetype` (Text).
-   **`prize_wall`**: `id` (UUID), `name` (Text), `cost` (Int), `stock` (Int), `image_url` (Text).
-   **`ledger`**: `id` (UUID), `payer_id` (UUID), `amount` (Numeric), `description` (Text).

## 4. Feature Specifications

### Feature A: The "Who Are You?" Login (No Passwords)

-   **Logic:** On first load, check for a `proxycon_user_id` cookie.
-   **UI:** If no cookie, show a dropdown of all players. User selects "Dave". App sets the cookie `proxycon_user_id=Dave_UUID`.
-   **Security:** None. We trust the boys not to impersonate each other.

### Feature B: Tournament Mode (The Drafts)

-   **Setup Page:** Input "Tournament Name" -> Select Participants -> Click "Start".
-   **Pairing Engine:**
    -   Use `tournament-pairings` library.
    -   Round 1: Random.
    -   Round 2+: Pair by Win/Loss record.
-   **Match Reporting:**
    -   Click a match card (e.g., "Dave vs. Steve").
    -   Simple Toggle: "Dave Won" | "Steve Won" | "Draw".
    -   Submit updates the database and potentially triggers the next round if all matches are done.

### Feature C: Casual Mode (Commander / Board Games)

-   **Input Flow:**
    -   Select "Commander" or "Board Game".
    -   Select Players (Multi-select, usually 4).
-   **Select Outcome:**
    -   Winner Take All: Click the winner.
    -   Ranked: Assign 1st, 2nd, 3rd, 4th.
-   **Achievements (Commander Only):**
    -   Checkboxes for "First Blood", "Killed Sol Ring", etc.
    -   These add bonus tickets to the player's total.

### Feature D: The Dashboard & Leaderboards

-   **Two Tabs:**
    -   **Tournament Kings:** Ranked by wins in matches where `tournament_id` IS NOT NULL.
    -   **Casual Crushers:** Ranked by wins in casual matches.
-   **News Feed:** A list of the last 5 matches.
-   **AI Integration:** Each new match entry sends a prompt to OpenAI: "Generate a 1-sentence sarcastic commentary on this match result: [Winner] beat [Loser] in [Format]." Save this text to the display.

### Feature E: The Prize Wall (Shop)

-   **UI:** Grid of cards (Image + Name + Cost).
-   **Logic:**
    -   "Buy" button is disabled if `user.tickets < item.cost`.
    -   On click: `UPDATE players SET tickets = tickets - cost WHERE id = user.id` AND `UPDATE prize_wall SET stock = stock - 1`.
-   **Audio:** Play a "Cha-Ching" sound effect on success.

### Feature F: The Ledger (Simple Expenses)

-   **Input:** "I Paid" -> Select Payer -> Enter Amount -> Enter Description.
-   **Display:**
    -   Total Spent by Group.
    -   Per-Person Share (Total / 10).
    -   Personal Status: "You are UP $50" (Green) or "You OWE $20" (Red).

## 5. Implementation Roadmap (Step-by-Step)

### Phase 1: Foundation (Done)

-   [x] Initialize Next.js 16 + Supabase + Shadcn.
-   [x] Create Database Schema in Supabase Cloud.
-   [x] Set up async cookie clients (`server.ts`, `middleware.ts`).

### Phase 2: Core Data & Identity

-   [ ] Build `LoginScreen` component: A simple dropdown to select a user and set the cookie.
-   [ ] Build `Dashboard` page: Fetch players and display a simple list of names and ticket counts.
-   [ ] Seed Data: Manually add the 10 player names in Supabase.

### Phase 3: The Tournament Engine (Complex)

-   [ ] Create `actions/tournament.ts`: Server actions to create a tournament and generate pairings using `tournament-pairings`.
-   [ ] Build `TournamentBracket` UI: A view to see active matches for the current round.
-   [ ] Build `MatchReporter` UI: A modal to select the winner of a specific match.

### Phase 4: Casual & AI

-   [ ] Build `CasualGameForm`: A form to select 4 players and a winner.
-   [ ] Integrate OpenAI: Create an API route `/api/commentary` that takes match data and returns a string.
-   [ ] Update `MatchReporter`: Call the AI API after a match is saved and store the result.

### Phase 5: Economy (Prizes & Ledger)

-   [ ] Build `PrizeWall` page: Fetch items and allow "purchasing" (decrement tickets).
-   [ ] Build `Ledger` page: Simple form to add expenses and a summary card showing the math.

### Phase 6: Polish

-   [ ] Mobile Optimization: Increase font sizes and button padding for touch targets.
-   [ ] Dark Mode Check: Ensure no white flashes.
-   [ ] "God Mode" Admin Page: A hidden page to fix score mistakes (`UPDATE` rows manually).

## 6. Sample Prompt for AI Code Generation

Use this when asking an AI to build a specific feature from this roadmap.

```
I am building the Proxycon 2025 app using Next.js 16 and Supabase. Refer to my PROXYCON_ROADMAP.md for the database schema. I need you to build the [Insert Feature Name, e.g., Prize Wall Page]. It should fetch data from the [Table Name] table using the server client. Please use Shadcn UI Card components for the layout and ensure all database calls use await.
```