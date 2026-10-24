# ProxyCon screen guidelines

24 October 2026. Companion to [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md). These are design targets for each destination. Product behavior follows [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md).

**Current review tracker:** [UI_PAGE_AUDIT.md](UI_PAGE_AUDIT.md) (pass records, screenshots, remaining gaps).  
**Baseline implementation checks:** [UI_IMPLEMENTATION_VERIFICATION.md](UI_IMPLEMENTATION_VERIFICATION.md).

## Screen-by-screen guidance

| Screen | Preserve | Standardize or improve |
| --- | --- | --- |
| Pick a player | Direct name choice, no required account; existing profiles | Neutral readable name rows with mana identity. Avoid a long wall of orange buttons. Make Add a name and Use house screen easy to find; keep Switch player explicit. Manrope task title. |
| Home / events | Current games, atmospheric event cards, readable dates | Fraunces destination heading even when live games exist; Fraunces featured event names. Clear live/setup/history order. Shared shell and event state language. House entry must not imply it needs a personal profile. |
| Event / Play | Own match slip, nearby event records, room destination | On phones, table/opponent/state/result action first. Both simultaneous games visible, tournament first. Orange/dark-text primary action. Reduce stacked competing frames and badges. |
| Tournament detail | Personal match, pairings/results, event context | Personal action before room promotion on phone. Promote Finish when places are ready; places never auto-lock. Reuse clock/standings/result components. |
| Room | Large clock, substantial report controls, pairings beside standings | Compact top navigation with neutral current-page selection. Scope to one selected tournament. Keep eight-row standings readable at laptop sizes; no personal sidebar or default left rail. Show open tables and pause/elapsed states clearly. |
| Tournament setup / seats | Clockwise seats; draft seat distinct from play table | Compact task title. Joined/unseated/assigned states with explicit labels. Readiness near the next action. Randomize explains Fill empty vs Reshuffle. No decorative hero competing with seat assignment. |
| Create tournament | Direct title, rounds and optional prizes | Create above optional details. Consistent selection controls, required/optional labels, 16px fields. Follow product format and lock rules. |
| Start a game | Short task flow, player selection, optional details | One coherent format-selection mechanism. Explain why Start is unavailable. Decks and day overrides stay optional. |
| Report tournament result | Required +/− game-win counters for both players | Shared reporter on phone and room; counters always visible, winner/draw derived from score, no winner-choice buttons or optional-score disclosure. Reject 0–0; one outcome preview before save. Compact “Games won” legend; no permanent tutorials. |
| Quick-game result | Pod winner, optional commanders, replay continuity | Accurate pod/team/draw wording. Do not require finishing order. Missing optional decks do not overwhelm the saved result. Return to event after save according to product flow. |
| Correction / Finish | Existing result, standings, optional prize text | Current versus proposed result when dirty, prefilled scores. Finish is podium-first; resolve ties only when needed. Early finish stays secondary. |
| Event statistics | Commander artwork, event-only records, streaks, head-to-head | Separate game categories; denominator and sample size visible. No-results state rather than ranking everyone at 0/0. Omit empty setup tournaments and players with no results in the selected filter. |
| Event players | Simple list and invite access | Names with mana symbols; no ambiguous presence dots. Distinguish a profile link from a selectable participant row. Quiet intro. |
| Playgroup directory | Search, identity, profile/deck access | Dense rows/cards for roughly twelve people. Respect signed-in directory access; not a public global ranking. |
| Player profile | Play name, player colors, real commander artwork | Consolidate identity; shared deck nameplates. Quiet link to events rather than a promotional feature panel. |
| Deckbox / deck dialog | Recognizable commander collection | Consistent artwork crops, solid nameplates, mana identity and view/edit/delete hierarchy. Direct New deck title. Quiet missing-art treatment. |
| Profile / appearance settings | Play-name continuity and clear form | Player colors and Appearance are separate. Compact Manrope title; avoid duplicate identity headers. |
| Create event | Short form and dates | Direct title without duplicate introductions. Shared labels and action hierarchy. |
| Event tools / invites | QR/code, participant management, corrections | Compact task page. Room is a quiet utility link, not an ember feature panel. Tournament corrections use tournament score mode. Code/QR must remain legible. |
| Login / account screens | Existing-account access and direct name-list route | On phones put the form before large story panels. Correct theme for fields, password controls, errors and external sign-in buttons. |
| Admin / onboarding / join | Existing access boundaries and identity continuity | Compact utility styling. Clear expired/invalid link and denied-access states. Never imply a picked name gains administration. |

## Reusable state requirements

Each affected page must handle initial loading, empty data, long names, missing optional art/decks, pending submission, validation failure, network failure, saved confirmation and stale/conflicting updates where relevant. These states use the same semantic colors and control vocabulary as the normal screen.

For tournament views also inspect setup, pairings posted, started, paused, time elapsed, bye, dropped player, all results received, finished, correction and needs-finishing-again states. Preserve the product's round locks and correction rules. Places lock only on Finish.

## Enhancement priorities (after Ember Folio audit)

1. ~~Returning-player phone hierarchy on Events, Event, and Room (live table before discovery).~~ Done 24 Oct 2026 — see UI_PAGE_AUDIT evidence.
2. Full room/tournament live-state coverage (posted, paused, bye, seating, completed).
3. Hosted invite origin (`PROXYCON_HOUSE_URL`) and QR correctness.
4. Form-first login on phone; light-theme spot-checks; thinner Stats payload as follow-ups.

Do not treat historical reviews ([UX_DESIGN_REVIEW.md](UX_DESIGN_REVIEW.md), [UX_IMPLEMENTATION_PLAN.md](UX_IMPLEMENTATION_PLAN.md)) as open bug lists without verifying current code.
