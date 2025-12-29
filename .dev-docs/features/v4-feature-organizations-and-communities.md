# Feature: Organizations & Communities ("Guilds") - V4 Architecture

**Status:** Draft
**Role:** Senior Architect
**Goal:** Transition "Upkeep" from a single-user event manager to a multi-tenant community platform.

---

## 1. Core Concept: The "Guild" (Organization)

To support persistent gaming groups, we are introducing an Organization layer, thematically styled as **"Guilds"**.

**Hierarchy Change:**
*   **V3 (Current):** User -> Events -> Tournaments
*   **V4 (New):** User -> **Guilds** -> Events -> Tournaments

### Key Relationships
-   A **User** can belong to multiple **Guilds**.
-   An **Event** belongs to one **Guild** (or can remain standalone/personal).
-   **Statistics** are aggregated at the **Guild** level (e.g., "Season 1 Leaderboard").

---

## 2. Database Schema Changes

### 2.1 New Table: `public.organizations`
The root entity for a gaming group.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique Guild ID |
| `owner_id` | UUID | FK → profiles.id | The Guild Master (Creator) |
| `name` | TEXT | NOT NULL | Display Name (e.g., "Ravnica High Rollers") |
| `slug` | TEXT | UNIQUE, NOT NULL | URL-friendly identifier |
| `description` | TEXT | NULLABLE | Guild manifesto or bio |
| `logo_url` | TEXT | NULLABLE | Branding image |
| `banner_url` | TEXT | NULLABLE | Hero image for Guild dashboard |
| `theme_color` | TEXT | DEFAULT 'gold' | UI Accent Color preference |
| `is_public` | BOOLEAN | DEFAULT FALSE | Searchable in directory? |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation date |

### 2.2 New Table: `public.organization_members`
Manages membership and RBAC within a Guild.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `organization_id` | UUID | PK, FK → organizations.id | The Guild |
| `profile_id` | UUID | PK, FK → profiles.id | The Member |
| `role` | TEXT | CHECK ('owner', 'admin', 'member') | Permissions level |
| `title` | TEXT | NULLABLE | Flavor text (e.g., "Grand Arbiter") |
| `joined_at` | TIMESTAMP | DEFAULT NOW() | Membership start date |

**Roles:**
-   **Owner (Guildmaster):** Can delete guild, transfer ownership, manage all settings.
-   **Admin (Officer):** Can create Events, Invite/Kick members, manage content.
-   **Member (Initiate):** Can view private events, view guild stats, join internal tournaments.

### 2.3 Updates to `public.events`
Link events to the new parent entity.

-   **Add Column:** `organization_id` (UUID, FK → organizations.id, NULLABLE).
-   **Logic:**
    -   If `organization_id` is set: The event appears in the Guild Dashboard. Permissions are inherited from Guild roles.
    -   If `organization_id` is NULL: The event is "Personal" (Legacy V3 behavior) or "Public One-Shot".

---

## 3. Security & RLS (Row Level Security)

### Policies for `organizations`
-   **SELECT:** Public if `is_public = true`. Members can always view their own guilds.
-   **INSERT:** Authenticated users can create a guild (becoming `owner`).
-   **UPDATE:** Only `owner` or `admin` (via `organization_members` check).
-   **DELETE:** Only `owner`.

### Policies for `organization_members`
-   **SELECT:** Members can view the roster of guilds they belong to.
-   **INSERT:**
    -   Users can join via "Invite Code" (Open).
    -   Admins/Owners can insert users (Invite system).
-   **DELETE:** Admins/Owners can remove members. Users can leave (remove self).

---

## 4. Migration Strategy

1.  **Schema Migration:** Create tables and add columns.
2.  **Data Backfill (Optional):** We will NOT force existing V3 events into guilds immediately. They will remain "Personal Events" (organization_id = NULL).
3.  **Adoption:** Provide a UI tool for users to "Move Event to Guild" if they want to consolidate history.

---

## 5. API / Server Action Layer

### New Actions (`app/guilds/actions.ts`)
-   `createGuild(data)`: Transaction -> Create Guild -> Add Creator as Owner.
-   `generateGuildInvite(guildId)`: Returns a signed URL or short-code.
-   `joinGuild(inviteCode)`: Adds user to `organization_members`.
-   `getGuildStats(guildId)`: Aggregates wins/losses from all linked Events.

---

## 6. Integration with Existing Systems

-   **Auth:** Continues to use `public.profiles`.
-   **Tournaments:** No direct schema change; they live inside Events, which now live inside Guilds.
-   **Casual Play:** Casual games logged within a Guild context must be linked to a "Season" or "Event" container within that guild to track stats correctly.

