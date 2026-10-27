# Proposed deck-photo review workspace

Research and implemented refinement · 26 October 2026. The natural-card refinement below supersedes the earlier crop proposal.

## Recommendation

Use compact, action-oriented photo candidates and a separate accepted deck organized into type stacks. Preserve Ember Folio, its semantic colors, typography and neutral navigation. Borrow Archidekt's density and progressive disclosure, while keeping explicit approval of photo interpretations.

## Research

- [Archidekt FAQ](https://archidekt.com/faq): documents adding through a card-level plus control, view/group/sort controls, and automatic saving.
- [Draggable Categories update](https://archidekt.com/news/7305181): documents card sizing, reduced margins, category organization, and a card context menu. Stable stack placement matters when adding cards.
- [Static card view and card controls update](https://archidekt.com/news/20605672): documents a shared card preview, optional card UI, and already-in-deck indicators. The March 2026 edit describes clicking a card for details and an ellipsis menu for other controls.

These sources establish interaction patterns. The design and dimensions below are recommendations for Upkeep, not claims about Archidekt's exact current measurements.

## Current problems

The supplied screenshot shows roughly 580px-tall tiles at about 240px width. Full artwork is followed by repeated identification, repeated provider commentary, a large evidence disclosure, Add, and Skip in separate vertical blocks. Cards with uncertainty receive nearly the same treatment as straightforward additions. The accepted deck is below the entire review list, so the relationship between an approval and its destination is difficult to see. The previous artwork pass improved recognition but retained too much form-like chrome around every card.

## Workspace

Desktop: compact toolbar and totals, then review candidates beside the accepted deck. Target approximately 55% review / 45% deck when sufficient width is available; switch to the phone interaction before either region becomes cramped. Keep one page scroll rather than trapping users in two independently scrolling panes. Card details open in one shared inspector; do not reserve a permanent third sidebar.

Phone: Review and Your deck tabs with persistent pending/deck counts and a compact toolbar. Review uses two columns, with a one-column fallback at narrow widths or increased text size. Your deck defaults to a compact grouped List; Stacks remains selectable. Avoid sideways board scrolling, hover-only controls and required dragging.

Photos, model choice, provider failures, export and notes belong in secondary disclosures/menus. Put provider-wide status above the review once; show per-card status only when actionable. A successful provider plus a failed provider is an incomplete comparison, not 22 independent warnings.

## Candidate cards and controls

Use the full natural card portrait at approximately 145–165px wide on desktop. A short Add/Review action row sits directly beneath it. Do not crop away the printed title, enlarge artwork to fill a fixed-height box, or repeat a visible name below the printed name. Accessible names remain explicit. Phone cards fill two available columns; dimensions remain content-driven rather than clipping faces.

Each candidate has one readable name, a visible observed quantity, and one primary 44px add target. Prefer a small rounded rectangle labeled `+ Add` or `+ Add 2` next to the quantity over an unexplained icon. On especially tight layouts a plus icon can have an accessible name such as `Add 2 Pactdoll Terror to your deck` and a tooltip; essential meaning must remain available on touch.

Use the existing orange action fill/dark text for adding and the existing success tokens plus check/text for Added. Do not introduce a new green action palette. Keep the name/quantity readable and avoid putting the action over the printed title or mana cost. A card tap opens details, never adds implicitly. Secondary actions live in a 44px ellipsis target: skip, evidence, and replace name. Evidence expands inside the shared inspector, including the existing highlighted region and explicitly paid Look closer action.

For new additions the action label includes the observed count. Quantity disagreements, ambiguous names and overlap with existing cards show `Review` rather than an unconditional plus. The inspector shows current versus observed quantity and explicit keep/use/additional choices. A follow-up photo never silently increments a deck count.

After approval, update the category and totals immediately. The candidate retains its position and displays `Added ×2` with a success check; it cannot repeatedly add through the same control. Keep a scoped Undo action and a Reviewed filter. Do not repack the grid under a user's pointer immediately after each press. A new quantity increase belongs in the accepted deck's controls. Announce the change with a polite status message. Disable repeat activation while a decision is being applied and preserve revision checks.

## Accepted deck stacks

Default desktop view: Stacks grouped by card type, with List as the accessible compact alternative. Groups: Creatures, Instants, Sorceries, Artifacts, Enchantments, Planeswalkers, Lands, Other. Hide empty groups. Headers show total copies, not merely distinct names. Use stable group order; sort names alphabetically initially. Mana-value sorting can follow after the data model supplies a canonical mana value.

Within each bounded 180px stack expose opaque readable name/quantity strips for preceding cards and one full natural card at the end. Do not repeat the final card as both a strip and a portrait. Category columns flow independently, without waiting for the tallest neighboring group. Touch controls remain at least 44px. Activating a card opens the inspector. Keep quantity, Replace and Remove controls there instead of repeating four buttons on every entry. No action requires dragging or hover.

On reopening a completed review, replace its candidate grid with a compact completion bar and Show reviewed cards. The accepted deck then uses the full workspace width. Do not collapse or repack the candidate grid automatically when the player adds the final pending card. New pending suggestions always reveal review. Keep Undo in the sticky toolbar instead of obscuring cards with a floating toast; failed provider retries remain visible while healthy reader details live in Photos.

Count each physical card once. Artifact creatures and enchantment creatures appear under Creatures; front-face/main-card identity governs double-faced/adventure cards, and the back face is available in details. Land cards go under Lands; an MDFC with a spell front is not silently counted as a land. Unknown/custom cards remain Other until classified. Define deterministic precedence for remaining multi-type cases rather than showing duplicates. Canonical Oracle identity continues to merge printings. Grouping is presentational and must not change deck legality, registration or tournament results.

Basic lands use compact number controls within Lands; do not require adding one visible top card at a time to reconstruct hidden piles.

## Bulk review

Replace vague `Add 20 listed cards` with an explicit action such as `Add 20 new entries · 23 copies` based on actual counts. Expandable preview lists included names/quantities before application. Exclude name conflicts, quantity conflicts, existing-card overlap and unverified identities. Explain once if eligible entries come from only one successful provider. Agreement is not verification. Bulk acceptance is a deliberate player action with scoped undo, not automatic merging.

## Implementation order and acceptance

1. Compact candidate component, inline add state, shared inspector, failure banner and scoped undo.
2. Stable type stacks and totals with single-category assignment and front-face rules.
3. Desktop linked layout and phone tabs; preserve existing theme/navigation semantics.
4. Clear bulk preview and keyboard/screen-reader behavior.

Use the existing 22-entry photo and an accepted 40-card deck as fixtures. Compare visible candidates and scroll distance against the current screen at equal viewport/text size. Aim for at least a 50% reduction in ordinary candidate height; measure rather than promise. Verify 320/390/768/1366px, both themes, 200% zoom, long/custom names, unavailable artwork, mixed types, alternate faces, failed saves and pending requests. Verify that add-once, undo, quantity conflicts, overlapping photos, manual land counts and owner edits remain correct. Keep keyboard focus stable when adding; no controls hidden behind hover. No provider requests are needed for layout tests.
