# Feature: Tournament Dashboard & Match Reporting Fixes

**Status:** Draft
**Role:** Engineering & UX Polish
**Goal:** Ensure the Tournament Dashboard reliably displays pairings and allows for error-free match reporting.

---

## 1. Problem Statement

Two critical issues have been identified:
1.  **Blank Dashboard:** After starting a draft, the tournament dashboard pairing list may appear empty or fail to render the created matches.
2.  **Runtime Error:** Accessing the "Enter Result" form triggers a `Runtime Error: A <Select.Item /> must have a value prop that is not an empty string.` This is caused by the Deck Selector's "No Deck" option having an invalid `value=""` prop.

---

## 2. Proposed Solution

### A. Match Reporting Form Fix
**File:** `components/tournament/match-reporting-form.tsx`

The `<Select>` component for choosing a deck (used when reporting results) currently uses an empty string for "No Deck". This violates Radix UI/Shadcn requirements.

**Changes:**
- Update `<SelectItem value="">` to `<SelectItem value="no_deck">`.
- Update the logic to treat `"no_deck"` as `null` when submitting to the server action.

### B. Tournament Dashboard Resilience
**File:** `app/tournament/[id]/page.tsx`

Ensure the dashboard handles edge cases gracefully:
-   **No Participants:** If a match exists but participants failed to insert, it should not crash.
-   **Loading State:** Ensure data fetching doesn't cause a hydration mismatch.
-   **Visual Feedback:** If "No matches found" is rendered, provide a way to "Force Start Round 1" or check tournament status (Admin only).

### C. Action Verification
**File:** `app/tournament/actions.ts`

-   Verify `startDraft` transaction logic ensures `match_participants` are created *before* the redirect.
-   Verify `profile_id` is correctly mapped from `tournament_participants` to `match_participants`.

---

## 3. UX Workflow Confirmation

1.  **Draft Seating:** User selects seats -> Clicks "Start Draft".
2.  **Transition:** System creates Round 1 Matches -> Redirects to `/tournament/[id]`.
3.  **Dashboard:**
    -   Header: Shows "Round 1 of X".
    -   Body: Lists matches (e.g., "Player A vs Player B").
    -   Action: "Enter Result" button is visible for incomplete matches.
4.  **Reporting:**
    -   User clicks "Enter Result".
    -   Form shows Score Inputs (0-0).
    -   Deck Selector defaults to "No Deck Selected" (if applicable).
    -   User selects deck (or leaves as "No Deck").
    -   User submits.
5.  **Result:** Dashboard updates with result. Standings update.

---

## 4. Implementation Checklist

- [ ] Refactor `MatchReportingForm` to use valid Select values.
- [ ] Review `startDraft` in `actions.ts` for race conditions.
- [ ] Verify `TournamentPage` rendering logic for matches.
