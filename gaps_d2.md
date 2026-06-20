# gaps_d2.md — iSchool Platform Final Audit & Implementation Plan

*Bismillah Ar-Rahman Ar-Roheem*

**Generated**: 2026-06-17
**Audit scope**: Full codebase vs school_softwares.md (PRD), SUPPORT_TICKET_SYSTEM.md, gaps_b/b2/c/c2/d1
**Status**: Production build passing, 60 themes, 42 dashboard pages, 43 API endpoints

---

## AUDIT STATUS: WHAT IS COMPLETE

| Feature | Source | Status |
|---------|--------|--------|
| Database schema (50+ tables, 16 modules) | PRD | DONE |
| Auth system (9 roles, session-based, bcrypt) | PRD | DONE |
| Middleware (auth, RBAC, rate limiting, security headers) | gaps_b/b2 | DONE |
| 42 dashboard pages (all with CRUD, search/filter) | gaps_b/b2/c | DONE |
| 43 API endpoints (all school-scoped, auth-checked) | gaps_b/b2/c | DONE |
| 60 CMS themes registered | gaps_c/c2 | DONE |
| AI integration: 26 tools (12 read + 14 write) | gaps_d1 A1 | DONE |
| AI permission-aware tool filtering | gaps_d1 A3 | DONE |
| AI streaming responses (SSE) | gaps_d1 A2 | DONE |
| AI autonomous vs confirmation mode | gaps_d1 A4 | DONE |
| API key encryption (AES-256-GCM) | gaps_d1 A5 | DONE |
| PII stripping | gaps_d1 A6 | DONE |
| AI interaction audit logging | gaps_d1 A8 | DONE |
| Public chatbot rate limiting | gaps_d1 A11 | DONE |
| Public chatbot handoff-to-human | gaps_d1 A12 | DONE |
| CMS management AI tools | gaps_d1 A13 | DONE |
| TOTP-based 2FA | gaps_d1 B3 | DONE |
| Student/parent portal (6 pages) | gaps_d1 B4 | DONE |
| Email integration wiring (10+ notification types) | gaps_d1 B5 | DONE |
| Notification template seeding (15 templates) | gaps_d1 B6 | DONE |
| Input validation hardening (security.ts) | gaps_d1 B7 | DONE |
| Subscription plans wiring | gaps_d1 B8 | DONE |
| CSV export API handlers (13 endpoints) | gaps_c | DONE |
| CSV export buttons (11 of 13 pages) | gaps_c | PARTIAL |
| CSV bulk import (students + staff API) | gaps_c | DONE |
| Password reset flow | gaps_d1 | DONE |
| CSRF protection | gaps_d1 D2 | DONE |
| Health check endpoint | gaps_d1 D4 | DONE |
| Database indexes (20+ composite) | gaps_d1 D5 | DONE |
| Error boundary (500 page) | gaps_d1 D3 | DONE |
| Support tickets dashboard (page + full API) | gaps_d1 C1 | DONE |
| Live classes dashboard (page + API + schema) | gaps_d1 C2 | DONE |
| AI chat widget with streaming + attachments | gaps_d1 A10 | DONE |
| AI suggestion button component | gaps_d1 A9 | DONE |
| File upload API endpoint | gaps_c 11 | DONE |
| Dashboard dark mode toggle | gaps_c 5 | DONE |

---

## REMAINING GAPS (STRICT AUDIT)

### SECTION 1: MISSING AI TOOLS (gaps_d1 A1 — partial completion)

**Status**: 14 of 30 write tools implemented. Missing 16:

| # | Tool | Category | Priority |
|---|------|----------|----------|
| 1.1 | `approve_enrollment(enrollmentId)` | Enrollment | HIGH |
| 1.2 | `reject_enrollment(enrollmentId, reason)` | Enrollment | HIGH |
| 1.3 | `generate_invoice(studentId, feeStructureId)` | Finance | HIGH |
| 1.4 | `get_student_attendance(studentId, dateRange)` | Student | MEDIUM |
| 1.5 | `get_student_grades(studentId)` | Student | MEDIUM |
| 1.6 | `get_absent_students(date)` | Attendance | MEDIUM |
| 1.7 | `search_staff(query)` | HR | MEDIUM |
| 1.8 | `get_staff_details(staffId)` | HR | MEDIUM |
| 1.9 | `get_notifications(count)` | Communication | LOW |
| 1.10 | `get_course_details(courseId)` | Academic | MEDIUM |
| 1.11 | `get_upcoming_exams()` | Academic | MEDIUM |
| 1.12 | `get_timetable(classId, day)` | Timetable | MEDIUM |
| 1.13 | `find_free_rooms(day, period)` | Timetable | LOW |
| 1.14 | `check_book_availability(bookId)` | Library | LOW |
| 1.15 | `get_revenue_report(period)` | Reports | MEDIUM |
| 1.16 | `get_attendance_report(period)` | Reports | MEDIUM |
| 1.17 | `get_academic_performance(term)` | Reports | MEDIUM |
| 1.18 | `get_student_invoices(studentId)` | Finance | MEDIUM |

