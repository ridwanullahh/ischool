# gaps_c.md — iSchool Platform Implementation Plan

*BismiLlah Ar-Rahman Ar-Raheem*

**Generated**: 2026-06-15
**Source audits**: `gaps_b2.md` (all items resolved), `school_softwares.md` (16-module PRD), full codebase review

---

## Status Summary

| Category | Status |
|----------|--------|
| All 13 stub pages from gaps_b2.md | ✅ Fully implemented |
| All 12 missing API endpoints from gaps_b2.md | ✅ Fully implemented |
| Security issues from gaps_b2.md | ✅ All resolved |
| 27 dashboard pages | ✅ All have CRUD, stats, search/filter, modals |
| 27 API endpoints | ✅ All have auth + school-scoping |
| 33 themes registered | ✅ All in `src/themes/index.ts` |
| Database schema (50+ tables) | ✅ Complete |
| Session-based auth (9 roles) | ✅ Complete |

---

## Bugs Fixed This Audit

| Bug | Location | Fix |
|-----|----------|-----|
| `schoolMembers.joinedAt` undefined | `it-admin.astro:68`, `it-admin.ts` | Changed to `schoolMembers.createdAt` |
| Unused `isNull` import | `src/pages/api/search.ts` | Removed from import |
| Prerender + SSR conflict | `src/pages/modules/[module].astro` | Removed `prerender` and `getStaticPaths()` |

---

## GAPS-C: Remaining Implementation Tasks

### 1. Data Export (CSV / PDF) — HIGH PRIORITY

**PRD requirement**: Every module should support exporting data to CSV and PDF.

- [ ] **1.1** Add CSV export utility (`src/lib/export.ts`)
  - [ ] `toCsv(rows, columns)` — generic array-to-CSV serializer
  - [ ] `downloadCsv(res, filename, rows, columns)` — sends Response with correct headers
- [ ] **1.2** Add CSV export to API endpoints (action=`export`)
  - [ ] `students.ts` — export student list
  - [ ] `staff.ts` — export staff list
  - [ ] `attendance.ts` — export attendance records by date range
  - [ ] `grades.ts` — export gradebook for a class/term
  - [ ] `payments.ts` — export payment ledger
  - [ ] `invoices.ts` — export invoice list
  - [ ] `library.ts` — export book catalog / loan history
  - [ ] `events.ts` — export event list
  - [ ] `inventory.ts` — export asset/inventory register
  - [ ] `transport.ts` — export vehicle/route roster
  - [ ] `hostel.ts` — export room allocation
  - [ ] `payroll.ts` — export payroll register
  - [ ] `leave.ts` — export leave history
- [ ] **1.3** Add export buttons to dashboard pages
  - [ ] Each page's toolbar gets a "Export CSV" button that calls the API with `action=export`

### 2. Bulk Import — HIGH PRIORITY

**PRD requirement**: Schools should be able to bulk-import students and staff from CSV files.

- [ ] **2.1** Add CSV parser utility (`src/lib/import.ts`)
  - [ ] `parseCsv(text)` — simple CSV parser (handles quoted fields, newlines in quotes)
  - [ ] `validateImportRows(rows, schema)` — validates required fields, returns errors
- [ ] **2.2** Add bulk import to API endpoints (action=`bulk_import`)
  - [ ] `students.ts` — bulk create students from CSV upload
  - [ ] `staff.ts` — bulk create staff from CSV upload
- [ ] **2.3** Add import UI to dashboard pages
  - [ ] `students.astro` — "Import CSV" button + file upload modal with column mapping
  - [ ] `staff.astro` — same

### 3. Student/Parent Portal Views — HIGH PRIORITY

**PRD requirement**: Students and parents see role-specific portal views (not the admin dashboard).

