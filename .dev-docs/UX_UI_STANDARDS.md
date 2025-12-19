# ProxyCon UX/UI Standards & Design System

**Last Updated:** December 18, 2025
**Philosophy:** Mobile-First, Desktop-Optimized.
**Aesthetic:** "Dark Basement" (High contrast, dark slate, neon accents).

---

## 1. Core Layout Principles

The application must function perfectly with "One-Thumb" on mobile, but expand gracefully to utilize screen real estate on desktop.

### Container Widths
-   **Mobile (Default):** 100% width, padded (`p-4`).
-   **Desktop (`md+`):** Constrained containers centered on screen.
    -   **Standard Page:** `max-w-7xl mx-auto`.
    -   **Read-Focused Page:** `max-w-3xl mx-auto`.
    -   **Forms/Modals:** See *Dialogs* section.

### Navigation Strategy
-   **Mobile:** Sticky **Bottom Navigation Bar**.
    -   *Constraint:* 5 items max. Labels must be short.
-   **Desktop:** (Future Goal) Sticky **Top Navigation Bar**.
    -   Bottom nav should disappear on `md` screens and be replaced by a header nav.

### Grid Systems
-   **Lists (Decks, Tournaments):**
    -   Mobile: `grid-cols-1` (Stacked).
    -   Tablet: `grid-cols-2`.
    -   Desktop: `grid-cols-3` or `grid-cols-4`.
    -   *Class:* `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

---

## 2. Color Palette & Theming

We use **Tailwind CSS** with **Shadcn UI** variables. The theme is forced **Dark Mode**.

### Backgrounds
-   **App Background:** `bg-slate-950` (Deepest dark).
-   **Card/Surface:** `bg-slate-900` (Slightly lighter).
-   **Overlay/Modal:** `bg-slate-900` with `border-slate-800`.

### Text Colors
-   **Primary Text:** `text-slate-100` (Near white).
-   **Secondary Text:** `text-slate-400` (Muted gray).
-   **Muted/Disabled:** `text-slate-600`.

### Accents (Functional Colors)
-   **Primary Action (Gold/Yellow):** `text-yellow-500`, `bg-yellow-500`.
    -   Used for: Submit buttons, "New" actions, Winning results.
    -   *Hover:* `hover:bg-yellow-600`.
    -   *Foreground:* `text-black` (on yellow background).
-   **Casual/Play (Emerald):** `text-emerald-500`.
    -   Used for: Casual mode actions.
-   **Destructive (Red):** `text-rose-500`, `bg-rose-600`.
    -   Used for: Delete actions, Errors.

---

## 3. Component Standards

### Buttons & Touch Targets
-   **Minimum Height:** `h-12` (48px) for all interactive elements.
-   **Mobile:** Full width (`w-full`) for primary actions.
-   **Desktop:** Auto width (`w-auto`) aligned right or left.

### Cards (`components/ui/card.tsx`)
-   **Base Style:** `bg-slate-900 border-slate-800`.
-   **Shadows:** `shadow-md` to distinct from background.
-   **Hover:** `hover:border-slate-700` or `transition-colors` for interactive cards.

### Dialogs & Modals (`components/ui/dialog.tsx`)
**CRITICAL:** Default Shadcn dialogs are constrained to `sm:max-w-lg` (512px). We must override this for complex forms on desktop.

-   **Standard Form (Login, Simple Input):** Default (`sm:max-w-lg`).
-   **Complex Form (Deck Edit, Tournament Setup):** `sm:max-w-5xl`.
    -   *Layout:* Split view (Inputs left, Preview right) on desktop.
-   **Gallery/Selection (Card Search):** `sm:max-w-6xl`.
    -   *Layout:* Grid of 4-6 columns.

### Forms
-   **Labels:** `text-slate-100 font-medium`.
-   **Inputs:** `bg-slate-950 border-slate-800`.
-   **Layouts:**
    -   Mobile: Vertical stack (`space-y-4`).
    -   Desktop: Two-column grid for related fields (e.g., Name + Format).

---

## 4. Typography

-   **Font Family:** `Geist Sans` (UI), `Geist Mono` (Data/Stats).
-   **Headings:**
    -   H1 (Page Title): `text-3xl font-bold tracking-tight text-slate-100`.
    -   H2 (Section): `text-xl font-semibold text-slate-100`.
-   **Data Display:**
    -   Use `font-mono` for IDs, Stats, and scores.

---

## 5. CSS Implementation Checklist

When reviewing or writing new CSS:

- [ ] **Is it responsive?** Does it use `md:` and `lg:` prefixes to adapt layout?
- [ ] **Is it touch-friendly?** Are buttons at least `h-12`?
- [ ] **Is the contrast sufficient?** Using `slate-100` for text vs `slate-950` bg?
- [ ] **Does it respect the aesthetic?** No white backgrounds. No blue/purple defaults unless specified.
- [ ] **Dialogs:** Did you check the `max-w` class for desktop viewing?

---

## 6. Future Improvements (Roadmap)

-   **Responsive Navigation:** Implement a top-bar navigation for desktop (`md+`) screens to replace the bottom bar.
-   **Data Tables:** Implement a proper data table component for desktop views of tournaments/matches.
