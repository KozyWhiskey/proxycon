# Proxycon 2025 Companion App - Master Roadmap

**Note:** This roadmap has evolved into the V2 Platform Specification. See `PROJECT_SUMMARY.md` and `IMPLEMENTATION_PLAN.md` for the most current state.

## 1. Project Vision

A "One-Thumb Drunk" mobile-first companion app for Magic: The Gathering weekends. Now supports multiple events and persistent profiles.

## 2. Tech Stack & Architecture

-   **Framework:** Next.js 16 (App Router)
-   **Database:** Supabase (Cloud Instance)
-   **Auth:** Supabase Auth (V2)

## 3. Database Schema (Reference)

See `.dev-docs/DATABASE_STRUCTURE.md` for the definitive schema.

## 4. Key Features Status

### Feature A: Auth (V2)
-   **Status:** ✅ Completed. Migrated to Supabase Auth.

### Feature B: Tournament Mode
-   **Status:** ✅ Completed. Includes Draft Seating, Timers, and Game Scores.

### Feature C: Casual Mode
-   **Status:** ✅ Completed. Supports Event Linking.

### Feature D: Dashboards
-   **Status:** ✅ Completed. Split into Global Home and Event Dashboard.

### Feature E: Prize Wall
-   **Status:** 🔄 Pivoted. Replaced by Tournament-specific Prizes.

### Feature F: The Ledger
-   **Status:** ⏸️ Deferred.

## 5. Implementation Roadmap

Refer to `.dev-docs/IMPLEMENTATION_PLAN.md` for the active checklist.
