# Issue #2 — Implementation TODO (Sub-Sub-Task Breakdown)

Bismillah Ar-Rahman Ar-Roheem.

Granular task list derived from `ISSUE2_GAP_AUDIT.md`. Each sub-sub-task is small enough to commit individually. Commit after each, with hash verification per Core Working Protocol Section 14.

**Convention:** `[P1]` = Phase 1 (foundation), `[P2]` = Phase 2 (high-value), `[P3]` = Phase 3 (remaining).

---

## Phase 1 — Foundation (RBAC + Role Portals)

### Task 1: RBAC System
- [ ] 1-a: Add `roles` and `permissions` and `role_permissions` and `user_roles` tables to schema.ts + migration
- [ ] 1-b: Seed 8 default roles (Super Admin, School Admin, Teacher, Student, Parent, Staff, Accountant, Librarian, IT Admin) with default permissions
- [ ] 1-c: Create `src/lib/rbac.ts` with `hasPermission(userId, permission)`, `getUserRole(userId)`, `requirePermission(ctx, permission)`
- [ ] 1-d: Update `src/lib/middleware.ts` to enforce RBAC on all `/api/dashboard/*` and `/api/admin/*` endpoints
- [ ] 1-e: Create `src/pages/dashboard/roles.astro` admin UI for managing roles and permissions
- [ ] 1-f: Add role assignment UI to user management (`it-admin.astro`)
- [ ] 1-g: Build + test + commit + push

### Task 2: Student Portal
- [ ] 2-a: Create `src/pages/portal/student/index.astro` — student dashboard with schedule, assignments, grades overview
- [ ] 2-b: Create `src/pages/portal/student/assignments.astro` — assignment list + submission UI
- [ ] 2-c: Create `src/pages/portal/student/grades.astro` — grade view with trends
- [ ] 2-d: Create `src/pages/portal/student/timetable.astro` — personal timetable view
- [ ] 2-e: Create `src/pages/portal/student/quizzes.astro` — quiz list + take-quiz UI
- [ ] 2-f: Create student portal layout `src/layouts/StudentPortalLayout.astro`
- [ ] 2-g: Add student portal link to student's navigation + auth gate
- [ ] 2-h: Build + test + commit + push

### Task 3: Parent Portal
- [ ] 3-a: Create `src/pages/portal/parent/index.astro` — parent dashboard with children overview
- [ ] 3-b: Add `parent_children` table linking parents to students
- [ ] 3-c: Create `src/pages/portal/parent/child/[id].astro` — child detail (attendance, grades, fees)
- [ ] 3-d: Create `src/pages/portal/parent/fees.astro` — fee statement + payment
- [ ] 3-e: Create `src/pages/portal/parent/messages.astro` — teacher messaging
- [ ] 3-f: Create parent portal layout + auth gate
- [ ] 3-g: Build + test + commit + push

### Task 4: Teacher Dashboard
- [ ] 4-a: Create `src/pages/portal/teacher/index.astro` — teacher dashboard with classes, today's schedule
- [ ] 4-b: Create `src/pages/portal/teacher/attendance.astro` — take attendance per class
- [ ] 4-c: Create `src/pages/portal/teacher/assignments.astro` — create/grade assignments
- [ ] 4-d: Create `src/pages/portal/teacher/grades.astro` — gradebook entry per class
- [ ] 4-e: Create teacher portal layout + auth gate
- [ ] 4-f: Build + test + commit + push

---

## Phase 2 — High-Value Module Deepening

### Task 5: Module 1 (SIS) — Enterprise Features
- [ ] 5-a: Add `student_documents`, `student_medical`, `student_emergency_contacts`, `family_groups` tables to schema
- [ ] 5-b: Redesign `students.astro` with tabbed profile (Overview, Medical, Documents, Family, Enrollment History)
- [ ] 5-c: Create student document vault UI (upload, view, delete, categorize)
- [ ] 5-d: Create student medical records UI (conditions, allergies, medications, immunizations, nurse visits)
- [ ] 5-e: Create family/sibling linking UI
- [ ] 5-f: Create ID card generation (SVG template + print/PDF)
- [ ] 5-g: Create student photo management (upload, crop, store)
- [ ] 5-h: Create online application portal `src/pages/[slug]/apply.astro` with configurable forms
- [ ] 5-i: Create application workflow (stages: submitted → reviewed → accepted/rejected/waitlisted)
- [ ] 5-j: Create re-enrollment flow for returning students
- [ ] 5-k: Add attendance analytics (trend charts, class summaries, threshold alerts)
- [ ] 5-l: Build + test + commit + push after each sub-sub-task

### Task 6: Module 5 (Finance) — Enterprise Features
- [ ] 6-a: Add `fee_discounts`, `fee_fines`, `fee_installments`, `credit_notes` tables
- [ ] 6-b: Create discount management UI (sibling, scholarship, staff child, custom)
- [ ] 6-c: Create fine/penalty rule configuration UI
- [ ] 6-d: Create installment plan configuration UI
- [ ] 6-e: Integrate Stripe payment gateway (`src/lib/payments/stripe.ts`)
- [ ] 6-f: Integrate Paystack payment gateway (`src/lib/payments/paystack.ts`)
- [ ] 6-g: Create automatic invoice generation (per student per term)
- [ ] 6-h: Create bulk invoice generation UI
- [ ] 6-i: Create prorated fee calculation for mid-term joiners
- [ ] 6-j: Create fee-access linkage system (configurable blocking of LMS/exam for fee defaulters)
- [ ] 6-k: Create outstanding fees report with aging analysis
- [ ] 6-l: Create revenue dashboard with charts
- [ ] 6-m: Build + test + commit + push after each sub-sub-task

