# Upkeep V3 Design System: "The Mythic"

**Last Updated:** December 20, 2025
**Philosophy:** Mobile-First, Desktop-Optimized, High-Fidelity.
**Aesthetic:** "The Mythic" (Burnished Gold, Obsidian, Glassmorphism).

---

## 1. Core Layout Principles

The application must function perfectly with "One-Thumb" on mobile, but expand gracefully to utilize screen real estate on desktop.

### Container Widths
-   **Mobile (Default):** 100% width, padded (`p-4`).
-   **Desktop (`md+`):** Constrained containers centered on screen.
    -   **Standard Page:** `max-w-7xl mx-auto` (e.g., Dashboard, Tournaments).
    -   **Read-Focused Page:** `max-w-3xl mx-auto`.
    -   **Forms/Modals:** See *Dialogs* section.

### Navigation Strategy
-   **Mobile:** Sticky **Bottom Navigation Bar**.
    -   *Constraint:* 5 items max. Labels must be short.
-   **Desktop:** Collapsible **Side Navigation**.
    -   Bottom nav disappears on `md` screens.

### Grid Systems
-   **Lists (Decks, Tournaments):**
    -   Mobile: `grid-cols-1` (Stacked).
    -   Tablet: `grid-cols-2`.
    -   Desktop: `grid-cols-3` or `grid-cols-4`.
    -   *Class:* `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`

---

## 2. Color Palette & Theming

We use **Tailwind CSS V4** variables defined in `app/globals.css`. The theme is forced **Dark Mode**.

### Backgrounds
-   **App Background:** `bg-background` (Zinc 950 - `#09090b`).
-   **Glass Panel (Cards/Surfaces):** `bg-zinc-900/60` with `backdrop-blur-md` and `border-white/10` (via `.glass-panel` utility).
-   **Overlay:** `bg-black/80` with `backdrop-blur-sm`.

### Text Colors
-   **Foreground:** `text-foreground` (Zinc 50 - `#fafafa`).
-   **Muted:** `text-muted-foreground` (Zinc 400 - `#a1a1aa`).
-   **Headings:** `text-foreground` using `font-heading`.

### Accents (Functional Colors)
-   **Primary (Burnished Gold):** `bg-primary` (Amber 700 - `#ba932b`).
    -   Used for: Primary actions, active states, winning results, 1st place.
    -   *Glow Effect:* `shadow-[0_0_15px_rgba(186,147,43,0.2)]`.
-   **Secondary (Zinc):** `bg-secondary` (Zinc 800).
    -   Used for: Secondary buttons, inactive states.
-   **Destructive (Red):** `bg-destructive` (Rose 600).
-   **Borders:** `border-white/10` (Transparent white for glass effect).

### Status Colors
-   **Win:** `text-emerald-500` (Success).
-   **Loss:** `text-rose-500` (Destructive).
-   **Draw:** `text-primary` (Gold/Neutral).
-   **Pending:** `text-amber-500`.

---

## 3. Component Standards

### Buttons & Touch Targets
-   **Minimum Height:** `h-12` (48px) for all interactive elements.
-   **Styles:**
    -   `variant="default"`: Solid Burnished Gold with glow. Text is `primary-foreground` (white).
    -   `variant="outline"`: Transparent with `border-white/10`. Hover: `bg-white/10`, `text-primary`.
    -   `variant="neon"`: Border only with glow, solid on hover.

### Cards (`components/ui/card.tsx`)
-   **Base Style:** Use the `.glass-panel` utility class.
    -   `bg-zinc-900/60 backdrop-blur-md border border-white/10`.
-   **Hover:** `hover:border-primary/50 transition-colors duration-300`.
-   **Typography:** Use `CardTitle` with `font-heading` tracking-wide.

### Dialogs & Modals (`components/ui/dialog.tsx`)
**CRITICAL:** Default Shadcn dialogs are constrained to `sm:max-w-lg` (512px). We override this for complex forms.

-   **Standard Form:** `sm:max-w-lg`.
-   **Complex Form (Deck Edit):** `sm:max-w-5xl`.
    -   *Layout:* Split view (Image/Preview left, Inputs right) on desktop.
-   **Gallery/Selection:** `sm:max-w-6xl`.
    -   *Layout:* Grid of 4-6 columns.

### Forms (`Input`, `Select`, `Textarea`)
-   **Base Style:** `bg-zinc-900/50 border-white/10`.
-   **Focus:** `focus-visible:border-primary/50 focus-visible:ring-primary/20`.
-   **Labels:** `text-foreground font-medium`.

---

## 4. Typography

-   **Font Family:**
    -   Body: `Geist Sans` (Variable).
    -   Headings: `Chakra Petch` (Google Font) mapped to `font-heading`.
    -   Data/Stats: `Geist Mono` (Variable).
-   **Styles:**
    -   **Page Title:** `text-3xl font-bold tracking-tight font-heading`.
    -   **Section Title:** `text-xl font-semibold text-foreground font-heading uppercase tracking-wide`.
    -   **Glow Text:** Use `.text-glow` utility for emphasis on Primary colors.

---

## 5. CSS Implementation Checklist

When reviewing or writing new CSS:

- [ ] **Is it transparent?** Use `bg-zinc-900/XX` or `.glass-panel`.
- [ ] **Is the border subtle?** Use `border-white/10`.
- [ ] **Is it responsive?** Use `md:` and `lg:` prefixes.
- [ ] **Are buttons accessible?** Minimum `h-12` height.
- [ ] **Typography:** Are headings using `font-heading`?
- [ ] **Effects:** Are primary actions using the "glow" shadow?
- [ ] **Colors:** Are we using `text-primary` (Gold) instead of blue/purple?

---

## 6. Future Improvements (Roadmap)

-   **Data Tables:** Enhance mobile table views with better cards/stacking.
-   **Animations:** Add `framer-motion` page transitions.
