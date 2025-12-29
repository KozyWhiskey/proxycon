# Upkeep - Implementation Plan

This document outlines the development plan for the Upkeep companion application. The project is broken down into features, each with its own detailed specification file located in the `.dev-docs/features/` directory.

We will follow this plan sequentially. Each feature must be implemented and tested before moving to the next.

## Feature Checklist

- [x] **Phase 1: Foundation & Setup** (`00-feature-foundation-and-setup.md`)
- [x] **Phase 2: Core Identity & Data**
  - [x] Zero-Friction Auth (`01-feature-zero-friction-auth.md`) ✅ **COMPLETED** (Replaced by V2 Auth)
  - [x] Dashboard (`02-feature-dashboard.md`) ✅ **COMPLETED** (Refactored to Global/Event Split)
- [x] **Phase 3: Tournament Engine**
  - [x] Tournament Engine (`03-feature-tournament-engine.md`) ✅ **COMPLETED**
  - [x] Match Reporting (`04-feature-match-reporting.md`) ✅ **COMPLETED**
  - [x] Tournament Ranking & Draft Seats (`04.5-feature-tournament-ranking-draft-seats.md`) ✅ **COMPLETED**
- [x] **Phase 4: Casual Play & AI Integration**
  - [x] Casual Mode (`05-feature-casual-mode.md`) ✅ **COMPLETED** - With Event Linking
  - [x] AI Gamification ("The Snarky Director") ✅ **COMPLETED** - Dynamic Commander Roasts
- [x] **Phase 5: Economy**
  - [x] Prize Wall (`07-feature-prize-wall.md`) ✅ **COMPLETED** - Replaced by Tournament Prizes
- [ ] **Phase 6: Polish & Administration**
  - [x] UX/UI Standardization (`UX_UI_STANDARDS.md`) ✅ **COMPLETED**
    - [x] Responsive Desktop Layouts
    - [x] Context-Aware Quick Actions
    - [x] Scryfall Art Selection
  - [ ] Admin Tools (`09-feature-polish-and-admin.md`)

## V2 Platform Upgrade (Completed)

- [x] **Phase 1: Authentication & Migration** ✅ **COMPLETED**
  - [x] Database Migration (`profiles`, `events`, `event_participants`, `decks`)
  - [x] Supabase Auth Integration (Email/Password)
  - [x] Legacy Profile Claim Flow
- [x] **Phase 2: Event Management** (`02-feature-event-management.md`) ✅ **COMPLETED**
  - [x] Database Migration (Link Tournaments to Events)
  - [x] Event Creation UI
  - [x] Event Switcher & Navigation (Events Tab)
  - [x] Dashboard Refactor (Global Landing + Event Dashboard)
- [x] **Phase 3: Deck Tracker** (`03-feature-deck-tracker.md`) ✅ **COMPLETED**
  - [x] Deck Library UI
  - [x] Match Reporting with Decks
- [x] **Phase 4: Expanded Game Modes** (`04-feature-expanded-game-modes.md`) ✅ **COMPLETED**
  - [x] Casual Mode Refactor (Commander, 1v1, 2HG)
  - [x] Event Linking for Casual Games
