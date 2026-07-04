# Production Hardening TODO

Bismillah Ar-Rahman Ar-Roheem.

Comprehensive production hardening tasks derived from codebase audit.
Each task is granular and independently commitable.

---

## Phase 1: CRITICAL — Block Production (must fix before deploy)

### Task 1: Add 18 Missing Tables to autoMigrate
- [ ] 1-a: Add `course_units`, `lessons`, `bell_schedules` CREATE TABLE to autoMigrate
- [ ] 1-b: Add `asset_checkouts`, `suppliers`, `purchase_requests` CREATE TABLE
- [ ] 1-c: Add `job_postings`, `job_applications`, `interviews`, `performance_appraisals` CREATE TABLE
- [ ] 1-d: Add `library_reservations`, `transport_dispatch`, `transport_boarding` CREATE TABLE
- [ ] 1-e: Add `event_rsvps`, `data_requests` CREATE TABLE
- [ ] 1-f: Add `cbt_proctoring_logs`, `cbt_sections`, `cbt_question_tags` CREATE TABLE
- [ ] 1-g: Build + test + commit + push

### Task 2: Security Fixes
- [ ] 2-a: Remove ENCRYPTION_KEY fallback — hard-fail if unset
- [ ] 2-b: Enable Astro CSRF protection (checkOrigin: true in astro.config.mjs)
- [ ] 2-c: Fix cross-tenant access in webhooks.ts PUT/DELETE (add schoolId check)
- [ ] 2-d: Fix cross-tenant access in live-classes.ts messages endpoint
- [ ] 2-e: Fix host-header injection in password-reset.ts (use PUBLIC_BASE_URL env)
- [ ] 2-f: Hash platform-admin passwords, use bcrypt.compare
- [ ] 2-g: Add Secure flag to session cookies when NODE_ENV=production
- [ ] 2-h: Build + test + commit + push

### Task 3: API Error Handling
- [ ] 3-a: Wrap all API handlers in try/catch returning 500 JSON
- [ ] 3-b: Add error handling to auth endpoints (login, register, password-reset)
- [ ] 3-c: Add error handling to dashboard API endpoints
- [ ] 3-d: Build + test + commit + push

### Task 4: Auto-Seed on First Boot
- [ ] 4-a: Create auto-seed function that checks if DB is empty and seeds
- [ ] 4-b: Call auto-seed from getDb() after autoMigrate
- [ ] 4-c: Build + test + commit + push

---

## Phase 2: HIGH — Before Public Launch

### Task 5: Pagination
- [ ] 5-a: Add pagination to students.astro (limit 50, page param)
- [ ] 5-b: Add pagination to staff.astro, assignments.astro, cbt.astro
- [ ] 5-c: Add pagination to all list API endpoints
- [ ] 5-d: Build + test + commit + push

### Task 6: DB Indexes
- [ ] 6-a: Add CREATE INDEX for school_id on all major tables
- [ ] 6-b: Add CREATE INDEX for student_id, email, slug, status columns
- [ ] 6-c: Build + test + commit + push

### Task 7: XSS Fixes
- [ ] 7-a: Fix onclick handlers in students.astro to use data-* attributes
- [ ] 7-b: Fix onclick handlers in staff.astro
- [ ] 7-c: Fix onclick handlers in other dashboard pages
- [ ] 7-d: Build + test + commit + push

### Task 8: Missing Pages
- [ ] 8-a: Create /portal/no-profile.astro
- [ ] 8-b: Remove or create stub pages for 45 missing dashboard nav links
- [ ] 8-c: Build + test + commit + push

### Task 9: Configuration
- [ ] 9-a: Add `site` to astro.config.mjs
- [ ] 9-b: Add `start` script to package.json
- [ ] 9-c: Remove stray `./2` file and `"2"` devDependency
- [ ] 9-d: Create .env.example with all env vars
- [ ] 9-e: Update README.md with real deployment docs
- [ ] 9-f: Build + test + commit + push

---

## Phase 3: MEDIUM — Polish

### Task 10: File Upload Fix
- [ ] 10-a: Fix local file upload to actually write the file
- [ ] 10-b: Add file type/size validation
- [ ] 10-c: Build + test + commit + push

### Task 11: Performance
- [ ] 11-a: Fix N+1 in cbt.ts GET
- [ ] 11-b: Cache dashboard index counts (30s TTL)
- [ ] 11-c: Build + test + commit + push

### Task 12: Cleanup
- [ ] 12-a: Move dev .md files to docs/dev/
- [ ] 12-b: Replace Math.random() with crypto.randomUUID()
- [ ] 12-c: Sweep console.log calls
- [ ] 12-d: Build + test + commit + push

---

## Phase 4: Add 5 Mobile Native App-Like Themes
- [ ] 13-a: Create mobile-native-1 theme (app-like with bottom tab bar, no hero, app-style navigation)
- [ ] 13-b: Create mobile-native-2 theme
- [ ] 13-c: Create mobile-native-3 theme
- [ ] 13-d: Create mobile-native-4 theme
- [ ] 13-e: Create mobile-native-5 theme
- [ ] 13-f: Register all 5 in v3/registry.ts
- [ ] 13-g: Build + test + commit + push
