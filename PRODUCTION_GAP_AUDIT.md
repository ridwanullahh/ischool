# Production Gap Audit — iSchool Platform

## Audit Date: 2026-07-09
## Spec: school_softwares.md (16 modules + platform-wide features)

---

## Summary

- **Total spec modules:** 16 + platform-wide
- **Fully functional pages:** 51 (out of 97 dashboard pages)
- **Stub/placeholder pages:** 46 (showing "coming soon" or "module active" with no functionality)
- **Schema tables:** 130+ (comprehensive coverage)
- **API endpoints:** 58 (covering most CRUD operations)
- **Portal pages:** 25 (student, teacher, parent)

---

## Module 1 — SIS (Student Information System)

### Student Records — FUNCTIONAL
- [x] Student profile (students.astro, students/[id].astro)
- [x] Custom fields (schema: custom_fields JSON)
- [x] Status management (active, transferred, graduated, withdrawn, suspended)
- [x] Enrollment history (enrollments.astro)
- [ ] Student photo management — PARTIAL (photo_url in schema, no upload UI)
- [ ] ID card generation — STUB (students/id-cards.astro missing)
- [ ] Sibling/family linking — STUB (family_groups in schema, no UI)
- [ ] Document vault — STUB (student_documents in schema, student-docs.astro is stub)

### Enrollment & Admissions — PARTIALLY FUNCTIONAL
- [x] Online application portal ([slug]/admissions with period detail + apply)
- [x] Application workflow (submitted, reviewing, accepted, rejected, waitlisted)
- [x] Admin application management (admissions.astro)
- [ ] Document checklist during application — MISSING
- [ ] Automated acceptance/rejection email — MISSING
- [ ] Re-enrollment flow — MISSING
- [ ] Bulk enrollment processing — MISSING
- [ ] Transfer student intake — MISSING

### Class & Section Management — FUNCTIONAL
- [x] Academic year/term config (periods.astro is STUB, but academic_periods in schema)
- [x] Grade levels, sections (classes.astro)
- [x] Student-to-class assignment (enrollments.astro)
- [ ] Class capacity limits and waitlist — MISSING
- [x] Homeroom teacher assignment (homeroomTeacherId in schema)
- [x] Subject-to-class mapping (class-subjects API)
- [ ] Timetable conflict detection — STUB

### Attendance — FUNCTIONAL
- [x] Daily and period-based attendance (attendance.astro)
- [x] Teacher attendance interface (portal/teacher/attendance.astro)
- [ ] QR code and biometric — MISSING
- [ ] Automated absence notifications to parents — MISSING
- [x] Attendance reports
- [ ] Late arrival and early departure logging — PARTIAL
- [ ] Attendance analytics and trend charts — MISSING
- [ ] Bulk attendance entry — MISSING
- [ ] Attendance thresholds and alert rules — MISSING

### Health & Medical — STUB
- [ ] Student medical history — STUB (medical.astro, student_medical_records in schema)
- [ ] Allergy and medication records — STUB
- [ ] Nurse visit log — MISSING
- [ ] Immunization tracking — MISSING
- [ ] Emergency medical action plans — MISSING
- [ ] Health incident reports — MISSING

**GAP TASKS:**
1. Implement student photo upload UI in students.astro
2. Build ID card generation page (students/id-cards.astro)
3. Build family/sibling linking UI
4. Implement document vault (student-docs.astro)
5. Add document checklist to admissions application
6. Add automated acceptance/rejection emails
7. Build re-enrollment flow
8. Build bulk enrollment processing
9. Implement class capacity/waitlist
10. Build timetable conflict detection
11. Add QR/biometric attendance support
12. Implement automated absence notifications
13. Add attendance analytics/charts
14. Build bulk attendance entry
15. Implement attendance alert rules
16. Build full medical module (medical.astro)
17. Add nurse visit log
18. Add immunization tracking

---

## Module 2 — LMS (Learning Management System)

### Course Management — FUNCTIONAL
- [x] Course creation (courses.astro)
- [x] Course visibility controls
- [ ] Course duplication — MISSING
- [ ] Drag-and-drop content builder — MISSING
- [x] Units, topics, lessons (lessons.astro is STUB but lesson schema exists)
- [ ] Co-teacher support — MISSING
- [x] Course announcements

