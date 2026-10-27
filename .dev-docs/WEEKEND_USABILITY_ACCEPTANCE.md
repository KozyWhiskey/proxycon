# Weekend usability acceptance evidence

Updated 27 October 2026. **Release gate: open.** Application changes are local; the three approved additive Supabase migrations are applied and selected authenticated integration/browser checks pass. Pass below means the specific criterion has local behavioral, visual, or database evidence; it is not production certification. Not verified never means Pass.

## Evidence and reproducible checks

- `npm run test:weekend-usability`: safe paths, derived personal states, Chicago dates, completed-only results, Commander shared encounters, export wrapping; PGlite atomic creation/retries/rollback, score snapshots, agenda revisions, reordering and permissions.
- `npm run test:weekend-rules`, `npm run test:ux`, `npm run test:guest-accounts`: existing tournament, outcome and identity regressions pass.
- `npm run test:deck-memories`: repeatable base/category/confirmation migrations, draft versus confirmed revisions, sharing privacy, incomplete confirmation, stale writes and owner boundaries pass. Save API, showcase and builder suites also pass.
- TypeScript passes. Isolated production build passes. Changed weekend workflow lint passes. Full-repository lint fails with 37 existing errors in legacy tournament/guild/admin and unrelated deck/Scryfall/import files; no generated output is linted.
- Browser fixture: `npm run dev:weekend-preview`, open `http://127.0.0.1:3002/dev/weekend?screen=event`. Screens: event, room, quick, stats, agenda, recap; states setup/posted/playing/waiting/finished; count 6/8/12. Dev-only, gated by the helper environment; fixture rendering is not proof of deployed writes.
- Browser responsive checks: event/room/quick/stats/recap at 320/390/768/1024/1366 widths had no page overflow. Phone/laptop screenshots in light and dark; eight-player focus Room fits all four result actions and eight standings rows. Record mode was exercised with four selected players and a winner, optional decks/order closed. No fixture save submitted to the real backend.
- Screenshots: `.next-verify/weekend-screenshots/`; export evidence: `recap-export-page-01.png` (actual browser download). These local generated artifacts are ignored by Git.
- Not performed: physical phone, 200% native browser zoom, full assistive-technology/contrast audit, live email/Google/recovery and the complete deployed workflow matrix. Selected authenticated write journeys and aggregate migration preservation are verified below.

## Criterion ledger

### BASE

Scenario/evidence: Visual fixtures and existing domain suites; complete device/accessibility matrix still required.

| ID | Criterion | Status |
|---|---|---|
| BASE-01 | Visual direction | Pass |
| BASE-02 | Typography | Pass |
| BASE-03 | Navigation | Pass |
| BASE-04 | Tournament rules | Not verified |
| BASE-05 | Identity and permissions | Not verified |
| BASE-06 | Phone priorities | Pass |
| BASE-07 | Optional data | Pass |
| BASE-08 | Truthful feedback | Not verified |
| BASE-09 | Responsive and keyboard matrix | Not verified |
| BASE-10 | Draft preservation | Not verified |

### ENTRY

Scenario/evidence: Fresh browser → invite → name/account/house → event; provider callbacks and reset email require disposable live fixtures.

| ID | Criterion | Status |
|---|---|---|
| ENTRY-01 | Invite identity screen | Not verified |
| ENTRY-02 | Continuation across identity/auth | Not verified |
| ENTRY-03 | Refresh and duplicate membership | Not verified |
| ENTRY-04 | Actual player context | Not verified |
| ENTRY-05 | House invite arrival | Not verified |
| ENTRY-06 | Invalid invite recovery | Not verified |
| ENTRY-07 | Name selection and identity switching | Not verified |
| ENTRY-08 | Phone login and password toggle | Not verified |
| ENTRY-09 | Provider recovery journey | Not verified |
| ENTRY-10 | Internal continuations only | Pass |

### HOME

