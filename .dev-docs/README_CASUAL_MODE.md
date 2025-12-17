# Casual Mode - Implementation Documentation

**Status:** ✅ **COMPLETED**  
**Route:** `/play/casual`  
**Feature Spec:** `.dev-docs/features/05-feature-casual-mode.md`

---

## Overview

Casual Mode allows users to log results of non-tournament games. In the V2 platform, these games can be **linked to a specific Event**, allowing them to appear in the event's activity feed and contribute to event stats.

## Key Features

### 1. Game Formats
- **Commander:** 4-player standard.
- **1v1:** Standard duels.
- **2HG:** Two-Headed Giant (2v2).

### 2. Event Linking
- The page accepts an optional `eventId` query parameter (e.g., `?eventId=123`).
- If present, the logged match is saved with `event_id = 123`.
- Redirects return to the Event Dashboard if linked, or Home if global.

### 3. Deck Selection
- Users can select which of their decks they played.
- This data feeds into the Deck Tracker stats.

## Usage

1.  **From Home:** Click "Play" or "Log Casual Game". This logs a **Global** game.
2.  **From Event:** Click "Log Casual Game" on the dashboard. This logs an **Event** game.