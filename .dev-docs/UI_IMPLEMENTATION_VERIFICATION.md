# UI implementation verification

23 October 2026, updated after owner review of typography and tournament score entry. Implementation of [the approved UI design system](UI_DESIGN_SYSTEM.md). Product behavior remains governed by PROJECT_SUMMARY.md.

## Applied system

- Exact Ember Folio light/dark semantic colors mapped into the existing runtime theme and Tailwind roles. Orange actions use dark text; links and status colors have separate roles. No second theme stylesheet is imported.
- Locally hosted Fraunces, Manrope and IBM Plex Mono, including their OFL licenses. Display type is reserved for destinations; forms and settings use direct compact titles.
- Shared opaque panels, readable fields, focus states, disabled states, dialogs, checkboxes, tooltips and button variants. Neutral rounded-rectangle navigation replaces the personal sidebar and decorative active treatments.
- Five-mana destination divider; player and deck color identity uses existing mana SVGs in WUBRG order. Commander artwork remains visible with solid nameplates.
- Phone player action hierarchy, large room clock and result controls, side-by-side laptop pairings/standings, tablet header spacing and form-first phone login.
- Tournament results require always-visible +/− game-win counters and derive the outcome from the score. The save action rejects missing/invalid tournament scores and 0–0. Quick-game outcome selection remains available. Statistics use a real no-results state for empty categories. Standings calculations, access boundaries and pairing rules remain unchanged.

## Automated checks

| Check | Result |
| --- | --- |
| TypeScript, tsc --noEmit | Pass |
| ESLint on changed TypeScript/TSX plus new mana component | Pass: zero errors; five existing warnings in deck-form and deck-list-item |
| Production Next.js webpack build, PROXYCON_DIST_DIR=.next-verify | Pass, including type check and all generated routes |
| scripts/ux-flows.test.mjs | Pass |
| scripts/guest-accounts.test.mjs | Pass using in-memory PGlite |
| scripts/weekend-rules.test.ts | Pass |
| git diff --check | Pass |

The build required a retry outside the filesystem sandbox after Windows rejected creation of a generated directory. The successful production build was then used for final browser checks. Existing baseline-browser-mapping staleness warnings remain; dependencies were not upgraded as part of this visual change.

## Browser review

Reviewed the running app using existing Beta House Weekend data. Tests changed only local player/house, appearance and room-focus preferences. No results, decks, profiles, seats, events or tournament state were saved or deleted.

| Surface / flow | Coverage and observations |
| --- | --- |
| Player event / Play | Light and dark at 390px; own table, opponent and result action appear in the first view. At 320px no page overflow and result action remains visible. |
| Room | Light and dark laptop at 1366 × 768, normal and focus mode. Four pairings and all eight standings rows fit in focus mode. Normal shell can scroll vertically. Large report controls retained; elapsed time uses warning color. |
| Tournament result page and room dialog | Light and dark checks; required counters visible without a disclosure, no winner-choice buttons. 0–0 cannot save; 2–0 and 2–1 preview the higher-scoring winner and positive equal scores preview a draw. Phone buttons are 44 × 44px with no page overflow. Closed without submission. |
| Statistics | Desktop and phone; category filtering and empty Team games state verified. Empty category does not rank everyone at 0/0. |
| Deckbox / editor | Phone dark, tablet light; real artwork, mana identity, new/edit dialog, persistent artwork controls and field layout reviewed. |
| Profile / player identity | Phone light and dark profile settings; neutral name choices, mana labels and directory/profile layout checked. No settings saved. |
| Start game / creation / utility routes | Phone routes for start game, tournament creation, event creation, event tools, directory, player profile, tournament setup, active tournament match and completed quick match reviewed for layout. No global horizontal overflow in sampled 390px routes. |
| Login | Phone light; form precedes artwork, fields use 16px text. Email field appears in first view. |
| Navigation / appearance | Light, Dark and System options retained. Simple selected navigation; desktop/tablet/phone hierarchy checked. Appearance is separate from Player colors. Keyboard focus visible on appearance control. |

