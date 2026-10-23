# Final UX and lifecycle verification

22 October 2026. The charcoal-and-orange design, commander artwork, house callout, and laptop room layout remain intact.

## Review and test method

A separate critical UX designer reviewed the phone home/event/setup and laptop room, then reviewed the fixes. Three QA agents exercised disposable tournament data in event `5592b3bc-dfd7-4281-be5c-1226142177f8` (`QA Disposable — Final verification 2026-10-22`). Existing event results, profiles, and decks were not edited.

Draft and cube/quick-game passes used the running application UI. Sealed and edge-case integration tests executed the actual server action module against Supabase with a normal anonymous house session and deployed policies. Only request-bound session resolution and Next.js cache invalidation were substituted in that integration harness; the authenticated context was checked with `current_player_context`. No service key was used.

## Findings fixed and retested

- Tournament results again support explicit winner/draw selection without a score. Optional scores still derive the outcome; changing a conflicting winner clears the old score.
- Phone match slips give the table label more width while keeping the result action at least 44px high.
- Swiss history preserves both sides of matches against dropped players. Dropped opponents' records still contribute to opponent strength, while only active players receive new pairings.
- Fill empty seats recalculates pod boundaries after the chart grows. Six players split into three and three without moving claimed seat numbers.
- Early Finish removes unstarted future pairings, retaining every started match and result, so those future tables cannot produce live-match slips.
- Play again resets the quick-game form when its source match changes, restoring that match's format, players, teams, and saved decks.

## Verified scenarios

| Pass | Coverage |
| --- | --- |
| Six-player set draft, three rounds | Manual claim, fill preserving claims, reshuffle, across-pod pairings, registration lock, clock pause/resume/reset, scoreless win/draw, 2–1 score, corrections before and after next-round start, Swiss progression, Finish, reload persistence |
| Five-player sealed, three rounds | No draft seats, random pairings, pre-start swap, clear/repost, automatic bye, field lock, clock controls, scoreless outcomes, drop during a started match, opponent win, historical results preserved, future exclusion, ties, prizes, Finish, post-Finish correction and re-Finish |
| Early Finish | Complete round one, automatically post round two, finish early, verify future pairings removed and all played results retained |
| Two-pod cube, two rounds and final | Six players in two odd pods, within-pod round one, two byes, whole-field Swiss round two, top-two final, tie review, Finish and reload persistence |
| Pod fill regression | Six initially unseated players receive seats 1–6 and a balanced 3+3 split through the actual fill action |
| Commander quick games | Four-player winner, correction to a different winner, Play again restoring players/commanders, replayed draw and persisted event results |
| Two-Headed Giant | Two teams of two, shared winner/loss outcomes, replayed format and team assignments, separate team statistics |
| Event statistics | Commander and team counts stay separate, draws end current streaks, head-to-head separates Commander and tournament matches |

Screenshots in `ux-screenshots/` record the phone event/setup, completed draft/cube/sealed, and team result/statistics. The live integration script is opt-in: `node scripts/qa-sealed-integration.mjs <disposable-event-id>`; it rejects events without the `QA Disposable` name prefix.

Cleanup is a separate opt-in utility: `node scripts/qa-cleanup.mjs <disposable-event-id>` prints a manifest without deleting event data; `--delete` is required for removal. It verifies QA event/tournament names and captured parent IDs, rejects cross-event links or uploaded photos, checks deletion counts, and never deletes player profiles, saved decks, or auth users.

## Automated checks

- TypeScript: `npx tsc --noEmit`.
- ESLint on changed TypeScript/TSX and integration utilities: no errors; existing unused-variable warnings in the rules module/test remain.
- UX tests: `npm run test:ux`.
- Guest database tests: `npm run test:guest-accounts`.
- Rules tests, including dropped-opponent Swiss regression: `node --experimental-strip-types scripts/weekend-rules.test.ts`.
- Production build: `PROXYCON_DIST_DIR=.next-verify npx next build --webpack` (PowerShell environment syntax used locally).

These passes verify serialized user workflows and result persistence. They are not a concurrency/load test; the multi-step tournament lifecycle is not a single database transaction.
