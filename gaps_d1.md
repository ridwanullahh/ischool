# gaps_d1.md — iSchool Platform Deep Audit & Implementation Plan

*Bismillah Ar-Rahman Ar-Roheem*

**Generated**: 2026-06-16
**Audit scope**: Full codebase vs AI_INTEGRATION.md, gaps_c2.md, school_softwares.md (PRD), gaps_b.md, gaps_b2.md, gaps_c.md
**Auditor**: Deep production-grade audit

---

## SECTION A: AI INTEGRATION GAPS (vs AI_INTEGRATION.md spec)

### A1. Agentic AI — Missing Write/Mutation Tools (CRITICAL)

The AI agent currently has **12 read-only tools**. The spec requires **30+ tools** including write operations. Missing tools:

| Tool | Category | Priority |
|------|----------|----------|
| `add_student(data)` | Student Mgmt | HIGH |
| `update_student(id, data)` | Student Mgmt | HIGH |
| `get_student_attendance(studentId, dateRange)` | Student Mgmt | MEDIUM |
| `get_student_grades(studentId)` | Student Mgmt | MEDIUM |
| `approve_enrollment(enrollmentId)` | Enrollment | HIGH |
| `reject_enrollment(enrollmentId, reason)` | Enrollment | HIGH |
| `mark_attendance(studentId, date, status)` | Attendance | HIGH |
| `get_absent_students(date)` | Attendance | MEDIUM |
| `record_payment(invoiceId, amount, method)` | Finance | HIGH |
| `generate_invoice(studentId, feeStructureId)` | Finance | HIGH |
| `get_student_invoices(studentId)` | Finance | MEDIUM |
| `search_staff(query)` | HR | MEDIUM |
| `get_staff_details(staffId)` | HR | MEDIUM |
| `approve_leave(leaveId)` | HR | HIGH |
| `reject_leave(leaveId, reason)` | HR | HIGH |
| `send_announcement(title, content, audience)` | Communication | HIGH |
| `send_message(recipientId, content)` | Communication | MEDIUM |
| `get_notifications(count)` | Communication | LOW |
| `get_course_details(courseId)` | Academic | MEDIUM |
| `create_assignment(courseId, data)` | Academic | HIGH |
| `get_upcoming_exams()` | Academic | MEDIUM |
| `get_timetable(classId, day)` | Timetable | MEDIUM |
| `find_free_rooms(day, period)` | Timetable | LOW |
| `check_book_availability(bookId)` | Library | LOW |
| `create_event(data)` | Events | MEDIUM |
| `get_revenue_report(period)` | Reports | MEDIUM |
| `get_attendance_report(period)` | Reports | MEDIUM |
| `get_academic_performance(term)` | Reports | MEDIUM |
| `update_about_page(data)` | CMS | HIGH |
| `create_blog_post(data)` | CMS | HIGH |
| `update_school_settings(data)` | CMS | HIGH |

**File**: `src/pages/api/dashboard/ai.ts` — TOOL_DEFINITIONS array and executeTool() function

### A2. Streaming Responses (HIGH)

- **Status**: NOT implemented
- **Spec requires**: Real-time token streaming for chat responses
- **Fix**: Add SSE (Server-Sent Events) or WebSocket support to the AI chat endpoint
- **File**: `src/pages/api/dashboard/ai.ts` POST handler, `src/components/AIChatWidget.astro`

### A3. Permission-Aware Tool Filtering (HIGH)

- **Status**: NOT implemented — all tools available to all authenticated users
- **Spec requires**: AI respects user's role and permissions
- **Fix**: Filter TOOL_DEFINITIONS based on user role (e.g., accountant shouldn't see HR tools, teacher shouldn't see finance tools)
- **File**: `src/pages/api/dashboard/ai.ts` POST handler

### A4. Autonomous vs Confirmation Mode (MEDIUM)

- **Status**: NOT implemented — no mode setting exists
- **Spec requires**: Configurable per school — autonomous mode executes actions directly, confirmation mode asks user before executing
- **Fix**: Read `ai_settings` for `autonomous_mode` flag; when false, return tool call details and require explicit confirmation before executing

### A5. API Key Encryption (CRITICAL — SECURITY)

- **Status**: API keys stored in PLAIN TEXT in `ai_api_keys.api_key` column
- **Spec requires**: "API keys stored encrypted in database, never exposed to client-side"
- **Fix**: Encrypt keys using AES-256-GCM before storing, decrypt on read. Add encryption utility.
- **File**: `src/lib/db/schema.ts`, `src/pages/api/admin/ai.ts`

### A6. PII Stripping (MEDIUM)

