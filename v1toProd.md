# v1 to Production Audit & Hardening Plan

**Created:** 2026-07-10  
**Status:** ACTIVE  
**Goal:** Take the iSchool platform from v1 (all 16 modules functional) to battle-tested, enterprise-grade production readiness.

---

## Executive Summary

The platform has all 16 spec modules implemented with functional UIs and APIs. However, several production-critical gaps remain:

- **Security:** 68 of 78 APIs lack RBAC permission checks; no rate limiting on auth endpoints; no CSRF protection on state-changing endpoints; file uploads have no size/type validation
- **Reliability:** No try/catch error handling in 60+ APIs; no database transactions for multi-step operations; no health check monitoring
- **Testing:** Zero automated tests; no test framework installed
- **DevOps:** No CI/CD pipeline; no Dockerfile; no staging environment; no automated backups
- **Performance:** No database indexes beyond PKs; no query pagination; N+1 query patterns in loops
- **Observability:** No structured logging; no error tracking (Sentry); no metrics dashboard

This document breaks down every task into actionable items with clear acceptance criteria.

---

## Phase 1: Security Hardening (CRITICAL — Blocker for production)

### 1.1 RBAC Permission Enforcement
**Current state:** Only 10 of 78 dashboard APIs use `guardPermission()`. Any authenticated user can access any school's data if they know the URL.

- [ ] 1.1.1 Audit all 78 dashboard APIs and categorize by required permission
  - [ ] Read-only endpoints (GET): require `*.view` permission
  - [ ] Create endpoints (POST): require `*.create` permission
  - [ ] Update endpoints (PUT): require `*.edit` permission
  - [ ] Delete endpoints (DELETE): require `*.delete` permission
- [ ] 1.1.2 Add `guardPermission()` calls to all 68 unprotected APIs
  - [ ] SIS: students, enrollments, attendance, admissions, medical, student-docs, classes
  - [ ] LMS: courses, lessons, assignments, quizzes, grades, discussions
  - [ ] Timetable: timetable, prayer-schedules, substitutes
  - [ ] Exams: exams, marks, report-cards
  - [ ] Finance: fees, invoices, payments, finance-reports, fee-access
  - [ ] HR: staff, staff-attendance, recruitment, leave, payroll, performance
  - [ ] Comms: messages, comms-announcements, notifications, tickets
  - [ ] Library: library, stock, suppliers
  - [ ] Hostel: hostel, hostel-allocations, hostel-checkin, hostel-maintenance
  - [ ] Transport: transport, transport-routes, transport-assignments, transport-maintenance
  - [ ] Inventory: inventory, stock, suppliers, inventory-audit
  - [ ] Events: events, venues, rsvp
  - [ ] Classroom: classroom, behavior, seating, interactive
  - [ ] CBT: cbt, question-bank, candidates, proctoring, cbt-results
- [ ] 1.1.3 Add role-based UI element hiding (hide delete buttons for non-admins)
- [ ] 1.1.4 Add server-side validation that `schoolId` in request body matches user's school
- [ ] 1.1.5 Penetration test: attempt cross-school data access with different user accounts

### 1.2 Authentication Hardening
- [ ] 1.2.1 Add rate limiting to login endpoint (5 attempts per IP per 15 minutes)
  - [ ] Implement in-memory rate limiter (or Redis for multi-instance)
  - [ ] Return 429 Too Many Requests with Retry-After header
  - [ ] Log failed attempts to audit_logs
- [ ] 1.2.2 Add rate limiting to password reset endpoint (3 per email per hour)
- [ ] 1.2.3 Add account lockout after 10 failed attempts (unlock by admin)
- [ ] 1.2.4 Enforce password policy on registration and reset:
  - [ ] Minimum 8 characters
  - [ ] At least 1 uppercase, 1 lowercase, 1 digit, 1 special char
  - [ ] Reject passwords from common-breaches list (HIBP API or local list)
  - [ ] Reject passwords matching user's name/email
- [ ] 1.2.5 Add password history (prevent reuse of last 5 passwords)
- [ ] 1.2.6 Implement session timeout (30 minutes idle → require re-login)
- [ ] 1.2.7 Add "Remember me" option (extends session to 30 days)
- [ ] 1.2.8 Add concurrent session limit (max 3 active sessions per user)
- [ ] 1.2.9 Force 2FA for admin roles (super_admin, school_admin, it_admin)
- [ ] 1.2.10 Add login notification email (new device/location alert)