### Content & Resources — PARTIALLY FUNCTIONAL
- [x] File uploads (upload API)
- [ ] Embedded video support — MISSING
- [x] Rich text lesson pages (RichTextEditor exists)
- [ ] External link resources — MISSING
- [ ] SCORM/xAPI — MISSING (out of scope for now)
- [ ] Content library — MISSING
- [ ] Folder organization — MISSING

### Assignments — FUNCTIONAL
- [x] Assignment creation (assignments.astro)
- [x] Assignment types (essay, file_upload, link, offline)
- [ ] Group assignment mode — MISSING
- [ ] Rubric builder — PARTIAL (rubric field in schema, no UI)
- [x] Resubmission settings
- [x] Late submission policies
- [x] Submission inbox
- [ ] Inline annotation — MISSING
- [x] Grade sync to gradebook

### Quizzes — FUNCTIONAL
- [x] Question types (question-bank.astro)
- [x] Question bank with tagging
- [ ] Randomize question/answer order — MISSING
- [x] Time limits and attempt limits
- [x] Auto-grading for objective types
- [ ] Quiz results analytics per question — MISSING
- [ ] Quiz review mode — MISSING
- [x] Scheduled quiz windows

### Gradebook — FUNCTIONAL
- [x] Points-based grading (grades.astro)
- [ ] Standards-based grading — MISSING
- [ ] Weighted categories — MISSING
- [x] Grade override with comment
- [ ] Missing and late grade flags — MISSING
- [ ] Grade history — MISSING
- [x] Gradebook export
- [x] Grade visibility controls
- [ ] Progress reports — MISSING

### Discussion — FUNCTIONAL
- [x] Threaded discussion boards (discussions.astro)
- [x] Teacher-moderated posts
- [ ] Student peer replies and reactions — PARTIAL
- [ ] Announcement-only mode — MISSING
- [ ] Discussion grading — MISSING

### Student Progress — PARTIALLY FUNCTIONAL
- [ ] Per-student progress dashboard — MISSING
- [ ] Completion tracking — MISSING
- [ ] Time-on-task tracking — MISSING
- [ ] At-risk student flags — MISSING
- [ ] Class-wide performance analytics — STUB (results-analytics.astro)

**GAP TASKS:**
1. Build course duplication feature
2. Implement drag-and-drop content builder
3. Build lessons page fully (currently stub)
4. Add co-teacher support
5. Add embedded video support
6. Build content library
7. Add group assignment mode
8. Build rubric builder UI
9. Add inline annotation for submissions
10. Implement question/answer randomization
11. Build quiz results analytics
12. Add quiz review mode
13. Add weighted categories to gradebook
14. Add missing/late grade flags
15. Build grade history
16. Build progress reports
17. Add announcement-only mode to discussions
18. Add discussion grading
19. Build per-student progress dashboard
20. Implement completion tracking
21. Add at-risk student flags
22. Build class-wide analytics (de-stub results-analytics.astro)

---

## Module 3 — Timetable & Scheduling

- [x] Academic period config (periods.astro is STUB but schema exists)
- [x] Bell schedule config (bell-schedules.astro is STUB but schema exists)
- [ ] Automated timetable generation — MISSING
- [x] Manual timetable editor (timetable.astro)
- [ ] Teacher availability constraints — MISSING
- [ ] Room/resource availability — MISSING
- [x] Subject-period allocation
- [ ] Conflict detection — STUB
- [ ] Multi-campus support — MISSING
- [ ] Substitute teacher scheduling (substitutes.astro is STUB)
- [x] Timetable publication to portals
- [ ] Timetable export (PDF, iCal) — MISSING
- [ ] Special event overlay — MISSING
- [ ] Recurring overrides — MISSING

**GAP TASKS:**
1. Build periods.astro fully (academic periods CRUD)
2. Build bell-schedules.astro fully
3. Implement automated timetable generation
4. Add teacher availability constraints
5. Add room/resource availability
6. Implement conflict detection
7. Build substitutes.astro fully
8. Add timetable export (PDF, iCal)
9. Add special event overlay
10. Add recurring overrides

---

## Module 4 — Examinations & Results

