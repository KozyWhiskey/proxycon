# ProxyCon product spec

Product end state, updated 21 October 2026. This file is the product.

Account scope update: preserve existing accounts, profiles, and decks. A player profile does not require a login. A phone picks a name from the home screen.

The app is a quality-of-life tool for one friend group. It shows what is being played, what each person is playing, who they sit down against next, and the stats for that event.

The code still contains older surfaces (guilds, a personal trophy feed, badges, a global directory). Do not extend those. Change the product toward this spec.

## What it is

One event is the container. ProxyCon 2026 runs Thursday through Sunday. The same shape is a single MTG night. Any signed-in person can create an event. An event has a start date and an end date.

The expected weekend group is roughly twelve people. Different games can run at once. One live draft is the usual weekend, not a limit. A second tournament can sit in setup or be started. Two pods can share one draft. Commander can run beside any of that. An odd draft field uses byes.

Inside an event, quick matches and tournaments run at the same time. There is no separate host role. Any event member can create a game, leave a tournament in setup, assign or move a seat, report a result, and replace a result.

## Accounts and home

- One claimed profile per person. A profile can exist before anyone signs in, and it keeps that person's decks, seats, and results.
- The home screen is the playgroup list. A phone picks a name, or adds a name that is not there, and that browser stays on that player until they switch. No email, password, or Google account is required for that.
- Google and email sign-in remain for existing accounts and for the permanent admin. A picked name never becomes an administrator.
- The house laptop can open the room without becoming a player. Results are still stored on the players in the game.
- A signed-in playgroup directory shows player profiles and their decks. A player can read another profile, but only edit their own profile and decks. This is not a public directory or an all-time ranking.
- Each person sets a play name once. The Google name is only the suggestion. Changing the play name later updates every event already played. If they never set one, the Google name is kept.
- Each person can set a color: white, blue, black, red, green, or a two-color guild. The seat chart and the room use it.
- Event members and permanent admins can add existing player profiles to an event without that person signing in or joining themselves. Event members can add any event player to a tournament until Start round 1. Existing accounts and deck ownership stay unchanged. A player with no phone can still hold a seat.
- The app opens on a list of every event. Anyone logged in can read and join any event, without an invitation or approval. Joining is what puts them into that event's games.
- An invite link and a short code still work. The link must be an address the house can open.
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

Game two with the same pod keeps the players and the commanders. Someone can be swapped before it starts.

A deck is stored on the account: a name plus one commander, or two for partners. It remains for the next event. Photos and budget-deck links are later. A result can be saved and the deck filled in with it.

## Tournaments

A tournament is a set draft, a chaos draft, a cube, or a sealed. Commander, Two-Headed Giant, and a one-off constructed game are not tournaments.

- The round count is chosen in setup. Six to eight players suggests three rounds. Nine to sixteen suggests four. It can be changed until Start round 1, then it stays fixed.
- People join the tournament before they have a seat. A draft or cube uses numbered seats. Sealed does not.
- The seating screen draws those seats clockwise. The low numbers sit across the top from left to right, and the rest continue around the bottom. Tapping a seat assigns any player who joined.
- Each player claims a seat, or anyone hits Randomize. Randomize asks: fill empty seats, or reshuffle everyone who joined. Fill empty keeps existing claims, seats the unseated players, and adds seats if needed. Reshuffle gives every joined player a new seat and drops extra empty seats. The first claim on a seat keeps it. The dashboard can move someone. A seat can be added.
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
- When the set rounds are complete, someone taps Finish. A top-two final is the only extra match, and it can be added before Finish. Finish labels 1st, 2nd, and 3rd from the standings, including anyone who dropped. The full order is shown.

## Stats

Stats are for the event that is open. They never roll into an all-time total.

The event has a dedicated statistics page so the group can see how everyone is doing across the weekend. Results from different kinds of games remain distinguishable.

- Commander wins and losses, by commander, including partner pairs. A draw is neither.
- Team-game wins and losses. Both players on a team share the result.
- Each tournament: match points and match record while it is played. Place at Finish.
- Head to head for the event, with Commander games and tournament matches in separate columns.
- The event uses America/Chicago. Each game has a day, defaulting to today in that zone. Anyone can change the day until the game is finished. Thursday and Sunday are visible on their own and in the event total.
- Most wins and streaks are separate for Commander and for tournament matches. A streak is consecutive wins in that column. A draw ends it. A tournament bye counts as a win. A loss ends it. The page shows the current streak and the best streak.
- The page also shows tournament titles, each player's match-win rate, and who played the most games.
- Each player on the event has a card: games played, wins, win rate, the commanders they played, their tournament places, and their recent games. The card covers this event only. There is no life-total history.

## Prizes

Prizes are optional freeform text for 1st, 2nd, and 3rd, entered during setup and shown with the tournament. There is no prize inventory. Nothing is stocked, claimed, or taken off a wall.

Finish labels the places. The prize text stays next to those places. If the math still ties, the person tapping Finish puts one name first. A repair after Finish clears the place labels and leaves the prize text in place. The tournament needs Finish again.

Quick matches do not name prizes. There is no money, buy-in, or paid tracking in the app.

## The room

The event page is the weekend dashboard: live tournaments, open quick matches, and recent results. Opening a tournament or a quick match goes to a page for that game alone.

The room is the working screen for one tournament. It is opened on a laptop or a tablet that anyone in the house can use. It is not a display-only board. Anyone on the event can seat players, post pairings, start the round, enter or correct a result, and finish. It shows the current round, the clock, standings, and open tables for that tournament only. When the event has more than one tournament, the screen can switch which one it is working. Quick matches are not listed on the room.

A quick match opens on its own page. Report the result there. After it is saved, the phone returns to the event dashboard.

One person can be in a live tournament match and a live Commander game at the same time. The phone lists both, tournament match first. Each slip opens that game’s page.

Words on the screen: game, draft, seat, table, room.

### Visual direction

Keep the charcoal-and-orange palette, commander artwork, layered surfaces, and the “Take a seat. Run the room.” destination. Visual character should help people find the next useful action. On a phone, a returning player's table, opponent, round state, and result action take priority over discovery content; event records remain close to their games. Setup and settings use compact, direct headings. Expressive display copy and prominent feature panels belong where they help explain a destination, rather than repeating above every form. Room controls and standings must remain readable and usable at laptop sizes.

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

## Later

Photographing a drafted deck, and attaching a budget-deck link, are capabilities to add after match tracking is solid. They are not part of the current build.
