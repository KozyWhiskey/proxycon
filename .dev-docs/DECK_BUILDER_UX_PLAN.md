# Limited deck builder: image stacks and editable categories

26 October 2026. Implementation handoff from the UX design agent. Read with [DECK_BUILDER_FEATURE_SPEC.md](DECK_BUILDER_FEATURE_SPEC.md); its card accounting rules govern. This refines the accepted-deck section of [DECK_REVIEW_DESIGN_PROPOSAL.md](DECK_REVIEW_DESIGN_PROPOSAL.md), superseding its text-only stack strips. Keep the existing photo approval and follow-up-photo safeguards.

## Design decision

Make Your deck feel like arranging real Magic cards on a table. Every stack entry is the actual card image at its natural ratio, with successive cards overlapping below the preceding printed title. The final card stays fully visible. Category headings and copy counts provide structure; almost all repeated controls move into a shared inspector. Keep List as an equally capable accessible alternative.

The supplied Archidekt screenshot demonstrates this visual pattern directly. Its [official FAQ](https://archidekt.com/faq) documents distinct view, grouping and sorting controls, category creation through card menus/settings, automatic saving and card-level adding. These are reference interaction patterns; dimensions below are Upkeep recommendations, not measurements of Archidekt. Prices, shopping, collaborative editing and a playtester are not part of this change.

## Existing visual system

Use existing semantic tokens and shared components, without a second theme. Canvas is #F2F4F5 / #12161B, surface #FFFFFF / #1C232B, soft surface #E8EDF0 / #28323D, text #1B222A / #F1F3F5, and action #FF873E with dark action text. These values document existing light/dark roles; implementation must reference their existing tokens. Manrope labels and task headings, IBM Plex Mono quantities, existing Fraunces destination headings. Keep the shared opaque raised popouts, 8px controls and 12px panels.

The signature is the real card-title fan: printed Magic frames, not another decorative frame or a duplicate custom nameplate. Category controls stay quiet and neutral. Reserve orange for a focused action or selection; do not color all stacks or copy counts.

## Workspace hierarchy

Keep compact sticky page totals, Photos, Undo, Finish review and Export. When pending candidates exist, desktop retains Review beside Your deck. Reopened completed review is a compact Show reviewed cards disclosure, giving the deck the available width. Never collapse the review automatically while the user is accepting its final card.

Your deck starts with its main-deck total and land/nonland counts, followed by view/group controls and Add category. Main deck and Sideboard are explicit separate sections with independent totals. Sideboard is a deck-memory section, not a tournament registration tool. Do not include sideboard copies in the 40-card warning or main-deck land count.

```text
Your deck   Main deck 40 · Lands 17 · Nonlands 23
View [Stacks]  Group [Categories]                [+ Category]

Main deck · 40
Creatures · 15  …        Removal · 8  …         Lands · 17  …
[actual card top]        [actual card top]       [actual card top]
[actual card top]        [actual full card]      [actual card top]
[actual full card]                              [actual full card]

Sideboard · 7
Sideboard · 7  …
[actual title bands / full final card]
```

## Actual overlapping cards

- Bound stacks around 200px card-image width plus an approximately 20px quantity gutter; allow 180–220px images according to available width. Never stretch a two-card deck to fill its panel. Independent columns pack categories vertically, avoiding empty grid rows beneath short stacks.
- Render the full card image at its natural 488:680 ratio, object fit contain, image top at stack top. Each following entry covers the preceding image below a 44px exposed band. Use real image elements and overlap; do not substitute text strips, faded background images, or a stretched cropped terminal image.
- The last card remains entirely visible. Do not repeat its title above it or append a large Details footer. A small ×N badge lives in the left gutter beside each printed title, including the last card. The card image retains its printed title and mana cost unobscured.
- The exposed band is the card's tappable control, with at least 44px effective height. Each control has the accessible name “View Grim Bauble, 2 copies, Removal, main deck.” Preserve a visible focus treatment on the exposed band, not an invisible buried image rectangle. Do not raise an entire card over its neighbors merely on focus/hover.
- Clicking/tapping any card opens the shared full-image inspector. This is the dependable preview on all devices. A desktop hover preview is optional and must not cover the pointer's next stack target, steal focus, or be required to edit.
- Missing art falls back to an opaque readable name/quantity band and a restrained full-card-sized placeholder for the final card. Unverified remains explicitly labeled. Long printed titles are supported through the inspector and accessible names, never an extra truncated title layered over artwork.
- Keep accepted card positions steady during quantity edits; category moves may deliberately relocate a card. Do not animate cards across the workspace. Respect reduced motion.

## Categories and copy placement

Persist custom categories in memory data, not browser preferences. Each category has a stable ID, name, order and main/sideboard zone. Automatic main-deck type groups remain available for unassigned copies. Explicit allocations consume part of a canonical card's total; the remainder stays in its automatic main-deck group. A card may have copies in several categories without duplicating physical-card counts.

Category headers show the sum of copies in that category, including split allocations. Always show user-created empty categories with a brief “No cards yet” state so a successful creation is visible. Empty automatic groups can stay hidden. Stored category order drives deterministic height-aware column packing, with explicit Move earlier/later controls. Copy-count-only edits do not change heights or positions; distinct card/category moves and layout changes may deliberately repack. Phone List preserves linear stored order.

Add category opens a small shared dialog with a persistent Name label and Section selector (Main deck / Sideboard). Default section follows the section where creation started. Save creates the category and exposes it immediately; errors retain input. Trim names, reject empty and duplicate names within a section, and enforce the feature spec's length/count bounds server-side as well as in the form. Do not infer zone from a name such as “Sideboard.” Renaming never changes the zone.

Each owner category header has a 44px ellipsis button labeled “Manage Removal.” Menu actions: Rename, Move earlier, Move later, and Delete category. Disable boundary moves with an understandable state. Keep automatic main type headings stable. The built-in Sideboard category can be renamed while retaining its stable sideboard identity; it cannot be deleted. Custom categories can be renamed, reordered and deleted.

Delete a nonempty custom category with a concrete confirmation: “Move 3 copies to their default main-deck groups and delete Removal?” In sideboard, reassign to the built-in Sideboard category. Never delete the cards, silently move them between sections, or change their total. Empty category deletion can be direct with Undo if supported safely; otherwise use the same concise confirmation.

The card inspector identifies the selected allocation: “2 copies in Removal · Main deck.” It contains quantity +/− controls scoped to those copies and a Move copies control: quantity, destination section/category, explicit Move. For 3 copies, moving 1 leaves 2 at the source and creates/increases 1 at the destination; it never increments the canonical total. An accessible numeric input or select complements the +/− controls. For implicit type-group copies, Move uses that remainder as the source. Offer New category from the destination picker without losing the card or quantity.

Group by Categories is the default organized view; Group by Card type is a presentational alternative that retains main/sideboard separation and stored category assignments. Do not mistake changing group mode for resetting category allocations. In type view, category controls should not imply that a type heading can be renamed. All placements remain inspectable from the card dialog.

## Mobile and accessibility

Keep existing Review / Your deck tabs with counts. Default Your deck to List at compact widths, retaining an explicit Stacks choice. At 390px, Stacks uses one comfortable approximately 200px card column rather than shrinking Magic title strips into unreadable miniatures; a second column appears only when both fit with gutters. This avoids horizontal page scrolling. List fills available width and shows thumbnail, name, copies and a reachable card control in minimum 52px rows.

View and Group controls wrap beneath the main totals; Add category stays a labeled 44px control. Main deck and Sideboard remain separate headings in both modes. Category menus and Move copies open accessible popouts/dialogs within the viewport. No operation requires drag, long press, hover, a keyboard shortcut, or precise tiny targets. Drag enhancement can follow only after menu-based movement is complete.

Dialog focus moves to its title/first useful control, Escape closes it, and focus returns to the initiating card/category control. On deletion/move where it disappears, return focus to the destination/category heading or Add category, not document body. Announce “Moved 1 Grim Bauble to Sideboard” and save failures politely. Read-only shared views expose cards and categories without editor controls. Color alone never expresses a selected card, saved state or zone.

## Persistence and safety

Use the existing optimistic deck revision, atomic save and owner authorization. Save categories and allocations together with card rows; reload must restore names, order, zones and split counts. Apply the same server validation to API callers. Disable duplicate destructive submission while pending. Show “Saving…” / “Couldn’t save · Retry” truthfully; preserve the draft if a revision conflicts. Recognition compares against main copies, preserves all sideboard and manually assigned main copies, and puts newly accepted copies in the implicit main type group. If a proposed main reduction conflicts with manually assigned copies, show a specific conflict directing the owner to resolve those allocations; never silently truncate them.

Plain-text export contains main-deck cards once and a separate Sideboard heading/counts, merging custom categories by canonical identity inside each zone. Main-deck-only export remains available. Sharing includes the organization without changing existing private-photo/finished-tournament rules. Confirmation accepts fewer than 40 main-deck cards only through the existing explicit incomplete acknowledgement.

## Build and critical review gates

1. MTG feature spec fixes counts, zones, canonical identity and move/delete semantics.
2. Implement allocation helpers and persistence validation with deterministic tests before wiring category controls.
3. Build actual image stacks and category/inspector controls in existing components and semantic CSS.
4. Exercise initial photo candidates, 40-card completed deck, sparse two-card deck, 60-card main plus 20 sideboard, split canonical card, long category/card names and missing art. No paid recognition is needed for layout QA.
5. Verify 320, 390, 768 and 1366px, both themes and 200% zoom; keyboard and accessible names; saved reload, ownership, undo, repeated submission and revision conflict.
6. Independent UX QA reviews screenshots, not just passing tests. Require natural full final cards, recognizable printed-title strips, legible count badges, no giant sparse-stack enlargement or horizontal overflow, usable category controls and minimal phone header height.
7. Original MTG agent checks card conservation across split/move/delete/recognition, main-versus-sideboard totals and export. Iterate until both agents explicitly approve; record evidence and remaining real-device limitations honestly.

Acceptance: the two supplied screenshots should no longer differ in the fundamental card material—Upkeep shows actual card title bands overlapping full card images. The design should still read as Ember Folio rather than cloning Archidekt's palette or importing unrelated deckbuilder scope.
