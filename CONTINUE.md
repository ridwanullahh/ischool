# iSchool — Continuation Context for Next Agent

BismiLlah Ar-Rahman Ar-Raheem. AlhamduliLlah, Laailaaha illa ALLAH, Muhammadun RosuluLlah. La hawla wala quwwata illa biLlah. HasbiyaLlah la ilaha illa Hu, alayHi tawakkaltu. SubhanAllah, WalhamduliLlah, La ilaha illa Allah, Allahu Akbar.

This file gives the next agent everything needed to pick up where this session stopped. Read the approved plan at `/home/ubuntu/.qoder/plans/early-alcove-teal.md` first — this file supplements it with *current state*.

---

## Project Snapshot

- **Project**: iSchool — multi-tenant school-website SaaS (Astro 6 SSR, Tailwind CSS v4, SQLite via better-sqlite3, Drizzle ORM)
- **Working dir**: `/home/ubuntu/lab/ischool`
- **DB location**: `/home/ubuntu/lab/ischool/ischool.db` (project root — NOT `data/`)
- **Run dev**: `ALLOW_CROSS_ORIGIN=true npm run dev` → http://localhost:4321
- **Migrate + seed**: `npm run db:setup` (deletes of `ischool.db*` may be needed if schema changed)
- **Credentials**:
  - Platform admin: `admin@ischool.com` / `admin123`
  - Al-Noor (seed theme = `scholar`): `principal@alnoor.edu` / `school123`
  - Darul Hikmah (seed theme = `prestige`): `principal@darulhikmah.edu` / `school123`

---

## Critical Bugs (User-Reported, Root-Cause Found)

1. **Al-Noor renders blank** — 4 legacy themes (`harmony`, `scholar`, `bloom`, `horizon`) still destructure a `schoolSlug` prop and re-query the DB themselves. But all `[slug]` routes now pass `<Layout school={school}>`. `schoolSlug` is `undefined` → DB query returns nothing → page renders blank. Prestige and Spark already use the new `school` prop API (so Darul Hikmah works).
2. **Quirks-mode console warning** on Al-Noor only — side-effect of #1 (broken frontmatter produces a malformed doctype). Will self-resolve once #1 is fixed. Verify all 6 theme doctypes just in case.
3. **Theme selector has no effect** in `/dashboard/settings` — the radio `<input class="sr-only">` toggles but has no visual feedback and doesn't auto-submit. Also uses `border-primary-500` (static Tailwind theme color) instead of the school's `primaryColor`.
4. **No logout on dashboard mobile drawer** — desktop sidebar has it (line 91-95 of `DashboardLayout.astro`); mobile drawer (lines 120-143) does not.

---

## What's Already Done in This Session

### Files already modified (partial refactor, DO NOT discard):

**`src/lib/school.ts`** — added `getSchoolContacts(schoolId)` helper. Full file now:
```ts
import { getDb } from './db/index.js';
import { schools, schoolMembers, navigationItems, contactInfo } from './db/schema.js';
import { eq, asc } from 'drizzle-orm';

export function getUserSchool(userId: number) { /* existing */ }
export function getUserSchoolId(userId: number): number | null { /* existing */ }
export function getSchoolBySlug(slug: string) { /* existing */ }
export function getSchoolNav(schoolId: number) { /* existing, returns navItems[] */ }
export function getSchoolInfo(schoolId: number) { /* existing, returns single contact */ }
export function getSchoolContacts(schoolId: number) {
  const db = getDb();
  return db.select().from(contactInfo)
    .where(eq(contactInfo.schoolId, schoolId))
    .orderBy(asc(contactInfo.sortOrder))
    .all();
}
```

**`src/themes/harmony/Layout.astro`** — ✅ fully refactored to new API:
- Frontmatter: `school` prop, `nav = getSchoolNav(school.id)`, `contacts = getSchoolContacts(school.id)`, `pageTitle`, `prefix`, `pathname`
- Markup: all `navItems` renamed to `nav`; `<title>{pageTitle}</title>`
- Kept the `:root { --tp }` + `.tp/.tbg/.tbd` utility-class pattern for now (will be replaced with full palette CSS vars in Phase 3)

