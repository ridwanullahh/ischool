# iSchool v3 Theme System — Developer Guide

Bismillah Ar-Rahman Ar-Roheem.

This document is the canonical reference for building, extending, and maintaining themes on the iSchool v3 theme architecture.

---

## 1. Architecture Overview

The v3 theme system gives each theme **full WordPress-like autonomy** over every page type. A theme is not just CSS — it owns the complete HTML structure for every CMS page.

### Key Principles

- **Full page autonomy**: Theme A's homepage is completely different from Theme B's — different layout, elements, placement, CSS.
- **Shared data contract**: All themes receive the same `school` object + CMS data. Themes never query the DB directly.
- **Palette + font integration**: Themes inherit the school's configured color palette and font preset via CSS variables.
- **Popup/banner support**: All themes include the `SchoolBannerPopup` component which inherits the theme's primary color.

### Directory Structure

```
src/themes/v3/
├── _shared/
│   ├── PaletteStyles.astro      # Emits CSS variables from school palette
│   ├── FoucScript.astro         # FOUC prevention (dark/light mode)
│   ├── ThemeToggleScript.astro  # Light → dark → system cycle
│   └── social-icons.ts          # SVG path data for social platforms
├── aurora/
│   ├── theme.config.ts          # Theme metadata
│   ├── Layout.astro             # HTML shell (head, header, footer, chat)
│   ├── HomePage.astro           # Homepage template
│   ├── AboutPage.astro          # About page template
│   ├── AdmissionsPage.astro     # Admissions page template
│   ├── ProgramsPage.astro       # Programs listing
│   ├── ProgramDetailPage.astro  # Single program
│   ├── ClassesPage.astro        # Classes listing
│   ├── BlogIndexPage.astro      # Blog listing
│   ├── BlogPostPage.astro       # Single blog post
│   ├── AnnouncementsIndexPage.astro  # Announcements listing
│   ├── AnnouncementDetailPage.astro  # Single announcement
│   ├── GalleryPage.astro        # Gallery page
│   ├── FaqsPage.astro           # FAQs page
│   └── ContactPage.astro        # Contact page
├── heritage/
│   └── ... (same 15 files)
├── registry.ts                  # Central registry
└── types.ts                     # TypeScript types
```

---

## 2. Creating a New Theme

### Step 1: Create the directory

```bash
mkdir -p src/themes/v3/mytheme
```

### Step 2: Create `theme.config.ts`

```typescript
import type { ThemeConfig } from '../types';

const config: ThemeConfig = {
  name: 'mytheme',           // Must match directory name
  label: 'My Theme',          // Display name in admin selector
  description: 'A beautiful modern theme',
  category: 'conventional',   // 'conventional' or 'mobile'
  defaultMode: 'light',       // 'light' or 'dark'
  typography: 'Inter',        // Default Google Font
  iconPath: 'M12 2L2 22h20L12 2z',  // SVG path for admin icon (24x24 viewBox)
  defaultPrimaryColor: '#2563eb',
  tags: ['modern', 'clean'],
};

export default config;
```

### Step 3: Create `Layout.astro`

The Layout is the HTML shell that wraps all pages. It must:

1. Import global CSS, PaletteStyles, FoucScript, ThemeToggleScript
2. Include `<head>` with meta tags, Google Fonts, palette CSS variables
3. Render a `<header>` with navigation (using `getSchoolNav()`)
4. Render `<main><slot /></main>` for page content
5. Render a `<footer>` with school info, contacts, social links
6. Include `<SchoolBannerPopup school={school} currentPage={Astro.url.pathname} />`
7. Include a theme-specific chat widget
8. Include `ThemeToggleScript` for dark/light mode toggle

```astro
---
import '../../../styles/global.css';
import PaletteStyles from '../_shared/PaletteStyles.astro';
import FoucScript from '../_shared/FoucScript.astro';
import ThemeToggleScript from '../_shared/ThemeToggleScript.astro';
import { getSocialIconPath } from '../_shared/social-icons';
import { getSchoolNav, getSchoolContacts } from '../../../lib/school.ts';
import { normalizeSocialUrl } from '../../../lib/social.ts';
import LanguageSelector from '../../../components/LanguageSelector.astro';
import SchoolBannerPopup from '../../../components/SchoolBannerPopup.astro';

interface Props { school: any; title?: string; }
const { school, title } = Astro.props;
const nav = getSchoolNav(school.id);
const contacts = getSchoolContacts(school.id);
const pageTitle = title ? `${title} — ${school.name}` : school.name;
const prefix = `/${school.slug}`;
const { pathname } = Astro.url;
const social = (school.socialHandles as Record<string, string>) || {};
const socialEntries = Object.entries(social).filter(([, v]) => v && v !== '#');
---

<!doctype html>
<html lang={school.locale || 'en'} class="light scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="description" content={school.tagline || school.name} />
  {school.faviconUrl && <link rel="icon" href={school.faviconUrl} />}
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <title>{pageTitle}</title>
  <FoucScript defaultMode="light" />
  <PaletteStyles school={school} />
  <style is:inline>{`
    /* Theme-specific CSS */
    body { font-family: 'Inter', system-ui, sans-serif; color: var(--text); }
  `}</style>
</head>
<body>
  <header><!-- Your unique header --></header>
  <main><slot /></main>
  <footer><!-- Your unique footer --></footer>
  <SchoolBannerPopup school={school} currentPage={Astro.url.pathname} />
  <ThemeToggleScript defaultMode="light" selector="#theme-toggle" />
</body>
</html>
```

### Step 4: Create page templates

Each page template receives `{ school, ...data }` as props. The `data` object contains CMS content:

| Page | data fields |
|------|-------------|
| HomePage | about, features[], stats[], recentAnnouncements[], recentPosts[], schoolPrograms[] |
| AboutPage | about, features[], stats[], items[] (gallery images) |
| AdmissionsPage | (none — static content) |
| ProgramsPage | items[] (programs) |
| ProgramDetailPage | item (single program) |
| ClassesPage | items[] (classes) |
| BlogIndexPage | items[] (blog posts) |
| BlogPostPage | item (single post) |
| AnnouncementsIndexPage | items[] (announcements) |
| AnnouncementDetailPage | item (single announcement) |
| GalleryPage | items[] (gallery images) |
| FaqsPage | items[] (FAQs) |
| ContactPage | (none — uses contacts from school) |

### Step 5: Register the theme

Add imports and entry to `src/themes/v3/registry.ts`:

```typescript
import mythemeConfig from './mytheme/theme.config';
import mythemeLayout from './mytheme/Layout.astro';
import mythemeHomePage from './mytheme/HomePage.astro';
// ... all 13 page imports

const registry: Record<string, RegisteredTheme> = {
  // ... existing themes
  mytheme: {
    config: mythemeConfig,
    Layout: mythemeLayout,
    HomePage: mythemeHomePage,
    // ... all 13 page properties
  },
};
```

---

## 3. CSS Variable System

All themes inherit the school's configured palette via CSS variables:

```css
html.light {
  --bg: #f8fafc;        /* Page background */
  --surface: #ffffff;   /* Card/panel background */
  --text: #0f172a;      /* Primary text */
  --muted: #64748b;     /* Secondary text */
  --border: #e2e8f0;    /* Borders */
  --accent: #0ea5e9;    /* Accent color */
  --primary: #2563eb;   /* Primary brand color */
}
html.dark {
  --bg: #0f172a;
  --surface: #1e293b;
  --text: #f1f5f9;
  --muted: #94a3b8;
  --border: #334155;
  --accent: #0ea5e9;
  --primary: #2563eb;
}
:root { --tp: #2563eb; }  /* Legacy utility variable */
```

Use these variables in your theme markup:
```html
<div style="background:var(--surface);color:var(--text);border:1px solid var(--border)">
```

Or with Tailwind arbitrary values:
```html
<div class="bg-[var(--surface)] text-[var(--text)] border-[var(--border)]">
```

---

## 4. Font Preset Integration

When a school selects a font preset from Settings, `PaletteStyles.astro` automatically:
1. Loads the Google Fonts `<link>` tags
2. Applies `font-family` CSS overrides for `body` (body font) and `h1-h6` (heading font)

Themes should use `system-ui, sans-serif` as the fallback in their base CSS — the font preset will override it.

---

## 5. Palette Preset Integration

Schools can choose from 12 predefined palette combinations in Settings. When selected, the palette values override the auto-generated defaults. Themes automatically inherit these via the CSS variables — no theme changes needed.

---

## 6. Popup/Banner System

All themes must include the `SchoolBannerPopup` component:

```astro
<SchoolBannerPopup school={school} currentPage={Astro.url.pathname} />
```

The component:
- Queries active banners (top bar, hero) and popups for the school
- Filters by page path and date range
- Renders banners with `--tp` CSS variable (inherits theme's primary color)
- Renders popups with trigger types: on_load, timed, scroll, exit_intent
- Manages frequency: once, once_per_session, once_per_day

---

## 7. Chat Widget

Each theme should include its own chat widget with a unique design that matches the theme's aesthetic. The chat widget should:
1. Have a floating button (bottom-right by convention)
2. Expand into a chat panel
3. POST messages to `/api/[slug]/ai-chat`
4. Display the AI response

See any existing theme's Layout.astro for the implementation pattern.

---

## 8. Mobile Native App-Like Themes

Mobile themes (category: 'mobile') follow the same architecture but with app-like UX:
- Bottom tab bar navigation (first 5 nav items + "More")
- Slide-in drawer for full navigation
- Compact app-style header
- No traditional hero sections
- Touch-optimized spacing
- `viewport-fit=cover` and safe-area-inset support

---

## 9. Page Template Best Practices

### Archive Pages (BlogIndex, AnnouncementsIndex, ProgramsPage, etc.)

Archive pages should include:
- **Search**: Client-side text search filtering
- **Filter**: By category/tags/date range
- **Sort**: By date (newest/oldest), title (A-Z/Z-A)
- **Pagination**: Or infinite scroll for large lists

### Single Pages (BlogPost, AnnouncementDetail, ProgramDetail)

Single pages should include:
- **Social share buttons**: Facebook, Twitter, WhatsApp, Copy link
- **Reaction bar**: Like, love, etc. (via `/api/reactions`)
- **Comments/discussions**: If a discussion board exists for the content type
- **Related content**: Show related items at the bottom

---

## 10. Testing Your Theme

1. **Build**: `npm run build` — must pass without errors
2. **Switch theme**: In `/dashboard/settings`, select your theme
3. **Preview**: Click "Preview" to see it on the school's public site
4. **Test all pages**: Visit homepage, about, admissions, programs, blog, announcements, gallery, FAQs, contact
5. **Test dark mode**: Toggle the theme mode button
6. **Test mobile**: Resize to 375px width
7. **Test popup/banner**: Create a banner and popup in dashboard, verify they render

---

## 11. Current Theme Catalog

### Conventional (20)
aurora, heritage, pulse, bloom, apex, lumina, crest, nexus, marble, vivid, sapphire, drift, forge, halo, meadow, orbit, prism, quartz, summit, tide

### Mobile Native (5)
mobile-pulse, mobile-bloom, mobile-aurora, mobile-apex, mobile-heritage

---

*End of v3 Theme System Developer Guide.*
