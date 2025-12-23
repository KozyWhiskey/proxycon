# ProxyCon 2025 Companion App

A mobile-first, desktop-optimized companion web application for Magic: The Gathering tournament weekends. Built for groups of friends, with a focus on usability, instant feedback, and frictionless interactions.

## 🎯 Project Overview

ProxyCon 2025 is a **multi-event platform** that handles:

- **Event Management**: Create and manage multiple events (e.g., "ProxyCon 2025", "Weekly Draft").
- **Tournament Brackets**: Swiss-style pairings with draft seat-based Round 1 pairings.
- **Casual Play**: Log Commander, 1v1, and 2HG games, linked to specific events.
- **Deck Tracking**: Manage your personal deck library with Scryfall integration (including art selection).
- **Player Stats**: Track wins and tournament performance per event.
- **Live Feed**: Recent match history with AI-generated commentary.

### Design Philosophy

- **Mobile First**: All interactions optimized for one-thumb use on phones.
- **Desktop Optimized**: Responsive grids and expanded views for laptops/tablets.
- **Dark Mode**: Forged in the dark basement aesthetic.
- **V3 Architecture**: Secure Supabase authentication (Email/Password) and normalized schema.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI (Dark theme: Slate)
- **Database**: Supabase (Cloud PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Vercel AI SDK with OpenAI (GPT-4o) & Google Gemini
- **API**: Scryfall API

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase project
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

## ✨ Features

### ✅ Implemented (V3)

- **V3 Architecture**: Fully normalized database schema (`profiles`, `events`, `event_members`).
- **Multi-Event System**: 
  - Dedicated "Global Dashboard" for personal stats.
  - "Event Dashboard" for tournament weekends.
  - Seamless "Create vs. Join" workflows.
- **Deck Tracker**: 
  - **Scryfall Integration**: Search cards, auto-populate details.
  - **Art Selection**: Choose specific prints/art for your Commander.
  - **Rich Card Data**: Displays mana symbols, set symbols, and rich oracle text.
- **Achievements & Badges**:
  - **Trophy Case**: Profile section showcasing earned badges.
  - **Automated Awards**: Unlock badges for win streaks ("The Hot Hand") and participation ("Iron Man").
  - **AI Director**: "The Snarky Director" (powered by OpenAI) analyzes match results and Commander choices to generate unique, funny, and sometimes mean achievements (e.g., "The Arithmetic Nerd" for Atraxa players).
- **Tournament Engine**: 
  - Swiss-style brackets using MTG tiebreakers (Points > OMW% > GW%).
  - Draft seat selection.
  - Round timers.
- **Casual Mode**: Log Commander, 1v1, or 2HG games.
- **Community & Stats**:
  - **Player Directory**: Browse all registered players with activity summaries.
  - **Deep-Dive Profiles**: View detailed career stats, deck libraries, and match history for any player.
  - **Global Leaderboards**: Track top performers across all events.
- **UX/UI Polish**: 
  - Context-aware Quick Actions.
  - Responsive layouts (Mobile Stacked -> Desktop Grid).

## 📚 Documentation

- **PROJECT_SUMMARY.md**: High-level overview.
- **UX_UI_STANDARDS.md**: Design system and responsive guidelines.
- **DATABASE_STRUCTURE.md**: Schema definition (V3).
- **TOURNAMENT_STRUCTURE.md**: Pairing engine logic.

---

**Status**: Active Development (V3 Platform)  
**Last Updated**: December 22, 2025