**`src/themes/scholar/Layout.astro`** — ✅ fully refactored (same shape as harmony; uses `--tp`, `ff-serif`, `ff-sans` CSS classes).

**`src/themes/bloom/Layout.astro`** — ⚠️ **PARTIALLY refactored**:
- Frontmatter: ✅ DONE — new API (school prop, nav, contacts, pageTitle)
- `<title>{pageTitle}</title>`: ✅ DONE
- Markup `navItems` → `nav` rename: ❌ **NOT DONE** — three references still remain:
  1. Line ~41: desktop nav `{navItems.map(item => (...)}`
  2. Line ~56: mobile menu `{navItems.map(item => (...)}`
  3. Line ~76: footer Explore `{navItems.slice(0,6).map(...)}`

**`src/themes/horizon/Layout.astro`** — ❌ NOT started yet. Same refactor needed (frontmatter + navItems rename + title→pageTitle).

---

## Where I Stopped

I was mid-way through **Task 1: Refactor harmony/scholar/bloom/horizon themes to new `school` prop API**.

**Resume order:**
1. Finish bloom — rename the 3 remaining `navItems` references to `nav`.
2. Refactor horizon frontmarkup + markup (same pattern as harmony/bloom/scholar).
3. **Verify with dev server** — start `ALLOW_CROSS_ORIGIN=true npm run dev`, hit `/alnoor` (scholar), `/darulhikmah` (prestige), and switch Al-Noor's theme via dashboard to each of the 6 themes, confirming no blank pages.
4. Move to Task 2: fix the theme selector auto-submit + visual feedback in `src/pages/dashboard/settings.astro`:
   - Add `onchange="this.form.submit()"` to the radio input
   - Replace `border-primary-500` / `bg-primary-50` class:list entries with `style` attributes that use `school.primaryColor`
   - Ensure the label has an `id` matching the radio's `for` (sr-only + label pattern)
5. Task 3: add logout button to DashboardLayout mobile drawer (copy the desktop form pattern into lines 120-143).
6. Task 4: make homepage announcement banner a clickable link — wrap the `<section>` at `src/pages/[slug]/index.astro:52-60` in `<a href={/${slug}/announcements/${recentAnnouncements[0].slug}}>`.

---

## The 16 Tasks (Current State)

| # | Task | Status |
|---|------|--------|
| 1 | Phase 1: Refactor harmony/scholar/bloom/horizon themes to new `school` prop API | 🟡 IN PROGRESS (harmony + scholar done; bloom 70%; horizon 0%) |
| 2 | Phase 1: Fix theme selector auto-submit + visual feedback in `/dashboard/settings` | ⬜ pending |
| 3 | Phase 1: Add logout button to DashboardLayout mobile drawer | ⬜ pending |
| 4 | Phase 1: Make homepage announcement banner a clickable link | ⬜ pending |
| 5 | Phase 2: Schema — add `social_handles` column, `reactions` table, `schoolMembers.active` column to `schema.ts` + `migrate.ts` | ⬜ pending |
| 6 | Phase 2: Create `src/lib/palette.ts` with WCAG AA contrast guardrails + `generateDefaultPalette(primaryColor)` | ⬜ pending |
| 7 | Phase 2: Delete `ischool.db*` at project root, re-run `npm run db:setup` to verify migration+seed | ⬜ pending |
| 8 | Phase 3: Palette section in `/dashboard/settings` UI (primary + accent + advanced pickers + auto-generate) + API at `/api/dashboard/settings.ts` | ⬜ pending |
| 9 | Phase 3: Light/dark mode on all 6 themes — emit palette CSS variables under `html.light` / `html.dark`, add toggle button (sun/moon), use `localStorage.themeMode`. Prestige defaults to dark; all others default to light. | ⬜ pending |
| 10 | Phase 4: Social handles in dashboard settings + render social icons in all 6 theme footers (styled per theme) using `src/lib/social.ts` `normalizeSocialUrl()` helper | ⬜ pending |
| 11 | Phase 5: Theme preview — add "Preview" button to theme cards; opens `/{school.slug}/?preview_theme={name}` in new tab; themes honor param for authenticated members; preview banner with "Apply" / "Close" links | ⬜ pending |
| 12 | Phase 6: Create `OnboardingLayout` + 5 onboarding pages (`/onboarding`, `/onboarding/school`, `/onboarding/about`, `/onboarding/contacts`, `/onboarding/done`) + API endpoints at `/api/onboarding/*.ts`. Add middleware redirect for schoolless `school_admin` users. | ⬜ pending |
| 13 | Phase 6: `/dashboard/schools` page + `/api/dashboard/switch-school.ts` + reusable `CreateSchoolModal.astro` mounted in `DashboardLayout.astro` outside `<slot />` + `+ New School` button in header. Update `getUserSchool()` to respect `schoolMembers.active`. | ⬜ pending |
| 14 | Phase 7: `ShareButtons` component (Web Share API + fallbacks) + reactions API (`/api/reactions.ts`, `reactions` table) + live search/filter/sort on `/[slug]/blog`, `/[slug]/announcements`, `/blog`, `/docs` via `/api/search.ts` | ⬜ pending |
| 15 | Phase 8: Write `src/themes/README.md` — theme philosophy, architecture, prop contract, required sections, light/dark contract, accessibility checklist, social handles rendering, do's/don'ts, new-theme checklist | ✅ DONE — shipped as `/home/ubuntu/lab/ischool/src/themes/README.md` |
| 16 | Verify all routes with dev server after each phase | ⬜ pending (do after every phase) |