Scenario/evidence: Home fixtures for upcoming/past/closed and real identities; domain date and personal-state assertions.

| ID | Criterion | Status |
|---|---|---|
| HOME-01 | Assignment context | Not verified |
| HOME-02 | Simultaneous games | Not verified |
| HOME-03 | Compact event cards | Not verified |
| HOME-04 | Date-based event states | Pass |
| HOME-05 | Chicago inclusive dates | Pass |
| HOME-06 | Past dates with open games | Not verified |
| HOME-07 | House home wording | Not verified |
| HOME-08 | Visible Events destination | Pass |

### PLAY

Scenario/evidence: Preview event states plus domain personalAssignments assertions; verify next-round server refresh in live fixture.

| ID | Criterion | Status |
|---|---|---|
| PLAY-01 | Consistent derived states | Not verified |
| PLAY-02 | Next assignment refresh | Not verified |
| PLAY-03 | Parallel Commander visibility | Not verified |
| PLAY-04 | Secondary explicit records | Pass |
| PLAY-05 | Contextual tools | Pass |
| PLAY-06 | Recent result context | Pass |
| PLAY-07 | Room callout | Pass |
| PLAY-08 | Exact assignment destination | Pass |

### QUICK

Scenario/evidence: Phone record-form interaction and atomic RPC database tests; exercise team/replay/save round trip after migration.

| ID | Criterion | Status |
|---|---|---|
| QUICK-01 | Direct record mode | Pass |
| QUICK-02 | Explicit winner and Save | Pass |
| QUICK-03 | Minimal Commander requirements | Pass |
| QUICK-04 | Commander family and labels | Pass |
| QUICK-05 | Stored identifiers and other formats | Not verified |
| QUICK-06 | Selected group and bottom action | Not verified |
| QUICK-07 | Keyboard/safe-area placement | Not verified |
| QUICK-08 | Invalid group repair | Not verified |
| QUICK-09 | Chicago day default and notice | Not verified |
| QUICK-10 | Save receipt and replay | Not verified |
| QUICK-11 | Retry-safe creation | Pass |

### POD

Scenario/evidence: Position-validation database tests; exercise live report/replay with missing deck and swapped player.

| ID | Criterion | Status |
|---|---|---|
| POD-01 | Optional finishing order | Pass |
| POD-02 | Partial unique positions | Pass |
| POD-03 | Result-led completed game | Not verified |
| POD-04 | Quiet missing decks | Pass |
| POD-05 | Replay entry points | Not verified |
| POD-06 | Replay retained/reset values | Not verified |
| POD-07 | Replay participant/deck swaps | Not verified |
| POD-08 | Unavailable replay data repair | Not verified |
| POD-09 | Replay abandonment | Not verified |

### SETUP

Scenario/evidence: Room/setup preview plus unchanged weekend-rules tests; run 6/8/12-player, sealed, odd and two-pod writes.

| ID | Criterion | Status |
|---|---|---|
| SETUP-01 | Setup creation fields | Not verified |
| SETUP-02 | Setup summary | Not verified |
| SETUP-03 | Explicit round recommendation | Not verified |
| SETUP-04 | Visible assembly | Not verified |
| SETUP-05 | Readiness summary | Not verified |
| SETUP-06 | Post prerequisites and no auto start | Not verified |
| SETUP-07 | Clockwise pods | Pass |
| SETUP-08 | You seat label | Pass |
| SETUP-09 | Top-edge orientation | Not verified |
| SETUP-10 | Seat/table distinction | Not verified |
| SETUP-11 | Map/List equivalence | Pass |
| SETUP-12 | Contained phone map | Pass |
| SETUP-13 | Fill versus reshuffle rules | Pass |
| SETUP-14 | Hide premature sections | Pass |
| SETUP-15 | Sealed and odd/two-pod rules | Not verified |

### TOUR

Scenario/evidence: Open live and completed tournament fixtures, select historical round/final, report through dialog.