### Exam Planning — PARTIALLY FUNCTIONAL
- [x] Exam series creation (exam-series API)
- [x] Subject-wise exam scheduling (exams.astro)
- [ ] Exam timetable builder — PARTIAL
- [ ] Venue and seating plan (venues.astro is STUB, seating.astro is STUB)
- [ ] Invigilator assignment — MISSING
- [ ] Admit card generation — MISSING
- [x] Student exam schedule view

### Mark Entry — PARTIALLY FUNCTIONAL
- [x] Mark entry (marks.astro is STUB but exam results API works)
- [x] Grade scale configuration
- [ ] Subject weight configuration — MISSING
- [x] Automatic grade calculation
- [ ] Grade moderation workflow — MISSING
- [ ] Bulk mark import — MISSING
- [x] Absent/withheld handling

### Report Cards — STUB
- [ ] Configurable templates (report-cards.astro is STUB)
- [ ] Teacher comments — MISSING
- [ ] Behavioral ratings — MISSING
- [ ] Principal remarks — MISSING
- [ ] Ranking — MISSING
- [ ] Report card print/PDF — MISSING
- [ ] Bulk generation — MISSING
- [ ] Official transcripts (transcripts.astro is STUB)
- [ ] Promotion/retention — MISSING

### Results Analytics — STUB
- [ ] Class performance summary (results-analytics.astro is STUB)
- [ ] Student performance trend — MISSING
- [ ] Top/bottom performer identification — MISSING
- [ ] Subject difficulty analytics — MISSING
- [ ] Board exam result import — MISSING

**GAP TASKS:**
1. Build exam timetable builder with conflict checker
2. Build venues.astro fully (venue management)
3. Build seating.astro fully (seating plan)
4. Add invigilator assignment
5. Build admit card generation
6. Build marks.astro fully (mark entry interface)
7. Add subject weight configuration
8. Build grade moderation workflow
9. Add bulk mark import
10. Build report-cards.astro fully (templates, comments, ranking, PDF)
11. Build transcripts.astro fully
12. Add promotion/retention tools
13. Build results-analytics.astro fully
14. Add student performance trends
15. Add top/bottom performer identification
16. Add subject difficulty analytics

---

## Module 5 — Finance & Fees

### Fee Configuration — FUNCTIONAL
- [x] Fee structure setup (fees.astro)
- [x] One-time, recurring fee types
- [ ] Discount types — PARTIAL
- [ ] Fine/penalty rules — MISSING
- [ ] Fee waiver workflow — MISSING
- [ ] Installment plans — MISSING

### Invoicing — FUNCTIONAL
- [x] Invoice generation (invoices.astro)
- [x] Manual invoice creation
- [ ] Invoice preview/PDF — MISSING
- [ ] Bulk invoice generation — MISSING
- [ ] Prorated fees — MISSING
- [ ] Credit notes — MISSING

### Payments — FUNCTIONAL
- [x] Payment gateway integration (payments.astro)
- [x] Bank transfer and cash recording
- [ ] Payment receipt generation — MISSING
- [x] Partial payment support
- [x] Payment history
- [ ] Overpayment/refund management — MISSING

### Reporting — PARTIALLY FUNCTIONAL
- [x] Fee collection summary
- [ ] Outstanding fees with aging — MISSING
- [ ] Revenue dashboard — STUB (finance-reports.astro)
- [ ] Income/expenditure ledger — MISSING
- [ ] Budget vs actual — MISSING
- [ ] Audit-ready transaction log — MISSING

### Parent Payment Portal — PARTIALLY FUNCTIONAL
- [x] Parent fee view (portal/parent/fees.astro)
- [ ] Online payment from parent portal — MISSING
- [ ] Payment reminders — PARTIAL
- [ ] Download receipts — MISSING

### Fee-Access Linkage — FUNCTIONAL
- [x] Fee-access rules (fee-access.astro)
- [x] Configurable module blocking

**GAP TASKS:**
1. Add discount types UI
2. Implement fine/penalty rules
3. Build fee waiver workflow
4. Add installment plans
5. Add invoice PDF generation
6. Build bulk invoice generation
7. Add prorated fee calculation
8. Add credit notes
9. Build payment receipt generation
10. Add overpayment/refund management
11. Build finance-reports.astro fully
12. Add outstanding fees with aging
13. Build revenue dashboard
14. Add income/expenditure ledger
15. Add online payment from parent portal
16. Build payment receipt download

