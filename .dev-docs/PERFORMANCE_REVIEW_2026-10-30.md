# ProxyCon performance measurements and implementation plan

Measured 30 October 2026. This document preserves the original baseline and implementation plan. Delivered changes, validation and before/after measurements are recorded in [the implementation report](PERFORMANCE_IMPLEMENTATION_2026-10-30.md).

**Recommendation:** first remove repeated identity work and redundant post-save retrievals, then fix the duplicate live-refresh retrieval, shorten page-specific data loading, and provide immediate navigation feedback. Result correction is the slowest measured workflow. Keep the current Next.js/Supabase architecture and all product behavior. The measurements do not justify starting with a rendering rewrite, a larger database, or a new realtime system.

## Measurement scope and evidence

- Current working-tree source at commit `41ffca2`, including the owner's existing uncommitted changes, copied into an isolated directory. Next.js 16.0.10 production webpack build, including `proxy.ts`; no development compilation in the accepted baseline.
- Headless Chromium, 390 × 844 mobile viewport, desktop CPU, no network or CPU throttling. Browser and Next.js server ran locally on Windows; database and Auth requests used the configured hosted Supabase backend and ordinary authenticated player permissions through the app.
- Disposable fixture: twelve players, one two-pod draft with a reported first round and open second round, one open Commander game, completed Commander history, 24 decks, a pending Limited memory, and an agenda item. Baseline: 36 matches / 120 participant rows. Growth test: 236 matches / 920 participant rows.
- Eighteen screens × four direct document loads; four navigation transitions × four repetitions. Growth test: seven screens × three document loads and four transitions × three repetitions. Two 23-second idle windows observed the twenty-second refresh. Public asset probes used six samples per path. A separate pure-function microbenchmark used 100 measured repetitions after ten warm-ups.
- After the owner's explicit approval, the deployed site at `https://upkeep.vercel.app` was measured with a fresh disposable fixture: another eighteen screens × four document loads and four transitions × four repetitions, one initial result save, five corrections, six direct refresh API calls, a visible-tab refresh cycle, and six samples per public asset path. The fixture event was verified on the deployed site before testing result writes. Browser/runtime failures were not observed in accepted production samples.
- Four successful result corrections were timed on the expanded disposable fixture. An initial fixture result entry also committed successfully, but its browser response-completion observer stalled; it is excluded from end-to-end action statistics. A subsequent selector mismatch was corrected before the four accepted samples. The accepted timer ends at the visible returned tournament page, rather than waiting indefinitely on a navigation-abandoned response stream.
- Main-content timing ends when the main heading is visible and two animation frames have elapsed. It is not LCP, a full hydration measurement, or a guarantee that every image has loaded. TTFB is the browser navigation timing. Backend spans end at response headers; their durations include network/SDK/framework behavior, not just SQL execution.
- Accepted navigation samples returned HTTP 200, with no captured browser runtime errors. An earlier incomplete instrumentation run that omitted the proxy is excluded.
- Sanitized measurements: [measurements.json](qa/2026-10-30/performance/measurements.json). Raw timing logs, isolated build, and disposable session state remain in ignored `.next-verify/performance/`. No credentials, session cookies, real player names, or result payloads are included in the published measurements.
- Sanitized production measurements: [deployed-measurements.json](qa/2026-10-30/performance/deployed-measurements.json). The original artifact retains the local baseline; the production results are separately labeled.

**Deployment boundary:** both the isolated local production build and the deployed Vercel site were measured. Production browser/API timings are available; production function spans, SQL execution plans, exact deployed source revision/feature flags, controlled Vercel cold starts, database region, real-phone CPU, and house Wi-Fi timings are not. No production release or instrumentation deployment was performed. The earlier external-session approval block was resolved by the owner's explicit confirmation of `upkeep.vercel.app`.

Small screen sample sizes support prioritization, not statistical production latency claims. Observed maxima below are not p95 estimates. The initial Events sample includes first-process/browser initialization and was not a controlled cold-start experiment.

## Screen results

