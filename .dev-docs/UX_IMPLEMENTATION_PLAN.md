# UX implementation plan

Based on UX_DESIGN_REVIEW.md and PROJECT_SUMMARY.md. Started 22 October 2026.

## Delivery sequence

1. House capabilities: keep player membership separate from event operation; use existing server-side house/admin gates; audit database policies. House never becomes a player or permanent administrator.
2. Player journey: event context throughout tournament pages, one mobile event navigation, direct match anchors, personal games first, live/setup/history ordering, distinct event records, accessible name/house selection.
3. Tournament desk: compact house shell, tournament selector, readiness summary and seating, open tables first, visible reporting, compact clock, state-driven finishing, separate quick-game pages.
4. Results and finishing: select outcome then save, preload corrections and scores, explain pairing consequences, preserve failed drafts, order ties with buttons, preview all places and optional prizes before Finish.
5. Design system: semantic Light/Dark/System themes persisted per browser before first paint, green playmat/card stock/brass palette, restrained serif display typography and framed match slips, consistent controls and accessible focus.
6. Review and verification: independent Expert UX and Design agent reviews source and browser results; address actionable findings, run type/build checks and existing rules/account tests, inspect narrow phone and laptop in both themes.

## Acceptance criteria

- At 390 × 844 a returning event player can identify table, opponent, round state and primary action without scrolling. Simultaneous Commander appears directly below the tournament match.
- House can create/run tournaments and quick matches without a player profile; personal deck/profile writes and account administration remain protected.
- At 1366 × 768 the house room has no personal sidebar; compact round/clock header leaves report actions and standings prominent.
- Finished tournaments do not precede current quick games. A tournament match retains event context and is directly addressable.
- Result selection never saves immediately. Corrections show current outcome and score, and have a distinct Save correction action.
- Finish previews ordered places/prizes and explicitly resolves ties; early finish remains secondary.
- Theme tokens cover main pages, forms, popovers, dialogs, tables, authentication and toast surfaces. Status and player identity never depend on color alone.
- Keyboard access, reduced motion, long names and browser zoom remain usable.

## Verification record

Implemented the six delivery stages locally. The application was not deployed and no tournament, seat, player result or account settings were changed during verification. Browser appearance was restored to System after testing.

### Delivered

- Explicit event capabilities separate membership from house/admin operations. House event controls and server actions no longer require a player; joining/claiming/name edits still do. Event layout/page reads share a request-scoped cache.
- Event-aware phone navigation, identity/screen switching, direct match pages for every tournament round, personal slips/records first, live/setup/history sections, and optional quick-game decks/day.
- Compact house shell and room, tournament state labels, readiness information, setup settings/player tools, deliberate seat randomization, results-first table ordering, clock controls and clear elapsed-time language.
- Outcome selection followed by explicit save, existing result/score prefill, shared preview/save outcome rules, stale-edit checks, preserved dirty drafts, error recovery, and one database statement recording all participant outcomes together.
- Tie-order buttons, final-match-aware place/prize preview, explicit early finish, promoted normal finish, and reset review confirmation when the incoming standings change.
- Semantic themes for all shared surfaces, before-paint preference restoration, cross-tab preference updates, system-theme support, coordinated toasts, touch controls, and the framed-slip/playmat visual identity.

### Independent expert review

A separate Expert UX and Design agent reviewed the implementation in multiple passes, including source and browser checks. Their findings led to fixes for missing correction data, older-round navigation, stale reporter drafts, changing Finish standings, dark sidebar/auth/destructive contrast, overwritten player colors, and persistent More menus. Their final assessment found the visual direction coherent and the player/house hierarchy substantially clearer. The last two requested robustness fixes (stable reporter identity and Finish review reset) were applied.

### Checks

- `npx tsc --noEmit`: passed.
- ESLint across all changed TypeScript/TSX and new application modules: no errors. Existing deck-component warnings remain (unused CardContent and a native image).
- Production Next.js webpack build with `PROXYCON_DIST_DIR=.next-verify`: passed. The default Turbopack build stalled and was stopped; the isolated webpack build completed successfully.
- `npm run test:guest-accounts`: passed the existing database preservation/permissions/claim tests.
- Existing `scripts/weekend-rules.test.ts` with Node type stripping: passed.
- `npm run test:ux`: passed new house/member capability, score outcome, team-result and stale-snapshot tests.
- Browser: house/event/room, setup entry, historical match navigation, correction prefill and disabled-until-edited Save correction; light/dark at 1366 × 768 and phone at 390 × 844. Independent review also inspected the phone layout. Original localhost:3000 server checked and returned HTTP 200.
- Screenshots: `ux-screenshots/house-light.jpg`, `ux-screenshots/house-dark.jpg`, `ux-screenshots/match-phone-dark.jpg`.

### Remaining validation

The proposed task-time targets require actual playgroup testing; they are not measured outcomes. Runtime production database policies and a full write-through tournament lifecycle were not exercised against live data. No SQL migration was introduced by this change. Existing database policy deployment should be checked using a disposable event before release.

Stale edits are rejected when the result has already changed at request time. The participant outcome write is atomic, but the entire result/round-advancement/finish workflow is not one database transaction; fully simultaneous competing writes remain a backend hardening task. A future transaction/RPC should lock the match and tournament together. This implementation does not claim full conflict serialization.