### 1.3 CSRF Protection
- [ ] 1.3.1 Generate CSRF token per session, embed in all forms
- [ ] 1.3.2 Validate CSRF token on all POST/PUT/DELETE requests
- [ ] 1.3.3 Add `SameSite=Strict` to session cookies
- [ ] 1.3.4 Add `Secure` flag to cookies (HTTPS only)
- [ ] 1.3.5 Add `HttpOnly` flag verification on all cookies

### 1.4 Input Validation & Sanitization
- [ ] 1.4.1 Install and configure Zod for schema validation
- [ ] 1.4.2 Define Zod schemas for all API request bodies (78 endpoints)
- [ ] 1.4.3 Validate all user input before database writes
- [ ] 1.4.4 Sanitize HTML in rich-text fields (prevent XSS) using DOMPurify
- [ ] 1.4.5 Add SQL injection audit (verify all `sql` template tags are parameterized)
- [ ] 1.4.6 Add file upload validation:
  - [ ] Max file size: 10MB images, 50MB videos, 5MB documents
  - [ ] Allowed MIME types whitelist per upload context
  - [ ] Virus scan uploaded files (ClamAV integration)
  - [ ] Validate file headers match declared MIME type

### 1.5 Security Headers & CORS
- [ ] 1.5.1 Add security headers middleware:
  - [ ] `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'`
  - [ ] `X-Frame-Options: DENY` (prevent clickjacking)
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `Referrer-Policy: strict-origin-when-cross-origin`
  - [ ] `Permissions-Policy: camera=(self), microphone=(self)` (for CBT proctoring)
  - [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)
- [ ] 1.5.2 Configure CORS for API (only same-origin by default; whitelist for known integrations)
- [ ] 1.5.3 Add CORS preflight handling for OPTIONS requests

### 1.6 Data Encryption
- [ ] 1.6.1 Encrypt sensitive fields at rest (bank details, salary, medical notes)
- [ ] 1.6.2 Use AES-256-GCM with key from environment variable
- [ ] 1.6.3 Add `encrypt()` and `decrypt()` helpers in `src/lib/crypto.ts`
- [ ] 1.6.4 Audit all fields containing PII and mark for encryption
- [ ] 1.6.5 Add environment variable rotation strategy for encryption key

---

## Phase 2: Reliability & Error Handling (CRITICAL)

### 2.1 API Error Handling
**Current state:** 60+ APIs have no try/catch. Any database error crashes the request with a 500 and stack trace.

