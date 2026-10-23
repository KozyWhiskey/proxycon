# ProxyCon UI design system

**Version 1.1 · approved direction with owner-requested depth refinement · 23 October 2026**

This is the source of truth for ProxyCon's visual design. The owner selected **Ember Folio**, **Quiet Frame**, the **five-mana divider**, and **simple neutral navigation** through visual review. These decisions supersede the earlier palette, typography, decorative-frame and navigation proposals in UX_DESIGN_REVIEW.md, old mockups, and the current application where it differs.

This document specifies the approved target. The shared system has been implemented; see [implementation verification](UI_IMPLEMENTATION_VERIFICATION.md) for tested coverage and remaining limits. PROJECT_SUMMARY.md remains authoritative for behavior, permissions, data and product scope. A visual example never authorizes a new feature or a change to tournament rules.

## Reference package

- [Visual reference](design/visual-reference.html): open in a browser; inspect the style sheet, player phone, room, statistics and setup in both themes. Sample names, dates and results are illustrative. Controls simulate local feedback and never write application data.
- [Reference stylesheet](design/reference-tokens.css): exact semantic colors, type, spacing and component-state values. This is documentation, deliberately not imported by the application.
- [Screen guidance and audit notes](UI_SCREEN_GUIDELINES.md): what to preserve, improve and verify on each destination.
- [Page audit prompt and tracker](UI_PAGE_AUDIT.md): repeatable one-page reviews with evidence and completion criteria.

When examples and prose disagree, this document and the reference tokens govern. Fix the example; do not silently create another design direction. The mockup is a visual guide, not a pixel-perfect specification for every workflow or state.

## 1. Product character

A polished Magic game-night companion for one friend group of roughly 10–12 people. Welcoming, clean and quietly distinctive, with substantial statistics and dependable tournament controls. Think of a well-kept collection and a comfortable house table.

Keep charcoal, warm orange, layered opaque surfaces, commander artwork, readable data, and the room destination “Take a seat. Run the room.” Build character through typography, actual Magic imagery and restrained mana details. Keep everyday navigation and forms familiar.

Do not introduce a new accent palette, fantasy control shapes, glowing gradients, glass panels, noisy textures, ornamental frames, or decorative “AI sparkle” styling. Do not turn every section into an equally prominent card. Do not flatten the room by reducing the clock, result controls or standings to tiny utility elements.

## 2. Colors

Use semantic roles, not page-specific hex values. Both themes are first-class designs; neither is an inversion or an afterthought. Light, Dark and System are per-browser appearance preferences, resolved before first paint. Player colors are a separate setting.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| Canvas | `#F2F4F5` | `#12161B` | Page background |
| Surface | `#FFFFFF` | `#1C232B` | Panels, forms, menus and dialogs |
| Soft surface | `#E8EDF0` | `#28323D` | Grouping and quiet row emphasis |
| Text | `#1B222A` | `#F1F3F5` | Headings, body, names and values |
| Secondary text | `#53616F` | `#AEBAC6` | Helpers, timestamps and metadata |
| Border | `#CCD3DA` | `#45515D` | Structural dividers and panel boundaries |
| Action | `#FF873E` | `#FF873E` | Main action; limited functional accent |
| On action | `#21170F` | `#21170F` | Text and icons on orange |
| Text link / focus | `#A84209` | `#FFA469` | Links and visible focus |
| Navigation selected | `#E9EDF0` | `#303B46` | Current destination background |
| Navigation hover | `#F2F4F5` | `#26303A` | Hover on an inactive destination |

The action orange with its dark text is approximately **7.36:1**. Orange itself is not a body-text color on white. Never use white text on the pale peach fills seen in older result buttons. Borders are structural, not sufficient by themselves to identify an input or control; use text, shape and focus as well.

### Status pairings