---

## Module 6 — HR & Staff Management

### Staff Records — FUNCTIONAL
- [x] Staff profile (staff.astro)
- [x] Employment type, department, designation
- [ ] Document vault — MISSING
- [ ] Staff ID/badge generation — MISSING
- [x] Emergency contacts (schema exists)

### Recruitment — STUB
- [ ] Job posting management (recruitment.astro is STUB)
- [ ] Application tracking (job_applications in schema)
- [ ] Interview scheduling (interviews in schema)
- [ ] Offer letter generation — MISSING
- [ ] Onboarding checklist — MISSING

### Attendance & Leave — PARTIALLY FUNCTIONAL
- [x] Staff clock-in/out (staff-attendance.astro)
- [x] Leave management (leave.astro)
- [x] Leave types and approval workflow
- [ ] Leave balance tracking — PARTIAL
- [ ] Holiday calendar — MISSING
- [x] Attendance reports

### Payroll — FUNCTIONAL
- [x] Salary structure (payroll.astro)
- [x] Payslip generation
- [ ] Tax/pension computation — MISSING
- [ ] Bonus/overtime — MISSING
- [ ] Payroll approval workflow — MISSING
- [ ] Payslip distribution — MISSING
- [ ] Bank transfer file export — MISSING

### Performance — STUB
- [ ] Appraisal cycles (performance.astro is STUB)
- [ ] Self-assessment — MISSING
- [ ] Manager assessment — MISSING
- [ ] KPI tracking — MISSING
- [ ] Performance rating — MISSING

**GAP TASKS:**
1. Build staff document vault
2. Build staff ID/badge generation
3. Build recruitment.astro fully (job postings, applications, interviews)
4. Add offer letter generation
5. Build onboarding checklist
6. Add leave balance tracking UI
7. Add holiday calendar
8. Add tax/pension computation
9. Add bonus/overtime processing
10. Build payroll approval workflow
11. Add payslip distribution (email)
12. Add bank transfer file export
13. Build performance.astro fully (appraisals, KPIs, ratings)

---

## Module 7 — Communication & Engagement

### Messaging — FUNCTIONAL
- [x] Direct messaging (messages.astro)
- [x] Group messaging
- [x] Message threading
- [ ] Read receipts — MISSING
- [ ] File attachments — MISSING
- [ ] Message search — MISSING
- [ ] Message moderation — MISSING

### Announcements — FUNCTIONAL
- [x] School-wide and targeted announcements
- [ ] Scheduled publishing — MISSING
- [x] Pinned announcements
- [ ] Read tracking — MISSING
- [ ] Emergency broadcast — MISSING

### Notifications — FUNCTIONAL
- [x] In-app notifications (notifications.astro)
- [ ] Email notifications — PARTIAL
- [ ] SMS notifications — MISSING
- [ ] Push notifications — MISSING
- [x] Notification templates
- [ ] Notification preferences — MISSING

### Parent Portal — PARTIALLY FUNCTIONAL
- [x] Parent portal exists (portal/parent/)
- [x] Student attendance view
- [x] Fee statement
- [ ] Assignment visibility — MISSING
- [x] Teacher messaging
- [ ] Announcements feed — MISSING
- [ ] Event calendar — MISSING
- [ ] Child document uploads — MISSING

### Student Portal — FUNCTIONAL
- [x] Class schedule and timetable
- [x] Assignment submission
- [x] Quiz access
- [x] Grade view
- [x] Course resources
- [x] Announcements feed

**GAP TASKS:**
1. Add message read receipts
2. Add file attachments to messages
3. Add message search
4. Add scheduled announcement publishing
5. Add announcement read tracking
6. Add emergency broadcast mode
7. Implement SMS notifications
8. Add notification preferences per user
9. Add assignment visibility for parents
10. Add announcements feed to parent portal
11. Add event calendar to parent portal
12. Add child document uploads for parents

---

## Module 8 — Library Management

