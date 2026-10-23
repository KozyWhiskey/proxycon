# ProxyCon UX review and redesign plan

> Historical assessment. The approved visual direction is now [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md) (23 October 2026). Its Ember Folio palette, typography, mana signature and simple navigation supersede the visual proposals below, including the green/brass palette. Product behavior follows PROJECT_SUMMARY.md. Findings here are historical observations; verify current behavior before treating them as open issues.

Reviewed 22 October 2026 against PROJECT_SUMMARY.md.

## Assessment and evidence

ProxyCon has a useful product model, but the interface does not consistently express its priorities. Its strongest idea is the personal match slip: who you play, where you sit, and what happens next. Make that the center of the phone experience. Make the house room an efficient working tournament desk.

Evidence: repository review of the current shell, home, event overview, tournament page, room, name picker, reporting, seating, setup and finish components; live browser inspection of name selection, house entry, an event and its room; responsive inspection at 390 × 844 and 1366 × 900. Player-specific screens were assessed from source rather than through another person's session. No games, seats, results or account settings were changed. This is an expert assessment, not a playgroup usability study. Live event data includes QA tournaments; unusual bye data is not evidence of a pairing-engine defect.

## Keep

- One event contains simultaneous tournaments and quick matches. This matches a weekend with friends.
- Pick a name without creating an account. Retain Google/email access for existing accounts and permanent administration.
- Personal opponent/table slips, ordered tournament first when someone has two games.
- Distinct Commander and tournament records; event-scoped stats rather than a combined lifetime ranking.
- Clockwise draft seating, player colors, two-pod support, and clear separation of draft seats from play tables.
- A room that works on one tournament at a time, with tournament switching.
- Optional decks, optional game scores, optional prizes, and replay with the same pod.
- Visible focus styling, reduced-motion handling, and an existing mobile navigation foundation.

## Critical findings

| Priority | Current evidence | User consequence | Proposed change |
| --- | --- | --- | --- |
| P0 | `loadEventBoard` makes `joined` depend on a player ID. House mode has no player ID. Room controls, reporters and quick-match creation depend on `board.joined`. The live house room had no operating controls. | The shared laptop can view the tournament but cannot perform its intended job. | Model the house browser's permitted event operations separately from player membership and permanent administration. Enforce the same distinction in actions and database policies. Validate end to end. |
| P1 | House navigation still contains My decks/My profile and describes House screen as Your player profile. Event cards prompt the house to Join event. | The shared computer appears to need a personal identity. | Give house mode an explicit shell and event selection, with Room as its default destination. Provide links to event overview, quick-game setup and results without assigning a player. |
| P1 | Mobile has global bottom navigation plus event tabs. Global destinations are Events, My decks, Players, Profile. Tournament routes leave the event layout and its tabs. | Navigation emphasizes account maintenance and changes context during the main task. | Inside an event use Play, Standings, Players, More; keep the event name/switcher visible. More contains decks, profile, Room and event tools. Preserve event context on tournament/match pages. Keep all-events navigation outside the event. |
| P1 | Event overview renders all tournaments before quick matches. Live data put completed QA tournaments before current table activity. The personal slip follows the page heading/action area. | Someone checking a phone must scan historical or administrative content. | Order: identity/event, personal games, personal records, happening now, joining/seating, recent results. Put finished tournaments in history. |
| P1 | A tournament phone page combines player information with settings, adding players, seating tools, all pairings and reporting controls. | A player must distinguish their next action from tournament operations. | Lead with My match and current record. Put the wider pairings/standings below. Keep shared tournament tools reachable through a clearly labeled disclosure; this is progressive disclosure, not a new permission restriction. |
| P1 | Winner buttons save immediately. Correcting a result uses the same reporter, initialized without the existing game counts. | A wrong tap can change standings; an operator lacks a clear before/after comparison. | Select outcome, review a plain-language summary, then Save result. For corrections, preload the existing result and score and show the change and any downstream pairing impact. Preserve drafts on errors. |
| P1 | LiveRefresh polls every 20 seconds, suppresses refresh during focused fields/dialogs, and appears in multiple nested surfaces. No freshness indicator is provided. | Players cannot tell whether pairings are current; screens may lag or refresh redundantly. | Deduplicate updates, refresh on return to the tab, show Updated just now/Connection interrupted, and offer Retry. Use event subscriptions if appropriate, retaining a fallback. Never claim a failed result was saved. |
| P1 | Global styles set `color-scheme: light`; many component colors are hardcoded. | A dark-mode toggle alone would create mixed or unreadable surfaces. | Replace literals with semantic theme tokens and support Light, Dark, System. Audit every interaction state in each theme. |
| P2 | The room retains a 236px personal sidebar and a very large round/clock masthead. | At laptop dimensions less space remains for tables, standings and actions. | Use a compact house header, bounded clock scale and a working tables/standings layout. Keep an enlarged read-across-the-room clock as an optional presentation choice. |
| P2 | Finish is a disclosure below the room; tie resolution requires manually numbering names. | The most important final action is easy to miss and unnecessarily error prone. | Promote Finish when the last scheduled round is complete. Review full standings, resolve ties with move-up/down controls, preview prizes, then Finish tournament. Keep ending early separate and explicit. |
| P2 | Small uppercase utility labels and repeated rounded white panels carry much of the design. | The product resembles a generic dashboard and critical information lacks a distinctive hierarchy. | Build identity through the match slip, seating geometry, restrained card-frame details and typography. Reduce containers and decorative labels. |

