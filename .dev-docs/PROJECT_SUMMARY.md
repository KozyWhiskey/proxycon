# ProxyCon product spec

Product end state, updated 27 October 2026. This file is the product.

Preserve existing accounts, profiles, and decks. A player profile does not require a login. A phone picks a name from the home screen.

The app is a quality-of-life tool for one friend group. It shows what is being played, what each person is playing, who they sit down against next, and the stats for that event.

The code still contains older surfaces (guilds, a personal trophy feed, badges, a global directory, and a legacy tournament dashboard route). Do not extend those. Change the product toward this spec. The working tournament surface is the **Room**, not the legacy dashboard.

Visual design follows [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md). Do not invent product behavior from mockups or screenshots.

## What it is

One event is the container. ProxyCon 2026 runs Thursday through Sunday. The same shape is a single MTG night. Any signed-in person can create an event. An event has a start date and an end date.

The expected weekend group is roughly twelve people. Different games can run at once. One live draft is the usual weekend, not a limit. A second tournament can sit in setup or be started. Two pods can share one draft. Commander can run beside any of that. An odd draft field uses byes.

Inside an event, quick matches and tournaments run at the same time. There is no separate host role. Any event member can create a game, leave a tournament in setup, assign or move a seat, report a result, and replace a result.

## Accounts and home

- One claimed profile per person. A profile can exist before anyone signs in, and it keeps that person's decks, seats, and results.
- **Unbound browser:** the first screen is the playgroup name list. A phone picks a name, or adds a name that is not there, and that browser stays on that player until they switch. No email, password, or Google account is required for that.
- **Bound browser:** after a name is chosen (or an existing account is signed in), the app resumes the last event selected by that profile. The preference follows the profile across devices. With no usable saved event it shows the event chooser. Explicit invitation/continuation destinations take precedence. Events always opens the chooser at /events. Anyone with a session can read and join any event without invitation or approval. Joining is what puts them into that event's games.
- Google and email sign-in remain for existing accounts and for the permanent admin. A picked name never becomes an administrator.
- The house laptop can open the room without becoming a player. Results are still stored on the players in the game.
- A signed-in playgroup directory shows player profiles and their decks. A player can read another profile, but only edit their own profile and decks. This is not a public directory or an all-time ranking.
- Each person sets a play name once. The Google name is only the suggestion. Changing the play name later updates every event already played. If they never set one, the Google name is kept.
- Each person can set a color: white, blue, black, red, green, or a two-color guild. The seat chart and the room use it.
- Event members and permanent admins can add existing player profiles to an event without that person signing in or joining themselves. Event members can add any event player to a tournament until Start round 1. Existing accounts and deck ownership stay unchanged. A player with no phone can still hold a seat.
- An invite link and a short code still work. The link must be an address the house can open (`PROXYCON_HOUSE_URL` on hosted deploys).
- There is no arrival check-in. A quick match is started by picking names from people who joined the event.
- There is no push notification. Opening the app shows a live opponent and table first.
- The event page shows your record for this event and the recent games.

## Quick matches

One table, one result, no rounds. Commander is always a quick match.

| Choice | Result |
| --- | --- |
| Commander, pod of 2 to 6 | One winner. Everyone else takes a loss. A draw gives nobody a win or a loss. Finishing order is optional and does not change the win. |
| $15, $30, cEDH, Planechase, Archenemy | Labels. The winner rule stays a normal pod. |
| 1v1, including Standard | Two people. One winner. |
| Two-Headed Giant | Two teams of two. One team wins. Both players on a team get that result. |
| Emperor or Star | The table reports the winning player or side. The app does not enforce combat rules. |
| Jumpstart | Two people, one game. |
| Winston or pack wars | Two or three people, one result. |
| Custom name | Any other table. Players and a reported winner. |

Start a game and Record a finished game are separate entry modes. Opening either creates only a draft. Commander is a family with an optional None/$15/$30/cEDH/Planechase/Archenemy label; stored identifiers and winner rules stay compatible. Recording needs only a valid group and winner/side or draw. Decks and partial nonduplicated finishing positions are optional. The winner is independent of finishing order.

Game two with the same group keeps format/label, players, sides and valid deck selections. It resets outcome, finishing order and day. Players/decks can be swapped before saving; missing identities require explicit repair. One stable request identifier per new draft makes retry return the same game. A successful result returns to the event with View result and Play again.

A Commander deck is stored on the profile: a name plus one commander, or two for partners. It remains for the next event. Budget-deck links are later. A result can be saved and the deck filled in with it.

## Limited deck memories

