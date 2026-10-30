# October 29 user-review implementation

Scope: implement the suggestions in [the user-facing QA review](QA_USER_REVIEW_2026-10-29.md), preserving the existing weekend rules and visual direction. This is an implementation follow-up, not a claim that every acceptance item in the original full-release matrix has been certified.

## Finding disposition

| Finding | Implementation | Verification |
|---|---|---|
| F01 | The final action receives the order shown in tied-place review; only unresolved tie groups can move. A final fixes the first two places, independently of Swiss points. After a final, review controls concern the remaining unresolved places. | **Pass:** real disposable eight-player draft, reordered four-way tie, Michael/Craig final, explicit Finish. Action regression also covers invalid orders, open rounds, membership, duplicate final and confirmed placing. |
| F02 | Original mismatch claim **retracted**: Beloved Companion is a different card from Ever Faithful. Added selected-card/printing preview, separate Notes and stale-search protection; retained valid card data. | **Pass:** browser fixture selects a named card, retains Notes/manual colors, ignores a delayed result after a new name is typed. This verifies selection behavior, not the external card catalog. |
| F03 | Outcome-first summaries order the score to match the named winner. Missing scores remain explicitly missing. | **Pass:** domain regressions plus real Room outcomes and final result; no stored scores rewritten. |
| F04 | Invitation context is a quiet line; name buttons wrap, with one column below 360px. | **Pass:** long-name/invitation browser fixtures at 320/390, both themes, no page overflow. |
| F05 | Dates stack on phones; name/date validation is inline. Event name is controlled so React form resets cannot erase it after a failed validation. | **Pass:** browser empty-name and reversed-date errors, retained entry, narrow layout. |
| F06 | Dedicated tournament match header always includes its tournament name, including a history return. | **Pass:** real filtered history → final match; tournament name and Final remain visible, with an anchored return to the filtered history row. |
| F07 | Explicit viewed-round headings, live return, Final history link, Final in progress state, completed Result recorded badges. First-round Room omits “Previous round results.” Completed round history says Results. | **Pass:** Room first-round fixture; real optional final and finished tournament observed. **Not verified:** every previous-round/final deep-link combination. |
| F08 | Finish action is in the Room mast and its review precedes table cards; completed Swiss clock is hidden. | **Pass:** real last-result → Review places and finish, focusable review anchor; clock absent. |
| F09 | Reset explicitly says it starts a new countdown, including from paused state. | Implemented. Existing countdown rules unchanged. **Not verified:** a fresh paused-reset interaction after wording change. |
| F10 | Shared pagination groups a heading with the first complete record; unused per-player formats disappear; aligned format/count rows and restrained notebook headings. | **Pass:** boundary/long-name domain tests and browser PNG/PDF generation. The two printed pages were rendered with Poppler and visually inspected: clear record columns, intact player blocks and footer/page numbers. |
| F11 | Stats uses compact format/day/player selects and visible four-section phone navigation. Head-to-head uses readable parallel format columns. History has search plus collapsible filters and active chips. | **Pass:** populated QA event head-to-head at390 and automated fixture with both encounter formats; no page overflow. **Not verified:** every history-filter combination after restructuring. |
| F12 | Removed separate count-only library panel; quiet count sits beside Create deck. | Implemented. **Not verified:** first existing deck's phone viewport after this change. |
| F13 | Photo/manual entry have separate actions. Manual controls precede the deck board, keep their own open state, and remain open when lands are added. Empty boards no longer repeat empty category sections. | **Pass:** empty manual browser fixture, typed card name +17 Forests, retained query/open controls, failed autosave retains edits. |
| F14 | Shared visible/accessibility state distinguishes draft persistence from confirmation. Current confirmed memory disables duplicate Confirm and offers View confirmation with focus return target. | **Pass:** confirmed browser fixture, disabled duplicate confirmation and focused confirmation section; deck-save regressions. |
| F15 | Read-only Card details and editable owner Notes are separate. Selecting a card does not overwrite Notes. | **Pass:** browser selection and Notes persistence; no existing notes migrated/deleted. |
| F16 | Recovery, expired-link and invalid-invite destinations use shared compact task typography, spacing, surfaces and touch targets. | Implemented. **Not verified:** fresh screenshots of every utility state after styling changes; credentials/email were not exercised. |
| F17 | Multi-select/Select all assembly, progress and retained remaining selection on failure; completed picker collapses. No zero-player round recommendation or false seats-ready message. | **Pass:** real Select all8 → Add selected8 → eight joined, collapsed assembled picker; real zero-player Room inspected. |
| F18 | Tournament detail and personal Room shortcut use the shared table-number-plus-label formatter. | Implemented; formatter already serves personal assignments. **Not verified:** renamed table in every destination after this change. |
| F19 | Saved casual outcome/date and replay precede compact participant/deck rows; missing decks stay quiet. | **Pass:** real four-player completed Commander result at390: winner/date and replay precede compact participant rows; no page overflow. The repeated header roster was removed. |
| F20 | Human-readable agenda day headings, nonredundant supplies note and explicit Edit plans mode. Existing revision/deletion boundaries retained. | Implemented; existing agenda database regressions pass. **Not verified:** a fresh editing/reordering browser traversal after presentation changes. |