- [ ] **3.1** Create `src/pages/portal/index.astro` — role-based portal landing
  - [ ] Student view: my courses, my grades, my attendance, upcoming events, assignments due
  - [ ] Parent view: my children's summary, attendance alerts, fee status, messages
  - [ ] Teacher view: my classes, pending grading, today's timetable
- [ ] **3.2** Create portal sub-pages
  - [ ] `/portal/courses.astro` — student's enrolled courses with grades
  - [ ] `/portal/attendance.astro` — student's attendance history
  - [ ] `/portal/fees.astro` — parent's fee invoices and payment status
  - [ ] `/portal/assignments.astro` — student's pending/submitted assignments
- [ ] **3.3** Wire portal links in dashboard middleware for non-admin roles

### 4. Notification Templates — MEDIUM PRIORITY

**PRD requirement**: Pre-built notification templates with variable substitution for common events.

- [ ] **4.1** Add `notification_templates` table to schema (or use existing `notifications` with template flag)
  - [ ] Fields: `name`, `channel`, `subjectTemplate`, `bodyTemplate`, `variables[]`, `isActive`
- [ ] **4.2** Seed default templates
  - [ ] `attendance_alert` — "Your child {studentName} was absent on {date}"
  - [ ] `fee_reminder` — "Invoice #{invoiceNo} of {amount} is due on {dueDate}"
  - [ ] `grade_posted` — "New grade posted for {courseName}: {grade}"
  - [ ] `event_reminder` — "Reminder: {eventName} on {date} at {time}"
  - [ ] `assignment_due` — "Assignment '{title}' for {courseName} is due {dueDate}"
- [ ] **4.3** Add template-based notification sending to relevant API flows
  - [ ] `attendance.ts` POST → fire `attendance_alert`
  - [ ] `invoices.ts` POST → fire `fee_reminder`
  - [ ] `grades.ts` POST → fire `grade_posted`

### 5. Dashboard Dark Mode — MEDIUM PRIORITY

- [ ] **5.1** Add dark mode CSS variables to `src/styles/global.css`
  - [ ] Define `--bg`, `--surface`, `--text`, `--muted`, `--border` for dashboard
- [ ] **5.2** Add dark mode toggle to `DashboardLayout.astro` header
- [ ] **5.3** Update all dashboard pages to use CSS variables instead of hardcoded colors

### 6. Advanced Filtering & Saved Reports — MEDIUM PRIORITY

**PRD requirement**: Users can save custom report filters and re-run them later.

- [ ] **6.1** Enhance `saved_reports` usage in `reports.astro`
  - [ ] Save current filter state as a named report
  - [ ] Load and apply saved filters on report open
  - [ ] Schedule reports (future: email PDF on cron)
- [ ] **6.2** Add cross-module analytics dashboard in `analytics.astro`
  - [ ] Enrollment trend chart (students over time)
  - [ ] Revenue vs. outstanding fees chart
  - [ ] Attendance rate by class/month
  - [ ] Staff utilization (teaching load vs. capacity)

### 7. Two-Factor Authentication (2FA) — MEDIUM PRIORITY

- [ ] **7.1** Add `twoFactorSecret` column to `users` table (nullable)
- [ ] **7.2** Add TOTP library integration (e.g. `otpauth`)
- [ ] **7.3** Add 2FA setup page in user settings
- [ ] **7.4** Add 2FA challenge step in login flow
- [ ] **7.5** Add 2FA enable/disable toggle in `/dashboard/settings`

### 8. Multilingual Support Across Themes — LOW PRIORITY (POST-MVP)

- [ ] **8.1** Implement `getSchoolLocale(school)` helper
- [ ] **8.2** Add translation dictionary system (`src/lib/i18n.ts`)
- [ ] **8.3** Wrap all theme strings in `t(key)` calls
- [ ] **8.4** Add locale selector in school settings

### 9. Platform Subscription Management — LOW PRIORITY

