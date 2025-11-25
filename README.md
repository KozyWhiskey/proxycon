# ProxyCon 2025 Companion App

A mobile-first companion web application for a 3-day Magic: The Gathering weekend tournament. Built for 10 slightly intoxicated nerds in a rental house, with a focus on "one-thumb" usability—big buttons, instant feedback, and zero friction interactions.

## 🎯 Project Overview

ProxyCon 2025 is a tournament management system designed for a casual weekend Magic: The Gathering event. The app handles:

- **Tournament Brackets**: Swiss-style pairings for draft/sealed tournaments
- **Match Reporting**: Simple, thumb-friendly result submission
- **Player Stats**: Track wins, tickets (currency), and tournament performance
- **Live Feed**: Recent match history with AI-generated commentary
- **Dashboard**: Personal stats and active tournament information

### Design Philosophy

- **Mobile First**: All interactions optimized for one-thumb use
- **Dark Mode**: Forged in the dark basement aesthetic
- **Zero Friction**: No passwords—just select your name and play
- **Instant Feedback**: Toast notifications and visual feedback for every action

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI (Dark theme: Slate)
- **Database**: Supabase (Cloud PostgreSQL)
- **Auth**: Cookie-based user selection (no passwords)
- **AI**: Vercel AI SDK with Google Gemini for match commentary
- **Icons**: Lucide React
- **Notifications**: Sonner (toast notifications)

### Key Libraries

- `@supabase/ssr`: Server-side rendering with Supabase
- `tournament-pairings`: Swiss bracket pairing algorithm
- `zod`: Form validation
- `canvas-confetti`: Visual feedback for achievements
- `sonner`: Toast notifications

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

   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key-here
   ```

4. **Set up the database**

   Run the SQL migrations in your Supabase SQL Editor. See `.dev-docs/SUPABASE_SETUP.md` for detailed schema information.

5. **Seed initial data** (optional)

   Use the seed script to add initial players:
   ```bash
   npm run seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