| Meaning | Light text / fill | Dark text / fill |
| --- | --- | --- |
| Information / playing | `#24559B` / `#E8F0FF` | `#A3C9FF` / `#20334E` |
| Saved / success | `#176341` / `#E5F3EB` | `#83D7AA` / `#203C2E` |
| Attention / paused | `#815100` / `#FFF1D2` | `#F1C879` / `#3D321F` |
| Error / destructive | `#A92338` / `#FBE9ED` | `#FFABBA` / `#44242D` |

Always include a word or meaningful icon with status color. “Playing,” “Saved,” “Paused,” and “Couldn’t save” must remain understandable in grayscale. Use a neutral labeled loss state; losing a game is not an application error. Points, ranks and ordinary statistics use normal text rather than orange by default. Player identity, game status and button priority are independent color systems.

## 3. Type

| Role | Typeface | Sizes and treatment |
| --- | --- | --- |
| Expressive destination title | Fraunces | 28–36px phone; 36–44px desktop; 600; line height 1.15 |
| Opponent / featured name | Fraunces | 28–32px phone; allow wrapping |
| Compact task title | Manrope | 24–28px; 600; line height 1.2 |
| Section title | Manrope | 18–22px; 600 |
| Body and form fields | Manrope | 16px; 400; line height 1.5 |
| Buttons and navigation | Manrope | 14px; 600; line height 1.3 |
| Helper text and table cells | Manrope | 13–14px; line height 1.4–1.5 |
| Small metadata | Manrope / IBM Plex Mono | 12px; occasional uppercase, never a paragraph |
| Clock, aligned scores, records | IBM Plex Mono | Tabular figures; 48–64px room clock, 14–20px records |

Destination headings stay in Fraunces across My decks, Events and event dashboards, including the returning-player “Your games” heading. Featured event names on event cards also use Fraunces. Having a live match must not switch a destination to the task-title font.

Fraunces supplies destination character; use plain Manrope for setup, settings, dialogs and task-heavy room headings. IBM Plex Mono serves aligned data rather than every label. Wordmark: Manrope 700, compact tracking, restrained orange punctuation if used. Font fallbacks: Georgia/serif, system-ui/sans-serif, ui-monospace/monospace respectively.

Keep essential labels at least 14px; 12px is for supporting metadata. Form fields remain at least 16px on phones. Do not reproduce the smallest 10–11px labels in exploratory mockups. Respect zoom and wrapping; never shrink text to fit a name or a dense table.

## 4. Space, shape and surfaces

- Spacing scale: **4, 8, 12, 16, 20, 24, 32, 48, 64px**. Use 4px increments; document rare optical adjustments.
- Phone gutters: 16–20px. Tablet/laptop gutters: 24–32px. Typical panel padding: 16–24px. Section gaps: 24–32px.
- Panel/card radius: **12px**. Buttons, fields, selected navigation: **8px**. Status badges: **5px**. Small filter chips may be pills; ordinary buttons are rounded rectangles.
- Use a 1px neutral border for surface separation. Prefer spacing and dividers before adding another card. Do not nest cards solely for decoration.
- Surfaces behind text and controls are opaque. Artwork may be vivid; names and actions sit on solid surfaces. Use shared, restrained elevation for controls and overlays; ordinary content rows remain flat.
- A restrained orange top rule can identify the current personal match or round clock area. Do not stack orange frame, colored side rail, glow and multiple badges on the same component.

### Controlled depth (owner refinement, 23 October 2026)

The owner requested the earlier room shading and more tactile actions back. This refines Quiet Frame without changing the palette, typography or navigation geometry:

- **Round stage:** a 12% action-orange wash at the lower left over opaque surface/soft-surface shading. Preserve clock size, warning colors, round state and the existing orange top rule.
- **Room destination / ember feature:** a 30% orange wash toward the upper right over an opaque surface; Fraunces destination copy, a quiet warm boundary and a framed action label. No text over artwork or ornamental card silhouette.
- **Primary button:** shallow vertical shading using the existing hover/action/pressed orange values with dark action text throughout. Secondary buttons use surface-to-soft-surface shading, a fine inset edge and a small shared shadow. Pressed state becomes inset; disabled state stays flat. Keep 8px rounded rectangles and 44–48px targets. Navigation remains neutral and flat.
- **Popout:** opaque surface with a very light 4% warm tint near its top, a fine inset edge, 12px corners and one shared elevation shadow. Apply the same recipe to dialogs, popovers, select menus, identity menus and the clock-length popout. Maintain visible focus, Escape/close behavior and readable content. No blur/glass or animated glow.
- These are semantic recipes in the existing theme, not page-specific hex values or a second CSS system. Ordinary forms, tables and statistics remain quiet.

The rejected half-arch treatment must not appear on navigation or buttons. Default table-number blocks are simple rounded rectangles too; do not extend the rejected arch into new controls.

## 5. Mana signature, identity and artwork

### Five-mana signature

Use the existing mana assets in **W–U–B–R–G** order, with short thin neutral rules on each side. Symbols are approximately 15–16px with 3–4px gaps. Center the group within its local heading area; keep it small and quiet.

Use at most one signature in an expressive destination header: event overview, statistics, deckbox, or an appropriate player destination. Do not put it above every section. Omit it from settings, setup, login fields, result dialogs, live table controls and the working room clock area. Treat a purely decorative signature as hidden from assistive technology. It is not a clickable control or a status indicator.

### Player and deck identity

Use existing white, blue, black, red, green or two-color mana identities. Keep the same symbols and ordering across profiles, seats, room and decks. Display the name beside the symbol; describe the chosen colors in settings. Call the setting **Player colors**, separate from **Appearance**. A two-color identity shows two symbols, not a third invented blended brand color. White and black symbols must remain distinct on both surfaces. Avoid unlabeled dots that resemble online-presence indicators.

### Commander artwork

Preserve real commander artwork and recognizable crops. Use collection cards, profile decks and meaningful statistics features. Keep a consistent crop within each component and avoid covering faces or focal features with text. Keep deck/commander names outside the image on solid nameplates. Support long names, partner pairs, missing art and missing optional decks. Missing artwork gets a quiet neutral placeholder, not unrelated fantasy imagery. Do not restyle or distort Magic logos and symbols to make a new UI icon family; use existing assets for Magic identity and one consistent Lucide icon family for interface actions.

## 6. Navigation

The agreed event destinations are **Play · Stats · Players · Room**, in that order. Preserve event context and a reachable event switcher/back-to-events action through game and tournament routes. Account maintenance belongs in identity/utility controls, not above the active match.

Desktop: compact top navigation. Current destination uses a neutral filled **8px rounded rectangle**, normal text color, and the same icon/label arrangement as its peers. Inactive links use secondary text; hover uses the neutral hover fill. No underline, arch, orange rim, decorative diamond or per-tab color. Selecting a page does not change its dimensions. Reserve orange for the main task action.

Phone: one event navigation at the bottom with icons and visible labels, the same order and neutral selected treatment. Avoid duplicating it with a second event-tab row. Respect safe areas and leave enough content padding when sticky. Keep the room accessible, but place the returning player's match before its promotional callout. Utility and signed-out screens need appropriate contextual navigation rather than pretending to be inside an event.

Use links for destinations and expose the current page programmatically. Use tabs only for switching related panels within one page. Format/day filters must look subordinate to primary navigation. Keep visible keyboard focus, hover and current-page states distinct.

## 7. Buttons, inputs and interaction states

