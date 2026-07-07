# iSchool Theme System — Developer Guide

BismiLlah Ar-Rahman Ar-Raheem.

This document is the canonical reference for anyone building, extending, or maintaining themes on the iSchool platform.

---

## 1. Philosophy: What a Theme Is on iSchool

On iSchool, a **theme is a presentation layer, not a content layer**.

- Themes are **purely visual**: they own layout, typography, color, spacing, motion, and component styling.
- Themes **never own content**: all content (pages, announcements, blog posts, programs, classes, FAQs, gallery, contacts, navigation) comes from the CMS, stored per-school in SQLite.
- Themes are **swappable per school**: an admin can switch themes at any time from `/dashboard/settings` without losing any content.
- Themes are **controlled by the admin** through a small, well-defined surface:
  - **Primary color** (drives the palette)
  - **Color palette overrides** (accent, surfaces, text, muted, borders — light + dark)
  - **Social handles** (rendered in footers and, where appropriate, header top-bars)
  - **Light/dark mode** (user-toggleable, respects system preference)
- Themes should **feel native** to each school: a school using the `bloom` theme should look like "their site in bloom", not "the bloom demo site".

A well-designed iSchool theme is *invisible infrastructure*: it makes the school's content look its best, then gets out of the way.

---

## 2. Architecture

### 2.1 Theme Resolution

Every public school page goes through a single flow:

```
src/pages/[slug]/*.astro
  → queries the school by slug
  → const Layout = getThemeLayout(school.theme || 'harmony')
  → <Layout school={school} title={...}> ... </Layout>
```

The resolver lives in `src/themes/index.ts`:

```ts
import HarmonyLayout from './harmony/Layout.astro';
import ScholarLayout from './scholar/Layout.astro';
import BloomLayout   from './bloom/Layout.astro';
import HorizonLayout from './horizon/Layout.astro';
import PrestigeLayout from './prestige/Layout.astro';
import SparkLayout   from './spark/Layout.astro';

export const themeLayouts: Record<string, any> = {
  harmony:  HarmonyLayout,
  scholar:  ScholarLayout,
  bloom:    BloomLayout,
  horizon:  HorizonLayout,
  prestige: PrestigeLayout,
  spark:    SparkLayout,
};

export function getThemeLayout(theme: string) {
  return themeLayouts[theme] || HarmonyLayout;
}
```

To add a new theme: create the file, import it here, register it in `themeLayouts`.

### 2.2 Prop Contract

Every theme Layout receives the same props:

```ts
interface Props {
  school: any;     // the full schools row (id, slug, name, tagline, logoUrl, faviconUrl, primaryColor, theme, settings, socialHandles, ...)
  title?: string;  // optional page title; theme composes "{title} — {school.name}" or falls back to school.name
}
```

Themes **must not** accept `schoolSlug` and re-query the DB. Use the helpers instead.

### 2.3 Helpers

Located in `src/lib/school.ts`. Themes import these — never `getDb()` directly:

| Helper | Returns |
|--------|---------|
| `getSchoolNav(schoolId)` | `navigationItems[]` ordered by `sortOrder` |
| `getSchoolContacts(schoolId)` | `contactInfo[]` ordered by `sortOrder` |
| `getSchoolInfo(schoolId)` | single `contactInfo` row (first one) or `null` — kept for backwards compatibility; prefer `getSchoolContacts` |
| `getSchoolBySlug(slug)` | `schools` row or `null` |
| `getSchoolPalette(school)` *(planned — Task 9)* | fully-merged `Palette` object, with defaults filled from `school.primaryColor` |

### 2.4 File Structure

```
src/themes/{name}/Layout.astro
```

One file per theme. All logic lives in the Astro frontmatter (`--- ... ---`); all presentation lives in the markup below it. No separate JS/TS files unless the theme genuinely needs them.

### 2.5 Required Sections

Every theme must emit, in this order:

1. `<!doctype html>` — always; quirks-mode warnings indicate a missing doctype.
2. `<html lang="en" class="...">` — must include the theme-mode script (see §5) **before** any visual markup.
3. `<head>` — must include:
   - `<meta charset>` and `<meta viewport>`
   - `<title>{pageTitle}</title>`
   - Optional `<meta description>` (fall back to `school.tagline || school.name`)
   - Optional `<link rel="icon">` (use `school.faviconUrl` if set)
   - Google Fonts `<link>` for the theme's typography
   - `<style is:inline>` block emitting the palette CSS variables (see §4)
4. `<body>` — must include:
   - **Header**: desktop nav + mobile nav (collapsed by default, toggled by a button)
   - **`<main><slot /></main>`** — where page content is injected
   - **Footer**: school name + tagline, navigation links, contact info, social handles, copyright
5. `<script>` at end of body: mobile menu toggle, theme-mode toggle.

### 2.6 The Slug-Prefix Pattern

All internal school links must use `prefix = /${school.slug}`:

```astro
<a href={`${prefix}/about`}>About</a>
<a href={`${prefix}${item.url}`}>...</a>  { /* nav items already include leading slash */ }
```

External URLs (when `item.url.startsWith('http')`) bypass the prefix.

---

## 3. The Color Palette System

### 3.1 The Palette Shape

```ts
type Palette = {
  primary: string;          // from school.primaryColor (source of truth)
  accent:  string;          // secondary accent
  backgroundLight: string;  // page background in light mode
  backgroundDark:  string;  // page background in dark mode
  surfaceLight:   string;  // card/panel background in light mode
  surfaceDark:    string;  // card/panel background in dark mode
  textLight:      string;  // primary text color in light mode
  textDark:       string;  // primary text color in dark mode
  mutedLight:     string;  // secondary text in light mode
  mutedDark:      string;  // secondary text in dark mode
  borderLight:    string;  // borders in light mode
  borderDark:     string;  // borders in dark mode
};
```

### 3.2 Storage

- `school.primaryColor` — source of truth for the primary color (existing column).
- `school.settings.palette` — partial `Palette` overrides, stored in the existing `schools.settings` JSON column.
- At render time, `getSchoolPalette(school)` merges stored overrides with `generateDefaultPalette(school.primaryColor)` so every slot is always populated.

### 3.3 Contrast Guardrails

`src/lib/palette.ts` exposes `ensureContrast(fg, bg, minRatio = 4.5)` which auto-adjusts `fg` luminance until WCAG AA is met against `bg`. Use this when an admin's custom color would fail accessibility.

### 3.4 Emitting CSS Variables

Themes emit their palette as CSS variables in `<style is:inline>` inside `<head>`:

```astro
<style is:inline>{`
  html.light {
    --bg: ${palette.backgroundLight};
    --surface: ${palette.surfaceLight};
    --text: ${palette.textLight};
    --muted: ${palette.mutedLight};
    --border: ${palette.borderLight};
    --accent: ${palette.accent};
    --primary: ${palette.primary};
  }
  html.dark {
    --bg: ${palette.backgroundDark};
    --surface: ${palette.surfaceDark};
    --text: ${palette.textDark};
    --muted: ${palette.mutedDark};
    --border: ${palette.borderDark};
    --accent: ${palette.accent};
    --primary: ${palette.primary};
  }
`}</style>
```

Then markup uses Tailwind arbitrary-value syntax or plain inline `style`:

```astro
<div class="bg-[var(--surface)] text-[var(--text)] border-[var(--border)]">
```

### 3.5 Legacy `.tp/.tbg/.tbd` Classes

Older themes (harmony, scholar, bloom, horizon) use utility classes `.tp`, `.tbg`, `.tbd` bound to a `--tp` CSS variable. These will be migrated to the new `--primary` / `--surface` / `--text` variable scheme in Task 9. Until then, both schemes coexist.

---

## 4. Light / Dark Mode Contract

### 4.1 Default Class

- Most themes default to **light**: `<html class="light ...">`.
- Dark-by-default themes (currently: **prestige**) default to **dark**: `<html class="dark ...">`.
- The default must match the theme's original visual identity — don't force a light-first rewrite on prestige.

### 4.2 FOUC Prevention

