# Limited deckbuilder feature specification

Owner-authorized extension · 26 October 2026 · Magic the Gathering feature review.

This extends the existing Limited memory editor. The owner explicitly requested actual overlapping card images, editable categories including Sideboard, and a practical desktop/mobile deckbuilding workflow. It supersedes the earlier exclusion of sideboard organization for this feature. Memories remain personal records: no tournament registration, deck checks, pairings, or results change. Commander collections, prices, playtesting, imports, and a global card pool are separate work.

## Card board

- Your deck shows bounded columns of real card images, overlapping vertically so each preceding card exposes its printed title strip and the last card remains fully visible. Do not replace images with text imitation strips. Artwork is never stretched. Copies of the same canonical card share one entry per allocation, with a legible quantity badge.
- A card can be opened from every exposed strip. Pointer hover/focus may raise a preview, but tap, keyboard, and the card inspector provide equivalent access without hover. The full inspector offers quantity, move, replacement, and removal. Missing/custom artwork has an equally operable name fallback.
- Main deck and Sideboard are separate labeled sections with separate totals. Automatic main groups remain Creatures, Instants, Sorceries, Artifacts, Enchantments, Planeswalkers, Lands, and Other. Artifact creatures and enchantment creatures appear once under Creatures. Double-faced/adventure/split cards remain one identity; grouping and land totals continue using the front face, without claiming complete mana-source analysis.
- Compact List remains available. Desktop initially uses Stacks. Phones initially use List; an explicit Stacks choice produces usable bounded columns, not an unreadably scaled desktop board. Review candidates, photo tools, private access, sharing, autosave, and Undo remain available.

## Categories

- Owners can create, rename, reorder, and delete custom categories, and move cards between categories. Category names are trimmed, nonempty, bounded, and unique case-insensitively within their section. Stable IDs, not names, identify categories. Invalid requests report actionable errors.
- Creation chooses Main deck or Sideboard. The zone is explicit and does not change when a category is renamed. A category named Sideboard is not sufficient to change counting semantics. The built-in Sideboard destination has a stable identity and sideboard zone.
- The built-in Sideboard display name may also be renamed (for example Reserve); its stable sideboard identity remains and it cannot be deleted. Keep a visible Sideboard section/zone label so a renamed destination cannot make its counting ambiguous. Automatic main type labels stay fixed. Reordering categories never crosses or obscures the Main deck/Sideboard section boundary.
- Main type groups are automatic fallback destinations. Custom main groups such as Ramp or Removal take assigned copies out of their automatic group. A main-to-main move changes organization only, never deck size. A main-to-sideboard move transfers copies and changes the main total; it never duplicates them.
- The inspector selects source allocation, destination, and copy count. One of three copies can move while two stay in the main deck. Exceeding available copies, fractional/negative counts, or nonexistent destinations is rejected. Explicit buttons/forms provide all actions; dragging is optional enhancement.
- Reordering has accessible earlier/later controls. Deleting an empty custom category is immediate. Deleting a populated category must explicitly state that its cards are preserved and where they move: main allocations return to automatic main type groups; sideboard allocations return to the built-in Sideboard destination. Never silently return sideboard cards to main. Built-in fallback destinations cannot be deleted.
- Editing a quantity adjusts the selected allocation and canonical total together. Removing one allocation preserves copies assigned elsewhere. A separate all-copies removal, if offered, must say so. Replacing an identity preserves the selected copy count and destination and merges canonical identities safely.

## Limited counting and identity contract

The existing `MemoryCard` is the canonical row across the memory. Its `count` is the total recorded copies across both zones. Add optional allocation entries `{ categoryId, count }`; custom categories carry `{ id, name, zone: 'main' | 'sideboard', order }`. An implementation may use equivalent strongly validated names, but must preserve these invariants:

1. Each canonical identity has one row. Different printings do not manufacture additional identities.
2. Allocation counts are positive integers; their sum cannot exceed `card.count`. Allocations reference existing categories and have unique category IDs per card.
3. The unallocated remainder belongs implicitly to that card's automatic **main** type group. Legacy rows without allocations therefore remain identical without a destructive backfill.
4. Main count equals canonical total minus sideboard allocations. Main land and nonland counts use the same main projection. Sideboard has its own count. The top summary must identify Main rather than ambiguously saying a total that includes sideboard.
5. A main list below 40 triggers the existing incomplete-memory choice. Adding sideboard cards can never satisfy that threshold. Limited sideboards have no 15-card cap. The editor does not enforce constructed four-copy limits, Commander singleton, or exactly 40 cards.
6. A category label and its zone are persisted separately. Renaming or reordering never changes card totals or sideboard semantics.
7. Existing unknown/custom entries remain available with explicit unverified acknowledgement. Token markers are not automatically counted as deck cards; owners can correct mistaken recognition.

## Recognition and correction protection

- Recognition remains a suggestion process. Compare new deck photos against the **main projection**, not the combined recorded main plus sideboard count. This release does not infer that a photograph shows a sideboard or automatically scan a full unused pool.
- Applying an observed main quantity preserves all sideboard copies and all manually assigned main-category copies. Newly approved copies enter the implicit automatic main group. If a proposed reduction would remove copies already explicitly assigned to custom main categories, require the owner to resolve the quantity/allocation conflict; do not silently truncate or redistribute those allocations.
- An Additional cards acceptance adds copies to main only. Rechecking never doubles quantities. Unseen cards are not removed. Sideboard moves are always explicit owner edits.
- In-flight recognition is compared against the current revision. Scoped review Undo refuses to overwrite subsequent allocation or category edits. Retrying either provider preserves categories and owner changes.

## Persistence and export

- Additive SQL and API validation preserve all existing snapshot IDs, canonical cards, photos, privacy, ownership, and confirmations. Save cards, categories, decisions, and revision atomically. Existing clients that omit new fields must not reset stored categories or allocations. Malformed and dangling allocations are rejected before any rows are mutated.
- Browser refresh restores all labels, order, split quantities, and zones. Stale saves fail without clobbering newer edits. Read-only shared views show the same grouping and counts without edit controls.
- Plain-text copy/download preserves a canonical main list followed by a clearly marked `Sideboard` block. A card split across zones appears with the correct quantity in each block. Organizational main category labels do not duplicate rows or change totals. Text export is a decklist, not a complete backup of category metadata.
- Basic-land counters are explicitly main-deck counters. Sideboard land copies remain intact when a main basic quantity changes.

## Functional acceptance sheet

| Scenario | Required result |
|---|---|
| Legacy 40-card memory, no categories | Same 40 main cards and type groups after load/save |
| 3 identical copies; move 1 to Sideboard | 2 main, 1 sideboard, canonical total 3; save/reload/export agree |
| 39 main + 10 sideboard | Incomplete-main warning remains; no sideboard size error |
| Move main card to Ramp, rename Ramp, reorder it | Counts unchanged; identity/image/assignment survive refresh |
| Rename Sideboard to Reserve | Zone stays sideboard; main count unchanged |
| Delete populated main category | Cards preserved in automatic main groups |
| Delete populated custom sideboard category | Cards preserved in sideboard fallback, never main |
| Add/remove/change quantity in one allocation | Other allocations untouched; zero allocation disappears cleanly |
| Main basic lands edited while sideboard has same land | Only main quantity changes |
| Main photo reports 2 copies; 1 more stored sideboard | Main stays 2 and sideboard 1; no false discrepancy from total 3 |
| Photo reduction conflicts with custom main assignments | Explicit resolution; no owner allocation loss |
| Two tabs save different category edits | One revision conflict; newer data preserved |
| Private/shared/read-only profile | Existing owner protections apply to every category action |
| 320/390px phone, laptop, both themes, 200% zoom | No page overflow; readable titles; operable move/category controls |
| Keyboard/touch only | Every card, quantity, category action accessible without dragging/hover |
| Image failure/custom card/MDFC/multiple copies | Operable fallback, no identity doublecount, correct badges |

Release review requires both independent visual UX QA and the Magic feature reviewer to inspect the implemented workflow and focused regression evidence. Browser mocks do not prove hosted migration application or actual-device camera behavior. No paid provider calls, production keys, or deployment are required for this UI/category work.