The house capability fix must not make picked names administrators. Anyone using the house laptop can operate permitted event/tournament tasks; permanent account administration remains separate. Do not solve house access by impersonating a player or by hiding controls only in CSS.

## Phone experience

Returning to the app should answer three questions in a glance: who am I playing, where, and has the round started?

Illustrative content only:

```text
ProxyCon 2026                       Chris ▾
Friday · Weekend total

YOUR MATCH                  Round 2 of 3
Table 3
Chris vs Scott
Pairings posted · Not started
6 points · Match record 2–0
                         [View match]

YOUR COMMANDER GAME
Kitchen table · Craig, Miko, Sid
                         [View game]

Commander 3–2       Tournament 2–0

Happening now
Cube · Round 2 · 2 tables still playing
Commander · Dining table · 4 players
                         [Start a game]

Play       Standings       Players       More
```

When the round starts, the match action becomes Report result. Opening a match should go directly to that match rather than the top of a long tournament page. Clearly label Draft seat 6 separately from Play table 3. A bye needs its own language: You have the bye · 3 match points, not a generic opponent slip.

When a result is recorded, replace the live action with the saved outcome, updated record and next-state explanation. Examples: Waiting for Table 2; Round 3 pairings posted; Tournament finished. No push notifications are needed.

Keep both personal games visible when someone is simultaneously in a tournament and Commander. Never infer that a player is unavailable solely because they have another live game.

First visit: show the roughly twelve names as readable choices with color markers; make Add a name secondary. Search is useful but should not require a keyboard before picking a visible name. Keep Use house screen immediately discoverable, rather than after a long name/add form. Show Playing as Chris and an explicit Switch player action after selection. Account sign-in remains available but is not the phone entry requirement.

Quick match: format → names → Start game. Default to Commander and today; progressively reveal other formats. Deck selection and day overrides remain optional. Preserve Start game versus Record a finished game. After saving, return to the event with confirmation and a clear Play again action carrying players and decks forward.

## House tournament desk

Use a task-specific shell, not the player's desktop sidebar. The shared laptop is a persistent room session, not an administrator's personal account.

```text
ProxyCon 2026 / Room       [Friday cube ▾]      House screen
Event overview       Start quick match       Event results

Round 2 of 3     32:18 remaining     2 of 4 results recorded
Started 8:12 PM   [Pause clock]             [Round options]

TABLES                              STANDINGS
Table 1   Chris vs Scott             # Name    Pts  Record
Playing   [Report result]            1 Chris    6   2–0
Table 2   Miko vs Craig              2 Miko     3   1–1
Playing   [Report result]            ...
Table 3   Sid beat Ryan 2–1          [Tiebreak details]
Recorded  [Correct result]

Waiting for Tables 1 and 2
```

During setup, the main area becomes the clockwise seat chart with joined/unseated names nearby. Show a persistent readiness checklist: joined players, unseated players, rounds, round length, pod split. Randomize offers Fill empty seats or Reshuffle everyone, with a plain description of the effect. Preserve tap/select and keyboard controls; dragging must be optional.

Make state changes explicit:

1. Setup: Add players, assign seats; primary action Post pairings.
2. Pairings posted: show opponent/table immediately; primary action Start round. Clearly explain what will lock.
3. Playing: report/correct results; pause/resume clock; name remaining tables.
4. All results recorded: next pairings post automatically; primary action Start round N. Do not suggest manually generating them again.
5. Scheduled rounds complete: primary action Review and finish, with optional top-two final before Finish.
6. Finished: show winner, places, optional prizes and full order. Correcting a result visibly returns the tournament to Needs finishing again and clears official place labels as specified.

Keep quick matches on their own pages. The house header can open quick-game setup or return to the event overview; the room's table list remains scoped to its selected tournament.

During a running tournament use Position for provisional ordering; after Finish use Place. Keep points and record visible. Explain tiebreaks on demand, including who played tougher opponents. Never imply that game scores determine tournament ranking.

