# One-page UI consistency review

23 October 2026. Use [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md) for the visual rules and [UI_SCREEN_GUIDELINES.md](UI_SCREEN_GUIDELINES.md) for page priorities. Product behavior remains in PROJECT_SUMMARY.md.

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
| Events / `/` | Destination | Pending full pass; picked player, live match, house and no events. |
| Event / `/events/[id]` | Destination | Current refinement: room callout; full pass pending. Own matches, simultaneous games, setup/history. |
| Room / `/events/[id]/room` | Live operations | Current refinement: clock shading, controls and report popout. Full state pass pending: posted, playing, paused, elapsed, bye, completed. |
| Tournament / `/tournament/[id]` | Live operations / setup | Current refinement: shared report copy/controls. Full pass pending: setup, seating, round, corrections and finish. |
| Tournament result / `/tournament/[id]/match/[matchId]` | Task | Required counters already verified; current refinement removes repeated instructions. Recheck posted/read-only/correction states. |
| Quick-game result / `/events/[id]/match/[matchId]` | Task | Pending: pod, team, draw, optional decks and replay. |
| Start game / `/events/[id]/play` | Task | Pending: format/player selection, optional details, validation. |
| Create tournament / `/events/[id]/tournaments/new` | Task anchor | Pending: formats, round count, optional pack/prize fields. |
| Statistics / `/events/[id]/stats` | Destination | Pending: category/day filters, no results, names/art and table overflow. |
| Event players / `/events/[id]/players` | Utility destination | Pending: joined/unjoined profiles and invite entry. |
| Event tools / `/events/[id]/manage` | Task | Pending: membership, QR/code, copy feedback, corrections and permissions. |
| My decks / `/decks` | Destination anchor | Pending full pass: gallery, empty, inspector, new/edit, artwork choice and delete confirmation. |
| Playgroup / `/players` | Destination | Pending: search, missing identity, long names and profile links. |
| Player / `/players/[id]` | Destination | Pending: own/other player and missing/long deck names. |
| Profile / `/profile` | Task | Pending: Player colors vs Appearance, field labels and save errors. |
| Create event / `/events/new` | Task | Pending: dates, validation and actions. |
| Pick a player / unbound `/` | Entry task | Pending: search, house mode, add name, focus. |
| Login / `/login` | Entry task | Pending: form-first phone, email/Google, errors and password controls. |
| Onboarding / `/onboarding` | Entry task | Pending; requires appropriate disposable account/session. |
| Guest / `/guest`, `/guest/[token]` | Entry task | Pending: claim, invalid/expired and already claimed states. |
| Invite / `/invite/[code]` | Entry task | Pending: valid, invalid/expired and existing-member states. |
| Seat/table join / `/join/sitting/[code]`, `/join/table/[code]` | Entry task | Pending: correct event/table context, invalid links and identity continuity. |
| Administration / `/admin` | Restricted task | Pending: permanent admin and denied access. Do not grant new access for visual review. |
| Legacy dashboard / `/tournament/[id]/dashboard` | Older implemented surface | Audit separately for reachability and intent; do not treat its old styling as the new standard. A redirect/replacement needs deliberate scope. |
| Redirects / `/events`, `/stats`, `/tournaments`, `/tournament/new`, `/guilds`, `/guilds/[slug]` | Legacy entry | Source currently redirects to Events. Verify destination/context; do not rebuild excluded guild features. |
| Redirects / `/tournament/[id]/seating`, `/pods`, `/deck`, `/play/casual` | Legacy entry | Source redirects to current tournament/start-game/event destinations. Verify actual routing; no separate style redesign. |

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
| Create tournament | Light/dark phone checked as the compact task anchor. Manrope task title and unchanged selection behavior. | Full setup/validation and zoom pass. |

Checks: TypeScript, targeted ESLint (zero errors/warnings), UX/required-score regression tests, production webpack build, CSS parsing and diff whitespace check passed. No live results or profiles were saved. Existing data may change independently while inspected.

Contrast at the strongest new shading endpoints: secondary text 4.63:1 dark / 4.90:1 light on the warm feature; action text 6.43:1 at the darkest primary-button stop. Existing reduced-motion rules still suppress transitions/animations. These endpoint checks do not constitute full accessibility certification.

Next complete page pass: **Events**, followed by **Event / Play**. Use the copyable prompt above and record all four theme/viewport combinations before closing each pass.
