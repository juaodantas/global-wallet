---
name: Global Wallet
description: Multi-currency digital wallet — secure, modern, direct
colors:
  primary: "#173a8a"
  primary-hover: "#102d6e"
  accent: "#0e7490"
  bg: "#f3f6fb"
  surface: "#ffffff"
  surface-muted: "#eef3f8"
  text: "#0f172a"
  muted: "#526179"
  border: "#d8e0ec"
  success: "#16794f"
  success-bg: "#dcfce7"
  warning: "#9a6700"
  warning-bg: "#fff7d6"
  danger: "#b42318"
  brand-highlight: "#eaf0ff"
  brand-highlight-border: "#cdd9ff"
  emphasis-bg: "#f4fbfd"
  emphasis-border: "#b7dce8"
  info-badge-bg: "#e0f2fe"
  info-badge-text: "#075985"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.05em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 750
    lineHeight: 1.2
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 750
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.78rem"
    fontWeight: 800
    letterSpacing: "0.12em"
    textTransform: "uppercase"
  badge:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 850
    letterSpacing: "0.05em"
    textTransform: "uppercase"
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  section: "32px"
  page: "40px"
  page-bottom: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.brand-highlight}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.brand-highlight-border}"
    padding: "10px 16px"
    height: "42px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.border}"
    padding: "10px 16px"
    height: "42px"
---

# Design System: Global Wallet

## 1. Overview

**Creative North Star: "The Trusted Ledger"**

A finance interface that earns trust by staying out of the way. Every screen communicates one thing clearly before asking for the next action. The palette is restrained — deep navy anchor, cool silver-blue background, white surfaces — so the numbers themselves carry visual weight. Typography is single-family Inter, relying on weight contrast and tight letter-spacing for hierarchy rather than multiple typefaces. Motion is minimal: state transitions only, no choreographed entrances, no decorative animation. The system explicitly rejects "banking app" heaviness (too many labels, too much chrome) and "fintech startup" flash (gradient buttons, glass cards, neon accents). It aims for the quiet confidence of a well-designed ledger: every line has a reason to be there.

**Key Characteristics:**
- Single font family (Inter), hierarchy via weight and scale
- Restrained palette: deep navy anchor, cool silver-blue background, white surfaces
- Direct, minimal copy — no filler, no marketing language
- Cards with soft shadows for containment, not decoration
- Consistent 4px spacing scale
- Rounded corners (8–28px) for approachability
- Focus on readability: high contrast body text, visible focus rings

## 2. Colors

The palette is restrained and purposeful. One dark blue anchor (Brand), one teal accent used sparingly, white surfaces on a cool silver-blue background for breathing room.