Behind `DECK_MEMORIES_ENABLED`, a tournament participant can save one current deck memory for a draft, chaos draft, cube, or sealed, with a main deck and optional manually organized sideboard. Take a photo, review suggestions, keep an autosaved draft, and explicitly confirm the list with retained photos and an optional note. Manual entry and main-deck basic-land counters always work. Memories never change tournament rules, results, or pairings.

- Choose Google Gemini, OpenAI, or Both · compare for each analysis. Both is the initial default; the browser remembers the last explicit selection. There is no silent provider fallback. Both reads independently and disagreements remain visible.
- A follow-up photo checks the corrected list by default. An explicit Additional cards choice proposes new copies. Rechecks never silently sum quantities, remove cards missing from a crop, or overwrite corrections. Suggestions require acceptance.
- Compact photo candidates show full natural card faces with explicit Add/Review actions, a shared card/evidence inspector, and toolbar Undo. Accepted stacks overlap actual card faces with printed title bands exposed and a full final card. Phones default to grouped List with selectable Stacks. Desktop shows review and deck together; phones use Review/Your deck tabs. Reopening prioritizes pending entries or collapses completed review history; accepting a card keeps its position during the current review.
- Owners can create, rename, reorder and delete custom main/sideboard categories, rename the built-in Sideboard label, and move selected copies between categories. Category identity and section are separate from names. Each canonical card remains one row; explicit copy allocations and an implicit automatic main-type remainder prevent doublecounting. Category deletion preserves cards in the same section. Main-only totals, confirmation, basic-land inputs, photo comparison and separate Sideboard text export preserve split copies. See [feature spec](DECK_BUILDER_FEATURE_SPEC.md) and [UX plan](DECK_BUILDER_UX_PLAN.md).
- Up to four private photos are retained. Hidden stack quantities remain manual. Draft autosave does not imply confirmation. Lists below 40 cards require the incomplete acknowledgement when confirming; unverified entries require acknowledgement. Editing a confirmed memory creates changes awaiting confirmation. A retained sharing choice never publishes an unconfirmed revision.
- Only the owner edits, reads private memories, or runs recognition. Picked-name sessions use the same profile ownership as accounts; house mode has no personal deck. Privacy follows the existing picked-name identity model.
- Owners may share confirmed lists and photos with the signed-in playgroup after tournament Finish. Unsharing stops new access grants; already-issued photo links expire shortly. A result correction does not silently revoke an existing sharing choice.
- Saved memories appear in My decks and tournament history. Commander decks stay separate. Copy/download, edit, share/unshare, and delete are supported. Unfinished drafts expire after 30 days without edits; confirmed memories stay until deleted.
- Limited memories use the same artwork-led gallery cards as Commander decks. Owners choose Use as showcase from a card inspector; one selection saves with the canonical card rows. Automatic artwork prefers a main-deck nonland and falls back safely when the chosen card is removed. Artwork selection changes no quantities, categories, privacy, or tournament data.
- Automatic sideboard/unused-pool scanning, Commander scanning, standalone imports, and live camera recognition remain out of scope. Manual sideboard organization is supported. See [DECK_MEMORIES.md](DECK_MEMORIES.md) for migration, configuration, evaluation, and pilot requirements.

## Tournaments

A tournament is a set draft, a chaos draft, a cube, or a sealed. Commander, Two-Headed Giant, and a one-off constructed game are not tournaments.

- The round count is chosen in setup. Six to eight players suggests three rounds. Nine to sixteen suggests four. It can be changed until Start round 1, then it stays fixed.
- Create tournament setup retains format/rounds/clock, with optional supplies and prizes. Creation does not post pairings or start play. Assemble the group, inspect readiness, explicitly apply the recommendation if desired, then Post pairings and Start round.
- People join the tournament before they have a seat. A draft or cube uses numbered seats. Sealed does not. Map/List are equivalent seat-assignment presentations. Each pod may have a descriptive top-edge orientation label; it never changes numbering or pairing rules.
- The seating screen draws those seats clockwise. The low numbers sit across the top from left to right, and the rest continue around the bottom. Tapping a seat assigns any player who joined.
- Each player claims a seat, or anyone hits Randomize. Randomize asks: fill empty seats, or reshuffle everyone who joined. Fill empty keeps existing claims, seats the unseated players, and adds seats if needed. Reshuffle gives every joined player a new seat and drops extra empty seats. The first claim on a seat keeps it. Anyone operating the room or tournament setup can move someone. A seat can be added.
- A large draft can be two pods with one leaderboard. Setup shows the split. Round 1 stays inside the pod. Later rounds may cross.
- Who is bringing the packs or the cube is optional: a person on the event, and a short note.
- Setup can name a 1st, 2nd, and 3rd prize in freeform text. Blank lines mean that place has no prize. A tournament without prize text still has standings, places, and the same Finish flow.
- A tournament still in setup, with no pairings posted, can be deleted by anyone on the event. Posted pairings that have not been started can be cleared, which returns it to setup. A started or finished tournament stays.

