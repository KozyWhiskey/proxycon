# Performance implementation and release validation

Implemented 30 October 2026, together with the owner's expressly approved existing UX changes. The [original review](PERFORMANCE_REVIEW_2026-10-30.md) contains the baseline, bottlenecks and implementation rationale. This report records the delivered changes and their measured value.

## Delivered changes and value

| Change | Reason and value | Behavior safeguards |
| --- | --- | --- |
| Request-scoped player/session reuse | Avoid repeated identity RPCs within one render; actions reuse their verified operator | No persistent cross-user cache; fresh resolver remains available; transport failures retain the previous snapshot |
| Lightweight event shell and focused board loaders | Room, tournament, match, chooser and tools retrieve the data they use; independent reads run concurrently | Canonical standings and outcome functions retained; complete history remains available where required |
| Stable paginated reads and bounded participant batches | Avoid Supabase row caps silently truncating larger events | More than 1,000 rows and complete round/seat equivalence tested; failed reads discard partial data |
| One retrieval after result navigation | Remove the obsolete match-page refresh before returning to the tournament | Atomic result RPC, revision checks, mandatory scores and 0–0 rejection retained |
| Lightweight refresh probe and acknowledged snapshots | Remove the full-board preflight; advance freshness only when the actual page succeeds | Prior content and input state survive failure; retry, offline recovery, editing pause and overlapping-request control tested |
| Immediate navigation feedback | Show a small pending indicator on the existing navigation links | Navigation shape, sizes and design system retained; reduced motion supported |
| Stream optional agenda and card artwork | Optional external work no longer holds up primary content | Existing saved artwork appears immediately; individual artwork can resolve separately |
| Public asset proxy exclusions | Avoid Auth work for public mana symbols and fonts | Private routes and session checks retain their protections |
| Optional history pagination RPC | Move filtering/counting/page retrieval to Postgres for growing history | SECURITY INVOKER, existing RLS, exact filter/order/day/count equivalence and missing-function fallback |
| Opt-in correlated timing | Make slow functions and backend calls measurable in future investigations | Logs omit query parameters, bodies, headers, identities and credentials; disabled by default |

No standings algorithm, pairing rule or atomic result-write implementation was replaced. Existing UX changes were included at the owner's request and validated alongside the performance work.

## Measured local production-build results

Same hosted Supabase backend, twelve disposable players, 36 games / 120 participant rows for screen timing; 236 games / 920 participant rows for result saves. Headless Chromium, 390×844 viewport, desktop CPU, no artificial CPU/network throttling. Four direct loads per screen; twenty navigation samples per path compared with four baseline samples. Timing ends at visible main content plus two animation frames; it is not LCP or full hydration. These are observational comparisons, not controlled statistical guarantees.

| Workflow | Baseline median | Implemented median | Reduction |
| --- | ---: | ---: | ---: |
| Navigate to Play | 709 ms | 437 ms | 38% |
| Navigate to Room | 510 ms | 386 ms | 24% |
| Navigate to Stats | 554 ms | 421 ms | 24% |
| Navigate to Players | 566 ms | 396 ms | 30% |
| Open tournament directly | 886 ms | 448 ms | 49% |
| Open Agenda directly | 752 ms | 369 ms | 51% |
| Open event tools directly | 751 ms | 380 ms | 49% |
| Correct a tournament result and return | 2,603 ms | 1,318 ms | 49% |

All eighteen direct-load medians and four navigation paths are in [implemented measurements](qa/2026-10-30/performance/implemented/measurements.json). Profile remained approximately unchanged (406→404 ms); Playgroup and player detail improved modestly. The 400 ms navigation target was not achieved on every path. The remaining delay is chiefly authenticated network/database work, rather than standings CPU. Further work should use deployed traces before adding broader caching.

Final application source fingerprint: `8685823029db04d6c59bdc9896768960bf5f8e88bf63e2e5bf607773daad8590`. Production build completed with the same fingerprint before and after. The optional SQL function was not installed in the hosted database during these local measurements, so History uses the compatibility fallback. Earlier loading-boundary experiments regressed reveal timing and were removed; those measurements are excluded.

## Deployed verification