- **Status**: NOT implemented
- **Spec requires**: Configurable PII stripping before sending to external AI providers
- **Fix**: Add regex-based PII detection (phone, email, SSN patterns) and stripping function before building AI messages
- **File**: `src/pages/api/dashboard/ai.ts`

### A7. Conversation Retention Policy (LOW)

- **Status**: NOT implemented — conversations stored indefinitely
- **Spec requires**: Auto-delete after N days, configurable per school
- **Fix**: Add scheduled cleanup or check on conversation creation

### A8. AI Interaction Audit Log (MEDIUM)

- **Status**: NOT implemented — no audit trail for AI actions
- **Spec requires**: Audit log for all AI interactions
- **Fix**: Log all tool calls and results to `audit_logs` table
- **File**: `src/pages/api/dashboard/ai.ts` executeTool()

### A9. Conventional AI Features Per Module (MEDIUM)

- **Status**: NOT implemented — no AI suggestion buttons on any page
- **Spec requires**: Smart suggestions, auto-fill, analytics insights per module
- **Fix**: Add "AI Suggest" buttons and API calls on key pages (lesson plans, blog posts, report cards, etc.)

### A10. Media/File Upload in AI Chat (HIGH — NEW REQUIREMENT)

- **Status**: NOT implemented
- **Requirement**: Users can attach images, documents to AI chat; AI processes them intelligently
- **Fix**: Add file upload to AIChatWidget, convert to base64 for vision models, store uploads, add multimodal support to API

### A11. Public Chatbot Rate Limiting (MEDIUM)

- **Status**: NOT implemented
- **Fix**: Add IP-based or session-based rate limiting to `api/[slug]/ai-chat.ts`

### A12. Public Chatbot Handoff-to-Human (LOW)

- **Status**: NOT implemented
- **Fix**: When AI can't answer, offer to create a contact submission or support ticket

### A13. CMS Management Tools for Agentic AI (HIGH)

- **Status**: NOT implemented — no CMS tools in current tool set
- **Spec requires**: `update_about_page`, `create_blog_post`, `update_school_settings`
- **Fix**: Add to TOOL_DEFINITIONS and executeTool()

---

## SECTION B: REMAINING gaps_c2.md TASKS (Still Incomplete)

### B1. CSV Export Buttons on Dashboard Pages (HIGH)

- **Status**: API handlers with `action=export` exist on 13 endpoints, but **ZERO dashboard pages have export buttons**
- **Affected pages**: students.astro, staff.astro, attendance.astro, grades.astro, payments.astro, invoices.astro, library.astro, events.astro, inventory.astro, transport.astro, hostel.astro, payroll.astro, leave.astro
- **Fix**: Add "Export CSV" button to toolbar section of each page, wire to `?action=export` download

### B2. CSV Bulk Import (MEDIUM)

- **Status**: Import utility exists (`src/lib/import.ts`), but:
  - No `action=bulk_import` POST handler on students.ts or staff.ts
  - No import modal/CSV upload UI on any dashboard page
- **Fix**: Add bulk import handler and UI

### B3. Two-Factor Authentication (MEDIUM)

- **Status**: Schema columns exist (`two_factor_enabled`, `two_factor_secret`) but NO logic implemented
- **Missing**: TOTP generation/verification, 2FA setup page, 2FA challenge in login flow
- **Files**: `src/lib/auth.ts`, `src/pages/auth/login.astro`, `src/pages/dashboard/settings.astro`

### B4. Student/Parent Portal (HIGH)

- **Status**: NOT created — no `/portal` directory exists
- **Required**: Role-based portal for students and parents with views for courses, attendance, fees, assignments, grades
- **Files needed**: `src/pages/portal/index.astro`, sub-pages for each module

### B5. Email Integration Wiring (MEDIUM)

- **Status**: `src/lib/email.ts` exists with nodemailer (SMTP + Gmail OAuth2), but:
  - NOT wired to any notification flows
  - No password reset email flow
  - No attendance alert, fee reminder, or grade-posted emails
- **Fix**: Wire `sendEmail()` calls into relevant API endpoints

### B6. Notification Template Seeding (LOW)

- **Status**: Table exists, migration references it, but NO default templates seeded
- **Fix**: Add INSERT statements for default templates in migration

### B7. Input Validation Hardening (HIGH — SECURITY)

- **Status**: Only ~12 of 39 API files have any validation. Most POST/PUT endpoints accept arbitrary JSON.
- **Missing**: Required field validation, type checking, length limits, XSS sanitization, rate limiting
- **Fix**: Add validation middleware, sanitize inputs

### B8. Subscription Plans Wiring (LOW)

- **Status**: `subscription_plans` table exists but NOT wired to pricing page
- **Fix**: Query plans from DB in pricing.astro, add plan enforcement

