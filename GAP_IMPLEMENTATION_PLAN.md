# iSchool — Gap Implementation Plan

BismiLlah Ar-Rahman Ar-Roheem

## Audit Summary

All 16 tasks from CONTINUE.md are substantially complete in the codebase. The following gaps remain.

---

## Phase A: Bug Fixes & Polish (Priority: Critical)

### A1. Fix SearchFilterBar.astro template literal bug
- **File**: `src/components/SearchFilterBar.astro`
- **Problem**: Uses JS template literals `"${schoolId}"` inside `<script>` — Astro doesn't interpolate these in client scripts
- **Fix**: Use `data-*` attributes on the container div and read them in the script

### A2. Fix social icons — platform-specific SVGs
- **Files**: All 6 theme Layout.astro files
- **Problem**: Every social icon renders the Facebook SVG path regardless of platform
- **Fix**: Import `socialPlatforms` from `social.ts`, look up the correct icon path per platform key

### A3. Add CreateSchoolModal as reusable component + mount in DashboardLayout
- **Files**: `src/components/CreateSchoolModal.astro` (new), `src/layouts/DashboardLayout.astro`
- **Problem**: Modal is inline in `dashboard/schools.astro` only. Task 13 says it should be mounted in DashboardLayout with a `+ New School` button in the header.
- **Fix**: Extract modal to reusable component, mount in DashboardLayout, add button to header

---

## Phase B: Palette CSS Variable Migration (Priority: High)

### B1. Update `[slug]/index.astro` homepage to use CSS vars
- Replace `text-gray-900`, `bg-gray-50`, `text-gray-600`, etc. with `style="color:var(--text)"`, `style="background:var(--bg)"` etc.
- Same for `school-bg-primary` classes → `style="background:var(--primary)"`

### B2. Update school subpages to use CSS vars
- `src/pages/[slug]/about.astro`
- `src/pages/[slug]/blog/index.astro` and `[post].astro`
- `src/pages/[slug]/announcements/index.astro` and `[announcement].astro`
- `src/pages/[slug]/programs.astro` and `[program].astro`
- `src/pages/[slug]/classes.astro` and `[class].astro`
- `src/pages/[slug]/contact.astro`
- `src/pages/[slug]/gallery.astro`
- `src/pages/[slug]/faqs.astro`
- `src/pages/[slug]/admissions.astro`

---

## Phase C: 10 New Premium Themes (Priority: High)

Each theme follows the same prop contract, palette CSS vars, light/dark toggle, social icons, responsive nav.

### C1. Aurora — Ethereal gradient theme
- Flowing aurora borealis gradient backgrounds
- Glassmorphic cards with backdrop blur
- Soft serif + sans combination (DM Serif Display + DM Sans)
- Gradient text headings

### C2. Serenity — Japanese zen minimalism
- Maximum whitespace, hairline borders
- Muted earth palette, single accent color
- Noto Serif JP + Inter
- Centered, calm layouts

### C3. Heritage — Rich classical tradition
- Ornate decorative borders and dividers
- Deep navy/burgundy base with gold accents
- Crimson Text + Lato
- Traditional double-column footer

### C4. Campus — Modern collegiate
- Bold color blocks, athletic-inspired
- Card-based layout with strong hierarchy
- Archivo + Source Sans 3
- Prominent CTA buttons

### C5. Ember — Warm earth tones
- Cozy, soft rounded corners everywhere
- Terracotta, sand, warm browns
- Lora + Work Sans
- Soft shadows, warm overlays

### C6. Prism — Creative geometric
- Diagonal section dividers, geometric patterns
- Vibrant multi-color accent system
- Sora + IBM Plex Sans
- Asymmetric grid layouts

### C7. Slate — Corporate professional
- Strict grid-based layout, clean lines
- Neutral grays with single accent
- Manrope + JetBrains Mono (for data)
- Structured, information-dense

### C8. Oasis — Nature-inspired freshness
- Organic curved shapes, leaf-like accents
- Green/teal palette with sky blue
- Poppins + Merriweather
- Flowing section transitions

### C9. Nova — Futuristic tech-forward
- Dark base with neon accent glow effects
- Monospace headings, tech feel
- Chakra Petch + Fira Code
- Glowing borders, subtle grid background

### C10. Mosaic — Cultural vibrancy
- Tile-pattern accent borders and backgrounds
- Rich warm palette (amber, teal, magenta)
- Righteous + Nunito
- Pattern-based decorative elements

---

## Phase D: Registration & Testing

### D1. Register all 10 themes in `src/themes/index.ts`
### D2. Add new themes to settings.astro theme picker grid
### D3. Rebuild DB and test with dev server
- Delete `ischool.db*`, run `npm run db:setup`
- Start dev server
- Test all routes for both schools
- Test theme switching
- Test onboarding flow
- Test all 16 themes render correctly

---

Wa billahi at-tawfiq.