**Note:** Task 15 (theme philosophy doc) has been completed and removed from the pending list — see `/home/ubuntu/lab/ischool/src/themes/README.md`.

---

## Key Architectural Decisions (Already Made by User)

- **Multi-school + "create from anywhere" modal** (user picked the fullest scope, not the simpler onboarding-only option).
- **Theme preview = new-tab with `?preview_theme=` URL param** (user picked simple over iframe).
- **Path-based routing with direct slugs** — `/{school.slug}`, no `/s/` prefix.
- **Same app hosts all admin panels** (no subdomains).
- **Session cookie auth** (`session=` HttpOnly cookie, 30-day expiry, nanoid tokens).
- **No billing in this iteration** — deferred.
- **No comments** — only reactions + shares for engagement.
- **Dev server only** when done — user said "Don't run build related, only dev for now."

---

## Schema Changes Still Needed (Task 5)

```ts
// In src/lib/db/schema.ts:

// 1. Add social_handles column to schools table:
socialHandles: text('social_handles', { mode: 'json' }).default('{}'),
//    shape: { facebook, instagram, twitter, youtube, linkedin, tiktok, whatsapp, email }

// 2. Add active column to schoolMembers:
//    change existing role col line to include:
active: integer('active', { mode: 'boolean' }).default(false),

// 3. Add new reactions table:
export const reactions = sqliteTable('reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type', {
    enum: ['blog_post', 'announcement', 'program', 'class', 'platform_blog']
  }).notNull(),
  entityId: integer('entity_id').notNull(),
  userFingerprint: text('user_fingerprint').notNull(),
  reactionType: text('reaction_type', {
    enum: ['like', 'love', 'helpful', 'celebrate']
  }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

```ts
// In src/lib/db/migrate.ts — add inside the big db.exec(`...`) block:
//   - Add social_handles TEXT DEFAULT '{}' to schools CREATE TABLE
//   - Add active INTEGER DEFAULT 0 to school_members CREATE TABLE
//   - Add CREATE TABLE reactions (...) statement
//   - Add CREATE INDEX IF NOT EXISTS idx_reactions_entity ON reactions(entity_type, entity_id);
//   - Add CREATE INDEX IF NOT EXISTS idx_school_members_active ON school_members(user_id, active);
```

Then: `rm ischool.db ischool.db-wal ischool.db-shm && npm run db:setup` from project root.

---

## Palette Helper Contract (Task 6)

`src/lib/palette.ts` should export:
- `generateDefaultPalette(primaryColor: string): Palette` — derives `{ primary, accent, backgroundLight, backgroundDark, surfaceLight, surfaceDark, textLight, textDark, mutedLight, mutedDark, borderLight, borderDark }` from the primary using HSL adjustments.
- `ensureContrast(fg: string, bg: string, minRatio = 4.5): string` — returns fg unchanged if WCAG AA passes; otherwise auto-adjusts fg luminance until it passes.
- `mergePalette(stored: Partial<Palette>, primary: string): Palette` — fills missing slots from `generateDefaultPalette(primary)`.

All themes will read `school.settings?.palette` (or fall back to `generateDefaultPalette(school.primaryColor)`) and emit CSS vars: `--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`, `--primary` under `html.light` / `html.dark`.

---

## Files to Touch (Non-Exhaustive Reference)

**New files to create:**
- `src/lib/palette.ts` (Task 6)
- `src/lib/social.ts` (Task 10)
- `src/components/CreateSchoolModal.astro` (Task 13)
- `src/components/ShareButtons.astro`, `ReactionBar.astro`, `SearchFilterBar.astro` (Task 14)
- `src/layouts/OnboardingLayout.astro` (Task 12)
- `src/pages/onboarding/*.astro` (5 pages, Task 12)
- `src/pages/api/onboarding/*.ts` (Task 12)
- `src/pages/api/reactions.ts`, `src/pages/api/search.ts`, `src/pages/api/dashboard/switch-school.ts` (Tasks 13-14)
- `src/pages/dashboard/schools.astro` (Task 13)

**Files to modify:**
- `src/themes/{harmony,scholar,bloom,horizon}/Layout.astro` — Task 1 (in progress); then palette CSS vars + light/dark + social icons in Tasks 9, 10.
- `src/themes/{prestige,spark}/Layout.astro` — already on new API; only need palette CSS vars + light/dark + social icons (Tasks 9, 10).
- `src/themes/index.ts` — may add `getSchoolPalette()` helper later.
- `src/pages/dashboard/settings.astro` — Tasks 2, 8, 10, 11.
- `src/pages/api/dashboard/settings.ts` — Tasks 8, 10, 11 (persist palette + social + preview).
- `src/layouts/DashboardLayout.astro` — Tasks 3, 13 (mobile logout, `+ New School` button, modal mount, schools nav).
- `src/lib/middleware.ts` — Task 12 (onboarding redirect for schoolless users).
- `src/lib/school.ts` — Task 13 (`getUserSchool` respects `active`).
- `src/pages/[slug]/index.astro` — Task 4 (clickable announcement banner) + Task 14 (share/reactions on detail pages).
- `src/pages/[slug]/blog/index.astro`, `announcements/index.astro`, `/blog/index.astro`, `/docs/index.astro` — Task 14 (search/filter/sort).

---

## Critical Rules (User's Standing Instruction)

Before and after EVERY thinking process, work, and generation, start and end with (in full Arabic transliteration):
1. BismiLlah
2. Shahadatyn (Laailaaha illa ALLAH, Muhammadun RosuluLlah)
3. Ayatul Kursiy (referenced by name, not full text required)
4. La hawla wa la quwwata illa billah
5. Hasbiyallahu la ilaha illahu 'alaihi tawakkaltu
6. Tasbeehat (SubhanAllah, WalhamduliLlah, La ilaha illa Allah, Allahu Akbar)

The user stated: "WITHOUT THEM EVERY OTHER THINGS ARE ZERO, SO 'ALWAYS' FOLLOW THIS RULES PROTOCOLS STRICTLY."

---

## Risks to Remember

- **Don't delete `ischool.db`** until schema changes are finalized — re-seeding is expensive.
- **Theme refactor cascade**: when touching the palette system (Task 9), keep Tailwind utility class names where possible; swap only the underlying CSS variable values. This limits visual regression.
- **Onboarding vs existing users**: only redirect when `schoolMembers` count = 0 AND `role='school_admin'`. Super admins must never be redirected.
- **Search performance** on large content: SQLite `LIKE %q%` won't scale. Accept for now; note FTS5 upgrade path in README.

BismiLlah — end of continuation context.
