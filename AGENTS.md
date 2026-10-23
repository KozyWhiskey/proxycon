# ProxyCon

Weekend companion for one Magic playgroup. The product spec is `.dev-docs/PROJECT_SUMMARY.md`. Follow it before changing what the app does.

Next.js 16 App Router, TypeScript, Tailwind, Supabase (`@supabase/ssr`). Google auth, plus email. `cookies()` is async. `npm run dev` serves http://localhost:3000. Schema SQL lives in `scripts/sql/`.

The running app still has older screens. Point new work at the spec.

The approved visual source of truth is `.dev-docs/UI_DESIGN_SYSTEM.md`. Read it before UI work; use `.dev-docs/UI_SCREEN_GUIDELINES.md` for page guidance and `.dev-docs/design/visual-reference.html` for examples. Reference tokens are in `.dev-docs/design/reference-tokens.css` (documentation only; not imported by the app). Preserve Ember Folio, Quiet Frame, the five-mana divider, equal light/dark themes, and simple neutral rounded-rectangle navigation. Do not reintroduce half-arch navigation, underlined active navigation, decorative diamonds, or an alternate palette. Older design proposals are superseded. Map tokens into existing shared components rather than creating a second styling system. Substantive changes to this direction require visual review and an explicit owner decision; routine work within it should proceed.

Preserve the charcoal-and-orange visual direction, commander artwork, and the room callout. On phones, put a returning player's table, opponent, round state, and result action before discovery content. Setup and settings use direct titles and compact headers; reserve expressive display copy and feature panels for useful destinations. Improve hierarchy without flattening the design or shrinking room controls and standings.

Keep destination headings in Fraunces across My decks, Events and event dashboards, including the returning-player Your games header. Task/settings titles and controls use Manrope. Tournament result entry always uses visible +/− game-win counters for both players; derive the outcome from the required score, reject 0–0, and never replace counters with winner-choice buttons or an optional-score disclosure. Quick-game winner/side selection remains separate.

Use `.dev-docs/UI_PAGE_AUDIT.md` for one-page consistency reviews. The owner approved controlled warm shading for round/room destination surfaces, shallow tactile action buttons and opaque raised popouts; use the shared depth tokens rather than flattening those surfaces again. Keep tournament score entry compact: Games won, named counters, one outcome preview and Save; omit permanent counter tutorials and repeated score paragraphs.
