# ProxyCon

A phone-first companion for a Magic: The Gathering weekend with friends. One event holds the people. Inside it, quick games and tournaments run at the same time. The app tracks what is being played, what each person is playing, who they play next, and the stats for that event.

The product end state is [`.dev-docs/PROJECT_SUMMARY.md`](.dev-docs/PROJECT_SUMMARY.md).

## What it is for

- Create an event such as ProxyCon 2026, or a one-night draft. People join it on their own phones.
- Play a Commander pod as a quick match. Record the winner, or a draw.
- Run a set draft, chaos draft, cube, or sealed. Seats, rounds, scores, and 1st through 3rd.
- Leave a tournament in setup before it starts. More than one game can be live.
- See the room: live games, pairings, running match points, and a dashboard anyone in the event can correct.

Guilds, a public player directory, badges, and a career record are not the product. Deck photos and budget-deck links come later.

## Tech

- Next.js 16 (App Router), TypeScript
- Tailwind CSS and shadcn/ui
- Supabase Auth and Postgres
- Scryfall for card data

## Run it

1. Install dependencies with `npm install`.
2. Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Start the app with `npm run dev`.
4. Open http://localhost:3000. Use the network address on the dev-server log when a phone in the house needs to reach it.

## Docs

- [Product spec](.dev-docs/PROJECT_SUMMARY.md)
- Schema SQL is in `scripts/sql/`