Milliseconds to visible main content. The median uses all four baseline samples, including the first sample. TTFB is the median across the same samples. The full numeric artifact also includes warm-only results.

| Screen | Median visible | Median TTFB | Observed range |
| --- | ---: | ---: | ---: |
| Events chooser | 919 | 847 | 771–2,356 |
| Event Play | 802 | 727 | 604–816 |
| Tournament detail | 886 | 805 | 652–1,060 |
| Event tools | 751 | 686 | 565–952 |
| Agenda | 752 | 687 | 703–780 |
| Event players | 690 | 621 | 506–1,325 |
| History | 662 | 591 | 587–716 |
| Quick-match detail | 639 | 573 | 615–806 |
| Record a finished game | 606 | 542 | 568–652 |
| Recap | 600 | 532 | 517–633 |
| Room | 599 | 521 | 512–1,057 |
| Stats | 591 | 523 | 564–629 |
| Start a game | 589 | 521 | 517–838 |
| My decks | 562 | 497 | 506–706 |
| Tournament match | 555 | 493 | 516–723 |
| Playgroup directory | 493 | 423 | 407–540 |
| Player detail | 437 | 372 | 396–499 |
| Profile settings | 406 | 331 | 329–458 |

In the local build, the substantial TTFB component supports starting with server/data work. This does not carry over directly to production TTFB: Vercel starts the response early and streams the remaining content, as the production measurements below show. Neither experiment establishes that browser JavaScript and images are unimportant on real phones.

| Actual navigation click | Median visible | Observed range |
| --- | ---: | ---: |
| Players → Play | 709 | 675–759 |
| Play → Stats | 554 | 504–693 |
| Stats → Players | 566 | 474–773 |
| Play → Room | 510 | 510–609 |

For the 236-match growth test, median direct loads were Events 1,057 ms, Play 885 ms, Room 640 ms, Tournament 762 ms, Stats 706 ms, History 631 ms, and Recap 593 ms. Some routes slowed, others improved within run-to-run variation. This does not demonstrate a dramatic history-dependent slowdown at this size. It does demonstrate that simple screens still retrieve event-wide history, so reducing scope is worthwhile for latency, traffic, and completeness as the dataset grows.

## Deployed site: measurements and effect on priorities

The production navigation fixture has the same shape as the local baseline: twelve players, 36 games, and 120 participant rows. The production write fixture was expanded to 236 games and 920 participant rows, matching the size used for local correction measurements. Source revisions, build tooling, feature flags, connection reuse, and runtime placement are not proven identical; differences below are not pure measurements of hosting overhead.

| Screen | Local median | Deployed median | Deployed observed range |
| --- | ---: | ---: | ---: |
| Events chooser | 919 ms | 1,154 ms | 940–1,610 ms |
| Event Play | 802 ms | 954 ms | 873–1,360 ms |
| Tournament detail | 886 ms | 782 ms | 629–1,103 ms |
| Tournament match | 555 ms | 801 ms | 655–1,137 ms |
| Room | 599 ms | 747 ms | 660–1,272 ms |
| Quick-match detail | 639 ms | 709 ms | 699–764 ms |
| Start a game | 589 ms | 714 ms | 622–892 ms |
| Record a finished game | 606 ms | 679 ms | 603–868 ms |
| Stats | 591 ms | 708 ms | 657–872 ms |
| Event players | 690 ms | 585 ms | 575–744 ms |
| History | 662 ms | 729 ms | 645–1,064 ms |
| Agenda | 752 ms | 922 ms | 798–1,081 ms |
| Recap | 600 ms | 864 ms | 614–967 ms |
| Event tools | 751 ms | 783 ms | 687–963 ms |
| My decks | 562 ms | 774 ms | 604–967 ms |
| Playgroup directory | 493 ms | 536 ms | 490–664 ms |
| Profile settings | 406 ms | 516 ms | 430–569 ms |
| Player detail | 437 ms | 571 ms | 529–633 ms |

