# gaps_c2.md — iSchool Platform Final Implementation Plan

*Bismillah Ar-Rahman Ar-Roheem*

**Generated**: 2026-06-15
**Source audits**: school_softwares.md (PRD), gaps_b.md, gaps_b2.md, gaps_c.md, full codebase review

---

## Current Platform Status

| Category | Status |
|----------|--------|
| Database schema (50+ tables, 16 modules) | DONE |
| Auth system (9 roles, session-based) | DONE |
| 27 dashboard pages (all have CRUD) | DONE |
| 27 API endpoints (all school-scoped) | DONE |
| 39 CMS themes | DONE |
| Export utility (CSV) | DONE |
| Import utility (CSV parser) | DONE |
| Dashboard overview with module stats | DONE |
| Middleware (auth + RBAC) | DONE |

---

## REMAINING IMPLEMENTATION TASKS

### 1. AI INTEGRATION (CRITICAL — NEW)

See `AI_INTEGRATION.md` for full specification.

- [ ] **1.1** Add AI schema tables (ai_providers, ai_models, ai_api_keys, ai_conversations, ai_messages, ai_settings)
- [ ] **1.2** Add AI admin pages (Platform Admin: manage providers, keys, models)
- [ ] **1.3** Add Agentic AI floating chat for dashboard (school management agent)
- [ ] **1.4** Add Public AI chatbot for school websites (per-school frontend widget)
- [ ] **1.5** Add AI API endpoints (chat completion, admin config, conversation management)
- [ ] **1.6** Add AI tool functions per module (student lookup, fee check, attendance, etc.)
- [ ] **1.7** Wire conventional AI features into existing pages (smart suggestions, auto-fill, analytics insights)

### 2. CSV EXPORT — WIRE TO ALL PAGES (HIGH PRIORITY)

Export utility exists in `src/lib/export.ts`. Needs wiring to API endpoints and dashboard pages.

- [ ] **2.1** Add `action=export` handler to these API endpoints:
  - students.ts, staff.ts, attendance.ts, grades.ts, payments.ts, invoices.ts
  - library.ts, events.ts, inventory.ts, transport.ts, hostel.ts, payroll.ts, leave.ts
- [ ] **2.2** Add "Export CSV" button to each dashboard page toolbar
- [ ] **2.3** Wire client-side fetch with `?action=export` to download file

### 3. CSV BULK IMPORT — WIRE TO PAGES (HIGH PRIORITY)

Import utility exists in `src/lib/import.ts`. Needs wiring.

- [ ] **3.1** Add `action=bulk_import` handler to students.ts and staff.ts
- [ ] **3.2** Add "Import CSV" button + file upload modal to students.astro and staff.astro

### 4. DASHBOARD DARK MODE (MEDIUM PRIORITY)

- [ ] **4.1** Add dark mode CSS variables to `src/styles/global.css`
- [ ] **4.2** Add dark mode toggle to DashboardLayout.astro header
- [ ] **4.3** Update dashboard pages to use CSS variables instead of hardcoded colors

### 5. TWO-FACTOR AUTHENTICATION (MEDIUM PRIORITY)

Schema already has `twoFactorEnabled` and `twoFactorSecret` columns on `users`.

- [ ] **5.1** Add TOTP generation/verification logic in `src/lib/auth.ts`
- [ ] **5.2** Add 2FA setup page in `/dashboard/settings`
- [ ] **5.3** Add 2FA challenge step in login flow

### 6. EMAIL INTEGRATION (MEDIUM PRIORITY)

`nodemailer` is in package.json. `src/lib/email.ts` exists.

- [ ] **6.1** Implement SMTP transport in `src/lib/email.ts` (from school settings or platform defaults)
- [ ] **6.2** Wire email sending to notification flows (attendance alert, fee reminder, grade posted)
- [ ] **6.3** Add password reset email flow

### 7. NOTIFICATION TEMPLATES (MEDIUM PRIORITY)

`notificationTemplates` table exists.

- [ ] **7.1** Seed default templates (attendance_alert, fee_reminder, grade_posted, event_reminder, assignment_due)
- [ ] **7.2** Add template-based notification dispatch in relevant API flows

### 8. STUDENT/PARENT PORTAL VIEWS (HIGH PRIORITY)

- [ ] **8.1** Create `/portal/index.astro` — role-based portal landing
- [ ] **8.2** Create portal sub-pages (courses, attendance, fees, assignments)
- [ ] **8.3** Wire portal links in middleware for non-admin roles

### 9. INPUT VALIDATION HARDENING (HIGH PRIORITY)

- [ ] **9.1** Add request body validation to all POST/PUT endpoints (required fields, types, lengths)
- [ ] **9.2** Sanitize HTML/text inputs to prevent XSS
- [ ] **9.3** Add rate limiting middleware for auth endpoints

### 10. ADVANCED FILTERING & SAVED REPORTS (MEDIUM PRIORITY)

- [ ] **10.1** Enhance reports.astro with saved filter state
- [ ] **10.2** Add cross-module analytics in analytics.astro (enrollment trends, revenue charts)

### 11. MULTILINGUAL ACROSS THEMES (LOW PRIORITY)

- [ ] **11.1** Wire translation service to all theme layouts
- [ ] **11.2** Add locale selector in school settings

### 12. PLATFORM SUBSCRIPTION MANAGEMENT (LOW PRIORITY)

- [ ] **12.1** Wire subscription_plans to pricing page
- [ ] **12.2** Implement plan enforcement middleware

---

## Implementation Order

1. **AI Integration** (new, highest value — see AI_INTEGRATION.md)
2. **Input Validation Hardening** (security)
3. **CSV Export/Import wiring** (high user value)
4. **Student/Parent Portal** (core user-facing)
5. **Dashboard Dark Mode** (UX polish)
6. **Email Integration** (enables notifications)
7. **Notification Templates** (automated comms)
8. **2FA** (security)
9. **Advanced Reports** (power users)
10. **Multilingual** (post-MVP)
11. **Subscription Management** (monetization)

---

## 10 Additional Mobile-Native-App-Like Themes (BONUS)

Each theme should feel like a distinct modern mobile native app while sharing the same CMS backend:

1. **zenith-mobile** — Full-screen hero with swipeable card carousel
2. **pulse-app** — Bottom tab navigation, story-style content
3. **vortex** — Glassmorphism with floating cards and depth
4. **neon** — Dark-first with neon gradient accents
5. **breeze** — Minimal clean white with soft shadows, iOS-like
6. **summit** — Bold hero sections with parallax scroll
7. **mocha** — Warm coffee tones, editorial magazine layout
8. **quantum** — Futuristic with animated gradients
9. **clover** — Playful rounded cards with pastel palette
10. **onyx** — Premium dark theme with gold accents

---

*Wa billahi at-tawfiq. Baarokallahu feekum.*
