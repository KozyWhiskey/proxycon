# Design reference files

Approved direction: [../UI_DESIGN_SYSTEM.md](../UI_DESIGN_SYSTEM.md). Page priorities and remaining review gaps: [../UI_SCREEN_GUIDELINES.md](../UI_SCREEN_GUIDELINES.md).

- `visual-reference.html` is the browser-readable visual guide. Open it locally; no application server or Supabase connection is required. It includes the style sheet and sample phone, room, statistics and setup views, with local-only interactions. Fonts, mana assets and sample artwork are embedded; the preview wrapper may load its icon/runtime dependencies from a CDN, so an internet connection is recommended. It is not a public application or a production UI implementation.
- `visual-reference.fragment.html` is the editable source of that guide. After an approved change, regenerate `visual-reference.html` with the visualization skill's bundled `scripts/render.py` export command. Keep the source and generated guide together. The source uses only optional widget state APIs; the standalone wrapper supplies fallback state handling.
- `reference-tokens.css` documents exact semantic values and component recipes. It is deliberately not imported by the application. During an implementation task, map its roles into the existing theme system rather than adding duplicate selectors.

The Markdown spec and token file govern where an illustrative mockup differs. Keep them synchronized when the owner changes an approved decision. Previous exploratory HTML files elsewhere in `.dev-docs` are historical proposals, not alternative sources of truth.

Design approval finalized on 23 October 2026. This package does not apply runtime changes or certify that every page/state has passed accessibility and usability validation.