All findings have implementation dispositions; a “Not verified” entry is not a pass. F02 is a corrected review error, not an application bug fix.

## Additional enhancement disposition

1. **Done / Next open table:** implemented with dialog save context. Real Room testing moved through all four open tables and preserved the selected tournament. The final card now remains stable after save; real final correction retained Done. Radix close returns focus to the report trigger.
2. **Return to live tournament:** implemented beside a viewed previous round, with explicit viewed-round heading. Completed history uses Results wording.
3. **Table number/location in personal assignment:** shared formatter is used; no new physical-location data model or future-round label carryover.
4. **Compact filters:** history filter disclosure and active chips; compact Stats selects with URL state retained. Result return URLs include the originating row anchor.
5. **Warmer recap:** notebook heading and restrained orange accent, compact format/count record columns, existing confirmed winners/prizes and Commander highlights. Optional artwork is not required or newly fetched; text export remains resilient when art is absent. Full records remain in recap/history, with past results collapsed on Play.
6. **Export labels:** Choose PNG pages reveals Download page N. Download work has explicit pending/error state. System-font PNG rendering does not wait on unrelated page-font requests; controls wait for client initialization to avoid ignored early taps.
7. **Short empty current-game state:** compact invitation panel, existing lower collapsed Results retained.

## Evidence and reproduction

Evidence folder: [qa/2026-10-29/implemented](qa/2026-10-29/implemented). It contains both-theme 320/390 name-picker captures, event validation, reviewed tie, Commander fallback/Notes, 1366×768 Room in both themes, head-to-head at390, failed autosave/manual entry, confirmed memory, recap preview, numbered PNG and browser print PDF. [checks.json](qa/2026-10-29/implemented/checks.json) records the automated browser assertions and runtime errors.

Real write-path fixture: event `5592b3bc-dfd7-4281-be5c-1226142177f8`, tournament **QA — Review fixes verification**, `35d99811-001f-4f06-a97a-9c1ad0ae720f`. Added the existing eight event players, filled seats, posted and separately started one round. Swiss winners Craig/Chris/Sid/Michael tied. Moved Michael first; final `181fc821-dd53-45da-86dd-98ade9925c30` paired Michael/Craig. Saved2–1, then exercised correction3–1 with Done retained. Explicit Finish confirmed Michael/Craig/Chris/Sid/Rohan/Chris P/Miko/Scott. Swiss points remain3 for the four Swiss winners and0 for the others. No real playgroup results or identity ownership changed. Fixture remains for reproduction.

## Validation commands

- `npm run test:weekend-review`: domain/recap/context regressions and executable server-action fixture, including final placement.
- `npm run test:weekend-rules`, `npm run test:weekend-usability`, `npm run test:ux`: existing rules, retry/agenda database and score/access regressions.
- Guest accounts, event preferences/house isolation, deck-memory save/API/database and deck-builder regressions passed. The existing deck-memory browser suite also passed photo review, manual entry, retry after reload, both themes and responsive zoom.
- `scripts/deck-builder-browser.test.mjs` passed both themes, image stacks,320/390/768/1366 layouts, category editing and allocations. Evidence remains under `.next-verify/deck-builder-screenshots`.
- `npm run test:weekend-review-browser`: requires development preview with `WEEKEND_UX_PREVIEW=true` at3002, and `DECK_MEMORY_PREVIEW=true` at3012. Set `WEEKEND_PREVIEW_URL` and `DECK_PREVIEW_URL` to override. Uses disposable rendering fixtures and mocked failing memory writes; it never creates real event data. On this host set `PLAYWRIGHT_BROWSERS_PATH=C:/Users/ckosz/AppData/Local/ms-playwright`. Run outside Windows sandbox when localhost is blocked.
- Changed-file ESLint and TypeScript passed. Full source lint (excluding the temporary generated `.next-memory-qa` directory) remains **Fail: 37 errors /52 warnings in unchanged code**, chiefly legacy surfaces, existing explicit-any types and effect warnings. Log: `.next-verify/qa-source-lint.log`. The unfiltered initial run also scanned generated preview bundles and is not a source-lint count. Production webpack build passed after rerunning outside the Windows sandbox's static-generation EPERM error.

The development browser initially encountered stale/malformed development chunks and unready controls while files were changing. Reloading restored the real Room. The final automated run must stand on its own; earlier incomplete runs are not accepted as passes.

Physical-phone keyboard/safe-area behavior, mobile Safari, native200% browser zoom, complete screen-reader/contrast audit, full authentication recovery, deployment behavior and the original exhaustive concurrency matrix remain **Not verified**. This follow-up needs no schema migration and does not expand the Limited-memory pilot.