- [x] Book catalog (library.astro)
- [x] Catalog search
- [ ] Barcode/QR support — MISSING
- [ ] Digital resource linking — MISSING
- [ ] Member management (library-members.astro is STUB)
- [x] Book issue/return (library-loans.astro is STUB but API works)
- [ ] Reservation/hold system — MISSING
- [x] Loan period configuration
- [ ] Fine calculation (library-fines.astro is STUB)
- [ ] Overdue notifications — MISSING
- [ ] Acquisition requests — MISSING
- [ ] Inventory audit — MISSING
- [ ] Library analytics — MISSING
- [ ] Self-service kiosk — MISSING

**GAP TASKS:**
1. Add barcode/QR support
2. Build library-members.astro fully
3. Build library-loans.astro fully
4. Build library-fines.astro fully
5. Add reservation/hold system
6. Add overdue notifications
7. Add acquisition requests
8. Add library analytics
9. Build inventory audit for library

---

## Module 9 — Hostel Management

- [x] Hostel/room setup (hostel.astro)
- [x] Room type configuration
- [ ] Bed allocation (hostel-allocations.astro is STUB)
- [ ] Allocation workflow — MISSING
- [x] Hostel fee integration
- [ ] Room roster — MISSING
- [ ] Check-in/out logging (hostel-checkin.astro is STUB)
- [ ] Visitor log — MISSING
- [ ] Maintenance requests (hostel-maintenance.astro is STUB)
- [ ] Warden assignment — MISSING
- [ ] Evacuation list — MISSING

**GAP TASKS:**
1. Build hostel-allocations.astro fully (bed allocation)
2. Build allocation request/approval workflow
3. Build room roster view
4. Build hostel-checkin.astro fully
5. Add visitor log management
6. Build hostel-maintenance.astro fully
7. Add warden assignment
8. Add evacuation list generation

---

## Module 10 — Transport Management

- [x] Fleet registration (transport.astro)
- [x] Route creation (transport-routes.astro is STUB but API works)
- [ ] Student-to-route assignment (transport-assignments.astro is STUB)
- [ ] Driver assignment — MISSING
- [x] Transport fee integration
- [ ] Daily dispatch logging — MISSING
- [ ] Boarding confirmation — MISSING
- [ ] Route change requests — MISSING
- [ ] Vehicle maintenance log (transport-maintenance.astro is STUB)
- [ ] License expiry alerts — MISSING
- [ ] Transport usage reports — MISSING

**GAP TASKS:**
1. Build transport-routes.astro fully
2. Build transport-assignments.astro fully
3. Build transport-maintenance.astro fully
4. Add daily dispatch logging
5. Add boarding confirmation with parent notification
6. Add route change requests
7. Add license expiry alerts
8. Add transport usage reports

---

## Module 11 — Inventory & Asset Management

- [x] Asset registration (inventory.astro)
- [x] Asset assignment
- [ ] Asset condition tracking — PARTIAL
- [ ] Check-in/check-out log — MISSING
- [x] Consumable stock (stock.astro is STUB)
- [ ] Reorder level alerts — MISSING
- [ ] Purchase requests (schema exists)
- [ ] Supplier management (suppliers.astro is STUB)
- [ ] Asset depreciation — MISSING
- [ ] Inventory audit (inventory-audit.astro is STUB)
- [ ] Asset disposal — MISSING
- [ ] Asset reports — MISSING

**GAP TASKS:**
1. Build stock.astro fully (consumable management)
2. Build suppliers.astro fully
3. Build inventory-audit.astro fully
4. Add asset check-in/check-out log
5. Add reorder level alerts
6. Add asset depreciation tracking
7. Add asset disposal
8. Add asset reports

---

## Module 12 — Events & Calendar

- [x] Event creation (events.astro)
- [x] Event categories
- [ ] Recurring events — MISSING
- [ ] RSVP tracking (rsvp.astro is STUB)
- [ ] Event reminders — MISSING
- [ ] Venue booking (venues.astro is STUB)
- [ ] Calendar views (calendar.astro is STUB)
- [ ] Role-filtered views — MISSING
- [ ] iCal export — MISSING
- [ ] Event media gallery — MISSING

