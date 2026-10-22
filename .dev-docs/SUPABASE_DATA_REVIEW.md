# Supabase data preservation review

Reviewed 21 October 2026 (America/Chicago). Project: `apnwvugvwlfopxtryjwk`.

## Current preservation scope

The user has narrowed preservation to accounts, profiles, and decks. Historical games do not need to be migrated. The historical findings below remain an audit record, not required implementation work. No game deletion has been performed. See `WEEKEND_GUEST_SETUP.md` for the new guest flow.

## Original audit recommendation

Keep the existing Supabase project and existing profile, deck, tournament, match, and participant IDs. The rebuild does not require resetting the database, recreating profiles, or re-entering decks. The public application columns checked are already present. The principal work is repairing historical relationships and reviewing database access policies.

This review made only GET requests. No database rows, users, settings, policies, or schema were changed. No authentication tokens, keys, emails, or raw database export are included here.

## Access and confidence

The inventory below describes records visible using the configured anonymous application key, without a signed-in user. Requests for all rows of the small public tables and exact-count requests agreed on the counts. RLS could hide other records, so this is not a privileged guarantee that no additional records exist.

The Supabase dashboard browser connection timed out. The API denied schema-metadata access with the anonymous key. Authentication users and identities, actual foreign-key constraints, triggers, indexes, storage inventory, backups, and RLS policies were therefore not inspected.

**21 public profiles does not establish that 21 usable authentication accounts exist.** Before any account migration, compare profiles with `auth.users` and `auth.identities` using the companion read-only SQL. Never match or merge accounts solely by a display name.

## Visible inventory

| Data | Records | Treatment |
| --- | ---: | --- |
| Profiles | 21 | Keep IDs, names, handles, roles, and existing metadata |
| Decks | 9 | Keep deck IDs, owner IDs, commanders, descriptions, card text, and image metadata |
| Events | 3 | Keep; review which are test events before archiving anything |
| Event memberships | 4 | Keep; add historical memberships only during a reviewed import |
| Tournaments | 4 | Keep IDs, rosters, seats, scores, and results |
| Tournament participant rows | 24 | 15 named players across rosters; 9 empty placeholder rows |
| Matches | 22 | Keep all, including the one unfinished historical match |
| Match-participant rows | 44 | 42 reported player results; 2 unreported |
| Badge definitions / awards | 24 / 7 | Leave stored as legacy data; the rebuilt navigation does not expose them |
| Organizations / organization members | 0 / 0 | No visible organization data to carry forward |
| Event decks / captured cards / event prizes | 0 / 0 / 0 | No visible records; do not introduce these features as part of preservation |

Visible player-result values: 19 wins, 19 losses, 4 draws, and 2 nulls. These are player-result rows, not 42 distinct games. There are 21 matches with all players' results reported and 1 without a complete result.

## Profiles already present

Names below are trimmed for presentation only. No stored values were edited. Result counts mean non-null player-result rows, across all visible history.

| Play name | Username | Role | Decks | Event memberships | Reported results |
| --- | --- | --- | ---: | ---: | ---: |
| chocozuna | dwu | user | 0 | 0 | 0 |
| Scott | Scott | user | 0 | 0 | 3 |
| Michael | jctepl | user | 0 | 0 | 3 |
| Beta | beta | user | 0 | 2 | 4 |
| Rohan | @rohan | user | 0 | 0 | 3 |
| Craig | Craig | admin | 4 | 0 | 0 |
| Test Player | tester | user | 1 | 1 | 4 |
| Elliot | Elliot | user | 0 | 0 | 0 |
| Miko | baciacalupo | user | 4 | 0 | 0 |
| Rockerbug | Rockerbug | user | 0 | 1 | 0 |
| allaboutduncan | allaboutduncan | user | 0 | 0 | 0 |
| Troy | @pagedpuddle65 | user | 0 | 0 | 0 |
| Mark O | kramneslo | user | 0 | 0 | 3 |
| ChrisP | ChrisP | user | 0 | 0 | 3 |
| Lexiphanicist | Lexiphanicist | user | 0 | 0 | 3 |
| Nick S | @nsegreti | user | 0 | 0 | 2 |
| Rohan Zalani | @rohanzalani | user | 0 | 0 | 3 |
| DNomz | @DNomz | user | 0 | 0 | 3 |
| Chris | Frodobagginses | user | 0 | 0 | 3 |
| Sid | Sid | user | 0 | 0 | 3 |
| yourbuddypal | yourbuddypal | user | 0 | 0 | 2 |