- [ ] **9.1** Wire `subscription_plans` table to pricing page
- [ ] **9.2** Implement plan selection and checkout flow
- [ ] **9.3** Add plan enforcement middleware (feature gating by plan tier)
- [ ] **9.4** Add usage tracking (student count, storage) against plan limits

### 10. Email Integration — MEDIUM PRIORITY

- [ ] **10.1** Configure `nodemailer` transport in `src/lib/email.ts`
  - [ ] SMTP from school settings or platform defaults
  - [ ] Template rendering for HTML emails
- [ ] **10.2** Wire email sending to notification flows
  - [ ] Password reset emails
  - [ ] Enrollment confirmation
  - [ ] Fee receipt emails
  - [ ] Notification template dispatch

### 11. File Upload & Storage — MEDIUM PRIORITY

- [ ] **11.1** Implement file upload API (`src/pages/api/upload.ts`)
  - [ ] Local file storage with configurable upload directory
  - [ ] Cloudinary integration (already in package.json) for images
  - [ ] File type validation and size limits
- [ ] **11.2** Wire file uploads to relevant forms
  - [ ] Student enrollment document upload
  - [ ] Staff document upload
  - [ ] Assignment submission file upload
  - [ ] Library book cover image upload
  - [ ] School logo/favicon upload in settings

### 12. Input Validation Hardening — HIGH PRIORITY

- [ ] **12.1** Add request body validation to all API endpoints
  - [ ] Validate required fields, types, string lengths
  - [ ] Sanitize HTML/text inputs to prevent XSS
  - [ ] Return structured 400 errors with field-level messages
- [ ] **12.2** Add SQL injection protection audit (Drizzle ORM handles this via parameterized queries — verify no raw SQL)
- [ ] **12.3** Add CSRF token validation for POST/PUT/DELETE requests
- [ ] **12.4** Add rate limiting middleware for auth endpoints

### 13. 7 New Professional Themes — ENHANCEMENT

**Current count**: 33 themes. Target: 40 themes.

- [ ] **13.1** `drift` — Soft, floating card design with subtle parallax; typography: DM Sans
- [ ] **13.2** `monument` — Bold editorial/magazine style; typography: Libre Caslon + Work Sans
- [ ] **13.3** `signal` — Tech-forward with neon accents on dark; typography: IBM Plex Sans
- [ ] **13.4** `foliage` — Organic, earthy tones with leaf/nature motifs; typography: Lora + Karla
- [ ] **13.5** `marble` — Clean white marble aesthetic with gold veining; typography: EB Garamond + Raleway
- [ ] **13.6** `tide` — Coastal blues with wave-shaped dividers; typography: Manrope
- [ ] **13.7** `forge` — Industrial/strength design with bold type and dark steel; typography: Barlow Condensed + Barlow

Each theme must:
- Follow the prop contract (`school` object, `title` optional)
- Use `getSchoolNav`, `getSchoolContacts` helpers
- Emit palette CSS variables under `html.light` / `html.dark`
- Include FOUC-prevention script
- Include theme-mode toggle (light/dark/system)
- Render social handles with filtering
- Use `prefix = /${school.slug}` for internal links
- Be registered in `src/themes/index.ts`
- Pass accessibility checklist

---

## Implementation Priority Order

1. **Input Validation Hardening** (§12) — security first
2. **Data Export** (§1) — high user value, moderate effort
3. **Bulk Import** (§2) — pairs with export
4. **File Upload & Storage** (§11) — enables document workflows
5. **Student/Parent Portal** (§3) — core user-facing feature
6. **Email Integration** (§10) — enables notifications
7. **Notification Templates** (§4) — automated communications
8. **Dashboard Dark Mode** (§5) — UX polish
9. **7 New Themes** (§13) — visual variety
10. **Advanced Filtering & Reports** (§6) — power users
11. **2FA** (§7) — security enhancement
12. **Subscription Management** (§9) — monetization
13. **Multilingual** (§8) — post-MVP

---

*BismiLlah — end of gaps_c.md*
