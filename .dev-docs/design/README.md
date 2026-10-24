# Design reference files

**Approved direction:** [../UI_DESIGN_SYSTEM.md](../UI_DESIGN_SYSTEM.md)  
**Screen targets:** [../UI_SCREEN_GUIDELINES.md](../UI_SCREEN_GUIDELINES.md)  
**Live page audit:** [../UI_PAGE_AUDIT.md](../UI_PAGE_AUDIT.md)

- `visual-reference.html` — browser-readable visual guide (no app server). Sample phone, room, statistics and setup in both themes; local-only interactions. Not production UI.
- `visual-reference.fragment.html` — editable source; regenerate the HTML guide after approved visual changes.
- `reference-tokens.css` — documentation tokens only; map into the app theme, do not import this file at runtime.

Where a mockup and the Markdown/token docs disagree, the Markdown and tokens win. Keep them synchronized when the owner changes an approved decision.

**Superseded:** `../theme-direction-mockups.html`, green/brass explorations, and proposals in [../UX_DESIGN_REVIEW.md](../UX_DESIGN_REVIEW.md). Do not use them as an alternate source of truth.

Design approval: 23 October 2026. Runtime Ember Folio styling is live; this package still does not certify every page/state for accessibility or usability.