- [ ] 2.1.1 Wrap all API handlers in try/catch blocks
- [ ] 2.1.2 Create standardized error response format:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
  ```
- [ ] 2.1.3 Create error code constants (VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, etc.)
- [ ] 2.1.4 Log all errors with request context (path, method, userId, body)
- [ ] 2.1.5 Never expose stack traces in production responses
- [ ] 2.1.6 Add global error handler middleware
- [ ] 2.1.7 Remove all empty `catch {}` blocks (8 files identified)

### 2.2 Database Transactions
**Current state:** Multi-step operations (e.g., issue library book → decrement availableCopies) are not wrapped in transactions. A crash mid-operation leaves inconsistent data.

- [ ] 2.2.1 Identify all multi-step write operations:
  - [ ] Library book issue (insert loan + update book copies)
  - [ ] Library book return (update loan + update book copies + compute fine)
  - [ ] Invoice payment (insert payment + update invoice status)
  - [ ] Hostel allocation (insert allocation + update room occupants)
  - [ ] Bulk attendance (loop insert/update)
  - [ ] Bulk invoice generation (loop insert)
  - [ ] CBT attempt submission (update attempt + insert proctoring logs)
  - [ ] Report card generation (aggregate results + insert card)
  - [ ] Recruitment hire (update application + insert staff)
- [ ] 2.2.2 Wrap each in `db.transaction(() => { ... })`
- [ ] 2.2.3 Add rollback testing (force error mid-transaction, verify no partial writes)

### 2.3 Database Health
- [ ] 2.3.1 Add database connection health check to `/api/health`
- [ ] 2.3.2 Add connection pool monitoring (better-sqlite3 is single-connection; document)
- [ ] 2.3.3 Add WAL mode verification (`PRAGMA journal_mode=WAL`)
- [ ] 2.3.4 Add periodic `PRAGMA integrity_check` (weekly cron)
- [ ] 2.3.5 Add database size monitoring with alert at 80% capacity
- [ ] 2.3.6 Document backup/restore procedure with tested runbook

### 2.4 Graceful Degradation
- [ ] 2.4.1 Add fallback UI when Cloudinary is unavailable (show placeholder)
- [ ] 2.4.2 Add fallback when email service is down (queue emails, retry later)
- [ ] 2.4.3 Add fallback when AI provider is down (disable AI features gracefully)
- [ ] 2.4.4 Add fallback when Google Translate is down (show original text)
- [ ] 2.4.5 Add maintenance mode that shows banner but allows admin access

---

## Phase 3: Testing (HIGH)

### 3.1 Test Infrastructure
- [ ] 3.1.1 Install Vitest for unit testing
- [ ] 3.1.2 Install Playwright for E2E testing
- [ ] 3.1.3 Create test database (separate from dev/production)
- [ ] 3.1.4 Create test fixtures and factories
- [ ] 3.1.5 Add `npm test`, `npm run test:e2e`, `npm run test:coverage` scripts
- [ ] 3.1.6 Configure coverage thresholds (80% minimum)

### 3.2 Unit Tests
- [ ] 3.2.1 Test all lib utilities (auth, crypto, payments, email, notifications, rbac)
- [ ] 3.2.2 Test database helpers (insertIfNotExists, safeInsertReturning)
- [ ] 3.2.3 Test grade calculation logic
- [ ] 3.2.4 Test fine calculation logic (library overdue)
- [ ] 3.2.5 Test invoice status computation
- [ ] 3.2.6 Test prayer schedule validation
- [ ] 3.2.7 Test attendance bulk insert logic

### 3.3 Integration Tests
- [ ] 3.3.1 Test each API endpoint with valid input (happy path)
- [ ] 3.3.2 Test each API endpoint with invalid input (validation)
- [ ] 3.3.3 Test each API endpoint without authentication (401)
- [ ] 3.3.4 Test each API endpoint with wrong school (403)
- [ ] 3.3.5 Test concurrent operations (two users editing same record)

### 3.4 End-to-End Tests
- [ ] 3.4.1 E2E: Student enrollment flow (admissions → enrollment → class assignment)
- [ ] 3.4.2 E2E: Fee payment flow (invoice → payment → receipt → parent portal)
- [ ] 3.4.3 E2E: Exam flow (create exam → enter marks → generate report card → transcript)
- [ ] 3.4.4 E2E: Library flow (add book → issue → return → fine → payment)
- [ ] 3.4.5 E2E: CBT flow (create exam → register candidates → take exam → grade → results)
- [ ] 3.4.6 E2E: Communication flow (create announcement → broadcast → parent sees it)

### 3.5 Performance Tests
- [ ] 3.5.1 Load test: 100 concurrent users on dashboard
- [ ] 3.5.2 Load test: bulk attendance entry (1000 students)
- [ ] 3.5.3 Load test: bulk invoice generation (500 students)
- [ ] 3.5.4 Stress test: CBT exam with 100 simultaneous test-takers
- [ ] 3.5.5 Database query performance audit (identify slow queries)

---

## Phase 4: Performance Optimization (HIGH)

### 4.1 Database Indexes
**Current state:** Only PKs and 82 indexes in migrate.ts. Many foreign keys lack indexes.

- [ ] 4.1.1 Add indexes on all foreign keys:
  - [ ] `students.schoolId`, `students.userId`, `students.parentId`, `students.familyGroupId`
  - [ ] `enrollments.studentId`, `enrollments.classId`
  - [ ] `attendance.studentId`, `attendance.date`, `attendance.schoolId`
  - [ ] `invoices.studentId`, `invoices.status`, `invoices.dueDate`
  - [ ] `payments.invoiceId`, `payments.schoolId`, `payments.paidAt`
  - [ ] `grades.studentId`, `grades.courseId`, `grades.assignmentId`
  - [ ] `examResults.examId`, `examResults.studentId`
  - [ ] `libraryLoans.bookId`, `libraryLoans.borrowerId`, `libraryLoans.status`
  - [ ] `hostelAllocations.studentId`, `hostelAllocations.roomId`
  - [ ] `transportAssignments.studentId`, `transportAssignments.routeId`
  - [ ] `cbtAttempts.examId`, `cbtAttempts.candidateId`
  - [ ] `messages.senderId`, `messages.recipientId`, `messages.schoolId`
  - [ ] `notifications.userId`, `notifications.schoolId`, `notifications.isRead`
  - [ ] `auditLogs.schoolId`, `auditLogs.userId`, `auditLogs.createdAt`
- [ ] 4.1.2 Add composite indexes for common query patterns:
  - [ ] `(schoolId, status)` on students, invoices, enrollments
  - [ ] `(schoolId, date)` on attendance
  - [ ] `(schoolId, createdAt)` on audit logs, messages
- [ ] 4.1.3 Add `CREATE INDEX IF NOT EXISTS` statements to migrate.ts
- [ ] 4.1.4 Run `EXPLAIN QUERY PLAN` on top 20 queries, verify index usage

### 4.2 Query Optimization
- [ ] 4.2.1 Eliminate N+1 query patterns:
  - [ ] `cbt-candidates.ts` bulk_register: loops `db.select(students)` per ID → batch fetch
  - [ ] `comms-announcements.ts` broadcast: loops `db.insert(notifications)` → batch insert
  - [ ] `attendance.ts` bulk: loops `db.select` + `db.update/insert` → batch with transactions
  - [ ] `invoices.ts` bulk_generate: loops `db.insert` → batch insert
  - [ ] `report-cards.ts` rank calculation: loops all students → single aggregate query
- [ ] 4.2.2 Add pagination to list endpoints (students, invoices, attendance, audit logs)
  - [ ] Default page size: 50
  - [ ] Max page size: 200
  - [ ] Return total count + page metadata
- [ ] 4.2.3 Add query result caching for:
  - [ ] Dashboard stats (cache 5 minutes)
  - [ ] School settings (cache 1 hour)
  - [ ] Module settings (cache 1 hour)
  - [ ] Theme list (cache 1 hour)

### 4.3 Frontend Performance
- [ ] 4.3.1 Lazy-load dashboard pages (code-splitting per route)
- [ ] 4.3.2 Add loading skeletons for async content (eliminate flash of empty state)
- [ ] 4.3.3 Add debounce to search inputs (300ms — already done in some)
- [ ] 4.3.4 Add virtual scrolling for large tables (1000+ rows)
- [ ] 4.3.5 Optimize images: generate responsive variants on Cloudinary
- [ ] 4.3.6 Add Service Worker for offline dashboard access (PWA)

### 4.4 Bundle Size
- [ ] 4.4.1 Audit bundle size (current: 9.2MB dist, 363 chunks)
- [ ] 4.4.2 Tree-shake unused theme files (64 themes × 15 files = 960 files)
- [ ] 4.4.3 Code-split theme loading (load only selected theme)
- [ ] 4.4.4 Minify and compress all assets
- [ ] 4.4.5 Enable Brotli compression on server

---

## Phase 5: Observability & Monitoring (HIGH)

### 5.1 Structured Logging
- [ ] 5.1.1 Replace `console.log/error` with structured logger (pino or winston)
- [ ] 5.1.2 Log format: JSON with timestamp, level, requestId, userId, schoolId, message
- [ ] 5.1.3 Log levels: debug, info, warn, error, fatal
- [ ] 5.1.4 Add request ID middleware (correlate logs across request lifecycle)
- [ ] 5.1.5 Log all API requests (method, path, status, duration, userId)
- [ ] 5.1.6 Log all database errors with query context
- [ ] 5.1.7 Log all authentication events (login, logout, failed, 2FA)

### 5.2 Error Tracking
- [ ] 5.2.1 Integrate Sentry (or self-hosted GlitchTip)
- [ ] 5.2.2 Capture all unhandled errors and 500 responses
- [ ] 5.2.3 Add source maps upload for accurate stack traces
- [ ] 5.2.4 Set up alerting for error rate spikes
- [ ] 5.2.5 Add error grouping and deduplication

### 5.3 Application Metrics
- [ ] 5.3.1 Add Prometheus metrics endpoint (`/api/metrics`)
- [ ] 5.3.2 Track: request count, request duration, error rate, active sessions
- [ ] 5.3.3 Track: database query count, query duration
- [ ] 5.3.4 Track: memory usage, event loop lag
- [ ] 5.3.5 Set up Grafana dashboard for visualization
- [ ] 5.3.6 Add alerts for: high error rate, slow responses, high memory

### 5.4 Audit Log Completeness
**Current state:** Only 1 API writes to audit_logs. 20+ write APIs don't log.

- [ ] 5.4.1 Create `logAudit()` helper function
- [ ] 5.4.2 Add audit log calls to all create/update/delete operations:
  - [ ] Student CRUD
  - [ ] Staff CRUD
  - [ ] Invoice CRUD + payment recording
  - [ ] Grade changes
  - [ ] Attendance corrections
  - [ ] Module settings changes
  - [ ] User role changes
  - [ ] Password resets
  - [ ] 2FA enable/disable
- [ ] 5.4.3 Add audit log retention policy (2 years)
- [ ] 5.4.4 Add audit log export for compliance

### 5.5 Uptime Monitoring
- [ ] 5.5.1 Set up external uptime monitoring (UptimeRobot or BetterStack)
- [ ] 5.5.2 Monitor: `/api/health` endpoint every 60 seconds
- [ ] 5.5.3 Monitor: database connectivity
- [ ] 5.5.4 Monitor: SSL certificate expiry (alert 30 days before)
- [ ] 5.5.5 Add status page (status.example.com)

---

## Phase 6: DevOps & Deployment (HIGH)

### 6.1 Dockerization
- [ ] 6.1.1 Create multi-stage Dockerfile:
  - [ ] Stage 1: Build (Node 22, install deps, npm run build)
  - [ ] Stage 2: Runtime (Node 22-alpine, copy dist + node_modules)
- [ ] 6.1.2 Create docker-compose.yml with:
  - [ ] App service (ischool)
  - [ ] Volume for SQLite database
  - [ ] Volume for uploads
  - [ ] Environment variables
- [ ] 6.1.3 Create .dockerignore (exclude node_modules, .git, dist, *.db)
- [ ] 6.1.4 Test Docker build locally
- [ ] 6.1.5 Optimize image size (target < 500MB)

### 6.2 CI/CD Pipeline
- [ ] 6.2.1 Create `.github/workflows/ci.yml`:
  - [ ] On push/PR: lint, type-check, build, test
  - [ ] Cache node_modules for speed
- [ ] 6.2.2 Create `.github/workflows/deploy.yml`:
  - [ ] On push to main: build Docker image, push to registry
  - [ ] Deploy to staging automatically
  - [ ] Deploy to production on manual approval
- [ ] 6.2.3 Add branch protection rules (require CI pass, require review)
- [ ] 6.2.4 Add semantic versioning (automated version bump on merge)

### 6.3 Environment Management
- [ ] 6.3.1 Create `.env.example` with all required variables:
  - [ ] `DATABASE_PATH`
  - [ ] `SESSION_SECRET`
  - [ ] `ENCRYPTION_KEY`
  - [ ] `CLOUDINARY_*`
  - [ ] `GMAIL_*`
  - [ ] `AI_*`
  - [ ] `STRIPE_*`
  - [ ] `PAYSTACK_*`
- [ ] 6.3.2 Create separate env configs: development, staging, production
- [ ] 6.3.3 Document env setup in README
- [ ] 6.3.4 Add env validation on startup (fail fast if missing required vars)

### 6.4 Database Migration Strategy
- [ ] 6.4.1 Create migration versioning system
- [ ] 6.4.2 Add `migrations` table to track applied migrations
- [ ] 6.4.3 Add rollback support for each migration
- [ ] 6.4.4 Test migration on copy of production database
- [ ] 6.4.5 Document zero-downtime migration procedure

### 6.5 Backup & Disaster Recovery
- [ ] 6.5.1 Automate daily database backups (cron job → S3/cloud storage)
- [ ] 6.5.2 Retain: daily for 7 days, weekly for 4 weeks, monthly for 12 months
- [ ] 6.5.3 Test restore procedure monthly
- [ ] 6.5.4 Document disaster recovery runbook
- [ ] 6.5.5 Add backup verification (restore to test DB, run integrity check)
- [ ] 6.5.6 Add off-site backup replication (different region/provider)

### 6.6 SSL/TLS
- [ ] 6.6.1 Set up reverse proxy (Nginx or Caddy) with auto-SSL
- [ ] 6.6.2 Configure HSTS (force HTTPS)
- [ ] 6.6.3 Use Let's Encrypt for free SSL certificates
- [ ] 6.6.4 Set up automatic certificate renewal
- [ ] 6.6.5 Configure SSL labs rating to A+

---

## Phase 7: UX & Polish (MEDIUM)

### 7.1 Toast Notifications
**Current state:** Many pages use `alert()` for success/error feedback. Not professional.

- [ ] 7.1.1 Create reusable Toast component (success, error, warning, info variants)
- [ ] 7.1.2 Replace all `alert()` calls with Toast notifications
- [ ] 7.1.3 Add auto-dismiss (5 seconds) with manual close
- [ ] 7.1.4 Stack multiple toasts (top-right corner)
- [ ] 7.1.5 Add toast for all API success/error responses

### 7.2 Loading States
- [ ] 7.2.1 Add loading spinner to all async buttons (disable + show spinner)
- [ ] 7.2.2 Add skeleton loaders for tables and cards
- [ ] 7.2.3 Add page-level loading indicator for route changes
- [ ] 7.2.4 Add optimistic updates where safe (e.g., toggle switches)

### 7.3 Empty States
- [ ] 7.3.1 Design consistent empty state component (icon + title + description + CTA)
- [ ] 7.3.2 Add empty states to all list views (already done in many)
- [ ] 7.3.3 Add "first time" onboarding hints

### 7.4 Form Validation UX
- [ ] 7.4.1 Add inline form validation (show error below field on blur)
- [ ] 7.4.2 Add required field indicators (*)
- [ ] 7.4.3 Add character counters for textareas
- [ ] 7.4.4 Add date picker with min/max constraints
- [ ] 7.4.5 Add confirmation dialogs for destructive actions (already done in many)

### 7.5 Responsive Design Audit
- [ ] 7.5.1 Test all dashboard pages on mobile (375px width)
- [ ] 7.5.2 Test all dashboard pages on tablet (768px width)
- [ ] 7.5.3 Fix any horizontal scroll issues
- [ ] 7.5.4 Ensure all modals are full-screen on mobile
- [ ] 7.5.5 Add mobile navigation drawer for dashboard sidebar

### 7.6 Accessibility (WCAG 2.1 AA)
- [ ] 7.6.1 Add ARIA labels to all interactive elements
- [ ] 7.6.2 Ensure keyboard navigation (Tab order, Enter/Space on buttons)
- [ ] 7.6.3 Add focus indicators (visible focus ring)
- [ ] 7.6.4 Ensure color contrast ratio ≥ 4.5:1 for text
- [ ] 7.6.5 Add screen reader announcements for dynamic content
- [ ] 7.6.6 Test with screen reader (NVDA or VoiceOver)
- [ ] 7.6.7 Add skip-to-content link
- [ ] 7.6.8 Ensure all images have alt text

### 7.7 Dark Mode
- [ ] 7.7.1 Add dark mode toggle to dashboard
- [ ] 7.7.2 Create dark color palette for all components
- [ ] 7.7.3 Persist preference in localStorage
- [ ] 7.7.4 Respect `prefers-color-scheme` system setting

---

## Phase 8: Feature Gaps & Improvements (MEDIUM)

### 8.1 Payment Gateway Integration
**Current state:** `src/lib/payments.ts` has interface defined but Stripe/Paystack initialization returns mock data. No actual payment processing.

- [ ] 8.1.1 Implement Stripe integration:
  - [ ] Install `stripe` npm package
  - [ ] Create Stripe customer on first payment
  - [ ] Implement Payment Intent creation
  - [ ] Implement webhook handler for payment confirmation
  - [ ] Add Stripe Elements to parent portal for card entry
- [ ] 8.1.2 Implement Paystack integration:
  - [ ] Use Paystack REST API
  - [ ] Initialize transaction (returns authorization URL)
  - [ ] Verify transaction on callback
  - [ ] Handle webhook
- [ ] 8.1.3 Implement Flutterwave integration (similar to Paystack)
- [ ] 8.1.4 Add payment retry logic for failed payments
- [ ] 8.1.5 Add refund processing
- [ ] 8.1.6 Add payment receipts (PDF generation)
- [ ] 8.1.7 Add automatic invoice status update on payment confirmation

### 8.2 Email System
- [ ] 8.2.1 Replace Gmail SMTP with transactional email service (SendGrid/Postmark/Resend)
- [ ] 8.2.2 Create email template system (HTML templates with variables)
- [ ] 8.2.3 Add email queue for retry on failure
- [ ] 8.2.4 Add email tracking (open, click)
- [ ] 8.2.5 Add unsubscribe links (CAN-SPAM compliance)
- [ ] 8.2.6 Add email preview before sending
- [ ] 8.2.7 Add scheduled email sending

### 8.3 Notification System
- [ ] 8.3.1 Add real-time notifications via WebSocket (Socket.io)
- [ ] 8.3.2 Add push notifications (Web Push API)
- [ ] 8.3.3 Add SMS notifications (Twilio or Termii integration)
- [ ] 8.3.4 Add notification preferences per user (email, SMS, push toggles)
- [ ] 8.3.5 Add notification digest (daily summary email)

### 8.4 Search
- [ ] 8.4.1 Add global search across all modules (students, staff, invoices, etc.)
- [ ] 8.4.2 Add search to public school website
- [ ] 8.4.3 Add search history and saved searches
- [ ] 8.4.4 Add search filters (by date, status, category)

### 8.5 Bulk Operations
- [ ] 8.5.1 Add bulk student promotion (end of year)
- [ ] 8.5.2 Add bulk grade entry (CSV import)
- [ ] 8.5.3 Add bulk SMS/email sending
- [ ] 8.5.4 Add bulk document generation (report cards, transcripts, ID cards)
- [ ] 8.5.5 Add bulk status updates with selection checkboxes

### 8.6 CBT Enhancements
- [ ] 8.6.1 Implement actual CBT exam-taking interface for students:
  - [ ] Full-screen forced mode
  - [ ] Tab switch detection
  - [ ] Question navigation panel
  - [ ] Flag for review
  - [ ] Auto-save answers
  - [ ] Countdown timer with warnings
  - [ ] Auto-submit on timeout
- [ ] 8.6.2 Implement webcam proctoring:
  - [ ] Capture photo at start
  - [ ] Periodic snapshots
  - [ ] Face detection (face-api.js)
  - [ ] Multiple face alert
- [ ] 8.6.3 Implement offline CBT mode (downloadable package)
- [ ] 8.6.4 Implement question randomization per candidate
- [ ] 8.6.5 Implement negative marking
- [ ] 8.6.6 Implement section-based time limits

### 8.7 Mobile Apps (Future)
- [ ] 8.7.1 Design REST API for mobile app consumption
- [ ] 8.7.2 Add JWT token authentication for mobile
- [ ] 8.7.3 Build React Native or Flutter app (out of current scope per spec)
- [ ] 8.7.4 Add push notification support for mobile

---

## Phase 9: Documentation (MEDIUM)

### 9.1 Technical Documentation
- [ ] 9.1.1 Create API documentation (OpenAPI/Swagger)
- [ ] 9.1.2 Document database schema with ERD
- [ ] 9.1.3 Create deployment guide
- [ ] 9.1.4 Create developer onboarding guide
- [ ] 9.1.5 Document theme development guide
- [ ] 9.1.6 Create troubleshooting guide

### 9.2 User Documentation
- [ ] 9.2.1 Create admin user manual
- [ ] 9.2.2 Create teacher user manual
- [ ] 9.2.3 Create parent user manual
- [ ] 9.2.4 Create student user manual
- [ ] 9.2.5 Add in-app help tooltips
- [ ] 9.2.6 Create video tutorials

### 9.3 Compliance Documentation
- [ ] 9.3.1 Create GDPR data processing agreement
- [ ] 9.3.2 Create privacy policy template
- [ ] 9.3.3 Create data retention policy
- [ ] 9.3.4 Create incident response plan
- [ ] 9.3.5 Create backup/restore runbook

---

## Phase 10: Pre-Launch Checklist (BLOCKER)

### 10.1 Security Sign-off
- [ ] 10.1.1 Penetration test by external security firm
- [ ] 10.1.2 OWASP Top 10 vulnerability scan
- [ ] 10.1.3 SSL Labs rating A+
- [ ] 10.1.4 Security headers verification (securityheaders.com)
- [ ] 10.1.5 Dependency vulnerability scan (`npm audit`)
- [ ] 10.1.6 Secret scan (no hardcoded credentials in repo)

### 10.2 Performance Sign-off
- [ ] 10.2.1 Lighthouse score ≥ 90 (performance, accessibility, best practices, SEO)
- [ ] 10.2.2 Page load < 2 seconds on 3G
- [ ] 10.2.3 API response < 200ms (p95)
- [ ] 10.2.4 Database query < 50ms (p95)

### 10.3 Reliability Sign-off
- [ ] 10.3.1 99.9% uptime target
- [ ] 10.3.2 Zero data loss (verified backup/restore)
- [ ] 10.3.3 Graceful handling of all error scenarios
- [ ] 10.3.4 Load test passed (100 concurrent users)

### 10.4 Compliance Sign-off
- [ ] 10.4.1 GDPR compliance verified
- [ ] 10.4.2 Data processing agreements signed
- [ ] 10.4.3 Privacy policy published
- [ ] 10.4.4 Cookie consent banner implemented
- [ ] 10.4.5 Terms of service published

### 10.5 Operational Sign-off
- [ ] 10.5.1 Runbooks tested
- [ ] 10.5.2 On-call rotation established
- [ ] 10.5.3 Monitoring dashboards configured
- [ ] 10.5.4 Alerting configured and tested
- [ ] 10.5.5 Incident response plan tested

---

## Priority Order for Implementation

1. **Phase 1 (Security)** — CRITICAL, BLOCKER. Do first.
2. **Phase 2 (Reliability)** — CRITICAL, BLOCKER. Do second.
3. **Phase 4.1-4.2 (DB Indexes + Query Opt)** — HIGH. Do third.
4. **Phase 5.1-5.4 (Logging + Audit)** — HIGH. Do fourth.
5. **Phase 6.1-6.3 (Docker + CI/CD + Env)** — HIGH. Do fifth.
6. **Phase 3 (Testing)** — HIGH. Ongoing throughout.
7. **Phase 7 (UX Polish)** — MEDIUM. After core hardening.
8. **Phase 8 (Feature Gaps)** — MEDIUM. Based on user feedback.
9. **Phase 9 (Documentation)** — MEDIUM. Parallel to other work.
10. **Phase 10 (Pre-Launch)** — Final gate before going live.

---

## Known Bugs to Fix

### Critical
- [ ] BUG-001: timetable.ts had unreachable code after `return` (FIXED in Phase 0)
- [ ] BUG-002: `grades` table lacked `assignment_id` and `exam_id` columns (FIXED in Module 2)
- [ ] BUG-003: Empty `catch {}` blocks in 8 API files silently swallow errors
- [ ] BUG-004: File upload has no size limit (DoS risk)
- [ ] BUG-005: No CSRF protection on any form

### High
- [ ] BUG-006: 68 APIs lack RBAC permission checks
- [ ] BUG-007: No rate limiting on login (brute force risk)
- [ ] BUG-008: No database transactions on multi-step operations
- [ ] BUG-009: `error-logger.ts` imports `writeFileSync` but never uses it (build warning)
- [ ] BUG-010: 17 "empty chunk" build warnings (TypeScript in `<script>` tags not generating output)

### Medium
- [ ] BUG-011: No pagination on list endpoints (performance degradation with scale)
- [ ] BUG-012: Audit log only written by 1 API (out of 20+ write APIs)
- [ ] BUG-013: No structured logging (debugging in production is difficult)
- [ ] BUG-014: `alert()` used for user feedback instead of Toast component
- [ ] BUG-015: No loading states on most async operations

### Low
- [ ] BUG-016: No dark mode
- [ ] BUG-017: No cookie consent banner
- [ ] BUG-018: No analytics tracking
- [ ] BUG-019: No 404 handling for invalid school slugs
- [ ] BUG-020: RTL support partial (CSS exists but not tested)

---

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Security | 5-7 days | CRITICAL |
| Phase 2: Reliability | 3-5 days | CRITICAL |
| Phase 3: Testing | 7-10 days | HIGH |
| Phase 4: Performance | 3-5 days | HIGH |
| Phase 5: Observability | 3-4 days | HIGH |
| Phase 6: DevOps | 4-6 days | HIGH |
| Phase 7: UX Polish | 5-7 days | MEDIUM |
| Phase 8: Feature Gaps | 10-15 days | MEDIUM |
| Phase 9: Documentation | 3-5 days | MEDIUM |
| Phase 10: Pre-Launch | 2-3 days | BLOCKER |
| **Total** | **45-67 days** | |

---

*This document is a living checklist. Update status as items are completed. Add new items as discovered.*

*Bismillah. May Allah make this effort beneficial.*