Vercel served application commit `f1813cdb3c5d077e67bf8782817a4fe6c4106504`, verified through revision metadata. Another eighteen screens × four loads and four navigation paths × twenty repetitions completed without failed page loads or captured browser runtime errors. Five result writes succeeded; the marked fixture was removed. [Sanitized deployed results](qa/2026-10-30/performance/implemented/deployed-measurements.json).

| Deployed workflow | Baseline median | Released median | Reduction |
| --- | ---: | ---: | ---: |
| Navigate to Play | 797 ms | 520 ms | 35% |
| Navigate to Room | 588 ms | 477 ms | 19% |
| Navigate to Stats | 639 ms | 520 ms | 19% |
| Navigate to Players | 655 ms | 544 ms | 17% |
| Correct result and return | 1,710 ms | 1,344 ms | 21% |

Initial result entry was approximately unchanged (1,809→1,805 ms, one sample each). Direct Agenda and Recap loads improved43% and35%. Direct Players was unchanged. Playgroup (+6%), Profile (+1%), player detail (+10%) and History (+10%) did not show improvement in this small deployed sample. Cold starts and network variation remain visible; the old deployed baseline did not expose a source revision and this release also includes approved UX changes. All raw ranges and limitations are retained in the aggregate report.

The History result identified avoidable rollout overhead: the missing RPC probe was followed by the full compatibility load. A follow-up now selects the existing loader directly unless `WEEKEND_HISTORY_PAGINATION=true`; after installing the SQL function, enable that flag to use database pagination. Tests verify no context/RPC preflight when disabled, equivalent fallback when enabled but unavailable, and retained failure semantics. This preserves existing history behavior while deployment access is pending.

## Validation

- TypeScript and production webpack build.
- Focused loader, request identity and history SQL tests, including 83 history filter/page combinations, large datasets, repeatable migration and invoker RLS.
- Existing rules, UX, guest account, preference, deck, catalogue and final-action tests.
- Live Supabase integration: permissions/house isolation, idempotency, stale result rejection, team and Commander results, agenda revisions, preference sync and removed-event fallback; disposable data cleaned.
- Browser fault injection: repeated failed reads preserve content/time, successful retry advances time, offline/reconnect, editing pauses refresh, scores survive, committed save does not refresh the obsolete match page.
- UX browser regression: inline event validation, commander notes/manual edits/search races, tie review, Room reflow, head-to-head, recap PNG/PDF and deck autosave recovery. [Checks and screenshots](qa/2026-10-30/performance/ux-regression/checks.json).
- Light/dark Room screenshots checked at phone and laptop widths; no horizontal overflow. [Browser checks](qa/2026-10-30/performance/implemented/browser-checks.json).

Repository-wide ESLint retains 37 existing errors in legacy/untouched files; changed release files have zero lint errors. No suppression or unrelated legacy rewrite was introduced to conceal those failures.

## Deployment and database follow-through

The app exposes the Vercel commit revision as a metadata tag so deployment verification can target this exact release. Master is the requested release destination. Deployed timings should be recorded separately from local production-build timings.

`scripts/sql/weekend_performance.sql` is additive and repeatable, changes no tables or policies, and is verified in PGlite. Hosted installation is pending authorized dashboard access: a CLI credential was unavailable and automatic approval review rejected browser-session discovery because it could expose unrelated private session metadata. The application uses the existing history loader by default. Apply the function through the approved project SQL editor, verify authenticated history filters/counts and RLS, then enable `WEEKEND_HISTORY_PAGINATION=true` before claiming the database pagination gain.

## Repeatable measurement

Run `npm run test:performance` for deterministic correctness checks. For a timed live benchmark, run `npm run benchmark:performance -- --base-url=http://127.0.0.1:3045 --samples=4 --navigation-samples=20 --allow-live-fixture` against a production build. The harness permits only the pinned local URL or `https://upkeep.vercel.app`, requires explicit fixture authorization, creates marked disposable records, and cleans them in `finally`. Its private session manifest and raw logs remain under ignored `.next-verify/performance/runs/`; publish only sanitized aggregates. Backend credentials are loaded locally and never included in reports.