## Visual direction: the playgroup's draft table

The signature is a functional match slip: a pronounced table tab, paired player names, compact round/status band, and restrained frame corners. It should be recognizable even without artwork. Extend its geometry to physical seating and result rows; keep forms and navigation quiet.

Use the material vocabulary of a table full of sleeved cards: deep green playmat, off-white score slips, graphite text, restrained brass details. Avoid decorative mana wheels, full-screen fantasy art, glowing gradients, glass panels, badges and invented RPG terminology. One small original event illustration could support an event cover later, but functional screens should not depend on artwork.

Starting palette, subject to contrast testing:

| Token role | Light | Dark |
| --- | --- | --- |
| Canvas | Score slip `#F1F3ED` | Deep playmat `#121C19` |
| Surface | Card stock `#FFFFFF` | Raised sleeve `#1C2A25` |
| Text | Graphite `#1D2924` | Soft white `#EAF0E8` |
| Primary action | Forest `#245D49` | Mint `#9DD6B5` with dark text |
| Frame detail | Brass `#88672D` | Brass `#D3B878` |
| Border | Cool gray `#CCD6CE` | Moss gray `#3B4D43` |

Player colors are identity markers, independent of primary actions and result states. White/black markers need outlines; two-color identities can use split markers. Pair every state color with text so a red player never appears to have lost simply because of their identity color.

Typography proposal: restrained Beleren-like proportions for the ProxyCon wordmark, explored with an original treatment; test Spectral Semibold for tournament names/opponent names, Source Sans 3 for controls and body, and the existing Geist Mono for clocks/points. These are design candidates, not adopted dependencies. Avoid ornate fantasy type for controls or small text. Suggested mobile scale: opponent 28–32px, table 32–40px, body/control 16px, secondary text 13–14px. Use tabular numbers and stable widths for records and timers.

Use 6–10px corners for controls and 10–14px for slips; reserve pill shapes for small format filters. Replace decorative stacks of generic cards with purposeful dividers, seat numbers and player identity. Use very subtle texture only outside text-bearing surfaces. One short transition when new pairings arrive is enough; avoid continuous pulsing and clock animations.

Themes: Light / Dark / System, stored per browser so the house laptop and phones can differ. Set the initial theme before paint. Tokenize canvas, surfaces, borders, text, focus, hover, selected, error, success and disabled colors; remove hardcoded component whites/navy/purples. Both themes need independent contrast validation rather than simple inversion.

## Implementation order and acceptance

1. **Repair house operations.** Introduce explicit capabilities for reading, running an event, managing one's own profile/decks, and permanent administration. Verify the room, actions and database policies agree. Acceptance: from a fresh house session, create a tournament, add players, assign seats, post/start, report/correct, finish; no player identity or account administration is acquired. Verify quick-game setup and reporting separately.
2. **Restructure the player journey.** Add event-aware navigation, prioritize personal games, split live/setup/history, deep-link directly to a match, and keep tournament tools secondary. Acceptance: a returning player identifies opponent, table and state without scrolling on a 390px-wide phone; two simultaneous games remain discoverable.
3. **Build the working room.** Compact house shell, state-driven primary action, open-table reporting, persistent standings, readiness checklist and clear finishing flow. Acceptance: with eight players at 1366 × 768, open tables and next action remain prominent; setup works with two pods and no-phone players.
4. **Apply the visual system and both themes.** Build one slip, seat, result row, standings table and input system before styling every page. Acceptance: consistent focus, selected/error/disabled states; no mixed-theme surfaces, clipped names or color-only meanings.
5. **Validate with the group.** Run realistic tasks before polishing optional presentation details. Acceptance: initial name selection under 15 seconds, opponent/table found within 5 seconds, report result in about 10 seconds, and a different person can take over the house desk without coaching. These are proposed test targets, not measured results.

Test narrow phones at 360/390px, tablet portrait, laptop at 1366 × 768, both themes, keyboard navigation and 200% zoom. Test long names, partner commanders, no deck, byes, an odd field, two pods, dropped players, pre-start pairings, simultaneous games, ties, corrections before/after a later round starts, and a correction after Finish. Test two browsers claiming a seat or replacing a result concurrently; communicate conflicts rather than silently overwriting newer state.

Design for 44–48px primary touch targets. WCAG 2.2 AA's target-size criterion specifies 24 × 24 CSS pixels with exceptions; this plan deliberately uses larger targets for the table environment. Validate normal text at 4.5:1 and large text at 3:1. Sources: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html and https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html.

Keep the redesign within the spec: no required arrival check-in, push notifications, life tracking, money, guild system, badge economy or all-time rankings. Any conflict between the shared laptop's intended operations and current authorization is an implementation issue to resolve, not a reason to require a player login.