### Primary
- **Deep Navy** (#173a8a): Brand color for primary buttons, key links, and the brand wordmark. High contrast against white surfaces.
- **Deep Navy Hover** (#102d6e): Darkened brand for hover state on primary buttons.

### Accent
- **Teal** (#0e7490): Used sparingly for section eyebrows and small accent elements. Never as a main button or surface color.

### Neutral
- **Cool Silver** (#f3f6fb): Page background. A tinted neutral toward blue, not warm cream.
- **White** (#ffffff): Card and panel surface.
- **Muted Silver** (#eef3f8): Muted surface for secondary container backgrounds.
- **Slate** (#0f172a): Body text. Near-black for maximum readability.
- **Steel** (#526179): Secondary/muted text. Meets 4.5:1 contrast against white.
- **Cloud** (#d8e0ec): Borders and dividers.

### Semantic
- **Green** (#16794f, bg #dcfce7): Success / completed state.
- **Amber** (#9a6700, bg #fff7d6): Warning / planned state.
- **Red** (#b42318): Error and danger states.

### Named Rules
**The One Accent Rule.** Teal is used on ≤5% of any given screen — section eyebrows only. Its rarity is the point. Never use it for buttons, badges, or large surfaces.

## 3. Typography

**Font:** Inter (with ui-sans-serif fallback stack). A single family used across all roles — no display font, no mono. Hierarchy comes from weight (400–850) and scale (0.75rem–3.25rem), not from typeface switching.

**Character:** Technical but human. Inter at book weight reads clean and neutral; at 750–850 weight it gains presence without becoming decorative. Letter-spacing tightens for display sizes and opens slightly for labels.

### Hierarchy
- **Display** (800, clamp(2rem, 4vw, 3.25rem), 1, -0.05em): Hero / page titles. Used once per page in the `PageHeader` component. `text-wrap: balance` applied.
- **Headline** (750, 1.5rem, 1.2): Card titles and section headings within pages. Standard weight for hierarchy.
- **Title** (750, 1rem): Subtitles and small section headers inside cards.
- **Body** (400, 0.92rem, 1.65): Paragraph text. Line length capped at 65–75ch. Color is `--color-muted` (#526179) for secondary emphasis, `--color-text` (#0f172a) for primary.
- **Label / Eyebrow** (800, 0.78rem, 0.12em, uppercase): Section eyebrows, form labels. Used once per section at most. Never for body copy.
- **Badge / Meta** (850, 0.75rem, 0.05em, uppercase): Badges, small metadata labels, short status indicators.

### Named Rules
**The One-Family Rule.** Inter is the only font family. No display font, no mono. If a designer proposes a second typeface, the answer is "use a different weight or size of Inter."

**The No-Eyebrow-Everywhere Rule.** The small uppercase tracked label above section headings (the "eyebrow") is reserved for the page header only — no more than one per page. Not on cards, not on sections within the page. When every section has an eyebrow, none of them has hierarchy.

## 4. Elevation

The system uses soft shadows to create a subtle card stack — surfaces appear to rest on the page rather than float above it. The effect is ambient, not structural: shadows are wide and diffuse (24–40px blur) with low opacity (6–8%) so they read as atmosphere, not depth.

- **Soft** (`0 8px 24px rgba(15, 23, 42, 0.06)`): Default card shadow. Applied to every card.
- **Card** (`0 16px 40px rgba(15, 23, 42, 0.08)`): Emphasized cards (balance cards, modals).
- **Focus Ring** (`0 0 0 3px rgba(14, 116, 144, 0.28)`): Keyboard focus indicator. Uses the teal accent at low opacity. Applied consistently to all interactive elements via `:focus-visible`.

## 5. Components

### Buttons
- **Shape:** Rounded with 12px (`--radius-md`) border-radius. Minimum height 42px for comfortable tap targets.
- **Primary (`button--primary`):** Deep Navy (`--color-brand`) background, white text, 10px 16px padding. Hover darkens to `--color-brand-hover` (102d6e). Disabled state at 64% opacity with `not-allowed` cursor.
- **Secondary (`button--secondary`):** Light blue (`--brand-highlight`: #eaf0ff) background with Deep Navy text and lighter blue border (`#cdd9ff`). Used for secondary or cancel actions alongside a primary button.
- **Ghost (`button--ghost`):** Transparent background with Slate text and Cloud border (`--color-border`). Used for tertiary actions and dismissals.
- **Full width modifier:** Available via `button--full` for form submits and mobile layouts.
- **Motion:** `background var(--motion-fast)` where `--motion-fast` is 140ms ease.

### Cards / Containers
- **Corner Style:** 18px (`--radius-lg`) border-radius. Auth shell panels use 28px (`--radius-xl`).
- **Background:** White (`--color-surface`).
- **Shadow Strategy:** Soft shadow at rest (`0 8px 24px rgba(15, 23, 42, 0.06)`).
- **Border:** 1px solid Cloud (`--color-border`: #d8e0ec).
- **Internal Padding:** 24px (`--space-6`) for standard cards, applied via `.card--padded`.
- **Emphasis variant (`card--emphasis`):** Subtle teal-tinted border and gradient background. Reserved for balance cards and primary data displays.

### Inputs / Fields
- **Style:** 1px solid Cloud (`--color-border`) stroke, white background, 44px min-height, 10px 12px padding, 12px (`--radius-md`) radius.
- **Labels:** Above the input, 750 weight, Slate (`--color-text`). Always visible, never placeholder-only.
- **Focus:** Focus ring via `--focus-ring`: `0 0 0 3px rgba(14, 116, 144, 0.28)`.
- **Error:** Red border (`--color-danger`) on `[aria-invalid="true"]`. Error message below input in `--color-danger` at 700 weight.
- **Hints:** Below input in Steel (`--color-muted`) at 0.9rem.

### Badges
- **Shape:** Pill (`--radius-pill`: 999px).
- **Padding:** 4px 9px.
- **Typography:** 0.75rem / 850 weight / 0.05em tracking / uppercase.
- **Currency badge:** Light blue bg (`#e0f2fe`), deep blue text (`#075985`).
- **Planned/Warning badge:** Amber bg (`#fff7d6`), amber text (`--color-warning`).
- **Status/Success badge:** Green bg (`#dcfce7`), green text (`--color-success`).

### Navigation (AppShell)
- **Style:** Sticky top bar with 94% white opacity background and bottom border.
- **Nav links:** Pill-shaped (`--radius-pill`), 9px 12px padding. Active link uses brand highlight (blue bg + brand text color). Inactive links are Steel (`--color-muted`).
- **Brand wordmark:** 800 weight, -0.03em letter-spacing, Deep Navy color.
- **Mobile:** Stacks vertically below 760px.

### Page Header
- **Structure:** Flex row with title block + optional actions. Stacks on mobile.
- **Title:** Display sizing, 800 weight.
- **Description:** Steel muted color, below title.
- **Eyebrow:** Optional small uppercase label in Teal accent above title. Max one per page.

### State Views
- **Loading, Empty, Authenticated, Error:** Rendered inside a card with a variant badge, title, description, and optional action links.
- **Actions:** Arranged in a row (stacks on mobile).

## 6. Do's and Don'ts

### Do:
- **Do** use the existing design tokens (`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--focus-ring`) for every new component or feature.
- **Do** keep body text at or above 0.92rem with at least 4.5:1 contrast against its background.
- **Do** use the `<Field>` component for all form inputs — it provides consistent labels, hints, error states, and `aria-describedby` associations.
- **Do** use the `<Button>` component with the correct variant (`primary` for main actions, `secondary` for alternatives, `ghost` for tertiary).
- **Do** give buttons breathing room — at least `--space-4` (16px) above and below buttons inside cards.
- **Do** keep the card/container consistent: white background, 1px Cloud border, 18px radius, 24px internal padding.
- **Do** hide raw UUIDs from the user interface. If an identifier is needed for support, truncate it (`abc1...ef23`) or provide a copy-button pattern.

### Don't:
- **Don't** place buttons directly adjacent to form fields without spacing — at minimum `--space-4` gap.
- **Don't** use native `<select>` elements without styling them to match the design system (height, border, radius, font).
- **Don't** show `ID da carteira: <uuid>` or similar raw technical identifiers as visible UI. Users don't need to see UUIDs.
- **Don't** use uppercase for body copy or long phrases. Reserve uppercase for short badges (≤4 words) and the optional section eyebrow.
- **Don't** use gradient text, glassmorphism, or side-stripe borders (border-left > 1px as accent).
- **Don't** render identical card grids (same-sized cards with icon + heading + text repeated). Vary layout.
- **Don't** add a section eyebrow above every section. One per page maximum, in the PageHeader.
- **Don't** add external UI libraries or icon packs. Use existing primitives and inline SVG if icons are needed.
- **Don't** use Inter font weights below 400 for body text — readability suffers.
- **Don't** animate layout properties. Transition only `background`, `border-color`, `color`, and `opacity` with `var(--motion-fast)` (140ms ease). Reduced motion must work: `@media (prefers-reduced-motion: reduce)` transition to 1ms.
