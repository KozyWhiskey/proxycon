# ProxyCon 2025 Companion App

A mobile-first companion web application for Magic: The Gathering tournament weekends. Built for 10 slightly intoxicated nerds in a rental house, with a focus on "one-thumb" usability—big buttons, instant feedback, and zero friction interactions.

## 🎯 Project Overview

ProxyCon 2025 has evolved into a **multi-event platform**. It handles:

- **Event Management**: Create and manage multiple events (e.g., "ProxyCon 2025", "Weekly Draft").
- **Tournament Brackets**: Swiss-style pairings with draft seat-based Round 1 pairings.
- **Casual Play**: Log Commander, 1v1, and 2HG games, linked to specific events.
- **Deck Tracking**: Manage your personal deck library with Scryfall integration.
- **Player Stats**: Track wins and tournament performance per event.
- **Live Feed**: Recent match history with AI-generated commentary.

### Design Philosophy

- **Mobile First**: All interactions optimized for one-thumb use.
- **Dark Mode**: Forged in the dark basement aesthetic.
- **V3 Auth**: Secure Supabase authentication (Email/Password) with automated profile creation.
- **Instant Feedback**: Toast notifications and visual feedback for every action.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI (Dark theme: Slate)
- **Database**: Supabase (Cloud PostgreSQL)
- **Auth**: Supabase Auth (Email/Password)
- **AI**: Vercel AI SDK with Google Gemini for match commentary
- **API**: Scryfall API for card data
- **Icons**: Lucide React
- **Notifications**: Sonner (toast notifications)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (cloud instance)
- Environment variables configured

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd proxycon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key-here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
proxycon/
├── app/                          # Next.js App Router
│   ├── login/                    # Auth Login (Email/Password)
│   ├── onboarding/               # New User Profile Setup
│   ├── events/                   # Event management & dashboards
│   │   ├── [id]/                 # Event Dashboard
│   │   └── page.tsx              # List of User's Events
│   ├── tournament/               # Tournament Engine
│   │   ├── [id]/                 # Bracket, Seating, Match Reporting
│   │   └── new/                  # Tournament Creation (Linked to Event)
│   ├── play/                     # Casual Play
│   ├── decks/                    # Deck Tracker (with Scryfall)
│   ├── profile/                  # User Profile Settings
│   └── page.tsx                  # Global Player Status Sheet (Home)
├── components/                   # React components
│   ├── dashboard/                # Home/Event Dashboard components
│   ├── decks/                    # Deck Management & Scryfall Search
│   ├── navigation/               # Bottom Nav & Headers
│   ├── tournament/               # Tournament specific UI
│   └── ui/                       # Shadcn UI components
├── lib/                          # Utilities (Auth, Types, Swiss Logic, Scryfall)
├── utils/                        # Supabase Config
└── .dev-docs/                    # Documentation
```

## ✨ Features

### ✅ Implemented (V3)

- **V3 Architecture**: Fully normalized database schema (`profiles`, `events`, `event_members`). No legacy `players` table dependency.
- **Multi-Event System**: Support for multiple distinct events with their own dashboards.
- **Player Status Sheet**: Global home page showing total wins and active event status.
- **Event Dashboard**: Dedicated hub for an event's active tournaments and feed.
- **Deck Tracker**: 
  - Create and manage decks.
  - **Scryfall Integration**: Auto-populate Commander details (Colors, Art, Text) via API search.
  - Track deck usage in matches.
- **Tournament Engine**: 
  - Swiss-style brackets using MTG tiebreakers (Points > OMW% > GW%).
  - Draft seat selection.
  - Round timers with admin controls.
  - Game score tracking (e.g., "Win 2-1").
- **Casual Mode**: Log Commander, 1v1, or 2HG games (linked to events) with deck selection filtering.
- **Match Reporting**: Simplified interface for reporting results.
- **Admin Tools**: Fix erroneous match results.

See `.dev-docs/IMPLEMENTATION_PLAN.md` for the full roadmap status.

## 🔧 Development Guidelines

### Critical Rules

1. **Next.js 16 Async Cookies**: Always use `await cookies()` in server components.
2. **Supabase SSR**: Use `createServerClient` for server-side data fetching.
3. **Event Linking**: Ensure `event_id` is passed when creating tournaments or logging casual matches.
4. **Error Handling**: Wrap server actions in try/catch.
5. **Profiles First**: Always query `profiles` table for user identity, never `players`.

See `.dev-docs/TOURNAMENT_RULES.md` for detailed tournament logic rules.

## 📚 Documentation

- **PROJECT_SUMMARY.md**: High-level overview.
- **DATABASE_STRUCTURE.md**: Schema definition (V3).
- **TOURNAMENT_STRUCTURE.md**: Deep dive into the pairing engine.

---

**Status**: Active Development (V3 Platform)  
**Last Updated**: December 17, 2025