A generic artwork-shade rule initially concealed deck art during testing; it was corrected and real commander art was rechecked. Tablet navigation initially wrapped labels awkwardly; its navigation now receives a separate row between 768px and 1023px.

## Saved visual evidence

These are screenshots of the implemented production build, not concept renderings. Names/results come from the existing test event.

| View | Light | Dark |
| --- | --- | --- |
| Player phone, 390 × 844 | [Light](ux-screenshots/ember-phone-light.jpg) | [Dark](ux-screenshots/ember-phone-dark.jpg) |
| Room normal, 1366 × 768 | [Light](ux-screenshots/ember-room-light.jpg) | [Dark](ux-screenshots/ember-room-dark.jpg) |
| Room focus, 1366 × 768 | [Light](ux-screenshots/ember-room-focus-light.jpg) | [Dark](ux-screenshots/ember-room-focus-dark.jpg) |

Additional evidence: [tablet deckbox](ux-screenshots/ember-deckbox-tablet-light.jpg), [required score counters — light](ux-screenshots/ember-score-counters-light.jpg), [required score counters — dark](ux-screenshots/ember-score-counters-dark.jpg), [room counters on phone](ux-screenshots/ember-room-counters-phone-dark.jpg). The earlier winner-selection screenshot is superseded.

## Coverage limits

This is a shared visual-system implementation with sampled route and state review, not a claim of every-route/every-state accessibility certification. Real pending/error recovery, concurrent corrections and finish flows were not exercised against live data. Valid/expired invitations, onboarding, anonymous authentication and every administration permission variant still need dedicated end-to-end coverage with disposable accounts/data. No live data mutations were used to manufacture visual states.

For future UI changes, read UI_DESIGN_SYSTEM.md and UI_SCREEN_GUIDELINES.md first, use existing semantic tokens/shared components, and repeat the checks relevant to the changed screens in both themes.

## Owner-review corrections

- Events previously changed its heading to Manrope when live games existed. It now retains the same Fraunces destination treatment as My decks, including featured event names. Setup/settings and controls retain their deliberate Manrope role.
- Fixed the Events result action's cascade so its orange fill uses the approved dark text on desktop as well as phone.
- Replaced tournament winner-choice buttons and the optional score disclosure with required counters in the shared reporter. Both the match page and room dialog inherit this behavior. The server action uses the same score validity check, so old clients cannot bypass the requirement. Existing scoreless historical results are preserved; a correction requires entering scores. Automatic byes remain automatic.
- Updated PROJECT_SUMMARY.md, UI_DESIGN_SYSTEM.md, UI_SCREEN_GUIDELINES.md and the saved interactive visual reference to document these decisions.
- Re-ran production build, TypeScript, targeted lint (zero errors/warnings), UX flow tests including required-score cases, weekend rules and guest-account regressions. No live results were submitted.
- On a 390 × 844 phone the returning-player result action ends around y=390, still in the first view. Required counter buttons measure 44px in both dimensions.

Corrected Events screenshots: [light](ux-screenshots/ember-events-light-corrected.jpg), [dark](ux-screenshots/ember-events-dark-corrected.jpg), [dark phone](ux-screenshots/ember-events-phone-dark-corrected.jpg).

The local development app initially served stale compiled CSS after restart. Its resolved `.next` generated directory was verified inside the repository, cleared and rebuilt. Final localhost:3000 checks confirmed Fraunces for both the Events destination and featured event names, and #21170F text on the result action.

## Controlled-depth and copy refinement

The owner requested warmth and tactile controls back after the earlier flattening. UI_DESIGN_SYSTEM.md v1.1 records the approved refinement: warm shading on the round stage and room destination, shallow shared action bevels, and opaque raised popouts. Removed the tournament counter tutorials and repeated score paragraphs while preserving score requirements, errors and correction consequences. Removed obsolete deck-popup overrides and ensured the room clock controls meet the 44px target.

See [the page audit prompt, tracker and targeted evidence](UI_PAGE_AUDIT.md) for checks and remaining page-by-page work. This refinement does not mark every route/state as audited.
