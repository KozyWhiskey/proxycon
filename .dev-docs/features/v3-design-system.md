# ProxyCon V3: "The Mythic" Design System

**Status:** Active
**Role:** Senior UX/UI Architecture
**Target:** Competitive Magic Players & Tournament Organizers
**Vibe:** Premium, High-Contrast, Championship-tier, "E-sports"

---

## 1. Navigation Architecture (Hybrid Console)

We use a responsive "Hybrid Console" layout that adapts to the device context.

### A. The "Command Sidebar" (Desktop & Tablet)
-   **Visibility:** Visible on screens `md` (768px) and larger.
-   **Behavior:**
    -   **Expanded:** Full width (~240px). Shows Icon + Label.
    -   **Collapsed (Focus Mode):** Icon only width (~80px). Maximizes space for tournament brackets or life counters.
-   **Aesthetics:** Glassmorphism background with Gold accents.

### B. The "Thumb Dock" (Mobile)
-   **Visibility:** Visible on screens smaller than `md`.
-   **Behavior:** Fixed bottom sticky bar (Existing component).
-   **Design:** Glassmorphism. High-contrast icons.

---

## 2. Color Palette: "Burnished Gold & Obsidian"

**Theme:** Deep Dark Mode (Zinc 950 Base).

### Semantic Variables
-   **Background (`--background`):** `#09090b` (Zinc 950) - *The Void*
-   **Surface (`--card`):** `#18181b` (Zinc 900) - *Card Surface*
-   **Primary (`--primary`):** `#ba932b` (Burnished Gold) - *The Trophy*
-   **Accent (`--accent`):** `#dcd7c1` (Muted Cream) - *Highlights*
-   **Border (`--border`):** `#27272a` (Zinc 800) - *Subtle containment*

### Effects
-   **Glow:** `box-shadow: 0 0 15px rgba(186,147,43,0.2)`
-   **Glass:** `bg-zinc-900/60 backdrop-blur-md border border-white/10`

---

## 3. Typography: "Data vs. Interface"

-   **Headings (`font-heading`):** `Chakra Petch` (Google Font). Square, technical, sci-fi.
-   **Body (`font-sans`):** `Geist Sans`. Clean, legible, standard.

---

## 4. Component Standards

### Cards (The "Pane")
We use "Panes" that look like sheets of glass.

-   **Class:** `.glass-panel`
-   **Base:** `bg-zinc-900/60 backdrop-blur-md border-white/10`
-   **Hover:** `hover:border-primary/50` (Interactive feedback)

### Buttons
-   **Primary:** Burnished Gold background with a faint glow.
-   **Secondary:** Ghost style with colored border.
-   **Outline:** Transparent with `white/10` border, hovers to Gold text.