## Rounds

- Pairings post first. The phone shows the opponent before the round has started.
- Draft round 1 pairs across the pod. Eight players: 1 vs 5, 2 vs 6, 3 vs 7, 4 vs 8. Six players: 1 vs 4, 2 vs 5, 3 vs 6. Neighbors do not play. Draft seats freeze when those pairings are posted. Draft pairings are not swapped.
- An odd pod draws its round-1 bye at random among that pod, so the same seat does not always receive it. The remaining seats, in seat order, pair across. Seats 1 through 7 with seat 3 drawn out pair as 1 vs 5, 2 vs 6, and 4 vs 7. Two odd pods each draw their own round-1 bye. Later rounds give one bye only when the whole field is odd.
- Sealed round 1 is random. Anyone can swap two people until Start.
- Start round locks the field, locks the pairings, and records the start time. Results are entered after Start. The room shows when the round started.
- A round clock counts down from the length chosen in setup. The default is 50 minutes. Anyone can pause it, resume it, or change the length, which resets the countdown. The clock never enters a result. There is no buzzer.
- New players can join until Start round 1. After that, nobody new joins. A player can still drop. Their played results stay. They are not paired again.
- Later rounds are Swiss. Win 3, draw 1, loss 0, bye 3. A rematch is avoided when another legal pairing exists, and marked when it cannot.
- When every match in the current round has a result, the next round is posted on its own. The room names any table still open. Replacing a result regenerates that next round only before it has started.
- A later-round bye counts as a win. It goes to the lowest score among players who have not had a bye. If those scores are tied, it is random among them. If every remaining player has already had a bye, it goes to the lowest score, then the highest draft seat, or a random player in a sealed.
- Tournament results require a game score entered with plus and minus for each player, such as 2–0 or 2–1. Winner-only buttons are not used. A 0–0 score cannot be saved. The higher count is that player's games won. An equal count above zero is a draw. The score is shown on the match and the standings, and it never changes standings or prizes.
- Standings order is match points, then opponent match-win percentage. That percentage is the opponent's match points divided by the match points they could have scored, and byes are excluded. Then head-to-head when exactly two players are tied and they played each other. The screen says who played the tougher opponents. Game scores are not used. If those steps still tie, Finish asks someone to put one name first for the place and the prize.
- Pairings are labeled Table 1, Table 2, and so on. Anyone can rename a table. The draft seat and the play table are different.
- A wrong result can be replaced before or after Finish. Standings update immediately. Pairings for a later round can be regenerated only before that round starts. Once a round starts, every pairing in that round stays fixed, including matches with no reported result. Corrected standings are used for future rounds. A correction after Finish clears the place labels, keeps the prize text and a top-two final if one was played, and someone taps Finish again.
- Dropping before the current round has started removes that player, and the pairings can be regenerated. Dropping during a started match records a loss for them and a win for the opponent. They are left out of later rounds. Results they already played stay.
- A quick match with no result can be deleted. A reported quick match stays, and its result can only be replaced. A started tournament can be ended early. That is Finish with the current standings.
- Running match points stay visible during the rounds.
- When the set rounds are complete, someone taps **Finish**. Places are never locked automatically when the last result is saved. A top-two final is the only extra match, and it can be added before Finish. Finish labels 1st, 2nd, and 3rd from the standings, including anyone who dropped. The full order is shown.

## Stats

Stats are for the event that is open. They never roll into an all-time total.

The event has a dedicated statistics page with Overview, Players, Head to head, and Tournaments sections. Section/day/format/player persist in the URL. Overview defaults to Commander and Whole weekend; day choices include additional recorded dates. Tournaments always uses Whole event and confirmed places; Head to head shows both columns with day/player filters. Casual win bars show counts on a shared scale, with alphabetical tie ordering and no official ordinal ranks. Results from different kinds of games remain distinguishable.