| ID | Criterion | Status |
|---|---|---|
| TOUR-01 | Destination title | Not verified |
| TOUR-02 | Personal priority | Not verified |
| TOUR-03 | Compact pairings/report dialog | Pass |
| TOUR-04 | No duplicate full reporter | Not verified |
| TOUR-05 | Ascending tables | Pass |
| TOUR-06 | Readable standings | Not verified |
| TOUR-07 | Round/final selection | Not verified |
| TOUR-08 | Secondary memories | Not verified |

### ROOM

Scenario/evidence: Room preview at 1366×768 and responsive width checks; exercise real clock/selector actions after migration.

| ID | Criterion | Status |
|---|---|---|
| ROOM-01 | Focus removes personal panel | Pass |
| ROOM-02 | Eight-player laptop fit | Pass |
| ROOM-03 | Twelve-player natural growth | Pass |
| ROOM-04 | Selector state grouping | Not verified |
| ROOM-05 | Explicit selection preservation | Not verified |
| ROOM-06 | Prominent numbered tables | Pass |
| ROOM-07 | Rename beside heading | Pass |
| ROOM-08 | Match-scoped labels | Not verified |
| ROOM-09 | Time called state | Not verified |
| ROOM-10 | Explicit clock reset | Not verified |
| ROOM-11 | Distinct tournament phases | Not verified |
| ROOM-12 | Themes and stacking | Not verified |
| ROOM-13 | No quick games | Pass |

### SCORE

Scenario/evidence: UX outcome tests, named-counter dialog and atomic expected-snapshot tests; verify cross-view correction journey.

| ID | Criterion | Status |
|---|---|---|
| SCORE-01 | Named required counters | Pass |
| SCORE-02 | Match context | Not verified |
| SCORE-03 | One preview and Save | Pass |
| SCORE-04 | Correction preload/change detection | Not verified |
| SCORE-05 | Relevant consequences | Not verified |
| SCORE-06 | Concurrent result review | Pass |
| SCORE-07 | Shared saved outcome | Not verified |
| SCORE-08 | Missing historical scores | Pass |
| SCORE-09 | Automatic byes | Pass |

### FINISH

Scenario/evidence: Existing rules suite and finished fixture; run optional-final → Finish → correction → Finish in disposable event.

| ID | Criterion | Status |
|---|---|---|
| FINISH-01 | Explicit Finish | Not verified |
| FINISH-02 | Results-led order | Not verified |
| FINISH-03 | Confirmed versus Swiss places | Not verified |
| FINISH-04 | Final explanation | Not verified |
| FINISH-05 | Readable outcome summaries | Not verified |
| FINISH-06 | Optional prizes and dropped places | Not verified |
| FINISH-07 | Existing tie rules | Pass |
| FINISH-08 | Correction clears places | Not verified |
| FINISH-09 | Secondary early Finish | Not verified |

### STATS

Scenario/evidence: Domain encounter tests and stats fixtures/URL interaction; verify complete filters/Back/streak matrix.

| ID | Criterion | Status |
|---|---|---|
| STATS-01 | Defaults and event scope | Not verified |
| STATS-02 | Consistent filtered denominators | Not verified |
| STATS-03 | All recorded dates | Not verified |
| STATS-04 | Filtered streak meaning | Not verified |
| STATS-05 | Whole-event tournament pane | Not verified |
| STATS-06 | Two-format head to head | Not verified |
| STATS-07 | Current-player defaults/deep links | Not verified |
| STATS-08 | Wins ranking and equal ordering | Pass |
| STATS-09 | Shared win scale | Pass |
| STATS-10 | Tied leaders | Pass |
| STATS-11 | Useful empty state | Pass |
| STATS-12 | Commander encounter rule | Pass |
| STATS-13 | Shared/neither context | Pass |
| STATS-14 | Actual tournament encounters | Pass |
| STATS-15 | Explicit standings labels/zero | Pass |
| STATS-16 | Player details retained | Not verified |