proxycon/
├── app/                          # Next.js App Router pages
│   ├── login/                    # Zero-friction auth (player selection)
│   ├── tournament/               # Tournament management
│   │   ├── [id]/                 # Tournament bracket view
│   │   │   └── match/            # Match reporting pages
│   │   └── new/                  # Tournament creation
│   ├── actions.ts                # Server actions
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Dashboard/home page
├── components/                   # React components
│   ├── dashboard/                # Dashboard components
│   ├── tournament/               # Tournament-specific components
│   └── ui/                       # Shadcn UI components
├── lib/                          # Utility functions
│   └── get-current-user.ts       # User session management
├── utils/                        # Utilities
│   └── supabase/                 # Supabase client setup
│       ├── client.ts             # Browser client
│       ├── server.ts             # Server client (async cookies)
│       └── middleware.ts         # Session refresh logic
├── scripts/                      # Utility scripts
│   └── seed.ts                   # Database seeding
├── .dev-docs/                    # Development documentation
│   ├── features/                 # Feature specifications
│   ├── PROJECT_SUMMARY.md        # Project overview
│   ├── TOURNAMENT_STRUCTURE.md   # Tournament system docs
│   ├── TOURNAMENT_RULES.md       # Development rules
│   └── SUPABASE_SETUP.md         # Database setup guide
└── proxy.ts                      # Next.js 16 proxy (replaces middleware.ts)
```

## ✨ Features

### ✅ Implemented

- **Zero-Friction Authentication**: Cookie-based player selection
- **Dashboard**: Personal stats, active tournament info, and match feed
- **Tournament Engine**: Swiss-style bracket generation with configurable rounds
- **Match Reporting**: Simple, mobile-friendly result submission
- **Automatic Round Generation**: Next round generates when all matches complete
- **Tournament Completion**: Automatic completion when max rounds reached

### 🚧 Planned

- **Casual Mode**: Commander/board game match tracking
- **AI Commentary**: Gemini-generated match roasts
- **Prize Wall**: Ticket-based prize shop
- **Ledger**: Shared expense tracking
- **Mobile Navigation**: Bottom bar navigation
- **Admin Tools**: Score correction interface

See `.dev-docs/IMPLEMENTATION_PLAN.md` for the full roadmap.

## 🎮 How It Works

### Tournament Flow

1. **Create Tournament**: Select players, format (draft/sealed), and number of rounds
2. **Round 1**: Random pairings generated automatically
3. **Match Reporting**: Players report results via simple tap interface
4. **Next Round**: When all matches complete, next round generates automatically using Swiss pairings
5. **Completion**: Tournament completes when max rounds reached

### Authentication

- No passwords or email verification
- Users select their name from a grid of players
- Selection stored in `proxycon_user_id` cookie
- Middleware redirects to `/login` if no cookie present

## 🗄️ Database Schema

### Core Tables

- **`players`**: Player profiles (name, nickname, avatar, wins, tickets)
- **`tournaments`**: Tournament metadata (name, format, status, max_rounds)
- **`matches`**: Individual matches (tournament_id, round_number, game_type)
- **`match_participants`**: Match results (player_id, result, deck_archetype)
- **`prize_wall`**: Prize shop items (name, cost, stock, image_url)
- **`ledger`**: Expense tracking (payer_id, amount, description)

See `.dev-docs/SUPABASE_SETUP.md` for detailed schema and migration scripts.

## 🔧 Development Guidelines

### Critical Rules

1. **Next.js 16 Async Cookies**: Always use `await cookies()` in server components
   ```typescript
   const cookieStore = await cookies(); // ✅ Correct
   const cookieStore = cookies(); // ❌ Wrong
   ```

2. **Tournament Pairings**: Use `Swiss` class, not `pair()` function
   ```typescript
   import { Swiss } from 'tournament-pairings';
   const pairings = new Swiss(standings); // ✅ Correct
   ```

3. **Redirect Error Handling**: Re-throw redirect errors, don't catch as failures
   ```typescript
   if (digest?.startsWith('NEXT_REDIRECT')) {
     throw error; // Re-throw, don't catch
   }
   ```

4. **Round Completion**: Check ALL participants have results before generating next round

See `.dev-docs/TOURNAMENT_RULES.md` for complete development rules.

### Code Style

- **Server Components**: Default to Server Components for data fetching
- **Client Components**: Use `'use client'` only when needed (interactivity, hooks)
- **Error Handling**: Wrap server actions in try/catch, return `{ success, message }`
- **Styling**: Use Tailwind classes, Shadcn components for UI

## 📚 Documentation

Comprehensive documentation is available in the `.dev-docs/` directory:

- **PROJECT_SUMMARY.md**: Complete project specification
- **TOURNAMENT_STRUCTURE.md**: Tournament system architecture
- **TOURNAMENT_RULES.md**: Development rules and patterns
- **SUPABASE_SETUP.md**: Database setup and authentication patterns
- **PROXYCON_ROADMAP.md**: Feature roadmap and implementation plan
- **features/**: Individual feature specifications

## 🐛 Troubleshooting

### Common Issues

**Session not persisting**
- Verify `proxy.ts` exists (not deprecated `middleware.ts`)
- Check that `await supabase.auth.getUser()` is in middleware
- Ensure cookies are being set in response

**"Cannot use await at top level"**
- Add `'use client'` directive to Client Components
- Use Server Components for async data fetching

**Tournament rounds not generating**
- Verify all matches in round have ALL participants with results
- Check `max_rounds` is set and not exceeded
- Ensure `revalidatePath()` is called before redirect

See `.dev-docs/SUPABASE_SETUP.md` and `.dev-docs/TOURNAMENT_STRUCTURE.md` for detailed troubleshooting.

## 🚢 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

Ensure all environment variables are set in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`

### Supabase Configuration

- Enable Row Level Security (RLS) on all tables
- Configure RLS policies for your use case
- Set up proper CORS if needed

## 📝 License

This project is private and intended for personal use.

## 👥 Credits

Built for the ProxyCon 2025 weekend tournament. Designed for maximum fun and minimum friction.

---

**Status**: Active Development  
**Version**: 0.1.0  
**Last Updated**: 2025
