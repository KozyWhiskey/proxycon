# UX/UI Feature: Guilds & Communities (V4)

**Status:** Draft
**Role:** Senior UX Designer
**Theme:** "The Mythic" - Expansion Pack
**Goal:** Create a feeling of belonging, legacy, and shared history for gaming groups.

---

## 1. Thematic Concept: "Guilds"

We are moving away from the dry "Organization" terminology. In Upkeep V4, players form **Guilds**.

*   **The Group:** "Guild"
*   **The Creator:** "Guildmaster"
*   **The Admins:** "Officers"
*   **The Members:** "Planeswalkers" / "Members"

**Visual Identity:**
Each Guild gets a customizable "Banner" (Hero Image) and "Sigil" (Logo/Avatar) that appears on all their events and leaderboards.

---

## 2. User Flows

### A. Creating a Guild
**Trigger:** "Create Guild" button on the Global Dashboard (Home).

1.  **The Founding:**
    -   User enters **Guild Name** (e.g., "Friday Night Cartel").
    -   User enters **Guild Handle** (e.g., `@fnc`).
    -   **Customization:** Select a Theme Color (Gold, Dimir Blue, Rakdos Red) and upload a Banner.
2.  **Outcome:**
    -   User is redirected to the **Guild Sanctuary** (Dashboard).
    -   User is granted the **Guildmaster** badge/role.

### B. Inviting Members (The "Summoning")
**Goal:** Zero-friction onboarding for the rest of the group.

1.  **Action:** Guildmaster clicks "Invite Planeswalkers" in the Guild Header.
2.  **Method:**
    -   **Copy Link:** A unique `upkeep.gg/g/join/[code]` link.
    -   **QR Code:** Displayed on the Guildmaster's phone for others to scan at the table.
3.  **Receiver Experience:**
    -   User clicks link.
    -   If logged out -> Sign Up/Login -> Auto-join Guild.
    -   If logged in -> "Accept Invitation to [Guild Name]?" -> Success.

### C. The Guild Sanctuary (Dashboard)
**Route:** `/guilds/[slug]`

This is the new "Home Base" for the group.

**Layout (Desktop - "Command Center"):**
-   **Header:** Guild Banner, Name, Member Count, and "Season" status.
-   **Left Column (Activity):**
    -   **Active Events:** "Draft Night (Live Now)" - One click join.
    -   **Upcoming Events:** Scheduled tournaments.
-   **Center Column (The Feed):**
    -   Aggregated match results from *all* events in the guild.
    -   "Jace defeated Chandra (2-1) in Casual Commander."
    -   "New Badge Unlocked: The Giant Slayer (Awarded to Liliana)."
-   **Right Column (Glory):**
    -   **Leaderboard:** Top 3 players by Win Rate (Current Season).
    -   **Hall of Fame:** Past tournament winners.

**Layout (Mobile - "The Scroll"):**
-   Sticky Header with Guild Selector (if in multiple).
-   **Tabs:** [Dashboard] [Events] [Members] [Stats].
-   **Dashboard:** Quick Actions ("New Tournament", "Log Game") -> Active Event Card -> Recent Feed.

---

## 3. Navigation Updates

We need to elevate Guilds in the navigation hierarchy.

**Mobile Bottom Bar (Updated):**
1.  **Home:** Personal Quick Actions & Career Stats.
2.  **Guilds:** List of user's Guilds (or direct link if only in one).
3.  **Play:** Quick Casual Game (Context-aware).
4.  **Events:** (Legacy/Specific) -> Merged into Guilds context mostly.
5.  **Profile:** Settings.

**Desktop Sidebar (The "Multiverse" View):**
-   **Far Left Rail:** Icons for each Guild the user belongs to (Discord style).
-   **Sidebar Panel:** Navigation *within* the selected Guild (Dashboard, Events, Members, Settings).

---

## 4. Permissions & Management UX

### Member Management
-   **Roster View:** List of all members with their "Guild Title" (customizable by Admin) and "Main Commander" (favorite card).
-   **Actions:**
    -   Promote to Officer (Admin).
    -   Kick (Remove).
    -   "Grant Title" (Flavor text, e.g., "The Combo Player").

### Privacy
-   **Private Guilds:** Invite only. Content hidden from public search.
-   **Public Guilds:** Visible in a "Find a Community" directory (Future feature).

---

## 5. Design System Extensions

**"Guild Identity" Colors:**
The UI should subtly adapt to the Guild's chosen theme color.
-   If the Guild is "Izzet" (Blue/Red), the primary buttons and borders within the Guild Dashboard should shift from the default "Burnished Gold" to the Guild's Accent Color.

**Empty States:**
-   "This Guild is empty. Summon your pod!"
-   "No events yet. Start the first Crusade."

---

## 6. Implementation Notes for Engineers

-   **"One-Thumb" Rule:** Switching between Guilds must be accessible via the bottom sheet or sidebar on mobile without reaching to the top.
-   **Context is King:** When a user is "inside" a Guild page, creating a "New Tournament" should *automatically* associate it with that Guild.