- Commander wins and losses, by commander, including partner pairs. A draw is neither.
- Team-game wins and losses. Both players on a team share the result.
- Each tournament: match points and match record while it is played. Place at Finish.
- Head to head for the event, with Commander games and tournament matches in separate columns. Commander means wins in completed shared pods: both losing or drawing awards neither a win. Shared pod/draw/neither context remains visible. Tournament encounters count actual matches and exclude byes.
- The event uses America/Chicago. Each game has a day, defaulting to today in that zone. Anyone can change the day until the game is finished. Thursday and Sunday are visible on their own and in the event total.
- Most wins and streaks are separate for Commander and for tournament matches. A streak is consecutive wins in that column. A draw ends it. A tournament bye counts as a win. A loss ends it. The page shows the current streak and the best streak.
- The page also shows tournament titles, each player's match-win rate, and who played the most games.
- Each player on the event has a card: games played, wins, win rate, the commanders they played, their tournament places, and their recent games. The card covers this event only. There is no life-total history.

## Prizes

Prizes are optional freeform text for 1st, 2nd, and 3rd, entered during setup and shown with the tournament. There is no prize inventory. Nothing is stocked, claimed, or taken off a wall.

Finish labels the places. The prize text stays next to those places. If the math still ties, the person tapping Finish puts one name first. A repair after Finish clears the place labels and leaves the prize text in place. The tournament needs Finish again.

Quick matches do not name prizes. There is no money, buy-in, or paid tracking in the app.

## The room

The event page is the weekend overview: live tournaments, open quick matches, and recent results. Opening a tournament or a quick match goes to a page for that game alone.

The room is the working screen for one tournament. It is opened on a laptop or a tablet that anyone in the house can use. It is not a display-only board. Anyone on the event can seat players, post pairings, start the round, enter or correct a result, and finish. It shows the current round, the clock, standings, and open tables for that tournament only. When the event has more than one tournament, the screen can switch which one it is working. Quick matches are not listed on the room.

A quick match opens on its own page. Report the result there. After it is saved, the phone returns to the event overview.

One person can be in a live tournament match and a live Commander game at the same time. The phone lists both, tournament match first. Each slip opens that game’s page.

Words on the screen: game, draft, seat, table, room.

On a phone, a returning player's table, opponent, round state, and result action take priority over discovery content. Setup and settings use compact, direct headings. Room controls and standings must remain readable and usable at laptop sizes. Detail for surfaces, type, and navigation lives in the UI design system.

## Out of scope

- Life totals during a game
- Elo, badges, trophies, and a career or all-time ranking
- Judges, deck checks, and sideboard registration
- Double elimination
- A required finishing order in Commander
- Auction or rotisserie cubes
- Guilds and an unauthenticated public player directory
- Push notifications and an arrival check-in
- Joining a tournament after Start round 1
- Constructed rounds, and Two-Headed Giant with rounds
- Money
- A prize inventory
- Extending or restyling the legacy `/tournament/[id]/dashboard` as a second room (use Room instead; decide redirect later)

## Later

Budget-deck links remain later scope. Limited deck memories are implemented behind a pilot feature flag; live recognition accuracy and playgroup usability must be measured before wider release.

## Approved weekend usability additions · 27 October 2026

These additions were explicitly approved as one release. The [acceptance ledger](WEEKEND_USABILITY_ACCEPTANCE.md) records local evidence and remaining release gates; this behavior specification does not assert production deployment.

### Arrival and continuity

Invitation arrival resolves selected-player context, not authentication alone. Unbound browsers choose an existing name, add a name, use an account, or open the house screen. The event name and dates appear before joining. A missing identity is never an invalid invitation. A validated internal continuation travels through name creation, login/callback, onboarding and recovery; external or protocol-relative continuations are rejected. House arrival opens Room without joining. Recovery uses the existing auth provider at /login/forgot-password and /auth/reset-password, with neutral sent confirmation and expired-link retry.

### Returning players and the house

Personal status is derived from membership, seats, matches/results, final state and confirmed places, with no independently editable status column. Show seat/seating before pairings; table/opponent and Not started after posting; Report result once started; explicit bye/dropped states; saved outcome and remaining-table count while waiting; new assignment when posted; Review places and finish once all results arrive; confirmed place after Finish; Places need confirming again after a correction. Tournament assignments precede simultaneous casual games. Current tasks precede records and discovery on phones.

Home event date badges use America/Chicago inclusive dates: Upcoming, Happening now, Past dates; explicitly closed events say Closed. Past dates do not finish open games. House mode uses Choose an event/Open room language and never presents itself as a player. Events is a visible destination. Event navigation remains Play → Stats → Players → Room. Agenda, history and recap are contextual links from Play.

Tournament detail keeps one featured assignment and compact ascending table rows whose Report result opens a score editor. Named +/− counters are always visible for tournament reporting; reject 0–0 and derive the outcome. Corrections retain the expected-result snapshot and show a conflicting saved result beside the proposal before an explicit baseline adoption. Historical missing scores say Score not recorded. Completed detail leads with official confirmed places/prizes, then optional final, Swiss standings, round history and secondary memories. A final changes official first/second, never Swiss points.