Production click-to-content medians were Play 797 ms, Stats 639 ms, Players 655 ms, and Room 588 ms. The production first-byte medians were only 20–46 ms on the document routes, while the main-content observation took 516–1,154 ms. For example, Event Play had 21 ms median TTFB and 863 ms median response-stream download duration. That stream duration includes server rendering/data waits and delivery; it is not a pure network bandwidth measurement. The benchmark waits for DOMContentLoaded before checking the heading, so it is an observation of available main content by that point, not a trace of the earliest heading paint during streaming. Keep measuring destination content and actionable controls rather than declaring the app fast from TTFB alone.

The operational measurements reinforce the implementation order:

- **Initial result save:** one successful sample, 1,809 ms to the returned tournament. This is a single observation, not a distribution.
- **Result correction:** five successful samples, median 1,710 ms, range 1,494–2,343 ms. The first four samples had a 1,619 ms median; a fifth trace sample was included in the final five-sample statistic. The local four-sample correction median was 2,603 ms. Do not substitute the local 83 ms commit-RPC timing for an unmeasured production RPC span.
- **Foreground post-save traffic:** a trace that explicitly distinguished prefetch headers recorded an action POST to the match page, a non-prefetch RSC GET to that same match page, then a non-prefetch RSC GET to the tournament destination. Their response-header durations were 1,268, 197, and 271 ms. These are header timings, not complete response durations. This directly supports removing the old-page refresh before returning to the tournament. The local three-board-load evidence remains local; production browser requests alone do not prove exactly how many internal loader executions occurred.
- **Refresh API:** six successful direct calls on the expanded fixture took a median 602 ms, with a warm median 562 ms and a 539–1,706 ms observed range. The 36-game visible-tab observation separately saw a 1,584 ms refresh API response before a route refresh. It is still a costly preflight before rendering the actual snapshot; no claim about a cold-start cause is established.
- **Public assets:** warm full-response probes took 155 ms for `/mana/W.svg`, 126 ms for `/mana/U.svg`, and 125 ms for the direct public Manrope file, versus 42 ms for an actual deployed bundled font and 29 ms for the favicon. All accepted probes returned 200 with cache HIT. These sequential native-fetch probes include transport/body time and are not browser critical-path measurements. An exploratory probe using the local build's bundled-font hash returned 404; it was discarded and replaced with the font URL observed in the deployed browser trace.