Inline script in `<head>` (before any visible markup) that reads `localStorage.themeMode` and `prefers-color-scheme` and sets `html.classList` before first paint:

```astro
<script is:inline>
  (function () {
    var stored = localStorage.getItem('themeMode');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || (!stored && systemDark && !document.documentElement.classList.contains('theme-defaults-dark'));
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(dark ? 'dark' : 'light');
  })();
</script>
```

The `theme-defaults-dark` class on `<html>` signals that the theme's own default is dark (so system preference should not override on first visit).

### 4.3 Toggle Button

Each theme renders its own sun/moon toggle, styled to match its aesthetic:

- Harmony: pill-style toggle in the nav pill
- Scholar: amber-gold moon/sun icon in the top bar
- Bloom: playful round button with pastel shadow
- Horizon: minimal mono icon in the ultra-minimal header
- Prestige: gold-outlined moon/sun in the header
- Spark: bold colored chip in the header

Click cycles: **light → dark → system** (system follows OS preference). Stores the choice in `localStorage.themeMode`.

### 4.4 WCAG AA Verification

Every color pair must pass:
- **4.5:1** for body text
- **3:1** for large text (≥18pt, or ≥14pt bold)

Use `ensureContrast()` from `src/lib/palette.ts` at palette-generation time; audit by hand with browser devtools before shipping.

---

## 5. Social Handles

### 5.1 Storage

`schools.social_handles` — JSON column (shape):

```ts
{
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
  tiktok?: string;
  whatsapp?: string;
  email?: string;
}
```

Values can be:
- A full URL (`https://facebook.com/schoolname`) — used as-is.
- An `@handle` or slug (`@schoolname`, `schoolname`) — normalized via `normalizeSocialUrl(handle, platform)` from `src/lib/social.ts`.
- A `#` placeholder or empty string — **filtered out, not rendered**.

### 5.2 Rendering

Each theme renders social icons in a position that fits its aesthetic:

| Theme    | Position | Style |
|----------|----------|-------|
| Harmony  | Footer, under contact column | Inline row of SVG icons |
| Scholar  | Footer, below copyright | Row with subtle amber hover |
| Bloom    | Footer, full-width strip | Playful colored icons |
| Horizon  | Footer, single line | Mono minimal icons |
| Prestige | Footer Connect column | Gold-accented icon row |
| Spark    | Footer, full-width strip | Bold icons on colored background |

Spark and bloom may also surface social icons in the header top-bar when any handle is configured.

### 5.3 Do Not Render Empties

Always filter before mapping:

```astro
{Object.entries(social)
  .filter(([, v]) => v && v !== '#')
  .map(([platform, handle]) => (
    <a href={normalizeSocialUrl(handle, platform)} aria-label={platform} target="_blank" rel="noopener">
      <!-- SVG icon for platform -->
    </a>
  ))}
```

---

## 6. Accessibility Checklist

Every theme must:

- [ ] Pass WCAG AA contrast for all text/background combinations in both light and dark modes.
- [ ] Provide visible focus rings on all interactive elements (`:focus-visible`).
- [ ] Support full keyboard navigation (Tab, Enter, Space, Escape).
- [ ] Respect `prefers-reduced-motion` — disable non-essential transitions/animations.
- [ ] Use semantic HTML (`<header>`, `<main>`, `<footer>`, `<nav>`, `<article>`, `<button>` for actions, `<a>` for navigation).
- [ ] Provide `aria-label` for icon-only buttons and links (e.g. social icons).
- [ ] Use `alt` text on all images (fall back to empty string for decorative).
- [ ] Announce dynamic content changes via `aria-live` where applicable.
- [ ] Avoid color-only meaning (e.g. required fields should have an icon *and* color).

---

## 7. Do's and Don'ts

### Do

- Use `getSchoolNav(school.id)` and `getSchoolContacts(school.id)` — never `getDb()` directly in themes.
- Emit palette as CSS variables so light/dark mode is a class swap.
- Use Tailwind arbitrary values (`bg-[var(--surface)]`) to bind to palette vars.
- Keep mobile nav collapsed by default, toggled by a button.
- Provide a theme-mode toggle with three states (light / dark / system).
- Use `prefix = /${school.slug}` for all internal links.
- Use double-quoted strings in `class:list` arrays when they contain `font-['Name']` syntax (single-quoted strings inside arrays break the Astro parser — see the spark theme bug from prior session).