**File**: `src/pages/api/dashboard/ai.ts` — WRITE_TOOLS array + executeTool()

### SECTION 2: CSV EXPORT BUTTON GAPS

**Status**: 11 pages have export buttons, 8 pages missing them.

| # | Page | Has Export Button | Has API Handler |
|---|------|-------------------|-----------------|
| 2.1 | cbt.astro | NO | NO |
| 2.2 | classroom.astro | NO | NO |
| 2.3 | quizzes.astro | NO | NO |
| 2.4 | assignments.astro | NO | NO |
| 2.5 | notifications.astro | NO | NO |
| 2.6 | messages.astro | NO | NO |
| 2.7 | enrollments.astro | NO | NO |
| 2.8 | timetable.astro | NO | NO |

**Fix**: Add `action=export` handler to each API + export button to each page toolbar.

### SECTION 3: SUPPORT TICKET SYSTEM — INCOMPLETE

**Status**: Dashboard page + full CRUD API done. Missing from SUPPORT_TICKET_SYSTEM.md spec:

| # | Task | Priority |
|---|------|----------|
| 3.1 | Public support API: `POST /api/[slug]/support/ticket` — external ticket creation | HIGH |
| 3.2 | Public support API: subscriber login/register/tickets/reply/rate | HIGH |
| 3.3 | Public support page: `/[slug]/support` — ticket creation form | HIGH |
| 3.4 | Subscriber dashboard: `/[slug]/support/my-tickets` — view/reply | HIGH |
| 3.5 | Ticket settings page: `/dashboard/ticket-settings` | MEDIUM |
| 3.6 | Ticket notification wiring (on create, assign, reply, resolve) | MEDIUM |
| 3.7 | AI ticket tools (search_tickets, update_ticket_status, assign_ticket, reply_to_ticket, get_ticket_stats, get_unassigned_tickets) | MEDIUM |
| 3.8 | Ticket category seeding in migration | LOW |

### SECTION 4: CONVERSATION RETENTION POLICY (gaps_d1 A7)

**Status**: NOT implemented. Conversations grow unbounded.

| # | Task |
|---|------|
| 4.1 | Add `ai_settings` key `conversation_retention_days` (default 90) |
| 4.2 | On conversation creation, delete conversations older than retention period |
| 4.3 | Add retention setting to dashboard AI settings page |

### SECTION 5: TICKET NOTIFICATION WIRING

| # | Event | Who to Notify |
|---|-------|---------------|
| 5.1 | Ticket created | Assigned agent + IT admin |
| 5.2 | Ticket assigned | Creator + assignee |
| 5.3 | New reply (agent) | Ticket creator |
| 5.4 | New reply (customer) | Assigned agent |
| 5.5 | Ticket resolved | Creator |
| 5.6 | Ticket closed | All parties |

**File**: `src/pages/api/dashboard/tickets.ts` — wire `notifyTicketUpdate()` calls

### SECTION 6: ADVANCED REPORTS ENHANCEMENT

| # | Task | Priority |
|---|------|----------|
| 6.1 | Save current filter state as named report (reports.astro) | MEDIUM |
| 6.2 | Cross-module analytics charts in analytics.astro (Chart.js or SVG) | MEDIUM |
| 6.3 | Custom report builder with field selection | LOW |

### SECTION 7: MULTILINGUAL WIRING TO THEMES

**Status**: Translation service exists (`src/lib/i18n/translation-service.ts`) but NOT wired to any theme layout.

| # | Task |
|---|------|
| 7.1 | Add translation script injection to theme layouts (client-side auto-translate) |
| 7.2 | Add language selector to dashboard header |
| 7.3 | Wire locale setting to school settings page |

### SECTION 8: DASHBOARD DARK MODE CSS

**Status**: Toggle button exists in DashboardLayout. Dark mode CSS variables need verification.

| # | Task |
|---|------|
| 8.1 | Verify dark mode CSS variables in global.css |
| 8.2 | Test dark class propagation on dashboard pages |

### SECTION 9: FILE UPLOAD WIRING

**Status**: Upload API exists (`/api/upload.ts`) but not wired to forms.

| # | Task |
|---|------|
| 9.1 | Wire upload to student enrollment document fields |
| 9.2 | Wire upload to staff document fields |
| 9.3 | Wire upload to assignment submission |
| 9.4 | Wire upload to school logo/favicon in settings |

---

## IMPLEMENTATION PRIORITY ORDER

1. **Missing AI tools** (S1) — 18 tools to complete the agentic AI
2. **CSV export gaps** (S2) — 8 pages need export buttons + API handlers
3. **Support ticket completion** (S3) — public API, pages, subscriber flow
4. **Ticket notifications** (S5) — wire notifications into ticket API
5. **AI ticket tools** (S3.7) — add to executeTool()
6. **Conversation retention** (S4) — auto-cleanup
7. **Reports enhancement** (S6) — saved filters, charts
8. **Multilingual wiring** (S7) — connect to themes
9. **File upload wiring** (S9) — connect to forms
10. **Dark mode polish** (S8) — verify and fix

---

*Wa billahi at-tawfiq. Baarokallahu feekum.*
