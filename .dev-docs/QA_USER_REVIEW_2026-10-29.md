# ProxyCon user-facing QA — October 29, 2026

## Verdict

The central weekend experience is substantially better and usable. The house Room is the strongest destination. Personal assignments, deckless Commander reporting, replay, waiting/next-round transitions, corrections, and confirmed places all worked in the exercised flows.

**The entire approved plan was not accepted as complete by this review.** The tied-place path blocked adding a final even after reordering the tie. There were also concrete mobile layout failures and several unfinished workflow/presentation details below. **Correction during follow-up implementation:** F02's claimed Commander mismatch was a reviewer error and is retracted; see the corrected finding and the implementation follow-up ledger.

This is an independent screen-and-workflow review. Application source was not reviewed and automated domain/build tests were not used as evidence. No application fixes were made. Starting the existing preview added generated TypeScript include paths; those generated additions were removed afterward.

## Environment, evidence, and boundaries

- Reviewed the running local app at `http://localhost:3002`, using real navigation, forms, dialogs, and saved fixture results. This does not verify the deployed hosting environment.
- Phone viewport: 390 × 844. Additional narrow checks: 320px. House laptop: 1366 × 768. Room reflow also inspected at 768 and 1024px.
- Light and dark themes were exercised across representative destinations, not every state in both themes.
- Browser viewports are not actual iPhone/Android hardware, mobile Safari, or a real on-screen keyboard. Native-phone checks remain unverified.
- All result, tournament, agenda, and memory writes were confined to the pre-existing event **QA Disposable — Final verification 2026-10-22**, ID `5592b3bc-dfd7-4281-be5c-1226142177f8`. The event roster remained eight players. Normal selected-player preferences changed as part of navigation tests; no real event results were edited.
- Created two completed QA tournaments, two completed Commander games, two agenda plans, and one private, acknowledged-incomplete Limited memory. Fixtures remain available for reproduction. No memory was shared and no Commander deck was created or edited.
- The downloaded PNG is preserved at [recap-page-01.png](qa/2026-10-29/recap-page-01.png). It represents the earlier six-result snapshot, before the later sealed tournament test. Its timestamp correctly identifies that snapshot.
- Browser export automation encountered very long waits. Eventually page 1 downloaded and was visually inspected. That delay is not established as an application performance defect. All PNG pages and browser print/PDF were not verified.
- Development compilation delays, the Next.js development overlay, and development-server restart behavior are excluded from production UX conclusions.

## What visibly works

