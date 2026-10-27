# Weekend usability release candidate

27 October 2026 · local implementation, not deployed or release-approved. See [acceptance ledger](WEEKEND_USABILITY_ACCEPTANCE.md) for all 195 acceptance IDs. The owner-approved plan remains the release contract.

## Delivered implementation

- Validated identity continuation across picker, invite, account/onboarding and provider recovery routes; house invitation opens Room without a player. Expired auth links have a destination-preserving retry screen.
- Derived returning-player assignment/wait/bye/dropped/Finish states; explicit date status independent of gameplay; contextual event navigation.
- Start versus after-game logging, Commander family labels, optional positions/decks, replay repair and stable creation request IDs. Record mode and existing live Commander reporting both offer optional finishing order.
- Setup assembly/readiness, explicit recommended rounds, seat Map/List and pod orientation; compact pairing reporters; focus Room with readable clock/tables/standings and match-scoped labels.
- Atomic score snapshots/correction review, results-led confirmed places separate from Swiss order, explicit Finish retained.
- URL-based statistics sections/filters, typed shared encounters, tied casual wins; contextual people/profiles, compact directory/deck setup; distinct Limited draft/confirmation terminology and confirmed-revision privacy.
- Invitation-first tools, searchable/paginated event history, revision-controlled loose agenda, snapshot-based print/PNG recap.
- Successful-fetch timestamps, editing deferral, offline/failed-refresh feedback and Retry. Full failure-injection acceptance remains open.

## Migration/deployment order

1. Verify existing base player-context/event schema and preserve aggregate record counts/checksums (do not export private rows without explicit authorization). Use a disposable fixture event for all write tests.
2. Apply existing Limited migrations only if not already present: scripts/sql/deck_memories.sql, then scripts/sql/deck_memory_categories.sql. Preserve the pilot flag.
3. Apply scripts/sql/weekend_usability.sql. It adds tournament pod_orientations and finished_at, match creation_request_id, event_agenda_items with RLS, and weekend_can_manage/edit_weekend_agenda/create_weekend_quick/commit_weekend_result functions. It never recalculates historical outcomes or standings.
4. Apply scripts/sql/weekend_memory_confirmation.sql. It adds confirmed_revision, backfills existing confirmed memories, distinguishes autosave from confirmation, and keeps unconfirmed changes private. Sharing metadata preserves confirmation, prior sharing choices survive corrections, and previously confirmed memories retain their retention status.
5. Verify PostgREST schema reload and function grants; deploy updated application write workflows only after SQL is present. Legacy links/identities remain intact. New agenda/orientation data requires no backfill.
6. Run the complete identity → event → start/report/replay → seating/rounds → optional final/Finish → correction → recap matrix, including competing sessions and interrupted responses. Compare existing record counts/checksums and confirmed places against the pre-migration checks.
7. Complete physical-phone, native 200% zoom, keyboard/screen-reader and light/dark route evidence. All Not verified ledger rows must pass before calling this the complete release.

Owner authorized Supabase access on 27 October 2026. All three additive migrations (weekend_usability.sql, weekend_memory_confirmation.sql, weekend_event_preferences.sql) were applied successfully through the authenticated project SQL editor. The CLI authenticated but its query path failed login-role initialization; no login roles were modified. A full private-record backup export was rejected by automatic approval review and was not attempted indirectly. Aggregate counts/checksums were used instead and all ten existing application-table fingerprints matched before/after the migration.

## Local verification

Use npm run test:weekend-usability, test:weekend-rules, test:ux, test:guest-accounts, test:deck-memories, test:deck-memory-save, test:deck-builder and test:deck-showcase. TypeScript and isolated production build pass. Changed-weekend lint passes. Repository-wide lint has 37 existing errors in older unrelated files and is a recorded release gate.

For visual review use npm run dev:weekend-preview (loopback port 3002). /dev/weekend is enabled only in development with WEEKEND_UX_PREVIEW=true and returns 404 in production. It reuses actual destination components with disposable in-memory fixtures and avoids generating anonymous Supabase users. Do not treat visual fixture interaction as proof of deployed writes. Generated builds and screenshots are ignored by Git.

No release, push, public recap link or automated sharing was created. Existing unrelated work in this checkout has been preserved.

## Live verification and event-memory follow-up

The new event preference migration is applied. npm run test:event-preferences covers cross-device player identity, switched-player isolation, house/device separation, invalid/deleted events, direct-write denial and repeatable migration. npm run test:weekend-live is an explicit live fixture suite: it creates clearly marked closed test events and nonselectable test profiles, checks authenticated PostgREST behavior, and removes only its fixture events/profiles/auth users afterward. It passed ten checks: cross-session event memory, house isolation, unauthenticated denial, retry-safe Commander recording, stale result rejection, deckless draw, team winner, agenda revision conflicts, house agenda management and removed-event fallback.

A separate browser test selected disposable event A, opened / and resumed A, used Events to reach the chooser, selected B, then verified a fresh / resumed B. After fixture deletion, / returned to the chooser. That test used house mode without assigning a player. Both disposable browser events were removed. Existing record preservation was checked by aggregate fingerprints, with no full private-data export.

Current/past event overview tests and captures include a current table plus a prior eighth-place finish; the prior place and record are hidden until lower Results is opened. Responsive checks at320/390/768/1024/1366 pass without overflow. Actual-phone and the rest of the full-release acceptance matrix remain open.

House-context edge case: the shared player resolver explicitly returns no player in house mode, even if an old anonymous account owns a profile. The preference effect also checks the expected identity so a request left over from an identity switch cannot save against the replacement player. Both changes preserve stored identities and management rules.