---

## SECTION C: NEW FEATURES REQUIRED

### C1. Support Ticket System — Internal + External (NEW — HIGH)

- **Status**: NOT implemented at all
- **Requirement**: Full support ticket module for each school (internal for students/parents/staff, external for prospects/public)
- **See**: `SUPPORT_TICKET_SYSTEM.md` (to be created)

### C2. Live Classes / Virtual Classroom (NEW — HIGH)

- **Status**: NOT implemented
- **Requirement**: Rich live class features comparable to Google Meet/Zoom — video, audio, screen sharing, chat, whiteboard, attendance tracking, recording
- **See**: `LIVE_CLASSES.md` (to be created)

### C3. Agentic AI CMS Full Integration (NEW — HIGH)

- **Status**: AI agent has no CMS tools — cannot manage website content
- **Requirement**: AI must manage all CMS aspects (pages, blog, announcements, settings) based on active plan and permissions
- **Fix**: Add CMS write tools + plan-based permission checks

### C4. 5-10 More Mobile-Native Themes (MEDIUM)

- **Status**: Currently 50 themes (39 original + 10 mobile + harmony)
- **Required**: 5-10 additional mobile-native-app-like themes

---

## SECTION D: PRODUCTION READINESS GAPS

### D1. No Rate Limiting on Auth Endpoints (HIGH — SECURITY)

- **Status**: No rate limiting on login, register, or password reset
- **Fix**: Add rate limiting middleware

### D2. No CSRF Protection (MEDIUM — SECURITY)

- **Status**: Forms use POST but no CSRF tokens
- **Fix**: Add CSRF token generation and validation

### D3. No Error Boundary / 500 Page (LOW)

- **Status**: Unhandled errors show raw stack traces in production
- **Fix**: Add error boundary middleware and custom 500 page

### D4. No Health Check Endpoint (LOW)

- **Status**: No `/api/health` endpoint for monitoring
- **Fix**: Add simple health check

### D5. Database Indexing Gaps (LOW)

- **Status**: Most tables have basic indexes, but some high-traffic queries lack composite indexes
- **Fix**: Add indexes for common query patterns (e.g., students by school+status+enrollment_date)

---

## IMPLEMENTATION PRIORITY ORDER

### Phase 1: Security & Critical Gaps
1. **A5** — API key encryption (CRITICAL)
2. **A3** — Permission-aware AI tool filtering
3. **B7** — Input validation hardening
4. **D1** — Rate limiting on auth endpoints
5. **A8** — AI interaction audit logging

### Phase 2: AI Completeness
6. **A1** — Add all missing write/mutation AI tools (30+ tools)
7. **A13** — CMS management tools for Agentic AI
8. **A2** — Streaming responses
9. **A10** — Media/file upload in AI chat
10. **A4** — Autonomous vs confirmation mode
11. **A11** — Public chatbot rate limiting

### Phase 3: New Major Features
12. **C1** — Support Ticket System (create doc + implement)
13. **C2** — Live Classes module (create doc + implement)

### Phase 4: Wiring & Polish
14. **B1** — CSV export buttons on all dashboard pages
15. **B2** — CSV bulk import on students/staff pages
16. **B4** — Student/Parent Portal
17. **B5** — Email integration wiring
18. **B3** — Two-factor authentication
19. **A9** — Conventional AI features per module
20. **B6** — Notification template seeding
21. **A6** — PII stripping
22. **A12** — Public chatbot handoff-to-human

### Phase 5: Themes & Extras
23. **C4** — 5-10 more mobile-native themes
24. **B8** — Subscription plans wiring
25. **A7** — Conversation retention policy
26. **D2-D5** — Production polish (CSRF, error boundary, health check, indexes)

---

## SUMMARY STATISTICS

| Category | Total Items | Completed | Remaining |
|----------|-------------|-----------|-----------|
| AI Tools (Agentic) | 42 | 12 | 30 |
| AI Security | 5 | 0 | 5 |
| AI UX | 4 | 0 | 4 |
| CSV Export Wiring | 2 | 1 (API) | 1 (UI) |
| CSV Import | 2 | 0 | 2 |
| Auth (2FA) | 3 | 0 | 3 |
| Email Integration | 3 | 1 (lib) | 2 (wiring) |
| Portal | 3 | 0 | 3 |
| Input Validation | 1 | 0 | 1 |
| New Modules | 2 | 0 | 2 |
| Themes | 50 | 50 | 5-10 more |
| Production Polish | 5 | 0 | 5 |
| **TOTAL** | **~125** | **~64** | **~61** |

---

*Wa billahi at-tawfiq. Baarokallahu feekum.*