| Workflow | Observed result |
|---|---|
| Invitation without a selected player | Event name/date and “Choose your name to join…” appear without a false join error. Choosing an existing member reaches the intended event; roster stays eight. |
| House invitation | Opens the event Room without a selected player. |
| Sign-in and recovery entry | Phone sign-in is form-first. Show/Hide changes state. Invitation continuation survives into sign-in and recovery links. Missing recovery session shows expired-link guidance and retry. No email was sent and no credential changed. |
| Invalid invite | Direct “Invitation unavailable,” another-code entry, and Choose an event are present. |
| Remembered event | Selecting the fixture event, then reopening `/`, returns to that event. Explicit Events navigation remains available. Cross-device/provider-login persistence was not established in this review. |
| Current versus past activity | Personal tournament assignment comes first, with table/opponent/round/action. A simultaneous Commander assignment remains separate. Completed places and results move under the lower, collapsed Results section. |
| Finished Commander logging | Four-player draw saved with no decks or finishing order; explicit Save required; event confirmation offered View result and replay. |
| Replay | Retained the group, allowed Sid to be swapped for Michael, and created a different game. Original draw stayed unchanged. |
| Finishing order | Duplicate positions blocked Save with an explanation. Partial positions were accepted without changing the independently selected winner. |
| Team validation | Three-player Two-Headed Giant explains “Select 4 players.” Four players with missing sides explains the team requirement. Assigned teams produce named side-win choices. Switching to Commander removes incompatible team controls. No team result was saved in this review. |
| Draft setup | Created setup, added eight players, filled empty seats, saved “Kitchen end,” and posted pairings separately from starting the round. |
| Sealed setup | No seat map or orientation requirement; explains random round-one pairing. |
| House operation | Eight-player live Room shows all four report actions and eight standings rows together at 1366 × 768. No large personal panel, including when opened as a picked-name player. |
| Score reporting | Named +/− counters, disabled 0–0 Save, derived 2–1 win and positive-score draw, saved scores preloaded for correction, unchanged correction disabled. |
| Table naming | Room preserves “Table 1 · Dining table” and includes it in the waiting summary. Tournament detail is inconsistent; see F18. |
| Clock | Pause/Resume, explicit reset wording, and zero-time “Time called · Matches remain open…” were observed. Pause/Resume disappears at zero. |
| Waiting and next round | Personal win became “Result saved…1 table still open.” Last other table produced round-two assignment with Not started state. |
| Correction before next start | Round-one correction changed Craig’s next opponent from Michael to Miko and created a new next-match identity. Relevant consequence warning appeared. |
| Correction after next start | Reversing that old result kept Craig versus Miko and the same next-match identity. Warning said started later pairings stay fixed. |
| Finish and correction | Last result did not auto-Finish. Explicit Finish stored places. A later correction removed winner/place claims and said Finish was required again. Finishing again restored them. |
| Optional final without a required tie | Final completed and Finish placed Sid first despite 3 Swiss points versus Craig’s 6. Finished page explicitly explains that the final determined first place; Swiss points remain separate. |
| Commander head-to-head | Craig/Chris shared a draw and a pod both lost. Display showed 0–0, 2 shared pods, and expanded 1 draw / 1 neither won. No false win was awarded. |
| Stats scope | Commander/Whole weekend default; additional recorded October 29 date appears outside advertised October 22 dates. Tournaments hides format/day controls and says Whole event. |
| People | No current assignment is used instead of availability/presence claims. Contextual profiles retain event return/results links. Another player’s profile shows artwork-led decks without edit/delete controls. |
| Directory | Six normal rows visible at 390 × 844; search and quiet deck counts are present. |
| History | Case-insensitive “sCoTt” search finds the result. Opening a result and using Game history retains the filter URL and search value. Twenty-row pagination was not exercised. |
| Agenda | Required day/title only works. Literal “After dinner,” supplies owner, optional tournament link, and accessible reorder actions work. No round starts from adding a plan. |
| Concurrent agenda edits | Second edit is blocked, retains the proposal, and shows current saved title/revision review action. No silent overwrite. |
| Limited memory | Manually entered 17 Forests and one Llanowar Elves; draft saved; incomplete acknowledgement required before explicit confirmation. Confirmed memory survives reload, stays private, and phone saved view defaults to List. Desktop has both panes. |
| Refresh failure | Briefly stopped only the QA preview server. After the refresh interval, the loaded event remained visible with “Couldn’t refresh · showing data from [time]” and Retry. Server restored. Full reconnect/Retry success on the same retained tab is not accepted because development hot reload interfered. |
| Recap basics | Separate completed-format counts, confirmed tournament places, per-format records, generated timestamp, and numbered PNG pages. Private Limited cards/photos absent from visible recap and inspected PNG. |

## Findings to fix

P1 means a significant workflow or trust failure. P2 means a concrete usability/readability defect or missed approved behavior. P3 means polish or an additional enhancement. These are UI observations, not claims about implementation causes.

### F01 — P1 — Reordered ties still block adding the final

**Where:** Room → all results in → tied-place review → Add top-two final instead. Original criteria: FINISH-07 and the optional-final journey.

**Reproduction:** In `QA — Thursday usability draft` (`f3fc87d6-4618-4913-9d86-bba99ec25da6`), the completed one-round field had Craig, Scott, and Sid tied for the leading places. The UI showed Move up/down controls. Moved Scott above Craig; the visible podium changed to Scott/Craig/Sid. Clicking Add top-two final instead still returned “Break the tie for the place before adding the final.” Repeating after the order changed returned the same message. Ordinary Finish accepted that same reordered placing.