### PEOPLE

Scenario/evidence: Read-only profile/directory inspection plus guest ownership suite; verify event-return links with real identities.

| ID | Criterion | Status |
|---|---|---|
| PEOPLE-01 | Event roster status | Not verified |
| PEOPLE-02 | No availability inference | Pass |
| PEOPLE-03 | Results/profile links | Not verified |
| PEOPLE-04 | Compact searchable directory | Not verified |
| PEOPLE-05 | Event context continuity | Not verified |
| PEOPLE-06 | Artwork-led profile decks | Not verified |
| PEOPLE-07 | Play identity settings | Not verified |
| PEOPLE-08 | Optional avatar URL | Not verified |
| PEOPLE-09 | Appearance and identity separation | Not verified |
| PEOPLE-10 | Owner-only edits | Not verified |

### DECK

Scenario/evidence: Existing deck-builder regressions; inspect actual gallery/create/edit in both themes with long names.

| ID | Criterion | Status |
|---|---|---|
| DECK-01 | Artwork gallery | Not verified |
| DECK-02 | Initial phone deck visibility | Not verified |
| DECK-03 | Commander-first identity | Not verified |
| DECK-04 | Optional partner/colors/notes | Not verified |
| DECK-05 | No redundant new format field | Not verified |
| DECK-06 | Manual override/partner/colorless | Not verified |
| DECK-07 | Manual/art failure fallback | Not verified |
| DECK-08 | Existing non-Commander compatibility | Not verified |

### MEMORY

Scenario/evidence: Full PGlite memory suite with repeatable confirmation migration and API save validation; device/autosave failures still required.

| ID | Criterion | Status |
|---|---|---|
| MEMORY-01 | Distinct persistence states | Not verified |
| MEMORY-02 | Focus confirm area | Not verified |
| MEMORY-03 | Incomplete/unverified acknowledgements | Pass |
| MEMORY-04 | Autosave versus confirmation | Pass |
| MEMORY-05 | Resume/failure draft preservation | Not verified |
| MEMORY-06 | Desktop/phone presentations | Not verified |
| MEMORY-07 | Existing review behavior | Not verified |
| MEMORY-08 | Private owner-only sharing | Pass |
| MEMORY-09 | Pilot boundary | Pass |

### TOOLS

Scenario/evidence: Open history with >20 mixed result fixtures, filter/search/open/Back; verify invite QR on house origin.

| ID | Criterion | Status |
|---|---|---|
| TOOLS-01 | Invite controls first | Not verified |
| TOOLS-02 | House origin and QR agreement | Not verified |
| TOOLS-03 | Playgroup assembly groups | Not verified |
| TOOLS-04 | All completed history kinds | Not verified |
| TOOLS-05 | Searchable filters | Not verified |
| TOOLS-06 | Stable twenty-row pagination/return | Not verified |
| TOOLS-07 | Canonical contextual rows | Not verified |
| TOOLS-08 | Round/history links | Not verified |
| TOOLS-09 | Compact inline event form | Not verified |
| TOOLS-10 | Utility routes and denied states | Not verified |
| TOOLS-11 | Legacy compatibility | Pass |

### AGENDA

Scenario/evidence: Phone form preview and PGlite revision/reorder/delete/house tests; verify deployed permissions and competing UI edits.

| ID | Criterion | Status |
|---|---|---|
| AGENDA-01 | Contextual summary/destination | Not verified |
| AGENDA-02 | Minimal creation | Pass |
| AGENDA-03 | Day groups and reordering | Pass |
| AGENDA-04 | Literal freeform time | Pass |
| AGENDA-05 | Descriptive supplies | Not verified |
| AGENDA-06 | Independent linked tournament | Pass |
| AGENDA-07 | Existing manager permissions | Pass |
| AGENDA-08 | Concurrent revision review | Pass |
| AGENDA-09 | Plan-only confirmed removal | Pass |
| AGENDA-10 | Date changes preserve plans | Not verified |
| AGENDA-11 | Empty/pass-time states | Not verified |
| AGENDA-12 | Current event model | Pass |