Room focus removes personal feature panels, even in a player browser. Eight-player operation targets all four result controls and eight standings rows at 1366×768; twelve players grow naturally. Explicit selection persists. Finished tournaments are secondary. A table name always retains its number; custom labels affect that match only. Zero clock says Time called and leaves matches open. Changing length explicitly resets the clock.

### Contextual supporting destinations

/events/[id]/history includes completed casual games, tournament matches, finals and byes, sorted newest first with stable twenty-row pagination. URL filters cover day/player/format family/tournament/search, with canonical result links and return context. Event Players shows truthful assignments or No current assignment, Weekend results and Player profile. Profiles opened with an authorized event context offer Back to event and its weekend results. Global directories stay compact; deck/profile collections keep artwork-led cards. Profile settings lead with Play name/Player colors; appearance stays a browser preference. Optional avatar details never require an upload.

### Loose agenda

/events/[id]/agenda stores independent event plans: required day/title; optional literal timing, roster supplies owner, note and same-event tournament link; explicit within-day position, timestamps and revision. Existing event managers including house mode edit; other authorized readers read. Move up/down is accessible. Revision conflicts retain the proposed text and require review. Remove confirms and deletes only the plan. New dates must be in the event range; plans displaced by later event-date changes remain visible for rescheduling. There are no RSVPs, attendance, reminders, countdowns or automatic starts. Legacy sittings/signups/check-ins remain retired.

### Recap and freshness

/events/[id]/recap builds an authorized event-only snapshot using the same completed-result calculations and confirmed places as Stats. Unfinished play says Weekend so far/Places pending. Formats, player records, Commander highlights and prizes remain distinct. Private Limited lists/photos, emails, invitations and management controls never enter the export. Print/Save as PDF uses the browser with light pages; numbered PNG downloads use the same wrapped/paginated snapshot and generated timestamp. More data never rewrites an already downloaded file. Newer data prompts Refresh recap. There is no public share URL or upload.

Visible-tab live views retain the twenty-second cadence and refresh on return. Last updated means successful server retrieval. Offline/failed refresh retains the prior snapshot with time and Retry; reconnect remains Refreshing until retrieval succeeds. Editing pauses refresh without discarding drafts. A committed result and a later failed board refresh have separate feedback. This is in-tab resilience, not offline writes or installation.

### Additive storage and release requirements

- Apply scripts/sql/weekend_usability.sql: tournament pod_orientations/finished_at, unique match creation_request_id, event_agenda_items and capability/revision/atomic result/creation RPCs. finished_at preserves knowledge that places need confirming again; it is not a second status authority.
- Apply scripts/sql/weekend_memory_confirmation.sql after the existing deck_memories.sql and deck_memory_categories.sql: confirmed_revision, explicit confirmation semantics and confirmed-only sharing. No recognition expansion; the existing pilot flag and ownership boundaries remain.
- Existing identities, formats, seats/results/prizes/places remain intact. No agenda/orientation backfill is required and no standings/outcomes are rewritten. Apply migrations before serving the updated write workflows. Validate using disposable events, never real playgroup outcomes.

### Selected event and current-play priority · approved 27 October 2026

The entry route / resumes the selected player's remembered event after sign-in or name selection. /events is the explicit chooser and always stays accessible, including from Room focus. A valid explicit continuation/invitation wins over the remembered preference. Preferences belong to existing profiles; switching players never inherits another player's preference. House remembers its event against its anonymous device identity and resumes Room. Visiting an event destination records selection after navigation, never during link prefetch. Deleted/unavailable events fall back to the chooser.

The top personal area contains in-flight tasks only: seating, posted/live matches, byes, waiting for an ongoing tournament and required Finish. Finished tournaments and dropped-player records are historical. On Play they appear under a collapsed Past games & weekend results disclosure in the lower Results section, alongside personal weekend records, recent completed matches and completed tournaments. No last-place/loss panel leads a later visit. A just-saved result in an ongoing tournament uses a neutral waiting heading, with the outcome as secondary metadata and an explanation of what remains. The same derived current/past classification drives home and player roster status. Results/Statistics/History remain accessible when deliberately opened.

Additive storage: scripts/sql/weekend_event_preferences.sql creates weekend_event_preferences with an exclusive profile_id or device_user_id owner, event_id and updated_at, plus remember_weekend_event / remembered_weekend_event RPCs. Ownership follows the existing player-context resolver; direct authenticated writes are revoked. These preferences grant no event membership or management capability.
