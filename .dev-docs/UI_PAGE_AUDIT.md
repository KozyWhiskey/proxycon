# One-page UI consistency review

Started 23 October 2026; Ember Folio route passes recorded through 24 October 2026. Use [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md) for visual rules, [UI_SCREEN_GUIDELINES.md](UI_SCREEN_GUIDELINES.md) for page targets, and [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for product behavior. This file is the living pass tracker—not a second design system.

## How to work through the app

Review one destination and its popouts per pass. Fix a shared component once, then revisit its other consumers. Do not redesign every page independently.

1. Establish three anchors: **My decks** for expressive destinations and artwork, **Create tournament** for compact tasks, and **Room** for live operations. Their different jobs justify different heading roles; their palettes, controls, spacing and feedback must still match.
2. Open the actual route using existing event/player data. Record role, event state and URL. Identify whether it is a destination, task, live-operation screen or legacy redirect.
3. Capture the same content in Light and Dark at **390 × 844** and **1366 × 768**. Check 320px, 768px and 200% zoom when the layout is affected. A screenshot in one theme is not a completed review.
4. List **Keep / Change / Why**. Give each issue a concrete location, impact and the shared token/component that should resolve it. Prioritize unreadable text, inaccessible controls and hidden primary actions before polish.
5. Implement routine corrections within the approved system. Present visual options for a substantive new direction; do not invent a palette or replace navigation shapes.
6. Review hover, focus, pressed, disabled, pending, selected, empty/error and saved states where relevant. Open the real menu/dialog. Check keyboard focus, Escape, close and returning focus. Use disposable data for writes; do not manufacture results in the real event.
7. Save before/after screenshots, checks run, remaining gaps and the next route. Mark only the combinations actually observed. Get owner feedback at useful checkpoints, rather than declaring the whole app consistent after shared CSS changes.

## Checklist for every page

| Area | Pass condition |
| --- | --- |
| Typography | Fraunces destination/featured names; Manrope task/section/control copy; IBM Plex Mono aligned scores/clock. Same role has the same scale and weight across pages. |
| Color | Shared light/dark semantic roles; dark text on orange; Playing is information, Paused/elapsed is attention, loss is neutral. Ordinary ranks/points are not all orange. |
| Hierarchy | Returning-player match first on phone. Clock, open tables and standings retain useful size on the laptop. One main action per task area. |
| Geometry | 16–20px phone gutters; consistent 4px spacing scale; panels 12px, controls 8px. Long names wrap and content reflows without page overflow. |
| Depth | Warm shading only on approved feature/round surfaces; shared shallow action bevel and opaque raised popouts. Navigation and data rows remain neutral. |
| Buttons | Same action role uses the same recipe; 44px touch targets; icon + clear label; stable dimensions and visible keyboard focus. No half arch or underlined active navigation. |
| Popouts | Shared surface/elevation/radius, unclipped controls, persistent field labels, sensible focus and a reachable close action. |
| Copy | Keep labels, live state, consequences and errors. Remove explanations that repeat the visible controls or repeat names/scores. Put uncommon rules in relevant disclosures. |
| Results | Tournament counters always visible, 0–0 unsavable, score derives winner/draw. Quick pod/team outcome choice remains separate. No rules or permission drift. |
| Data/art | Real commander art preserved; consistent mana identity, crop and nameplate; honest empty/missing states. |

## Copyable agent prompt

> Review and refine **[PAGE URL / SCREEN]** in ProxyCon. Read AGENTS.md, PROJECT_SUMMARY.md, UI_DESIGN_SYSTEM.md, UI_SCREEN_GUIDELINES.md and this audit first. Compare this page with My decks (destination), Create tournament (task) or Room (live operations), according to its job. Inspect the actual page and its popouts in Light and Dark at 390 × 844 and 1366 × 768. Return a concise Keep / Change / Why assessment, then implement routine consistency fixes using the existing tokens and shared components. Preserve Ember Folio, Quiet Frame, five-mana identity, neutral rounded-rectangle navigation, approved warm shading and tactile action/popout recipes. Remove redundant help copy while preserving labels, errors and consequential warnings. Preserve tournament score counters, permissions, rules and live data. Check related consumers of any shared component changed. Save visual evidence and update this tracker with exact coverage, checks, unresolved issues and the next page. Do not claim untested routes or states passed. Do not commit, push or deploy unless requested.

For a critique-only pass, replace “then implement routine consistency fixes” with “propose changes without editing runtime code.”

## Route tracker

**Pending** means a full one-page consistency pass is still needed, even when shared styling or an earlier sample review touched it. See UI_IMPLEMENTATION_VERIFICATION.md for narrower completed checks. Review in roughly this order.

| Page / route | Page role | Review status / special states |
| --- | --- | --- |
| Events / `/` | Destination | Pass recorded 23 Oct 2026 (friend-group voice + hierarchy). Live-match phone hierarchy tightened 24 Oct 2026 ([phone dark](ux-screenshots/ember-phone-hierarchy-events.png)); house and empty-events still open. |
| Event / `/events/[id]` | Destination | Voice/empty-copy pass applied 23 Oct 2026. Live-slip phone hierarchy rechecked 24 Oct 2026 ([phone dark](ux-screenshots/ember-phone-hierarchy-event.png)); simultaneous Commander + light still open. |
| Room / `/events/[id]/room` | Live operations | Voice/copy pass applied 23 Oct 2026. Returning-player LiveSlip 24 Oct 2026. Live-state badges 24 Oct 2026: [elapsed](ux-screenshots/ember-room-state-elapsed.png), [paused](ux-screenshots/ember-room-state-paused.png), [finished+bye](ux-screenshots/ember-room-state-finished-bye.png), [seating](ux-screenshots/ember-room-state-seating.png). Posted wired (no live posted field this pass). |
| Tournament / `/tournament/[id]` | Live operations / setup | Finish promotion + voice pass 23 Oct 2026. Round-phase status + match Playing/Posted/Bye/Final badges aligned 24 Oct 2026. |
| Tournament result / `/tournament/[id]/match/[matchId]` | Task | Pass recorded 24 Oct 2026 (recorded + correction). Playing/waiting/bye live shots and 320px/200% still open. |
| Quick-game result / `/events/[id]/match/[matchId]` | Task | Pass recorded 24 Oct 2026 (recorded Commander pod). Live report-first, team, and draw states still open. |
| Start game / `/events/[id]/play` | Task | Pass recorded 24 Oct 2026 (format + players + Start hint). Team/THG and validation toast still open. |
| Create tournament / `/events/[id]/tournaments/new` | Task anchor | Pass recorded 23 Oct 2026 (compact task voice + Create above optionals). Validation/error and 320px/200% zoom still open. |
| Statistics / `/events/[id]/stats` | Destination | Pass recorded 24 Oct 2026 (commander filter + empty-card trim). Light phone spot-check 24 Oct 2026 ([phone light](ux-screenshots/ember-stats-phone-light-spot.png)); client payload thinned to unique commander art. Empty-format still open. |
| Event players / `/events/[id]/players` | Utility destination | Pass recorded 24 Oct 2026 (trimmed intro). Light still open. |
| Event tools / `/events/[id]/manage` | Task | Pass recorded 24 Oct 2026 (room demoted, quieter copy). Invite QR uses `houseOrigin` / `PROXYCON_HOUSE_URL` (LAN verified 24 Oct 2026). Light still open. |
| My decks / `/decks` | Destination anchor | Pass recorded 24 Oct 2026 (eyebrow/summary/empty trim). Empty/inspector/edit still open. |
| Playgroup / `/players` | Destination | Pass recorded 24 Oct 2026 (mana divider, denser cards). Light still open. |
| Player / `/players/[id]` | Destination | Pass recorded 24 Oct 2026 (FeaturePanel demoted). Other-player empty decks still open. |
| Profile / `/profile` | Task | Pass recorded 24 Oct 2026 (compact task, duplicate heading removed). Save-error still open. |
| Create event / `/events/new` | Task | Pass recorded 24 Oct 2026 (single intro). Validation still open. |
| Pick a player / unbound `/` | Entry task | Pass recorded 24 Oct 2026 (Manrope title, shorter help). House-mode shot still open. |
| Login / `/login` | Entry task | Pass recorded 24 Oct 2026 (shorter form help). Form-first phone via grid areas 24 Oct 2026 ([phone light](ux-screenshots/ember-login-phone-light.png)). |
| Onboarding / `/onboarding` | Entry task | Pass recorded 24 Oct 2026 (task title + shorter help; code review). Live disposable session still open. |
| Guest / `/guest`, `/guest/[token]` | Entry task | Pass recorded 24 Oct 2026 (`/guest`→`/`; claim copy trimmed). Invalid/claimed live shots still open. |
| Invite / `/invite/[code]` | Entry task | Pass recorded 24 Oct 2026 (shorter CTA copy). Invalid/expired still open. |
| Seat/table join / `/join/sitting/[code]`, `/join/table/[code]` | Entry task | Pass recorded 24 Oct 2026 (Manrope titles). Live join continuity still open. |
| Administration / `/admin` | Restricted task | Pass recorded 24 Oct 2026 (compact task + quieter copy). Denied non-admin → `/`. Permanent-admin live UI still open. |
| Legacy dashboard / `/tournament/[id]/dashboard` | Older implemented surface | Reachability recorded 24 Oct 2026: still serves big-screen UI (no redirect). No Ember restyle this pass; deliberate scope later. |
| Redirects / `/events`, `/stats`, `/tournaments`, `/tournament/new`, `/guilds`, `/guilds/[slug]` | Legacy entry | Verified 24 Oct 2026: app route files `redirect('/')`. No rebuild. |
| Redirects / `/tournament/[id]/seating`, `/pods`, `/deck`, `/play/casual` | Legacy entry | Verified 24 Oct 2026: seating/pods/deck → tournament (or `/`); casual → `/events/{id}/play` or `/`. |

## Per-page record template

- Route, page job, data/event state and role:
- Keep:
- Change / reason / shared recipe:
- Light phone / Dark phone / Light laptop / Dark laptop: tested or pending, with screenshot links.
- Interactions and additional widths/zoom actually checked:
- Checks run and results:
- Remaining gaps / owner decision needed:
- Next page:

## Current targeted refinement — 23 October 2026

This was a shared-material/copy refinement, not a full audit of every page in the tracker.

| Target | Evidence / completed checks | Remaining scope |
| --- | --- | --- |
| Room stage/actions | [Light laptop](ux-screenshots/ember-depth-room-light.jpg), [Dark laptop](ux-screenshots/ember-depth-room-dark.jpg). Warm stage, substantial controls and all eight standings rows retained at 1366 × 768. | Full round-state, long-name and 200% zoom pass. |
| Report popout | [Light phone](ux-screenshots/ember-depth-result-phone-light.jpg), [Dark phone](ux-screenshots/ember-depth-result-phone-dark.jpg). Compact named counters, no tutorials or repeated score paragraph, 0–0 disabled and derived 2–1 preview. At 320px: 288px dialog, 44px controls, no page overflow. Escape closes and returns focus to Report result. | Pending/error and conflict writes using disposable data. |
| Event room destination | [Light laptop](ux-screenshots/ember-depth-event-light.jpg), [Dark laptop](ux-screenshots/ember-depth-event-dark.jpg). Warm opaque callout, Fraunces heading and framed action. | Full event page review, including player phone hierarchy and simultaneous games. |
| Deckbox/new deck | Light/dark phone checked as a shared-component consumer. Removed old deck-only popup background/shadow/title overrides; now the same 12px popup, surface recipe and 24px title as other dialogs. | Full gallery/inspector/edit/artwork/state pass. |
| Create tournament | Full pass recorded below (23 Oct 2026). | Validation/error writes and 320px / 200% zoom. |

Checks: TypeScript, targeted ESLint (zero errors/warnings), UX/required-score regression tests, production webpack build, CSS parsing and diff whitespace check passed. No live results or profiles were saved. Existing data may change independently while inspected.

Contrast at the strongest new shading endpoints: secondary text 4.63:1 dark / 4.90:1 light on the warm feature; action text 6.43:1 at the darkest primary-button stop. Existing reduced-motion rules still suppress transitions/animations. These endpoint checks do not constitute full accessibility certification.

## Events `/` — pass record · 23 October 2026

- Route, page job, data/event state and role: `/` Events destination; Craig picked; no open personal match; three events including active Beta House Weekend; not house mode.
- Keep: Ember Folio light/dark; Fraunces event names; five-mana divider; neutral Events nav; live-slip path when matches exist; Closed vs active cards.
- Change applied: plain **Your games** hero for known players with events; Create event demoted to outline when events already exist; status **This weekend** / **Not joined** / **Closed**; membership **You’re in** / **Not joined yet**; removed “3 events · one playgroup”; deckbox FeaturePanel → quiet My decks utility link; GameStatus setup icon CalendarDays (no diamond); featured joined active card gets orange top rule + primary Open event; past cards quieted.
- Light phone / Dark phone / Light laptop / Dark laptop: [phone light](ux-screenshots/ember-events-audit-phone-light.jpg), [phone dark](ux-screenshots/ember-events-audit-phone-dark.png), [laptop light](ux-screenshots/ember-events-audit-laptop-light.png), [laptop light footer](ux-screenshots/ember-events-audit-laptop-light-footer.png), [laptop dark](ux-screenshots/ember-events-audit-laptop-dark.jpg).
- Interactions: Appearance control available; no writes.
- Checks: `tsc --noEmit` pass; ESLint on `app/page.tsx` and `arena-ui.tsx` pass.
- Remaining gaps: live-match phone hierarchy, house mode, empty events, 320px / 200% zoom not rechecked this pass.
- Next page: Event / Play critique (below).

## Event / Play `/events/[id]` — pass record · 23 October 2026

- Route, page job, data/event state and role: `/events/[id]` destination Play; Craig; no open personal match; live tournaments + room callout.
- Keep: Fraunces event title; mana divider; Play · Stats · Players · Room; warm **Take a seat. Run the room.**; live cards + progress; dark text on orange Start a game; W–L–D strip.
- Change applied: winner copy **“{name} won”**; setup caption **Joining · N seated**; empty **No live games.** / **No results yet.**; house eyebrow **House screen**; hub action buttons keep readable Create tournament on phone (13px, wrap-safe); tables stack still precedes room aside below 1000px.
- Pre-fix evidence: [phone light](ux-screenshots/ember-event-play-audit-phone-light.png), [phone dark](ux-screenshots/ember-event-play-audit-phone-dark.jpg), [laptop light](ux-screenshots/ember-event-play-audit-laptop-light.jpg), [laptop dark](ux-screenshots/ember-event-play-audit-laptop-dark.png).
- Remaining gaps: open personal match on phone; simultaneous Commander + tournament slips; 320px / 200% zoom.
- Next page: Room (below).

## Room `/events/[id]/room` — pass record · 23 October 2026

- Route, page job, data/event state and role: `/events/09ec40dc-…/room` live operations; Test tournament Playing; Round 3 elapsed (`0:00`); focus mode on; Craig; 3 open tables + 1 final.
- Keep: Warm round stage; large clock; substantial Report/Correct controls; pairings beside standings at laptop; Playing / Final status language; “Waiting on Table…”; compact Games won report popout (Escape closes, Save disabled at 0–0); How ties are ranked disclosure.
- Change applied: eyebrow **House / Tournament room**; empty **No tournament yet.**; status line always uses tournament name (not “Open on a phone”); tools link **Tournament page**; standings subtitle just **Live standings** / **Final places**.
- Light phone / Dark phone / Light laptop / Dark laptop: [phone light](ux-screenshots/ember-room-audit-phone-light.png), [phone dark](ux-screenshots/ember-room-audit-phone-dark.png), [laptop light](ux-screenshots/ember-room-audit-laptop-light.png), [laptop dark](ux-screenshots/ember-room-audit-laptop-dark.png).
- Interactions: opened Report result popout; Escape closed it; no results saved.
- Remaining gaps: posted / paused / bye / completed / seating setup states; 320px / 200% zoom; long names.
- Next page: Tournament detail (below).

## Tournament `/tournament/[id]` — pass record · 23 October 2026

- Route, page job, data/event state and role: `/tournament/346c777e-…` Test tournament; Round 3 of 3; all four results reported; not yet finished (by design Finish locks places).
- Keep: Fraunces tournament name; event nav; personal live slip when open; required score counters on report/correct; FinishForm podium + lock places.
- Change applied: status **All results in · ready to finish** when last round is fully reported; **Finish tournament** panel under the header (above matches); removed house FeaturePanel; FinishForm is podium-first with no checkbox (button locks places); ties only when needed; early finish stays collapsed; dropped “suggestion is N”; standings title + shared ties disclosure.
- Why it looked “still open”: tournaments do not auto-complete. Places require Finish (PROJECT_SUMMARY). The detail page previously hid that behind “Review final places.”
- Evidence: [laptop dark](ux-screenshots/ember-tournament-audit-laptop-dark.png). Phone / light still pending for this route.
- Remaining gaps: setup/seating/posted phone hierarchy; light theme; do not auto-finish without owner confirmation.
- Next page: Create tournament (below).

## Create tournament `/events/[id]/tournaments/new` — pass record · 23 October 2026

- Route, page job, data/event state and role: `/events/09ec40dc-…/tournaments/new` compact task; Craig; canManage; Beta House Weekend.
- Keep: Compact Manrope task title; back link; format `aria-pressed` grid; defaults 3 rounds / 50 minutes; two-pods only for seated formats; join gate when not a member; full-width Create.
- Change applied: product-aligned format hints (seating/pairings, not marketing blurbs); visible **Format** label; shorter rounds hint; **Create tournament** before optionals; Day / packs / bringing / prizes under **Optional details**; consistent Label + field ids; drop competing `setup-page` max-width; format label type bumped to 14px.
- Light phone / Dark phone / Light laptop / Dark laptop: [phone light](ux-screenshots/ember-create-tournament-audit-phone-light.png), [phone dark](ux-screenshots/ember-create-tournament-audit-phone-dark.png), [phone dark CTA](ux-screenshots/ember-create-tournament-audit-phone-dark-cta.png), [laptop light](ux-screenshots/ember-create-tournament-audit-laptop-light.png), [laptop dark](ux-screenshots/ember-create-tournament-audit-laptop-dark.png).
- Interactions: no tournament created; Optional details left collapsed; Appearance light/dark toggled.
- Remaining gaps: validation/error/pending create; sealed vs two-pods interaction recheck; 320px / 200% zoom; join-only state not re-shot this pass.
- Next page: Tournament result (below).

## Tournament result `/tournament/[id]/match/[matchId]` — pass record · 24 October 2026

- Route, page job, data/event state and role: `/tournament/346c777e-…/match/4683a701-…` Craig vs Michael; Round 3 of 3; result recorded 2–1; Craig; canOperate.
- Keep: Event nav; back to tournament; required +/− Games won counters; derived outcome; 0–0 unsavable; Correct disclosure; Pairings & standings link; no winner-choice buttons.
- Change applied: Manrope task matchup title; score reporter above player cards while playing; compact playing contenders; drop generic “Player” label (keep You); plural **1 game won**; loss outcome muted (winner stays ink); shorter correction consequence; correction preview only after a dirty edit; status **Pairings posted** (dropped “Not started”).
- Light phone / Dark phone / Light laptop / Dark laptop: [phone light](ux-screenshots/ember-tournament-result-audit-phone-light.png), [phone light correct](ux-screenshots/ember-tournament-result-audit-phone-light-correct.png), [phone dark](ux-screenshots/ember-tournament-result-audit-phone-dark.png), [laptop light](ux-screenshots/ember-tournament-result-audit-laptop-light.png), [laptop dark](ux-screenshots/ember-tournament-result-audit-laptop-dark.png).
- Interactions: opened Correct this result; counters visible; Save correction stayed disabled until edit; no result saved.
- Remaining gaps: live Playing / waiting Start round / bye states not re-shot; 320px / 200% zoom; join-only permission state.
- Next page: Quick-game result (below).

## Quick-game result `/events/[id]/match/[matchId]` — pass record · 24 October 2026

- Route, page job, data/event state and role: `/events/09ec40dc-…/match/87529ffd-…` Commander; Craig · Michael · Chris · Sid; Craig won; one deck recorded; Craig; canManage.
- Keep: Pod winner/draw choice (not tournament counters); optional decks; Correct disclosure path; Back to event; Event nav from event layout.
- Change applied: result banner **“{name} won”** / Draw (dropped “takes the win” / THE RESULT); Manrope task head; removed live tutorial line; Report first while in progress; Correct collapsed when finished; quiet **No deck recorded** (no empty art block / duplicate lines); Won/Lost tags muted for loss; single-column seat cards under 520px; Deck (optional) label.
- Light phone / Dark phone / Light laptop / Dark laptop: [phone light](ux-screenshots/ember-quick-result-audit-phone-light.png), [phone dark](ux-screenshots/ember-quick-result-audit-phone-dark.png), [laptop light](ux-screenshots/ember-quick-result-audit-laptop-light.png), [laptop dark](ux-screenshots/ember-quick-result-audit-laptop-dark.png).
- Interactions: Correct left collapsed; no result saved or deleted.
- Remaining gaps: live in-progress report-first shot; Two-Headed Giant / draw; 320px / 200% zoom; replay entry from Start a game.
- Next page: Start a game (below).

## Start a game `/events/[id]/play` — pass record · 24 October 2026

- Route, page job, data/event state and role: `/events/09ec40dc-…/play` Quick Game task; Craig; canManage; Commander default.
- Keep: Compact task title; format select; player toggle grid; optional decks/day; Already finished disclosure; Play again links.
- Change applied: **Start game** above optionals with why-disabled hint; Optional details (decks + day); Play again shows names; form in panel; Label on format; larger player choice type.
- Light phone / Dark phone: [phone light](ux-screenshots/ember-start-game-audit-phone-light.png), [phone dark](ux-screenshots/ember-start-game-audit-phone-dark.png). Laptop pending.
- Interactions: no game created.
- Remaining gaps: Two-Headed Giant teams; Save result path; laptop/light full; 320px zoom.
- Next page: Statistics (below).

## Statistics `/events/[id]/stats` — pass record · 24 October 2026

- Route, page job, data/event state and role: `/events/09ec40dc-…/stats` destination; Craig; Commander · Whole weekend.
- Keep: Fraunces destination heading; format tabs; day filter; ranking with wins/played; streaks; head-to-head; tournament notebook.
- Change applied: event-only header note; win pluralization; player cards only when they have results in the selected format; empty streak/title copy; notebook omits empty setup tournaments; “Deck not recorded” instead of No commander in player detail.
- Evidence: [phone dark](ux-screenshots/ember-stats-audit-phone-dark.png). Light/laptop pending.
- Remaining gaps: empty Other games tab; table overflow at 320px; light theme.
- Next page: Event players (below).

## Event players `/events/[id]/players` — pass record · 24 October 2026

- Route, page job, data/event state and role: `/events/09ec40dc-…/players`; Craig; roster of 8.
- Keep: Fraunces “Players”; mana chips; manager invite link.
- Change applied: dropped redundant intro; empty copy → “No one joined yet.”
- Evidence: [phone dark](ux-screenshots/ember-players-audit-phone-dark.png).
- Remaining gaps: light theme; chip vs row layout optional.
- Next page: Event tools (below).

## Event tools `/events/[id]/manage` — pass record · 24 October 2026

- Route, page job, data/event state and role: `/events/09ec40dc-…/manage` task; Craig can manage.
- Keep: compact Manrope PageIntro; Add players; invite ShareCode; correct-result disclosures.
- Change applied: room FeaturePanel → quiet utility-link; shorter page/add-players/roster copy; mana on roster; ShareCode label 12px; dropped optional-score tutorial line in MatchReporter.
- Evidence: [phone dark](ux-screenshots/ember-manage-audit-phone-dark.png).
- Remaining gaps: light; long correction list density; QR theming.
- Next page: My decks (below).

## My decks `/decks` — pass record · 24 October 2026

- Route, page job, data/event state and role: `/decks` destination; Craig; 6 decks with art.
- Keep: Fraunces “Your decks. Your signature.”; gallery cards; New deck CTA.
- Change applied: eyebrow THE DECKBOX; summary count only; single empty state; no repeated format on card footer; shorter New deck dialog description.
- Evidence: [phone dark](ux-screenshots/ember-decks-audit-phone-dark.png).
- Remaining gaps: empty library; inspector/edit/delete confirmation; light.
- Next page: Playgroup (below).

## Playgroup `/players` — pass record · 24 October 2026

- Route, page job, data/event state and role: `/players`; Craig; 14 profiles.
- Keep: Fraunces Players; search; mana; add-player panel.
- Change applied: THE PLAYGROUP + mana divider; dropped tutorial intro; denser card padding/gap; removed “View player →”.
- Evidence: [phone dark](ux-screenshots/ember-playgroup-audit-phone-dark.png).
- Remaining gaps: light; long-name wrap stress.
- Next page: Player (below).

## Player `/players/[id]` — pass record · 24 October 2026

- Route, page job, data/event state and role: `/players/…` Craig (self).
- Keep: Fraunces name; decks grid; Edit my profile.
- Change applied: PLAYGROUP eyebrow; FeaturePanel → Events utility-link.
- Evidence: [phone dark](ux-screenshots/ember-player-audit-phone-dark.png).
- Remaining gaps: other player / empty decks; light.
- Next page: Profile + Create event (below).

## Profile `/profile` — pass record · 24 October 2026

- Route, page job, data/event state and role: `/profile` task; Craig guest session.
- Keep: compact Manrope title; Player colors; Switching players note; deckbox link.
- Change applied: dropped PageIntro description and duplicate avatar heading; deckbox subcopy is count only; removed registered-account helper under Account name.
- Evidence: [phone dark](ux-screenshots/ember-profile-audit-phone-dark.png).
- Remaining gaps: save error toast; light.
- Next page: Create event (below).

## Create event `/events/new` — pass record · 24 October 2026

- Route, page job, data/event state and role: `/events/new` task.
- Keep: compact task title; fields; Create event CTA.
- Change applied: single intro (no THE PLAYGROUP eyebrow stack); removed CardDescription duplicate.
- Evidence: [phone dark](ux-screenshots/ember-create-event-audit-phone-dark.png).
- Remaining gaps: validation/error writes.
- Next page: Entry flows (below).

## Entry flows — pass record · 24 October 2026

- Pick a player: Manrope title; shorter help (`name-picker.tsx`).
- Login: shorter Existing account help; [phone dark](ux-screenshots/ember-login-audit-phone-dark.png). Form-first reorder still open.
- Onboarding: task title “Choose a play name”; shorter form help (code review; no disposable session).
- Guest: `/guest` → `/`; claim title Manrope; shorter browser note.
- Invite: shorter sign-in CTA copy.
- Join sitting/table: Manrope card titles.
- Remaining gaps: house-mode picker shot; invalid guest/invite; claim continuity.

## Administration `/admin` — pass record · 24 October 2026

- Denied non-admin (Craig guest) → `/`. Copy: compact “Admin tools”; quieter guest/event manager blurbs. Permanent-admin live UI still open (do not grant access for review).

## Legacy dashboard + redirects — pass record · 24 October 2026

- `/tournament/[id]/dashboard` still serves big-screen page (no redirect); out of Ember restyle scope this pass.
- List/guild redirects: `app/*/page.tsx` → `/`.
- Seating/pods/deck → tournament (or `/`); `/play/casual` → event play or `/`.
- Tracker complete for route-level Ember Folio consistency passes. Open gaps remain on individual pages (light/laptop, live states, validation).

## Limited deck memories — fixture review · 25 October 2026

- Added `/tournament/[id]/deck` and `/decks/limited/[id]` behind the pilot flag. Capture/edit uses the existing compact Manrope task header; shared memory and library destinations retain Fraunces. No alternate tokens or global theme edits.
- Capture precedes optional deck naming/notes. One editable list receives explicit change proposals; basic lands have direct numeric inputs. Existing active tournament slips remain above the capture link.
- Fixture browser checks cover explicit model choice, preference storage, no automatic quantity changes on recheck, partial failure, retry selection, autosave, manual counts, unverified names, and no page overflow at 320, 390, 768, and 1366px. Light/dark screenshots at 390 × 844 and 1366 × 768 and 200% CSS zoom are generated under `.next-verify/deck-memory-screenshots/`.
- Reviewed fixture screenshots in both themes. Reused raised shared controls and opaque surfaces. Fixed an inherited display-font override using PageIntro compact rather than adding page-specific CSS.
- Remaining: real player/hosted storage integration, native iPhone/Android camera capture, full screen-reader and every-state contrast audit, a representative photo evaluation set, and the one-draft pilot. Fixture checks are not a completed production accessibility or usability audit.

### Limited deck photo review · 26 October 2026

Owner-requested artwork-led layout within Ember Folio. Keep semantic colors, shared controls, task heading and explicit suggestion approval. Changed the inherited 760px cap to a 1600px maximum collection workspace, added responsive artwork tiles/phone review rows, optional compact list, and collapsible capture/reading notes. Fixture route `/dev/deck-memory` reviewed with disposable data; no tournament results modified. Light/dark 390×844 and 1366×768 screenshots in ignored `.next-verify/deck-memory-screenshots/*-review.png`; browser assertions cover reflow at 320/768px and 200% zoom, targeted provider retries, autosave and manual corrections. Actual-phone feedback and screen-reader checks remain pending.

### Approved compact deck workspace implementation

Owner approved the generated desktop/phone concept and requested implementation. Implemented compact candidate art and one Add action, contextual inspector, success states/Undo, type stacks and List view, side-by-side desktop workspace, and phone tabs within Ember Folio. Fixture evidence: `.next-verify/deck-memory-screenshots/*-full-workspace*.png` (22 entries) and `*-complete-deck.png` (40 cards). Both themes at 390×844 and 1366×900 were inspected; automated reflow checks cover 320/768px and 200% zoom. Keyboard tabs, dialog close/focus return, add-once, bulk preview and retry-after-refresh are exercised. Real-player deck/results were not modified. Screen-reader and actual-phone feedback remain pending.

### Natural card refinement and independent UX QA · 26 October 2026

Supersedes the crop treatment above. Review candidates retain full natural portraits, without a duplicate visible name beneath the printed title. Accepted stacks are bounded at 180px, with opaque preceding name/count strips and one full final card; independently flowing columns avoid grid-row voids. Phone saved decks default to grouped List; Stacks remains available. Photos/save status are compact, healthy reader details are secondary, and scoped Undo lives in the sticky toolbar rather than a floating overlay. Reopened completed reviews collapse behind Show reviewed cards; active approvals never trigger automatic collapse.

The owner-requested critical UX QA agent reviewed source and fresh screenshots across three iterations and explicitly approved the final result with no remaining visual blocker. Evidence covers sparse two-land decks, 22-entry reviews, full 40-card decks, both themes, phone/laptop widths and 200% zoom. Browser regressions, focused domain/database/API tests, changed-file lint and the production webpack build passed. QA is visual/code review; actual-device and full screen-reader validation remain open. No release was pushed.

### Actual overlapping images and editable categories · 26 October 2026

Owner explicitly extended scope to custom categories and Sideboard. The MTG agent produced [feature spec](DECK_BUILDER_FEATURE_SPEC.md), the UX agent produced [implementation plan](DECK_BUILDER_UX_PLAN.md), and a developer agent implemented the board. Actual card faces now overlap with 44px exposed printed-title bands and full final cards. Copy badges use a gutter; bounded 200px images pack independently by deterministic height. List remains the phone default, with explicit usable Stacks. Missing and HTTP-failed images retain readable fallbacks. Main and Sideboard are visibly separate, with per-allocation quantities/movement and category management.

Original MTG reviewer explicitly accepted after fixing manual/catalog replacement merging. Independent critical UX reviewer explicitly accepted after fixing desktop column voids, image failure fallbacks, category-form styling, nested-dialog focus and zoom evidence. Fixture evidence under `.next-verify/deck-builder-screenshots/` covers 320/390/768/1366px, light/dark, sparse/organized/stress 60 main +20 sideboard, long categories, inspector/forms, keyboard focus and 200% equivalent zoom. Scoped domain/database/save-API/provider tests, two browser suites, changed-file lint and production build are verification sources. Actual-device and full screen-reader usability remain pilot checks. No application release was pushed; the additive Supabase category migration was applied separately.

### Limited library showcase · 27 October 2026

Reused Commander gallery grid/card frame for Limited memories rather than wide text panels. Matching image height, title hierarchy, opaque surface and open cue; responsive single-column phone grid. Card inspector adds owner-only Use as showcase/reset, saved with card JSON. Main/sideboard counts and privacy remain explicit. Visual checks at390/1366 in both themes include long titles and unavailable artwork; gallery HTTP-failure and pre-hydration fallback, selection/reset and autosave payload tested. Evidence `.next-verify/deck-showcase-screenshots/`. No Commander editing behavior changed.

### Weekend usability release candidate · 27 October 2026

Owner approved the complete weekend plan. Implementation retains Ember Folio/Quiet Frame, mana signature, destination typography, opaque popouts, raised actions and equal themes. Event navigation remains Play → Stats → Players → Room; agenda/history/recap are contextual. Personal assignment precedes event records/discovery on phones. Room focus suppresses personal panels; eight-player 1366×768 view fits four report actions and eight standings rows. Twelve-player Room grows without scaling down. Setup hides empty standings; Map/List gives contained narrow-phone seating.

Local fixture captures: .next-verify/weekend-screenshots/{event,room,quick,stats,recap}-{390,1366}-{light,dark}.jpg. Additional evidence: room-laptop-{light,dark}.jpg, room-12-laptop-light.jpg, event-waiting-phone-{light,dark}.jpg, quick-phone-dark.jpg, agenda-phone-light.jpg, score-dialog-draw-light.jpg, recap-export-page-01.png. The exported PNG was downloaded through the browser and visually inspected. Dialog 0–0 Save is disabled; 1–1 derives Draw with one enabled Save. Escape returns visible focus to the originating report trigger. Record mode selected four players without decks/order; Commander label change retained the group/winner; changing to 1v1 retained the group with a specific selection repair message.

Reflow checked at 320/390/768/1024/1366 for event, Room, quick, statistics and recap; no page overflow. Seat List at320 also stayed contained. Native 200% zoom, physical phone keyboard/safe-area checks, complete screen-reader/contrast review, and screenshots for every real authenticated/utility route remain **Not verified**. These captures are disposable local fixtures, not a deployed acceptance sign-off.

See [all acceptance IDs](WEEKEND_USABILITY_ACCEPTANCE.md) and [release/migration runbook](WEEKEND_USABILITY_RELEASE.md). No new migration was applied to live Supabase. The release gate remains open; do not mark this one-release plan complete from build/screenshots alone.

Focus-mode follow-up: focus styling now follows the server-rendered control state, preventing a transient personal panel before hydration. Exit/re-enter focus was exercised; updated twelve-player dark/light captures show natural page growth. Setup standings were removed after the narrow-phone review exposed the premature zero table.

### Current play before historical results · 27 October 2026

Owner requested remembered event entry and reduced emphasis on past losses/places. PersonalGames now defaults to derived current assignments; finished/dropped records move into the lower, collapsed Results disclosure alongside weekend records and completed tournaments. Waiting headings stay neutral while retaining outcome and remaining-table context. Events always opens /events, and Room focus exposes it directly. The / entry route resumes a profile's remembered event; house memory is device-scoped.

Mixed fixture includes a live Saturday table and a confirmed prior eighth place with a consistent losing record. At390×844, Table1, Scott and Report result appear in the first practical viewport; prior placement is absent until Results is opened. A completed-only event shows new-game actions and keeps prior results collapsed. Both states reflow without page overflow at320/390/768/1024/1366. Evidence: .next-verify/weekend-screenshots/active-before-past-{390,1366}-{light,dark}.jpg, past-results-expanded-390-light.jpg, finished-games-collapsed-390-light.jpg. Keyboard Enter opens/closes the disclosure.

Supabase migrations are now applied; all existing record counts/checksums match. Authenticated fixture and house-browser event-return checks passed; fixtures were removed. See the updated release runbook and acceptance ledger for remaining full-release gates.


## October 29, 2026 — user-facing weekend QA

A fresh browser-only workflow review is recorded in [QA_USER_REVIEW_2026-10-29.md](QA_USER_REVIEW_2026-10-29.md). It covers personal phone and house-laptop use, actual disposable saves, round transitions/corrections, an optional final, agenda concurrency, Limited confirmation, and a downloaded recap PNG. The review found a tied-final failure and mobile/context/pagination issues. The originally claimed Commander metadata mismatch was a reviewer error and is retracted: Beloved Companion and Ever Faithful are different cards. The report separates observed outcomes from unverified hardware, authentication, concurrency, export, and accessibility checks. No application fixes were made during that review; follow-up changes and evidence are in [QA_REVIEW_IMPLEMENTATION_2026-10-29.md](QA_REVIEW_IMPLEMENTATION_2026-10-29.md).


### October 29 QA follow-up implementation

All twenty review findings have an implementation disposition, with F02 explicitly retracted as a mistaken comparison of two different cards. See [QA_REVIEW_IMPLEMENTATION_2026-10-29.md](QA_REVIEW_IMPLEMENTATION_2026-10-29.md) for Pass/Not verified evidence and remaining release boundaries. Real disposable Room testing covers multi-select eight-player assembly, posting versus starting, all four reports with Next open table, reordered tied finalists, the optional final, correction with Done retained, and explicit Finish. The final first/second places remain independent of Swiss points.

Evidence: [phone and house captures](qa/2026-10-29/implemented), including names in light/dark at320/390, House Room light/dark at1366×768, phone encounters, draft/confirmation states, and PNG/print recap. All four house report controls and eight standings rows fit; Room reflows at320/768/1024. The two-page browser print PDF was rendered and inspected; aligned records and player blocks stay readable. Physical-phone keyboard/safe-area checks, mobile Safari, native200% zoom and a full screen-reader/contrast audit remain Not verified. Changed files lint clean; full source lint retains37 errors in unchanged code.

### October 30 performance release

Routine navigation pending feedback and retained snapshots preserve the approved design system. Room light/dark captures at390 and1366 were inspected; browser checks verify no horizontal overflow. Existing UX regression tests pass across names, event validation, tie review, commander search, Room, encounters, recap export and deck autosave recovery. See [performance implementation and evidence](PERFORMANCE_IMPLEMENTATION_2026-10-30.md). Hardware/mobile Safari and screen-reader coverage remain unverified.