### Don't

- Don't accept `schoolSlug` and re-query the DB — always take the `school` prop.
- Don't hardcode colors (`bg-amber-950` is fine for a one-off decorative element; `bg-[var(--surface)]` is required for anything that should respond to palette/light/dark).
- Don't put a `<slot />` outside `<main>` — content pages expect to render inside `<main>`.
- Don't re-import `global.css` from an incorrect relative path (it's `../../styles/global.css` from any theme's `Layout.astro`).
- Don't add a footer "Powered by iSchool" link that points to an external URL — use `/` (the marketing landing).
- Don't bake content into the theme (no hardcoded "Welcome to our school" hero text — that's the CMS's job).

---

## 8. Checklist: Adding a New Theme

1. **Create the file** at `src/themes/{name}/Layout.astro`.
2. **Use the correct frontmatter**:
   ```ts
   import { getSchoolNav, getSchoolContacts } from '../../lib/school.ts';
   interface Props { school: any; title?: string; }
   const { school, title } = Astro.props;
   const nav = getSchoolNav(school.id);
   const contacts = getSchoolContacts(school.id);
   const pageTitle = title ? `${title} — ${school.name}` : school.name;
   const prefix = `/${school.slug}`;
   const { pathname } = Astro.url;
   ```
3. **Emit doctype + html + head + body + header + main(slot) + footer** per §2.5.
4. **Emit palette CSS variables** under `html.light` / `html.dark` per §3.4.
5. **Include FOUC-prevention script** in `<head>` per §4.2.
6. **Include theme-mode toggle** per §4.3.
7. **Render social handles** per §5.
8. **Pass the accessibility checklist** in §6.
9. **Register in `src/themes/index.ts`**: import the layout and add it to `themeLayouts`.
10. **Add icon + description** to the theme selector in `src/pages/dashboard/settings.astro`.
11. **Test with a sample school**: switch an existing school's theme to the new one via `/dashboard/settings`, confirm no blank page, confirm light/dark toggle works, confirm mobile nav works, confirm social icons render when configured.
12. **Update seed data** (`src/lib/db/seed.ts`) to use the theme on a test school (or add a third seed school for the new theme).
13. **Add a migration** only if the theme needs new DB columns (rare — themes should not require schema changes).

---

## 9. Reference: Canonical Example

The **harmony** theme (`src/themes/harmony/Layout.astro`) is the canonical reference. It demonstrates:

- Correct prop contract (`school` object, not `schoolSlug`)
- Use of `getSchoolNav` and `getSchoolContacts` helpers
- `prefix` pattern for internal links
- `:root { --tp }` utility-class pattern (legacy; will migrate to full palette in Task 9)
- Desktop pill-nav + mobile hamburger menu
- Multi-column footer with nav + contacts
- Minimal inline `<script>` for mobile toggle

Until the palette refactor lands, harmony is the simplest theme to copy from when starting a new one.

After Task 9 lands, this section will be updated to point to the first theme that uses the full palette CSS variable system.

---

## 10. Current Theme Catalogue

| Theme      | Character                      | Default mode | Typography                    |
|------------|--------------------------------|--------------|-------------------------------|
| `harmony`  | Modern glassmorphism           | Light        | Inter                         |
| `scholar`  | Classical academic               | Light        | Playfair Display + Source Sans 3 |
| `bloom`    | Playful, nature-inspired       | Light        | Nunito                        |
| `horizon`  | Ultra-minimal                  | Light        | Space Grotesk + JetBrains Mono |
| `prestige` | Luxury dark & gold             | **Dark**     | Cormorant Garamond + Montserrat |
| `spark`    | Bold, energetic                | Light        | Outfit + Space Mono           |

Each theme must remain **visually distinct** — don't add a theme that looks like a slight variant of an existing one.

---

BismiLlah — end of theme developer guide.