| Component | Required behavior |
| --- | --- |
| Primary action | Orange fill, dark text, 8px radius, 44–48px height. One highest-emphasis action per task area. Hover `#FF9D61`; pressed `#F47A30`. Never save a result merely by selecting a winner. |
| Secondary action | Surface fill, neutral border, normal text; soft neutral hover. Use for alternate tasks and substantial room result controls. |
| Text action | Theme link color, clear label; adequate target spacing. Use for subordinate navigation/options. Inline prose links are underlined. |
| Selection | Neutral soft fill plus theme link-colored outline and an explicit checked/selected indication. Same-size peers. Selecting is distinct from saving. |
| Disabled | Soft fill and secondary text; no hover or press feedback. Explain non-obvious prerequisites nearby. For the familiar game-win counters, the owner requested a compact label and disabled save at 0–0 without a permanent instructional paragraph. Do not disable through color alone. |
| Pending | Keep width stable, show “Saving…”/“Starting…”, prevent duplicate submission and retain context. Announce completion or failure. |
| Destructive | Clear verb and object. Low emphasis until relevant; explicit confirmation for irreversible deletion or consequential state changes. Do not make losses red destructive actions. |
| Input | Persistent label, 16px text, 44–48px minimum height, surface fill and neutral boundary. Focus ring outside the control. Placeholder is an example, never its only label. |
| Invalid input | Error-colored boundary and specific nearby message. Preserve values; focus/announce the issue appropriately. |

Use sentence case and specific verbs: **Report result**, **Save result**, **Save correction**, **Start round 2**, **Pause clock**. Avoid “Submit,” ambiguous icon-only actions and ornate fantasy terminology. Button icons are typically 16–18px. Primary touch actions should have at least 44px effective targets; keep neighboring targets separate.

Focus: 2px ring in the theme link color with a 2px surface-colored separation. Do not remove keyboard focus. A one-pixel press movement is optional; layout must remain stable. Do not lower essential disabled helper text with blanket container opacity.

Tournament result flow: always-visible +/− game-win counters for each player → required score (for example 2–0 or 2–1) → derived winner/draw and concise score review → save → confirmed outcome. Do not show winner-choice buttons or hide the score in an optional disclosure. 0–0 cannot be saved; equal positive scores mean a draw. Quick pod/team games retain their winner/side selection and optional decks. Use the compact “Games won” legend, named counters and one derived result preview. Omit permanent counter instructions, the 0–0 tutorial and a second repetition of the same names/scores. Corrections preload the current result/score and show what changes. Errors keep the draft and offer retry. Exact game/round consequences follow PROJECT_SUMMARY.md.

## 8. Responsive hierarchy

Breakpoints are layout guides, not device detection: below 640px phone; 640–1023px compact/tablet; 1024px and above expanded. Reflow earlier whenever content needs it. Verify at 320, 390, 768, 1024 and 1366px, plus 200% zoom.

**Returning player phone:** identity/event → own tournament table, opponent, round state and action → simultaneous Commander game → event records → other live activity → room/discovery and history. Show the main match information in the first practical phone view. Avoid a large hero pushing it down.

**House room:** compact shell → selected tournament and round state → substantial clock and controls → pairings and standings together at laptop sizes → secondary tools. No personal sidebar. At 1366 × 768 with eight players, aim to keep all four result controls and the eight-row standings prominent without shrinking text. With 12 players, retain legibility and allow natural page growth rather than forcing everything into a viewport. At narrower widths stack pairings and standings; do not scale the entire desktop layout down.

**Forms:** compact direct heading, one readable column, progressive disclosure for optional fields. Default form maximum width around 640px. Avoid repeated explanatory heroes above setup or settings.

Long names wrap. Numeric columns align right and use tabular figures. Prioritize essential table columns; move tiebreak explanations into labeled details before reducing font size. Use contained horizontal scrolling only when meaningful table columns genuinely cannot reflow.

## 9. Data, feedback and empty states

