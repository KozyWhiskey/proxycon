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

Application source fingerprint for the full local benchmark: `8685823029db04d6c59bdc9896768960bf5f8e88bf63e2e5bf607773daad8590`. Production build completed with the same fingerprint before and after. The optional SQL function was not installed in the hosted database during these local measurements, so History uses the compatibility fallback. Earlier loading-boundary experiments regressed reveal timing and were removed; those measurements are excluded.

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

The History result identified avoidable rollout overhead: the missing RPC probe was followed by the full compatibility load. An interim follow-up selected the existing loader directly while database access was pending. Tests verified no context/RPC preflight when disabled, equivalent fallback when enabled but unavailable, and retained failure semantics. Database installation and activation after owner approval are recorded below.

The follow-up application commit `a535c7433c1277f7a2cb4948f043827f2fc81d95` was verified live. Its production build passed with stable source fingerprint `d9f305a04a1722877bd937f5fb5400bca09f36955bd3d42dcc6261b55571bcc1`; TypeScript, focused lint and performance correctness tests passed again. A further four deployed History reads returned successfully with a760 ms median (599–1,437 ms), versus729 ms at baseline: no demonstrated baseline speedup. [Follow-up evidence](qa/2026-10-30/performance/implemented/history-rollout-check.json). All fixtures were removed. These measurements precede database pagination activation; cold-start variation is not a proven code effect.

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

The owner subsequently authorized the existing Supabase dashboard session. `scripts/sql/weekend_performance.sql` was applied through the SQL editor to production project `apnwvugvwlfopxtryjwk`. Counts and checksums for all eight core tables matched before/after. The installed function is stable and SECURITY INVOKER with an empty search path; anonymous execution is denied and authenticated execution is allowed under the existing RLS. No tables or policies were changed. [Migration checks](qa/2026-10-30/performance/history-pagination/migration-checks.json), [visible dashboard verification](qa/2026-10-30/performance/history-pagination/supabase-function-installed.png).

Live authenticated validation compared the RPC with direct RLS-visible records and canonical history logic on236 disposable matches /920 participant rows:26 filter/page combinations, complete match/seat fields, scores, ordering, totals, days, load-more limits and an unknown event all passed. Anonymous execution returned permission denied. Median RPC time was101 ms across these26 differently sized queries; this is not an end-to-end page time. All fixtures were removed. [Live checks](qa/2026-10-30/performance/history-pagination/live-checks.json). The repeatable checker is `scripts/performance-history-live.test.mjs`, guarded by the same explicit disposable-fixture authorization and private manifest as the benchmark.

The application now uses database pagination by default. `WEEKEND_HISTORY_PAGINATION=false` selects the original loader directly as an operational rollback switch; hosts without the additive function still have the missing-function fallback. Transport failures continue to preserve the prior snapshot rather than masquerading as empty history. The existing history UI, filters, score data, counts and links remain unchanged.

Activation commit `159bd5a2cec9355ed00d38de5c32e7f2a27fb83d` was verified on the deployed site. Production build, TypeScript, focused lint and correctness tests passed; the build source fingerprint remained `d7e43f9077356794ec8ae069dd351ce19e77afc425fd9c8c1e66110d3719f19f` throughout compilation. Ten additional History document loads completed without captured runtime errors or failed loads, with a699 ms median versus the original729 ms baseline and interim760 ms fallback result. Range524–4,181 ms; the first-load outlier's cause was not isolated. This is a modest observed median change, not proof that History latency is solved. Database pagination bounds result/seat transfer to the requested page as history grows; the twenty-result UI is retained. [Deployed activation checks](qa/2026-10-30/performance/history-pagination/deployed-checks.json). All disposable records were removed after testing.

## Repeatable measurement

Run `npm run test:performance` for deterministic correctness checks. For a timed live benchmark, run `npm run benchmark:performance -- --base-url=http://127.0.0.1:3045 --samples=4 --navigation-samples=20 --allow-live-fixture` against a production build. The harness permits only the pinned local URL or `https://upkeep.vercel.app`, requires explicit fixture authorization, creates marked disposable records, and cleans them in `finally`. Its private session manifest and raw logs remain under ignored `.next-verify/performance/runs/`; publish only sanitized aggregates. Backend credentials are loaded locally and never included in reports.