Vercel response IDs showed routing sequences `cle1 → iad1` for dynamic responses and `cle1` for static responses. Vercel documents that `x-vercel-id` contains the regions a request hit and the function execution region; this does not reveal the Supabase database region or prove that region placement caused the delay. Dynamic document responses reported cache MISS; that is not a recommendation to publicly cache personalized pages. No Server-Timing spans or exact deployed source revision were exposed in the inspected headers. See [Vercel response-header documentation](https://vercel.com/docs/headers/response-headers).

**Decision:** retain the same plan: shared request/context cleanup, post-save navigation cleanup, cheaper refresh preflight, focused loaders, and immediate destination feedback. Production measurements confirm unnecessary foreground refresh work. They do not justify a database upgrade, region migration, transaction rewrite, or framework change. Obtain production server spans and source identity during implementation before assigning exact function-level production savings.

## Functions and calls consuming time

These are **local instrumented-build spans**, not production Vercel function timings. They are inclusive and overlap: do not add `loadEventBoard`, `resolvePlayer`, and their underlying fetch spans together. Fetch p95 values describe this instrumented run only. Counts include framework fetch invocations, some of which were served quickly by framework memoization; they are not asserted to be one distinct physical network request each.

| Function/call | Typical duration | Observed p95 | Interpretation |
| --- | ---: | ---: | --- |
| `loadEventBoard(eventId)` | 455 ms | 730 ms | Largest common data-loader span; six sequential stages including player resolution, with parallel queries inside stages |
| `getCurrentUser()` | 207 ms | 364 ms | Player resolution followed by profile retrieval; invoked independently by shell and some destinations |
| `resolvePlayer()` | 132 ms | 233 ms | Auth lookup followed by `current_player_context` RPC |
| `LimitedMemoryList()` | 131 ms | 180 ms | Fixture used a small memory without an external artwork lookup; not an artwork-cache-miss benchmark |
| Auth `/auth/v1/user` fetch | 64 ms | 132 ms | Frequently repeated in proxy/rendering/prefetch paths |
| `current_player_context` RPC fetch | 64 ms | 126 ms | Small but sequential and repeated |
| `match_participants` fetch | 71 ms | 152 ms | Ordinary endpoint latency, not proof of a slow SQL plan |
| `event_members` fetch | 71 ms | 123 ms | Same distinction between endpoint and SQL latency |
| `matches` fetch | 68 ms | 124 ms | Full event result set requested |
| Additional tournament metadata fetch | Approximately the 62 ms tournament endpoint median | — | Independent query awaited before starting the final query group |

The board loader makes up to nine table requests: event; members/tournaments/matches/prizes in parallel; optional tournament metadata; then roster/match participants/decks in parallel. The existing React `cache()` correctly avoids an extra board load when layout and page request the same event during one render. Preserve that behavior; the main problem is separate requests and overly broad loaders.

Two additional findings are directly measured:

1. **Live refresh duplicates the board.** In the baseline idle window, `/api/weekend-refresh` loaded the board in 532 ms, then `router.refresh()` loaded it again in 528 ms. The board spans were sequential. The observation window contained 52 backend fetch invocations including rendering, identity, agenda, and surrounding prefetch work; that count should not be interpreted as 52 necessary database queries for one refresh. The confirmed optimization is removing the first full-board retrieval while keeping failure handling and successful-snapshot acknowledgement.
2. **Public assets pass through authentication.** Warm direct requests for `/mana/W.svg` and `/mana/U.svg` took 63 and 61 ms, respectively. `/fonts/manrope.woff2` took 64 ms. A bundled `/_next/static/media/...woff2` request took about 1 ms and `/favicon.ico` about 2 ms. The navigation trace includes mana SVG requests. Fonts loaded through `next/font/local` use the already-excluded bundled path; the direct public font probe is an additional matcher case, not evidence that bundled font requests are slow.

The pure-function benchmark measured one `standingsFor()` call plus `matchPlayers()` for every synthetic match: median 0.06 ms at 36 matches, 0.49 ms at 236 matches, and 9.72 ms at 1,000 matches. Its synthetic shape differs from the mixed-game browser fixture. It gives no reason to prioritize replacing standings mathematics ahead of network work.

### Result correction: highest-priority workflow

| Measurement | Median | Observed range |
| --- | ---: | ---: |
| Save correction → returned tournament visible | 2,603 ms | 2,295–3,509 ms |
| Save correction → action response headers | 1,435 ms | 1,141–2,029 ms |
| Save correction → commit RPC response headers | 915 ms | 600–1,117 ms |
| `commit_weekend_result` RPC fetch alone | 83 ms | 64–179 ms |
| Complete board loads during each accepted correction | 3 | 3 in every sample |

Each accepted correction produced three complete board loads before the returned tournament was visible. This is consistent with the action's rendering/invalidation work, the explicit `useAction()` refresh, and the caller's subsequent navigation. Request-correlated tracing should distinguish those paths precisely before removing invalidation. The UI workflow is much slower than the atomic result RPC; replacing the transaction is not the first optimization. Correcting a result is measured here; initial result-entry end-to-end latency, finishing, last-table automatic pairing generation, and quick-game creation still need separate controlled samples in implementation validation.

## Implementation plan, in delivery order

### 1. Retain a reproducible performance baseline

**Change:** turn the isolated measurement procedure into an opt-in benchmark command. Require an explicit base URL, allowed host checks, a disposable fixture marker, and cleanup in `finally`. Keep fixture/session files ignored. Add request-correlated spans for proxy, identity, authorization, page loaders, result commit, and post-save navigation; capture response completion separately from response-header time. Record build/source identity, feature flags, data counts, browser, and throttling with each run.

**Why/value:** prevents changing the wrong layer and makes improvements reviewable. Correlation distinguishes a foreground navigation from background prefetch and remembered-event writes. It also resolves the current inability to isolate SQL execution or Vercel overhead.

**Acceptance:** repeat all eighteen routes and the four click paths; publish only sanitized results. Add direct acknowledgement checks for hydrated counters/dialogs. The deployed fixture pass is now complete; the remaining deployment work is establishing the source revision, collecting server spans, inspecting Supabase region/query plans, and repeating on a real phone. Do not claim a Vercel cold-start or database-index win without evidence.

**Effort:** approximately half a day to harden the harness, plus deployment/device validation time.

### 2. Remove low-risk repeated request work

**Files:** `proxy.ts`, `utils/supabase/middleware.ts`, `lib/player-session.ts`, `lib/get-current-user.ts`, `lib/event-board.ts`, `lib/agenda.ts`, `components/events/agenda-preview.tsx`, and internal action authorization helpers.

**Changes:**

- Exclude known public asset directories (`/mana/`, `/fonts/`, and other verified public-only paths) from the proxy. Keep authentication on application documents, RSC navigation, and action requests. Use an explicit allowlist rather than excluding every pathname containing a dot.
- Request-memoize identity/current-profile reads during an RSC render. Reuse the verified context in dependent loaders. In mutations, pass a freshly resolved context through internal helpers instead of repeatedly calling `session()` / `requireMember()`; do not assume RSC memoization works across independent actions.
- Start the independent optional tournament-metadata query alongside the first board query group. Preserve its existing upgrade/fallback behavior rather than merging optional columns into the required query and breaking pre-migration compatibility.
- Start agenda-preview retrieval independently of the completed board where authorization permits, using the same request-scoped identity. Keep its result/empty/error content unchanged.

**Why/value:** removes measured 60–70 ms waits and unnecessary network calls without altering data semantics. The identity span is about 132 ms; eliminating duplicate resolution has a more credible payoff than optimizing sub-millisecond calculations. Benefits overlap and must not be added as independent savings estimates.

**Acceptance:** no Auth calls for the known public asset probes; at most one RSC player-context resolution per render; no shared cache across users or requests. Verify unbound, picked-name, account, admin, and house sessions; token refresh; player switching; logout; missing-profile fallback; all relevant redirects. Verify mutation identity is fresh after an identity-changing action. Maintain baseline output and all permission boundaries.

**Effort:** roughly one day including identity regression checks.

### 3. Shorten post-save work without weakening correctness

**Files:** `components/weekend/act-button.tsx`, `components/weekend/match-reporter.tsx`, and internal helpers in `app/weekend/actions.ts`.

**Change:** use the action measurements above to isolate commit latency from the refreshed page. Reuse the action's verified context in internal authorization helpers. Give callers an explicit refresh/navigation policy: a reporter returning to a destination must not unconditionally refresh the old page first. Coordinate automatic action rendering/invalidation, explicit refresh, and destination navigation rather than letting all three independently retrieve a board. Preserve successful-save feedback and the return destination. Narrow invalidation only after checking every affected destination. Do not make a result look committed before the existing atomic commit and expected-result checks succeed.

**Why/value:** the local 2.6-second median and three complete board loads, plus production's 1.71-second median and confirmed non-prefetch refresh of the page being left, make this the highest-value user workflow after the shared identity cleanup. The local 83 ms commit RPC is a small portion of the local wait. Removing an unnecessary retrieval and using focused destination loaders offers a better starting point than changing atomic database semantics.

**Acceptance:** visible +/− counters, required score, rejected 0–0, derived outcome, conflict detection/baseline adoption, idempotent quick-game creation, fixed started pairings, automatic next-round posting, finish/re-finish semantics, and separate save/refresh failure feedback all remain intact. Verify updates on another visible browser within the existing freshness cadence. Measure initial result entry, correction, last-table advancement, and correction after Finish. First remove the third full-board retrieval; after the focused-loader work, aim for one necessary destination snapshot and no reload of a page being left. Confirm the request path rather than assuming Next's automatic action rendering can be disabled without consequences.

**Effort:** roughly half to one day if changes remain within context reuse and avoiding redundant navigation; broader transaction changes need a separate review.

### 4. Replace the expensive refresh preflight

**Files:** `components/events/live-refresh.tsx`, `app/api/weekend-refresh/route.ts`, shared snapshot-status support, and live-view data boundaries.

**Preferred implementation:** keep server-rendered route refreshes, but replace the preflight's full board load with a lightweight authenticated availability probe. Reuse its identity within the handler. Add a receipt from the actual successfully rendered page snapshot, using its successful retrieval timestamp, so the status becomes Updated only after the route data has arrived. Keep one refresh in flight until that receipt, failure, or timeout. Preserve the prior displayed snapshot on failed retrieval with a tested error boundary/state mechanism; the preliminary probe alone must never certify that the board refreshed.

**Why/value:** removes one of two measured full-board loads (532 ms in the observed cycle) and nine table requests from the preflight path. It also prevents false freshness claims. A lightweight probe still has a cost; this is not a promise of zero background traffic. A client snapshot provider returning data directly is a later alternative if the server-rendered receipt approach cannot retain the prior view reliably; do not change rendering architecture just to remove this duplication.

**Acceptance:** preserve the twenty-second visible-tab cadence, refresh on return/reconnect, paused refresh while editing, retained drafts, offline/failure message, Retry, and separation between successful result commit and failed board refresh. Each successful cycle has one full board retrieval, not two. A successful probe followed by a failed RSC retrieval must keep the prior timestamp and snapshot. No overlapping refresh after a slow response. No change to tournament generation or result rules.

**Effort:** one to two days because resilience behavior is part of the feature, not optional polish.

### 5. Split navigation data from destination data

**Files:** `app/events/[id]/layout.tsx`, `lib/event-board.ts`, `components/events/events-home.tsx`, event/tournament/match routes, and new small shared data-loader modules.

**Changes:**

- Introduce an event-shell loader for the event name, selected identity, and exact capabilities needed by navigation. The layout must not await all matches, seats, decks, and standings inputs.
- Introduce a compact event-chooser/current-assignment loader. Preserve current-play priority, all simultaneous assignments, saved-event preference precedence, and house behavior. Avoid loading a complete board per active joined event just to show slips.
- Add focused loaders for Room/tournament detail and single-match pages. Return the complete selected tournament history needed for Swiss standings and result correction; include the other tournament summaries used by the Room switcher. Scope quick-match detail to its game, players, and relevant decks.
- Let Agenda and event tools load their own event context, roster, and plan/management data. Let Players load current assignments and exactly the weekend results the existing screen displays.
- Preserve event-wide calculations for Stats and Recap. Do not replace all-data calculations with a recent-games slice. Keep one canonical calculation path for records, confirmed places, exports, and personal status.

**Why/value:** navigation waits on less data and fewer dependent queries. The current common board span is about 455 ms, even for destinations that need little of it. This also prevents unrelated historical games or deck galleries from slowing a Room result-entry task.

**Acceptance:** compare normalized old/new loader outputs for the twelve-player fixture across setup, posted, started, waiting, dropped, completed, and corrected states. Compare both house and personal views. Room switching and simultaneous tournament/Commander assignments must remain complete. Retain RLS/auth checks and the optional-metadata compatibility branch. Introduce focused loaders one destination at a time, with reversible commits.

**Effort:** two to three days, depending on how many destinations share a clean loader boundary.

### 6. Add immediate navigation feedback and stream secondary content

**Files:** route `loading.tsx` files, event/tournament layouts, tournament detail, deck galleries, and supporting preview sections.

**Changes:** add loading boundaries below the slim shared layout and around destination data. Stream agenda preview and optional Limited-memory galleries separately. Keep primary table/opponent/round/result actions ahead of secondary content. Retain current typography, artwork, themes, depth, navigation shapes, and Room focus. Use saved artwork immediately; isolate catalogue/cache misses from tournament operation. Audit actual prefetch requests before enabling additional prefetching.

**Why/value:** the click should respond immediately during the remaining backend wait. Current click medians are about 510–709 ms, and no route loading files exist. Streaming is especially useful for optional artwork, but a cold artwork/Scryfall path was not timed in this run, so its total benefit remains unquantified.

**Acceptance:** loading feedback appears within 100 ms on the benchmark machine while the destination loads; controls remain interruptible; no input/draft resets or layout shifts that hide the player's task. Verify light/dark themes and phone/Room layouts against the approved design documents. Measure visible-content time separately from feedback time so a skeleton is not reported as a faster completed page.

**Effort:** approximately half to one day after the shell/data split.

### 7. Make history pagination real and then verify SQL plans

**Files:** `app/events/[id]/history/page.tsx`, focused history loader or authenticated RPC, shared history predicates, and only evidence-supported SQL migrations.

**Changes:** move the existing search, date/player/format/tournament filtering, stable newest-first ordering, and twenty-row load-more behavior into a server/database query. Preserve all supported result types, including finals and byes, completed-result definitions, return links, and deterministic timestamp/ID ordering. Preserve option lists and result counts without loading every result. Fetch rows/participants in bounded pages. Inspect actual indexes and plans before adding indexes for event/time ordering and join/filter columns.

**Why/value:** the current page retrieves the complete board and then slices the rendered rows. Paging only the visible HTML does not reduce database work. The growth test does not prove slow SQL, so index changes are conditional on plans, not presumed fixes. Ensure full-event statistics independently retrieve all required records beyond any PostgREST row limit.

**Acceptance:** old/new history result order and filters agree, including search normalization, equal timestamps, missing legacy scores, byes/finals, team games, and direct correction/return links. Test beyond 1,000 participant rows. A later page must not duplicate or skip results under the supported pagination contract. If no slow scan appears in query plans, do not add speculative indexes.

**Effort:** about one day plus time needed to obtain production query-plan access.

## Release gates and practical targets

Deliver the phases as small reviewable commits, remeasure after each, and stop adding optimizations when the acceptance targets are met. Estimates above overlap; they are planning ranges, not a delivery commitment.

- Same-machine local target for the main four event navigation paths: median visible content at or below 400 ms and at least 25% improvement from the accepted local baseline. Local result-correction target: median at or below 1.5 seconds, with no redundant third board retrieval. On the deployed site, target at least 25% improvement on the four click paths and a correction median at or below 1.2 seconds from its 1.71-second baseline. Treat these as goals to validate, not predicted outcomes. Collect at least twenty samples per path in implementation validation; the current small samples are not suitable p95 baselines. Measure usable destination content, not only first bytes or a skeleton.
- Immediate feedback below 100 ms; no extra full board during a refresh; no proxy Auth calls for explicitly public assets; no repeated identity RPC within one RSC render. These request-count gates are less sensitive to network noise than timing alone.
- Page output/capability equivalence and all product invariants take precedence over timing. No cross-user caching, no broader database access, no changes to records/standings/prizes/identity semantics, and no weakening of score/concurrency rules.
- Run the existing identity, event-preference, weekend rules, usability, live-refresh, result-conflict, and relevant browser tests. Reuse meaningful existing checks; add targeted cases for context isolation, failed refresh after a successful probe, loader equivalence, large-history completeness, and post-save navigation. Validate writes only on disposable fixtures.
- Repeat on an actual phone and the deployed implementation; compare regional/network timings before recommending hosting changes. Production-origin permission was granted and the baseline deployed pass is complete. Verify fixture cleanup. Roll back individual loader/UI-boundary changes if correctness or freshness gates regress.

Defer a new realtime system, broad persistent caching, a database upgrade, wholesale client-rendering migration, and standings-algorithm changes until measurements show they are needed. Keep current functionality and the approved visual direction throughout.

## Completion and cleanup

Both marked fixture events, each with twelve fixture profiles, their decks/results/participants/memory/agenda, and one temporary Auth user, were removed successfully after their respective runs. The isolated local profiling server was stopped after the local run; no production server or deployment was changed. No performance fixes were applied to application source; the retained deliverables are this review and separately labeled local/production measurements. Existing user changes were preserved.