13 profiles have an avatar URL. None has selected a color. No play names are missing. Three play names have trailing spaces (Elliot, Lexiphanicist, Sid), and Nick S's username has a trailing space. No duplicate handles were found after trimming, lowercasing, and removing an initial @ for comparison.

Rohan and Rohan Zalani are separate profile IDs and separate handles. This is a possible identity question, not evidence they are the same person. Keep both until the owner confirms otherwise. Names such as Beta and Test Player suggest testing, but that is not authorization to remove them; Test Player owns a deck and has results.

Craig is the only visible administrator. Preserve that role and verify that its profile ID is linked to the intended authentication account. Most existing people have not joined one of the three current events; absence from an event is not absence of a profile or deck.

## Decks to retain

All nine use stored format `Commander`, have a commander name, and have image, oracle-text, and description values. No partner commander is currently set. The checked owner IDs all resolve to visible profiles.

| Owner | Deck name | Commander |
| --- | --- | --- |
| Craig | Skullbriar | Skullbriar, the Walking Grave |
| Craig | Wolverine | Wolverine, Best There Is |
| Craig | Winota | Winota, Joiner of Forces |
| Craig | Kardur | Kardur, Doomscourge |
| Test Player | Harold | Angelic Harold |
| Miko | yusri, cirque du soleil | Yusri, Fortune's Flame |
| Miko | the loch | Emry, Lurker of the Loch |
| Miko | Me | Alesha, Who Laughs at Fate |
| Miko | Sami's Wild Ride | Sami, Wildcat Captain |

The rebuilt account deck queries use the same `owner_id`. Event game selectors only offer decks for event members. Someone may need to join an event before their decks appear in that event's game form; their account deck library should remain available under the same account.

Retain the existing extra deck metadata even where the new UI only needs a name and commander(s). Simplifying the interface does not require dropping columns.

## Events and tournaments

Existing events:

| Event | Dates | Owner | Members | Tournaments | Matches |
| --- | --- | --- | ---: | ---: | ---: |
| Test | 10 Jan 2026 | Rockerbug | 1 | 0 | 0 |
| Beta House Weekend | 23–25 Oct 2026 | Beta | 1 | 1 | 0 |
| Loop Check | 22–25 Oct 2026 | Beta | 2 | 1 | 4 |

All three currently have `is_active=true`. The dates of the Loop Check games are 21 October, outside its configured event start; review that test data rather than shifting dates automatically.

| Tournament | Stored state | Named players | Matches | Results-complete matches | Current event |
| --- | --- | ---: | ---: | ---: | --- |
| Lorwyn Prerelease | active; field unlocked | 6 | 9 | 8 | None |
| Vintage Cube 1-17 | completed; field unlocked | 6 | 9 | 9 | None |
| Friday draft | active; field locked | 2 | 2 | 2 | Loop Check |
| Friday Set Draft | pending | 1 | 0 | 0 | Beta House Weekend |

Historical tournament IDs:
- Lorwyn Prerelease: `7ba9650b-d170-4526-8a29-367ef4086dc2`
- Vintage Cube 1-17: `88124c7d-4b91-404e-934e-1f36f6bad7b2`

Both historical tournaments' matches were created on 17 January 2026 in America/Chicago. That is evidence for a January 17 historical event, not proof of the intended event grouping or actual play date. Confirm whether to group these together before inserting an event.

## Changes needed for compatibility