**GAP TASKS:**
1. Build calendar.astro fully (day/week/month views)
2. Build rsvp.astro fully
3. Build venues.astro fully (venue booking)
4. Add recurring event support
5. Add event reminders
6. Add role-filtered calendar views
7. Add iCal export
8. Add event media gallery

---

## Module 13 — Classroom Tools

### Interactive Lessons — STUB
- [ ] Slide-based lesson builder (interactive.astro is STUB)
- [ ] Embedded polls/quizzes — MISSING
- [ ] Student response collection — MISSING
- [ ] Live class mode — MISSING

### Behavior Tracking — STUB
- [ ] Behavior point system (behavior.astro is STUB)
- [ ] Behavior categories — MISSING
- [ ] Per-student behavior log — MISSING
- [ ] Behavior leaderboard — MISSING
- [ ] Behavior report for parents — MISSING
- [ ] Merit/award badges — MISSING

### Seating Plan — STUB
- [ ] Drag-and-drop seating (seating.astro is STUB)
- [ ] Multiple seating variants — MISSING
- [ ] Student photo in seat — MISSING
- [ ] Random assignment — MISSING

### Lesson Planning — STUB
- [ ] Lesson plan templates (lessons.astro is STUB)
- [ ] Learning objectives — MISSING
- [ ] Resource attachment — MISSING
- [ ] Approval workflow — MISSING
- [ ] Lesson plan library — MISSING

**GAP TASKS:**
1. Build interactive.astro fully (lesson builder)
2. Build behavior.astro fully (point system, categories, reports)
3. Build seating.astro fully (drag-and-drop, variants)
4. Build lessons.astro fully (lesson planning, objectives, approval)

---

## Module 14 — Reporting & Analytics

- [x] Analytics dashboard (analytics.astro)
- [x] Pre-built reports (reports.astro)
- [ ] Custom report builder (report-builder.astro is STUB)
- [ ] Scheduled report delivery — MISSING
- [ ] Cross-module data views — MISSING
- [x] KPI cards
- [ ] Data visualization charts — PARTIAL
- [ ] Comparative analytics — MISSING
- [x] Export to CSV/PDF
- [ ] Report access control — MISSING

**GAP TASKS:**
1. Build report-builder.astro fully (drag-and-drop)
2. Add scheduled report delivery
3. Add cross-module data views
4. Add data visualization (charts, heat maps)
5. Add comparative analytics
6. Add report access control by role

---

## Module 15 — IT & System Administration

- [x] User account management (it-admin.astro)
- [x] Module/feature toggle (modules.astro)
- [x] Role customization (roles.astro)
- [ ] SSO configuration — MISSING
- [x] Login activity log
- [ ] Failed login alerts — MISSING
- [ ] Device/session management — MISSING
- [ ] Data backup (backup.astro is STUB)
- [x] System health (system-health.astro is STUB)
- [ ] Maintenance mode — MISSING
- [x] Integration management (integrations.astro is STUB)
- [x] Webhook management (webhooks.astro)

**GAP TASKS:**
1. Add SSO configuration (Google, Microsoft, LDAP)
2. Add failed login alerts
3. Add device/session management
4. Build backup.astro fully
5. Build system-health.astro fully
6. Add maintenance mode
7. Build integrations.astro fully
8. Build security.astro fully

---

## Module 16 — e-Exam & CBT

### Exam Creation — FUNCTIONAL
- [x] Exam builder (cbt.astro)
- [x] Exam types
- [x] Section-based structure
- [x] Scheduling and access windows
- [x] Access modes
- [x] Attempt limits
- [ ] Exam duplication — MISSING
- [x] Draft/published/closed states
- [x] Instructions page

### Question Bank — FUNCTIONAL
- [x] Centralized question bank (question-bank.astro)
- [x] Multiple question types
- [ ] Rich text/media in questions — PARTIAL
- [x] Difficulty tagging
- [x] Topic/subject tagging
- [ ] Bulk import — MISSING
- [ ] Question versioning — MISSING
- [ ] Usage tracking — MISSING
- [ ] Review/approval workflow — MISSING

### Exam Assembly — FUNCTIONAL
- [x] Manual question selection
- [ ] Auto generation by topic/difficulty — MISSING
- [x] Question randomization
- [x] Option shuffling
- [ ] Fixed/randomized pools — MISSING
- [x] Negative marking
- [ ] Passage/reading comprehension — MISSING