### Task 7: Module 16 (CBT) — Enterprise Features
- [ ] 7-a: Add `cbt_sections`, `cbt_question_tags`, `cbt_exam_templates`, `cbt_proctoring_logs` tables
- [ ] 7-b: Create section-based exam structure UI
- [ ] 7-c: Create question bank with tagging (topic, difficulty, subject) + bulk import
- [ ] 7-d: Create auto-exam generation by topic/difficulty mix
- [ ] 7-e: Create question randomization + option shuffling per candidate
- [ ] 7-f: Create full-screen exam delivery interface with exit detection
- [ ] 7-g: Create tab-switch detection + auto-flagging
- [ ] 7-h: Create answer auto-save + session resume
- [ ] 7-i: Create question navigation panel + flag-for-review
- [ ] 7-j: Create auto-submission on timer expiry
- [ ] 7-k: Create proctor dashboard (live candidate view)
- [ ] 7-l: Create post-exam integrity report per candidate
- [ ] 7-m: Create exam analytics (score distribution, per-question analytics)
- [ ] 7-n: Create result sync to Module 4 (Examinations)
- [ ] 7-o: Build + test + commit + push after each sub-sub-task

---

## Phase 3 — Remaining Modules

### Task 8: Module 2 (LMS) Deepening
- [ ] 8-a: Create drag-and-drop course content builder
- [ ] 8-b: Create rubric builder for assignments
- [ ] 8-c: Add `discussion_boards`, `discussion_posts` tables + UI
- [ ] 8-d: Create student progress dashboard (completion tracking, time-on-task)
- [ ] 8-e: Create at-risk student flagging
- [ ] 8-f: Create SCORM/xAPI content package support
- [ ] 8-g: Build + test + commit + push

### Task 9: Module 6 (HR) Deepening
- [ ] 9-a: Add `job_postings`, `job_applications`, `interviews` tables + recruitment UI
- [ ] 9-b: Create staff clock-in/clock-out system
- [ ] 9-c: Create leave balance tracking + accrual
- [ ] 9-d: Create payroll computation engine (tax, pension, bonuses)
- [ ] 9-e: Create payroll approval workflow + bank file export
- [ ] 9-f: Create performance appraisal system
- [ ] 9-g: Build + test + commit + push

### Task 10: Module 3 (Timetable) Deepening
- [ ] 10-a: Create automated timetable generation engine
- [ ] 10-b: Create drag-and-drop timetable editor
- [ ] 10-c: Create conflict detection (teacher, room, class)
- [ ] 10-d: Create substitute teacher scheduling
- [ ] 10-e: Create iCal/PDF export
- [ ] 10-f: Build + test + commit + push

### Task 11: Modules 8-14 Deepening
- [ ] 11-a: Module 8 (Library) — fines, reservations, overdue notifications, analytics
- [ ] 11-b: Module 9 (Hostel) — allocation workflow, check-in/out, visitor log, maintenance
- [ ] 11-c: Module 10 (Transport) — fee integration, dispatch logging, boarding confirmation, maintenance
- [ ] 11-d: Module 11 (Inventory) — asset assignment, check-in/out, reorder alerts, procurement
- [ ] 11-e: Module 12 (Events) — recurring events, RSVP, venue booking, calendar views, iCal
- [ ] 11-f: Module 13 (Classroom) — slide builder, seating plan, behavior leaderboard
- [ ] 11-g: Module 14 (Reporting) — custom report builder, scheduled delivery, cross-module views
- [ ] 11-h: Build + test + commit + push after each

### Task 12: Module 15 (IT Admin) Deepening
- [ ] 12-a: Create RBAC management UI (roles + permissions)
- [ ] 12-b: Create SSO configuration (Google, Microsoft)
- [ ] 12-c: Create device/session management
- [ ] 12-d: Create system health dashboard
- [ ] 12-e: Create maintenance mode
- [ ] 12-f: Create integration management (API keys, webhooks)
- [ ] 12-g: Build + test + commit + push

### Task 13: Platform-Wide Features
- [ ] 13-a: Create webhooks system (`webhooks`, `webhook_events` tables + dispatch lib)
- [ ] 13-b: Create GDPR compliance controls (data export, data deletion, consent)
- [ ] 13-c: Add SMS notification channel (Twilio or similar)
- [ ] 13-d: Add push notification support
- [ ] 13-e: Update v2 themes with multilingual/RTL improvements per multilingual_guides.md
- [ ] 13-f: Build + test + commit + push

---

## Execution Notes

- **Commit after EVERY sub-sub-task** (e.g., after 1-a, after 1-b, etc.)
- **Run build before every commit** — never commit broken code
- **Verify push with hash** — `git ls-remote origin master` must match `git rev-parse HEAD`
- **Update this file** — check off items as completed
- **No emojis** in any code or UI (Protocol Section 16)
- **No mocks/dummies/stubs** — every feature must be real and functional (Protocol Section 13)
- **Role-based access** on every new endpoint and page (Protocol Section 13)

---

*Total sub-sub-tasks: ~130. Each is a commitable unit of enterprise-grade work.*