1. **Attach historical tournaments and their matches to event containers.** Both old tournaments have null `event_id`; all 18 of their matches also have null `event_id`. The rebuilt tournament page requires an event, and event statistics query matches by event. These games can appear missing even though their rows remain intact. Assign an agreed historical event to both the tournaments and matches, and insert memberships for their 12 distinct historical players. Do not mix these results into the upcoming weekend.

2. **Backfill the historical tournament-player links.** All 36 historical match-participant rows have null `participant_id`. Current standings and Swiss history use that link. Each maps to an existing tournament participant through its match's tournament ID plus profile ID; there are no unmatched historical player-result rows or duplicate tournament/profile roster pairs in the visible data. Fill only null links with exactly one candidate. Preserve results, games won, and the original IDs. Do not assign a tournament participant to ordinary quick-match rows.

3. **Handle legacy completion metadata separately from the results.** Seventeen historical matches have all results but null `completed_at`; six of those also have null `started_at`. All 18 lack `played_on` and table numbers. Preserve recorded outcomes. A historical date can be supplied after review; table numbers can be assigned deterministically within each round if needed. Exact historical start and finish times cannot be recovered from a null. Do not silently use match creation as an asserted finish time. Prefer a historical import path that recognizes reported results without restarting old rounds.

4. **Freeze/review old tournament state before enabling controls.** Lorwyn remains active with one match unreported; do not invent its result or auto-finish it. Vintage Cube is completed but has no saved place labels. Both received the default `field_locked=false`. Prevent joining or regenerating their historical rounds during migration. New standings rules may differ from the original rules, so do not automatically claim a recalculated order was the original finishing order. The title “Vintage Cube” is not enough to rewrite its stored `draft` format without confirmation.

5. **Review access policies before wider use.** Anonymous reads returned profile names and roles, decks, events, matches, results, and legacy badge awards. This behavior is verified, but whether it comes from disabled RLS, broad policies, or another configuration is not established. Review `pg_policies`, table/column grants, and profile-role protections. The product requires signed-in event access. Verify owner-only deck/profile changes, admin-only role changes, and member-only event/game changes at the database layer. Anonymous write permissions were not tested.

6. **Verify auth linkage before any account cleanup.** Check profile IDs against auth users, providers, and identities. Existing email and Google sign-in must resolve to the intended profile UUID so decks stay with their owner. An apparent duplicate should be reconciled using verified account ownership, with all references accounted for; do not overwrite a profile or create a fresh account as a shortcut.

## Schema findings

Read-only select checks succeeded for all checked columns in:
- profiles, decks, events, event_members;
- tournaments and tournament_participants;
- matches and match_participants;
- event_prizes (still queried by the existing event loader).

This includes partner commanders, profile color, seats and pods, dropped status, place labels, optional prize text, round clock fields, table labels, game day, team, finishing order, and tournament participant links.

No immediate missing-column migration was found. This does not verify defaults, unique indexes, check constraints, foreign keys, triggers, or policy correctness. The local SQL files describe intended changes, but their presence/comments are not proof each migration ran.

The legacy `players` endpoint is absent from the public API schema cache. Do not make preservation depend on the unused `claimPlayer` action that still references it.

## Safe implementation order

1. Verify a recoverable backup covering public data/schema, auth identities, policies/triggers, and any stored assets. A review report is not a backup.
2. Run the companion administrator-only read queries; confirm auth mapping and actual policies/constraints.
3. Confirm historical event grouping, the open Lorwyn match, and any genuinely disposable test data.
4. Prepare a transaction-scoped migration with explicit IDs, expected row counts, uniqueness guards, and a rollback plan. Keep all existing IDs and all reported results.
5. Dry-run on a database copy, including the policy changes. Compare counts and ownership before and after.
6. Verify the same Craig/Miko accounts still see 4 decks each; verify Test Player still sees Harold. Verify historical standings include the preserved 17 completed matches and the remaining Lorwyn match stays unfinished. Verify event totals stay separated by event.
7. Deploy compatibility fixes and the reviewed data repair together. Retain unused legacy tables for now; no table drops, account deletion, or badge expansion are needed.

No repair or policy change has been applied by this review.