### RECAP

Scenario/evidence: Recap preview, actual PNG download and wrapping tests; print/PDF and corrected-data integration still required.

| ID | Criterion | Status |
|---|---|---|
| RECAP-01 | Event summary content | Not verified |
| RECAP-02 | Shared calculations/places | Pass |
| RECAP-03 | So-far/pending labels | Not verified |
| RECAP-04 | Separate formats | Pass |
| RECAP-05 | Private data excluded | Pass |
| RECAP-06 | Print/PDF layout | Not verified |
| RECAP-07 | Numbered PNG pagination | Pass |
| RECAP-08 | Artwork fallback | Pass |
| RECAP-09 | Timestamp/freshness warning | Not verified |
| RECAP-10 | Future corrected exports | Not verified |
| RECAP-11 | No public sharing | Pass |

### LIVE

Scenario/evidence: Interrupt successful/failed refresh and saves while online/offline with dialogs open; verify screen-reader behavior.

| ID | Criterion | Status |
|---|---|---|
| LIVE-01 | Cadence/visibility | Not verified |
| LIVE-02 | Successful retrieval timestamp | Not verified |
| LIVE-03 | Failed refresh/retry | Not verified |
| LIVE-04 | Offline/reconnect | Not verified |
| LIVE-05 | Editing pause and resume | Not verified |
| LIVE-06 | Save versus board feedback | Not verified |
| LIVE-07 | Snapshot preserved on errors | Not verified |
| LIVE-08 | Quiet screen-reader clock/status | Not verified |

## Release blockers

1. Run the full disposable-fixture journey after the applied additive SQL; the approved PostgREST functions are now deployed; the complete fixture journey is still required.
2. Complete all Not verified rows, including the identity matrix, real phone/keyboard, stale-refresh failure injection, correction regeneration before/after start, optional final/Finish and complete recap export comparison.
3. Resolve or explicitly accept the existing repository lint baseline before the plan’s all-green release gate.
4. Record final deployed light/dark screenshots in the page audit; fixture evidence does not cover every changed route or state.

The original remote-credential block was resolved by explicit owner authorization. Migrations were applied through the existing authenticated dashboard. A full private-data backup export was rejected and was replaced with aggregate preservation checks; no rejected export was performed.

## Approved follow-up: remembered event and active/past segregation

- EVENT-MEMORY-01 — Pass: two real authenticated sessions bound to one test profile shared its selected event; another identity did not inherit it.
- EVENT-MEMORY-02 — Pass: house preference was device-scoped and did not overwrite the player preference.
- EVENT-MEMORY-03 — Pass: a browser fresh / entry resumed event A, then B after selection; Events remained an explicit chooser.
- EVENT-MEMORY-04 — Pass: deleting the remembered fixture event returned the browser to the chooser.
- CURRENT-PLAY-01 — Pass: mixed fixture rendered current table/opponent/action before other content; prior eighth place was not visible before opening Results.
- CURRENT-PLAY-02 — Pass: completed-only fixture did not render a personal assignment panel; results remained collapsed lower down.
- CURRENT-PLAY-03 — Pass: waiting for an ongoing round remained current; completed/dropped entries were classified as historical by domain tests.
- CURRENT-PLAY-04 — Pass: mixed/completed-only reflow at320/390/768/1024/1366 had no page overflow; light/dark 390/1366 captures exist.

Live evidence: .next-verify/weekend-live-integration-results.json, weekend-preservation-{before,after}.txt, event-ordering-reflow.json and weekend-screenshots/active-before-past-{390,1366}-{light,dark}.jpg. Additional screenshots cover expanded/collapsed results, remembered house return and migration success. The full original release gate remains open.
