# Feature: Admin & Polish (V3)

**Status:** ✅ **COMPLETED**
**Role:** Administration & System Health
**Goal:** Provide comprehensive tools for system administration and ensure a high-quality user experience.

---

## Admin Tools ("God Mode")
**Route:** `/admin` (Protected - Requires `admin` role in `profiles`).

The Admin Panel is organized into four key areas:

### 1. User Management
- **Overview:** View all registered users in the system.
- **Capabilities:** Update user roles (e.g., promote a user to `admin`).

### 2. Event Management
- **Overview:** List all created events.
- **Capabilities:** Update event details (Name, Dates, Active status).

### 3. Match Correction
- **Overview:** Tool to fix erroneously reported results.
- **Capabilities:** 
    - Fix simple Win/Loss results.
    - **Fix Match Result with Games:** Correct individual game scores (e.g., change a 2-0 to a 2-1) and recalculate the winner automatically.

### 4. Badge Management ⭐ NEW
- **Overview:** Interface for the Achievement System.
- **Capabilities:**
    - Browse all defined badges (System & AI-generated).
    - **Manual Awarding:** Search for a user and manually award them any badge (e.g., for "Creative Deckbuilding" or special event participation).

---

## UX/UI Polish
- **Mobile First:** All tap targets must be thumb-friendly (`h-12`).
- **Dark Mode:** Permanent slate/dark aesthetic ("The Mythic" theme).
- **Toast Notifications:** Comprehensive use of `sonner` for success/error feedback and **Badge Unlock Alerts**.
- **Loading States:** Skeletons and spinners implemented for all asynchronous server actions.
- **Responsive Layouts:** Pages automatically transition from Mobile Stacked to Desktop Grid/Split-view layouts.

---

## Technical Maintenance
- **Schema Sync:** Use `verify_and_update_v3_schema.sql` to ensure database consistency.
- **AI Health:** Monitor OpenAI API usage for the "Snarky Director" badge generation.
- **Logs:** Monitor server logs for pairing or redirection errors.