- Keep event scope visible. Separate Commander, team games and tournament matches. Do not combine unlike records into a misleading total or career ranking.
- Label counts, denominators and percentages. “1 win / 3 games · 33%” is clearer than an isolated large 33.
- No games means **— / No games yet**, not a meaningful 0% rank. Empty formats explain what will appear and offer a relevant action when permitted.
- Distinguish **Pairings posted**, **Playing**, **Result saved**, **Paused**, **Time elapsed**, **Finished**, and **Needs finishing again**. Time elapsed never means a result was entered.
- Keep names, scores, table numbers and controls stable during live updates. Preserve open forms and focus. Show connection interruption and retry truthfully; never imply an unsuccessful write was saved.
- Loading placeholders preserve approximate layout and have readable loading text. Error and empty states inherit the same theme as the page, including menus, dialogs and notifications.
- Update announcements should be polite and concise. Do not announce every clock tick.

## 10. Voice and motion

Welcoming, clear and lightly playful. Use “game,” “draft,” “seat,” “table,” and “room.” Task instructions stay direct. Humor belongs in optional commentary or a small celebration after the factual result. It must never obscure the outcome, shame a player, or appear in an error message.

Snarky AI commentary is **future scope**, not part of this design implementation. If later approved, distinguish commentary from official results, keep it optional and collapsible, and preserve the underlying facts and controls.

Use approximately 120–180ms for hover/focus feedback and 180–240ms for a meaningful state transition. No continuous glow, pulsing, animated countdown digits, confetti loops or surprise layout motion. Honor reduced-motion preferences and provide the same feedback without animation.

## 11. Rules for future agents

1. Read PROJECT_SUMMARY.md and this document before UI work. Reuse the existing component system and semantic roles; map these reference tokens into it rather than layering a second theme system over the old one.
2. Preserve approved colors, fonts, navigation, mana usage and responsive priorities. A request to fix one screen does not authorize a redesign of the shell or palette.
3. Prefer shared component fixes over per-page overrides. Search for all uses of a component before changing it. Do not add hardcoded white/navy/orange variants inside one screen.
4. New components must specify light/dark and default, hover, focus, selected, disabled, pending, error and success states as applicable.
5. Propose substantive design-system changes with visual examples and an explicit decision before replacing this direction. Routine improvements within these rules do not need another approval cycle.
6. Update this document, tokens and visual reference together when an approved design decision changes. Record the date and reason. Mark exploratory examples as superseded; never treat old carousel selection state as approval.
7. Do not infer product scope from illustrative data or create guilds, badge systems, all-time rankings or other excluded features. Visual changes must preserve actual authorization and tournament behavior.

### Verification for UI changes

- Inspect affected screens on phone and laptop in light and dark, including a real open menu/dialog and applicable states.
- Check normal text contrast at least 4.5:1, large text 3:1, and meaningful control boundaries/indicators at least 3:1 against adjacent colors. A neutral panel border need not be an interactive indicator. Test actual composited backgrounds rather than assuming token names guarantee accessibility.
- Check keyboard operation, visible/unobscured focus, labels, 200% zoom, long names, color-independent status and reduced motion.
- Confirm the player-first phone view and readable room pairings/standings. Do not optimize a screenshot by hiding necessary information.
- Run checks appropriate to changed code. Documentation-only updates do not need new implementation tests.
- Record remaining gaps honestly. This design approval is not evidence of a complete every-screen/state accessibility audit or a playgroup usability test.

## Decision record

| Decision | Approved outcome |
| --- | --- |
| Overall direction | Ember Folio |
| Character level | Quiet Frame with controlled warm shading, tactile actions and raised popouts (owner refinement) |
| Magic signature | Small W–U–B–R–G symbols with short flanking rules |
| Navigation | Simple neutral rounded rectangle; icon and visible label |
| Rejected navigation | Half arch / Commander Arch, underline, decorative diamond; room rail is not the default |
| Generic sample | Replace “Character Boundaries” with an actual mana-signature example and usage rules |
| Themes | Equal light/dark support; System preference also supported |
| Delivery scope | Saved design specification and reference examples; no runtime styling changes |

Further refinement stays within this direction unless the owner explicitly changes it.
