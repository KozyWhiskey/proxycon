# Feature: Enhancements & Polish (V3)

**Status:** Planned  
**Role:** UX/UI & Gamification  
**Goal:** Elevate the application from a "tool" to a "companion" with high-fidelity visuals, gamification, and rich metadata.

---

## Epic 1: The "Deck Polish" Update

**Goal:** Elevate the presentation of the decks section from a simple data list to a rich, native-feeling Magic: The Gathering interface.

### 1.1 Scryfall-Powered Mana Symbols
**UX Rational:** MTG players scan for colors visually. Using real symbols reduces cognitive load and feels premium.

- [x] **Create Mana Symbol Component**
  - Create `components/ui/mana-symbol.tsx`.
  - Import SVG assets for `{W}`, `{U}`, `{B}`, `{R}`, `{G}`, `{C}`, `{X}`, etc. (using `mana-font` SVGs or similar).
  - Component should accept a mana string (e.g., `{3}{U}{U}`) and render the corresponding row of SVGs.
- [x] **Update Deck List**
  - In `components/decks/deck-card.tsx`, replace the colored CSS circles with the new `ManaSymbol` component.
  - Parse the stored `colors` array or `mana_cost` string to render.
- [x] **Update Deck Detail View**
  - Ensure the full mana cost is displayed prominently next to the Commander.

### 1.2 Smart Oracle Text & Keyword Tooltips
**UX Rational:** Helps newer players understand complex commanders without leaving the app.

- [x] **Rich Text Parser**
  - Create `lib/parse-oracle-text.tsx`.
  - Function to convert Scryfall `oracle_text` (newlines, `{T}` symbols) into HTML/JSX.
  - Replace `{T}` with `<ManaSymbol symbol="T" />`.
- [x] **Keyword Detection**
  - Implement regex detection for keywords (e.g., "Haste", "Trample", "Ward", "Connive").
  - Wrap detected keywords in a `<Tooltip>` or `<Popover>` trigger.
  - Define a dictionary of keyword definitions (or fetch from Scryfall Keywords API if possible/performant).
- [x] **Update Deck Form/View**
  - In `components/decks/deck-form.tsx`, replace the raw `Textarea` for description with a read-only `RichTextDisplay` when in "View" mode (or distinct "Preview" card).

### 1.3 "The Art Gallery" (Full Art Toggle)
**UX Rational:** Players choose commanders for the art. Strengthening emotional connection.

- [x] **Data Fetching**
  - Ensure `lib/scryfall.ts` fetches both `art_crop` (for headers) and `border_crop` (full card) or `large` image URIs.
- [x] **UI Implementation**
  - Add a "View Full Art" toggle/button on the Deck Details page.
  - Implement a lightbox or modal that displays the high-res card art.
  - Support "flipping" for transform cards (if applicable).

---

## Epic 2: The Achievement & Badge System

**Goal:** Gamify the experience and provide permanent recognition for event performance.

### 2.1 Database & Architecture
- [x] **Schema Migration**
  - Create `public.badges` table:
    - `id` (UUID)
    - `slug` (text, unique) - e.g., 'hot-hand'
    - `name` (text)
    - `description` (text)
    - `icon_url` (text) or `icon_name` (text)
    - `category` (text) - 'automated', 'manual', 'event'
  - Create `public.profile_badges` table:
    - `profile_id` (FK)
    - `badge_id` (FK)
    - `awarded_at` (timestamp)
    - `event_id` (FK, nullable) - Linked context
- [x] **Seed Data**
  - Populate initial badges (Win Streak, Event Winner, etc.).

### 2.2 The "Trophy Case" Profile Section
**UX Rational:** Users need a place to show off status.

- [x] **Profile Page Update**
  - Update `app/profile/page.tsx` to fetch user badges.
  - Create `components/profile/trophy-case.tsx` grid layout.
  - Design badge visual style (Gold borders, glowing effects).

### 2.3 Automated "Stat-Based" Badges
**UX Rational:** Immediate positive reinforcement via dopamine hits.

- [x] **Trigger Logic**
  - Implement check logic in `app/tournament/actions.ts` (after `submitResult`).
  - Example: Check if `wins_in_a_row >= 3`.
- [x] **Notification**
  - If a badge is awarded, trigger a `sonner` toast: "Badge Unlocked: Heating Up!".

### 2.4 Manual "Theme" Badges (Admin)
**UX Rational:** Human-driven awards for creativity.

- [ ] **Admin UI** (Scheduled for future update)
  - Create `app/admin/badges/page.tsx`.
  - User selector -> Badge selector -> "Award" button.
- [ ] **Ceremony View**
  - (Optional) Special dashboard view for "End of Event" awards.

---

## Epic 3: Limited & Set Tracking

**Goal:** Better support for Draft/Sealed decks where the specific expansion set matters.

### 3.1 Schema & Data
- [x] **Schema Update**
  - Add columns to `public.decks`:
    - `set_code` (text) - e.g., 'mh3'
    - `set_name` (text) - e.g., 'Modern Horizons 3'
- [x] **Scryfall Integration**
  - Update `lib/scryfall.ts` to include `set` and `set_name` in return objects.

### 3.2 UI Implementation
- [x] **Deck Form Update**
  - Add "Set / Expansion" search input (or auto-populate from the Commander's print if applicable).
  - Allows overriding: "I'm using the Bloomburrow commander, but this is a 'Standard' deck."
- [x] **Visuals**
  - Fetch and display Set Symbol SVG (Scryfall provides these via `https://svgs.scryfall.io/sets/{set_code}.svg`).
  - Display set symbol next to deck name in lists.