**Expected:** The tie review needs an explicit, understandable way to confirm the order and proceed into the final. If that action cannot use the order currently shown, explain the missing step beside it. Do not make the operator guess or change legitimate results to get past it. A separate untied sealed fixture successfully added a final, narrowing the failure to the tie path.

### F02 — Retracted false positive; selected-card clarity enhancement retained

**Where:** My decks → New deck → search Yoshimaru → choose **Yoshimaru, Beloved Companion** → expand optional details. Related: DECK-03, DECK-06.

**Correction:** The reviewer confused **Yoshimaru, Beloved Companion** with **Yoshimaru, Ever Faithful**. Beloved Companion is a distinct newer Reality Fracture card, and the observed mana cost and abilities belong to it. The original claim that these details disagreed with the selected identity was incorrect. The [official Wizards introduction](https://www.magic.wizards.com/en/news/feature/enter-the-echoverse-with-reality-fracture-design) identifies this newer card. Neither draft was saved; valid card data must remain unchanged.

**Retained enhancement:** Show a compact selected-card confirmation with name, mana cost, identity, artwork and printing. Separate read-only card details from editable Notes. A search that finishes after the user has typed a different name must not replace the newer entry. These are clarity/resilience improvements, not a correction to Beloved Companion's rules.

### F03 — P2 — Winner-first summaries keep loser-first scores

**Where:** Tournament detail, dedicated match result, history, and some result previews. FINISH-05.

Examples: **“Scott defeated Chris · 0–2”**, **“Miko defeated Craig · 1–2.”** Counters establish who has each score, but the summary reverses names without reversing score order.

**Expected:** “Scott defeated Chris, 2–0” and “Miko defeated Craig, 2–1,” or retain a consistently labeled original-player score line. Do not change stored results; change how the outcome is read.

### F04 — P2 — Name selection overflows at 320px

**Where:** Valid-invite name picker, 320px dark viewport. BASE-09, ENTRY-07.

Two-column name buttons extend past the right edge and the page has a horizontal scrollbar. A long event name also makes the task heading six lines tall before search.

**Expected:** No page-level horizontal scrolling. Allow a one-column roster at the narrowest width, and separate the event context from the compact task heading while retaining the invitation meaning.

### F05 — P2 — Date fields clip at 320px; validation is only a browser bubble

**Where:** Create event, 320px. BASE-09, TOOLS-09.

Start/end remain side by side and the year is clipped. Setting the end before the start produces a browser “Value must be…” bubble, rather than the requested nearby inline explanation.

**Expected:** Stack dates when full values no longer fit. Show persistent inline validation identifying which date needs repair. Preserve values.

### F06 — P2 — A match opened from history loses its tournament name

**Where:** Filtered history → tournament match. SCORE-02, PLAY-06.

The match header shows Round 1/Table 3 and Chris vs Scott. The back link becomes Game history; the tournament name is no longer visible. On phones the event title is absent from the bottom navigation too.

**Expected:** Always show a quiet tournament context line, even when the return destination is filtered history. Keep the useful history return link separately.

### F07 — P2 — Current round, viewed round, and Final are insufficiently distinguished

**Where:** Active tournament detail and Room. TOUR-07, PLAY-01, ROOM-11.

- Selecting Round 1 during live Round 2 swaps the cards to old matches beneath the unchanged Round 2 header/controls, without a visible “Viewing Round 1” heading in the live layout.
- Room shows **Previous round results** as soon as a round-one result exists.
- Completed Swiss matches are badged **Final**, while the optional championship match is also called **Final**.
- After adding the optional final, the tournament header still says **Round 2 in progress** and retains that round’s countdown, while the personal assignment says Final.

**Expected:** Distinguish “Live: Round 2,” “Viewing: Round 1,” “Result recorded,” and “Final in progress.” Name start actions with the round number. Include the final explicitly in round/history navigation.

### F08 — P2 — Room does not bring Finish review to the top of the phone workflow

**Where:** Room after last required result. FINISH-01, BASE-06.

The status says ready to finish, but the review/Finish controls follow all four result cards. The zero clock still explains that matches remain open even though every result is recorded. With a positive clock, the completed Swiss round continues showing Remaining this round.

**Expected:** Promote a clear Review places and finish action alongside the ready state, linking/focusing the review. Reduce irrelevant clock prominence after required play is complete. Preserve explicit Finish and any applicable final option.

### F09 — P2 — Resetting a paused clock also resumes it without saying so

**Where:** Room clock → Pause → Change length → Reset clock to 1:00. ROOM-10.

The countdown changed from Paused to running after reset. The explanation only says resetting the countdown.

**Expected:** If restart is intended, say “Reset and start clock…” or explain the running-state consequence before applying it. Otherwise retain pause. The operator should not discover this from a ticking clock afterward.

### F10 — P2 — Recap breaks a player's name from their record

**Where:** Recap preview and actual page-1 PNG. RECAP-06, RECAP-07.

In the eight-player/six-result snapshot, page 1 ends with PLAYER RECORDS and Craig. Craig’s four format lines begin page 2. This is visible in the preserved export. Small content is spread across three pages by repeating No games for unused formats.

**Expected:** Keep a player and their record together; move a whole block to the next page. Keep section headings with their first useful entry. Use compact format columns or omit unused format rows with an explicit key. Make the recap feel like a shareable weekend memento, retaining the light print treatment and snapshot timestamp.

### F11 — P2 — Phone history and stats spend too much space before useful results

**Where:** History and Stats, 390 × 844.

History's title, five full-width filters, and actions put the first result below the initial viewport. Stats has two large two-row control groups, day controls, scope copy, and highlight panels before rankings. Head-to-head details wrap awkwardly in the narrow table.

**Expected:** Preserve all filters and URL state, but collapse secondary history filters behind a summary/count. Put search and recent results first. Tighten local Stats navigation and filter spacing; use a phone encounter row that keeps names, counts, and shared context readable.

### F12 — P2 — My decks still has the redundant count-only section

**Where:** Empty and nonempty My decks. DECK-02.

A separate saved-deck count sits between the hero/New deck action and the gallery, with its own divider and large vertical gap. In the nonempty long-name fixture, only the start of the first deck name fits before phone navigation.

**Expected:** Move the count into a useful heading/action line and remove the empty vertical block. Preserve artwork, solid nameplates, Fraunces destination character, and long-name wrapping.

### F13 — P2 — Manual Limited entry is buried beneath photo and empty-section UI

**Where:** New Limited memory, phone and desktop. MEMORY-05, MEMORY-06; additional workflow refinement.

The opening workspace is photo-led even after choosing Your deck. Manual entry sits below empty Main deck and duplicated Sideboard headings. During the basic-land autosave plus card search, Add cards & basic lands collapsed; the found card and Add this card action remained inside it. The query was preserved, but the next action disappeared until reopening it.

**Expected:** Provide visible Photo / Enter cards entry paths. Keep active manual-entry controls and search results open during background saving. De-emphasize the photo panel after a manual workflow is chosen. Do not expand recognition scope or change pilot privacy.

### F14 — P3 — Confirmed memories still ask to Finish review and Confirm again

**Where:** Reloaded confirmed incomplete memory. MEMORY-01, MEMORY-04.

The persistent header correctly says Confirmed memory, but Finish review and the orange Confirm deck memory button remain active without edits. The transient status still uses Changes saved.

**Expected:** Keep the successful confirmation visible near the final action and disable/relabel reconfirmation until changed. Use Draft saved / Changes awaiting confirmation consistently so people do not wonder whether the first confirmation worked.

### F15 — P3 — Notes reads like an editable note field but shows card rules

**Where:** Commander creation optional controls. DECK-04.

Notes labels the rendered mana cost/type/rules text; no editable notes field is visible there after selecting a Commander.

**Expected:** Clarify Card details versus a real optional Notes field. If notes are editable only through a later step, state that. A label-only rename has not made the concept clear.

### F16 — P2 — Utility/recovery screens do not share the finished task styling

**Where:** Forgot password, expired recovery, unavailable invitation. BASE-02, TOOLS-10.

These screens use small serif/default-looking headings and bare edge-aligned content, unlike the clear Manrope task headers and raised forms elsewhere. The unavailable-invite input and Try code button touch without useful separation.

**Expected:** Apply the same compact task treatment, readable spacing, and clear error/retry hierarchy. Keep destination typography where it belongs. Recovery also needs one sentence explaining the next step; sending/receiving the email was not verified.

### F17 — P3 — Assembling the group takes too many individual actions

**Where:** Tournament setup.

Eight players require eight individual Add actions and responses. The section remains expanded with “Everyone is already in this tournament” before round one starts. Zero-player setup can say Seats ready in Room, while detail recommends three rounds for zero players.

**Expected:** Offer a visible selected roster and Add selected / Add all event players action with review. Summarize/collapse the completed assembly section. Recommend rounds after a meaningful group is assembled and avoid reassuring readiness words for an empty field. Do not silently alter configured rounds.

### F18 — P2 — Custom table label replaces its number in tournament detail

**Where:** Room-renamed Table 1 → tournament detail/history cards. ROOM-07, SETUP-10.

Room says Table 1 · Dining table, but the corresponding tournament pairing heading says only DINING TABLE. The score dialog correctly includes both.

**Expected:** Preserve Table 1 · Dining table consistently wherever the assignment appears. Do not introduce event-wide location carryover.

### F19 — P3 — Completed casual results repeat participants and empty metadata

**Where:** Completed four-player Commander result.

Winner/draw leads correctly, but each participant occupies a tall bordered card repeating Draw/Deck not recorded. The replay action is below that full list. The result has no obvious played-day context at the top.

**Expected:** Compact participant rows, quiet optional deck metadata, played day near the result, and a replay action immediately after the outcome as well as below details.

### F20 — P3 — Agenda dates and supply sentences could read more naturally

**Where:** Agenda list.

Day headings use ISO dates. Owner and note produce separate “Miko bringing supplies” / “bringing cube and spare sleeves” lines. Edit/reorder/remove controls are as visually prominent as the plan on phones.

**Expected:** “Thursday, Oct 22,” literal timing beneath the title, and a natural supply line. Put edit controls behind a simple Edit plans mode or quieter management area, retaining keyboard-accessible reorder actions. Keep the agenda loose; no attendance or automatic status inference.

## Further enhancements after the defects

1. **Next action on a saved result:** after saving in Room, offer Done / Next open table. The current dialog often immediately becomes a correction editor, requiring a manual close before continuing. Preserve focus/scroll and show truthful success.
2. **Current round shortcut while inspecting history:** a visible Return to live round action, with a quiet viewing-history label.
3. **Table location on the player's assignment:** use the same number plus custom label as Room; provide the draft orientation only when seating is the task.
4. **Compact phone filters:** active filter chips plus a single Filters action, retaining shareable URLs and Back behavior.
5. **A warmer recap:** a concise cover/highlight area, readable format-separated record table, tournament winners, and optional Commander artwork. Avoid emphasizing every participant's losses on the landing page. Full records can remain in the exported detail pages.
6. **Plain-language export buttons:** Prepare images / Choose pages, then Download page N. The first Download images button currently expands page controls rather than downloading a file.
7. **A clear no-current-game state:** a compact invitation to start/log the next game, keeping yesterday's results collapsed. The present ordering is correct; the empty panel can be shorter.

## Coverage against the approved plan

“Observed pass” applies only to the scenario actually exercised; it does not certify an entire acceptance family.

| Area | This review's disposition |
|---|---|
| A Arrival/recovery | Partial: existing-name invite, house invite, continuation links, visibility toggle and invalid/expired entry observed. New-name onboarding, Google/email login and delivered recovery flow not verified. 320px and utility-style defects remain. |
| B Home/events | Core priorities, date labels, open games on past dates, Events destination and remembered return observed. Cross-device persistence and date/time boundaries not verified. |
| C Personal state | Live, saved/waiting, next posted, ready-to-Finish and corrected-place states observed. Bye/drop and all seating variants not verified. |
| D/E Casual/replay | Four-player deckless draw/win, replay swap, optional partial order and duplicate validation observed. Retry/idempotency under ambiguous network outcome not verified through UI. |
| F Setup/seating | Eight-player draft fill/orientation/post/start and four-player sealed observed. Two pods, competing claims, odd players, six/twelve-player maps and all reshuffle consequences not verified. |
| G Active detail | Personal emphasis and compact reporters observed. Historical-round context, table numbering and final states need work. |
| H Room/clock | Eight-player laptop fit, focus without personal displacement, rename, pause/reset/zero states observed. Twelve-player density and multi-live-tournament preservation not verified. |
| I Reporting/corrections | Score/derived draw, dirty state, before/after-start consequences and post-Finish correction observed. Two simultaneous result editors were not exercised; agenda concurrency is separate evidence. |
| J Finish/final | Explicit Finish, cleared places, untied optional final and final-vs-Swiss explanation observed. Tied final workflow fails. Prizes, drops and early Finish not exercised. |
| K Statistics | Scope/format separation, URL sections/player, outside-date results and shared-pod semantics observed. All streak edge cases, full tied-win rankings and tournament bye exclusions not fully verified. |
| L People/profile | Roster, directory density, contextual profile links, public read-only collection and settings layout observed. Full ownership/admin boundary matrix not verified. |
| M Commander library | Artwork/gallery/create/search/optional hierarchy inspected without persisting a deck. Metadata mismatch and redundant count section remain. Manual override/partners/colorless/non-Commander save round trips not verified. |
| N Limited memory | Manual draft, autosave, incomplete acknowledgement, explicit confirmation, reload, privacy and layouts observed. Recognition/photo workflows, failed autosave, suggestions/Undo and sharing boundary matrix not verified. |
| O Tools/history | Invitation-first layout, configured house URL, copy fallback, search and filtered return observed. QR scan on hardware and twenty-result pagination not verified. Utility styling remains incomplete. |
| P Agenda | Minimal/full creation, reorder, linked existing tournament and stale-edit conflict observed. Removal confirmation and event-date-change rescheduling not exercised. |
| Q Recap | Correct earlier snapshot/places/counts and page-1 PNG observed. Pagination fails block cohesion. Full multi-page export, physical print/PDF, extreme names and new-data warning not fully verified. |
| R Freshness | Successful-update labels, editing pause, stale snapshot/error words and Retry presence observed. Development hot reload interfered with same-tab restart recovery; offline/reconnect and ambiguous-save recovery require further testing. |

## Remaining acceptance work

Do not mark the full release accepted from this review. Complete actual-phone keyboard/date/sticky-action tests; 200% browser zoom; systematic keyboard/focus and real screen-reader checks; measured contrast/touch targets; provider-login/recovery round trips; the account/nonmember/admin boundary matrix; simultaneous result/seat edits; retry-safe saves; two-pod/odd/12-player fixtures; dropped players/byes; prizes; all recap pages and browser print/PDF; and reconnect/failure recovery in a production build.

Recommended order at review time: fix F01, then result/context consistency (F03/F06/F07/F18), narrow-screen failures (F04/F05), Finish and recap (F08/F10), and finally density/clarity improvements. F02 was subsequently retracted. Retain the visual direction and the successful in-flight-versus-past hierarchy. Follow-up implementation and verification are recorded separately in [QA_REVIEW_IMPLEMENTATION_2026-10-29.md](QA_REVIEW_IMPLEMENTATION_2026-10-29.md).