### Candidate Management — PARTIALLY FUNCTIONAL
- [x] Candidate registration
- [ ] Bulk import — MISSING
- [ ] Candidate grouping — MISSING
- [x] Access token/PIN
- [ ] Eligibility rules — MISSING
- [ ] Admit card generation — MISSING
- [x] Status tracking

### Exam Delivery — FUNCTIONAL
- [x] Full-screen exam interface
- [x] Tab switch detection
- [x] Full-screen exit detection
- [ ] Browser lockdown — MISSING
- [x] Question navigation panel
- [x] Flag for review
- [x] Answer auto-save
- [x] Countdown timer
- [x] Auto-submission on expiry
- [ ] Session resume — MISSING
- [x] Connection status indicator
- [x] Attempt lock

### Proctoring — PARTIALLY FUNCTIONAL
- [ ] Identity verification (proctoring.astro is STUB)
- [ ] AI face detection — MISSING
- [ ] Webcam monitoring — MISSING
- [ ] Live proctor dashboard — MISSING
- [x] Auto flag system
- [x] Activity log
- [ ] IP logging — MISSING
- [ ] Post-exam integrity report — MISSING

### Grading — FUNCTIONAL
- [x] Auto-grading for objective types
- [ ] Manual grading interface — MISSING
- [ ] Partial marks — MISSING
- [x] Score release control
- [x] Result view per candidate
- [ ] Result notification — MISSING
- [x] Academic result sync

### Analytics — PARTIALLY FUNCTIONAL
- [ ] Exam summary (cbt-results.astro is STUB)
- [ ] Score distribution — MISSING
- [ ] Per-question analytics — MISSING
- [ ] Top/bottom performers — MISSING
- [ ] Proctoring flags summary — MISSING
- [ ] Export — MISSING

### Offline CBT — NOT IMPLEMENTED
- [ ] Offline package — MISSING
- [ ] Local sync — MISSING

**GAP TASKS:**
1. Add exam duplication
2. Add rich text/media in questions
3. Add bulk question import
4. Add question versioning
5. Add question usage tracking
6. Build auto exam generation
7. Add passage/reading comprehension
8. Add bulk candidate import
9. Add candidate grouping
10. Add eligibility rules
11. Build admit card generation
12. Add browser lockdown
13. Add session resume
14. Build proctoring.astro fully (identity, face detection, webcam)
15. Build live proctor dashboard
16. Add IP logging and duplicate detection
17. Build post-exam integrity report
18. Add manual grading interface
19. Add partial marks
20. Add result notifications
21. Build cbt-results.astro fully (analytics, charts)
22. Add score distribution
23. Add per-question analytics
24. Add proctoring flags summary
25. Add export functionality

---

## Platform-Wide Gaps

- [ ] 2FA implementation (schema exists, not enforced)
- [ ] GDPR compliance controls — MISSING
- [ ] Global search across modules — MISSING
- [ ] Audit log viewer UI — MISSING (schema exists)
- [ ] Bulk import/export for all entities — PARTIAL
- [ ] Data export (export.astro is STUB)

---

## Priority Order for Implementation

### HIGH PRIORITY (Core functionality gaps)
1. Module 4: Report cards, transcripts, results analytics
2. Module 6: Recruitment, performance appraisals
3. Module 8: Library loans, members, fines
4. Module 9: Hostel allocations, check-in, maintenance
5. Module 10: Transport routes, assignments, maintenance
6. Module 3: Timetable periods, bell schedules, substitutes
7. Module 13: Behavior, seating, lesson planning
8. Module 16: CBT results analytics, proctoring, manual grading

### MEDIUM PRIORITY (Feature completeness)
9. Module 1: Medical, document vault, ID cards
10. Module 5: Finance reports, invoice PDFs, receipts
11. Module 11: Stock, suppliers, inventory audit
12. Module 12: Calendar, RSVP, venues
13. Module 14: Custom report builder
14. Module 15: Backup, system health, maintenance mode

### LOW PRIORITY (Nice to have)
15. Module 2: Content builder, progress tracking
16. Module 7: SMS, push, message search
17. Platform: 2FA, GDPR, global search
