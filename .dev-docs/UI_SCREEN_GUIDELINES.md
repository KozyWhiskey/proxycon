# ProxyCon screen guidelines

23 October 2026. Companion to [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md). These are design targets and expert observations, not a claim that every theme, viewport and interaction has been validated. Product behavior follows [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md).

## Screen-by-screen guidance

| Screen | Preserve | Standardize or improve |
| --- | --- | --- |
| Pick a player | Direct name choice, no required account; existing profiles | Neutral readable name rows with mana identity. Avoid a long wall of orange buttons. Make Add a name and Use house screen easy to find; keep Switch player explicit. |
| Home / events | Current games, atmospheric event cards, readable dates | Fraunces destination heading even when live games exist; Fraunces featured event names. Clear live/setup/history order. Shared shell and event state language. House entry must not imply it needs a personal profile. |
| Event / Play | Own match slip, nearby event records, room destination | On phones, table/opponent/state/result action first. Both simultaneous games visible, tournament first. Orange/dark-text primary action. Reduce stacked competing frames and badges. |
| Tournament detail | Personal match, pairings/results, event context | Personal action before room promotion on phone. Reuse clock/standings/result components. Secondary shared tools remain reachable without changing permissions. |
| Room | Large clock, substantial report controls, pairings beside standings | Compact top navigation with neutral current-page selection. Scope to one selected tournament. Keep eight-row standings readable at laptop sizes; no personal sidebar or default left rail. Show open tables and pause/elapsed states clearly. |
| Tournament setup / seats | Clockwise seats; draft seat distinct from play table | Compact task title. Joined/unseated/assigned states with explicit labels. Readiness near the next action. Randomize explains Fill empty vs Reshuffle. No decorative hero competing with seat assignment. |
| Create tournament | Direct title, rounds and optional prizes | Consistent selection controls, required/optional labels, 16px fields, readable hints. Follow product format and lock rules. |
| Start a game | Short task flow, player selection, optional details | One coherent format-selection mechanism rather than duplicate shortcuts and dropdowns. Explain why Start is unavailable. Decks and day overrides stay optional. |
| Report tournament result | Required +/− game-win counters for both players | Shared reporter on phone and room; counters always visible, winner/draw derived from score, no winner-choice buttons or optional-score disclosure. Reject 0–0; review score before save. Preserve values on error. No repeated identity panels. |
| Quick-game result | Pod winner, optional commanders, replay continuity | Accurate pod/team/draw wording. Do not require finishing order. Missing optional decks do not overwhelm the saved result. Return to event after save according to product flow. |
| Correction / Finish | Existing result, standings, optional prize text | Current versus proposed result, prefilled scores and clear downstream explanation. Review full order and resolve remaining ties. Promote Finish when appropriate; distinguish early finish. |
| Event statistics | Commander artwork, event-only records, streaks, head-to-head | Separate game categories; denominator and sample size visible. No-results state rather than ranking everyone at 0/0. Plain readable charts and table data; no invented career statistics. |
| Event players | Simple list and invite access | Names with mana symbols; no ambiguous presence dots. Distinguish a profile link from a selectable participant row. |
| Playgroup directory | Search, identity, profile/deck access | Compact rows or appropriately sized cards for roughly twelve people. Avoid sparse oversize cards. Respect signed-in directory access; not a public global ranking. |
| Player profile | Play name, player colors, real commander artwork | Consolidate identity; shared deck nameplates and metadata. Long commander names and partners wrap. Keep event-specific stats visibly scoped. |
| Deckbox / deck dialog | Recognizable commander collection | Consistent artwork crops, solid nameplates, mana identity and view/edit/delete hierarchy. Direct New deck title and optional partner field. Quiet missing-art treatment. |
| Profile / appearance settings | Play-name continuity and clear form | Player colors and Appearance are separate concepts. Compact title; consistent field spacing and helper contrast. Avoid repeated Switch player controls. |
| Create event | Short form and dates | Direct title without duplicate introductions. Shared labels, optional hints, fields and action hierarchy. |
| Event tools / invites | QR/code, participant management, corrections | Consistent shell and theme; avoid nested long scrolling lists. Keep correction discovery clear. Code/QR must remain legible; label copy success and failure. |
| Login / account screens | Existing-account access and direct name-list route | On phones put the form before large artwork panels. Avoid repeated logos/navigation. Correct theme for fields, password controls, errors and external sign-in buttons. |
| Admin / onboarding / join | Existing access boundaries and identity continuity | Apply the same compact utility styling. Clear expired/invalid link and denied-access states. Never imply a picked name gains administration. |

## Reusable state requirements

Each affected page must handle initial loading, empty data, long names, missing optional art/decks, pending submission, validation failure, network failure, saved confirmation and stale/conflicting updates where relevant. These states use the same semantic colors and control vocabulary as the normal screen.

For tournament views also inspect setup, pairings posted, started, paused, time elapsed, bye, dropped player, all results received, finished, correction and needs-finishing-again states. Preserve the product's round locks and correction rules.

## Implementation review

The approved direction has now been applied to the shared runtime theme, controls, navigation and affected screens. See [implementation verification](UI_IMPLEMENTATION_VERIFICATION.md) for current checks, screenshots and remaining coverage limits. The section below preserves the earlier approval baseline; it is not the latest implementation status.

## Audit status at design approval

Live review sampled phone and laptop in both themes across the main destinations. Statistics, start-game setup, event tools, directory, create event, login, match reporting and completed quick games were inspected in both themes/device categories. Other screens had partial coverage. The following still need explicit validation during implementation:

- Home/events: complete light/phone coverage; player selection: light desktop.
- Room: light phone and additional clock/report states; active tournament detail: phone.
- Event players: dark and desktop variants; tournament setup/seats: phone and expanded settings.
- Profile: light phone; deckbox/dialog: dark phone; settled dark desktop checks for profile settings and tournament creation.
- Result reporter: light selected state and real pending/error recovery. Expanded correction/finish flows and concurrency require disposable test data.
- Anonymous login chrome, administration permissions, onboarding and valid/expired invite/join flows remain partially or wholly unreviewed.
- No every-route, every-state accessibility certification or playgroup usability study has been completed. Do not present the design approval as one.

Previously observed priorities include the near-white result label on pale peach in light mode (approximately 1.08:1), inconsistent button emphasis, small utility labels, empty-format rankings at 0/0, identity dots resembling live status, and mobile login artwork preceding fields. Check current code before claiming these remain unfixed; they are review observations, not permanent bug assertions.

## Suggested implementation order

1. Map approved semantic tokens into the existing theme layer; fix known contrast problems.
2. Standardize navigation, action/selection/input states, typography and spacing in shared components.
3. Apply player-phone and room hierarchy, keeping result behavior intact.
4. Apply deck/artwork, statistics, profile and utility screen rules.
5. Validate affected pages, themes and states; record screenshots and remaining gaps.

This sequence guided the implementation. Future changes must follow the approved system and repeat the relevant visual and functional checks.
