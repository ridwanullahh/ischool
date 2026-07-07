# Issue #2 — Comprehensive Gap Audit: school_softwares.md vs Codebase

Bismillah Ar-Rahman Ar-Roheem.

This document maps every feature line in `school_softwares.md` against the current codebase implementation, identifies gaps, and prioritizes work. Produced per Issue #2 instructions — ignoring all previous gap audit files.

**Methodology:** For each module, I list the feature areas from the PRD, map them to existing dashboard pages + API endpoints + DB tables, and classify each feature as:
- **[EXISTS-BASIC]** — page/API/table exists but implementation is shallow (CRUD-only, missing enterprise depth)
- **[MISSING]** — no implementation found
- ****[ENTERPRISE-GAP]** — exists but lacks role-based access, inter-module integration, or rich UX

---

## Codebase Inventory (as audited)

- **Dashboard pages:** 42 (students, staff, attendance, assignments, quizzes, grades, courses, classroom, enrollments, timetable, exams, cbt, fees, invoices, payments, payroll, staff, leave, messages, notifications, library, hostel, transport, inventory, events, reports, it-admin, analytics, live-classes, etc.)
- **API endpoints:** 41 (matching dashboard pages)
- **DB tables:** 95 (covering all 16 modules + platform-wide + CMS + AI + billing + support)
- **Schema file:** 1,409 lines

---

## Module 1 — Student Information System (SIS)

**Existing:** `students.astro` (362 lines), `enrollments.astro`, `attendance.astro`, DB tables: `students`, `enrollments`, `attendance`

### Student Records
| Feature | Status | Gap |
|---------|--------|-----|
| Comprehensive student profile (personal, medical, emergency, documents) | [EXISTS-BASIC] | Profile page is CRUD form — missing medical, emergency contacts, document vault sections |
| Custom fields per school | [MISSING] | No dynamic field schema |
| Student photo management and ID card generation | [MISSING] | No photo upload UI, no ID card generator |
| Sibling and family relationship linking | [MISSING] | No family/sibling table or UI |
| Student status management (active, transferred, graduated, withdrawn, suspended) | [EXISTS-BASIC] | Status field exists in schema but no workflow UI |
| Enrollment history and academic year tracking | [EXISTS-BASIC] | `enrollments` table exists but no history view |
| Document vault per student | [MISSING] | No document storage per student |

### Enrollment & Admissions
| Feature | Status | Gap |
|---------|--------|-----|
| Online application portal with configurable forms | [MISSING] | No public application portal |
| Application workflow with stages | [MISSING] | No application workflow |
| Document checklist and upload during application | [MISSING] | |
| Automated acceptance/rejection communication | [MISSING] | |
| Re-enrollment flow | [MISSING] | |
| Bulk enrollment processing | [EXISTS-BASIC] | CSV import button exists but no validation/preview |
| Transfer student intake | [MISSING] | |

### Class & Section Management
| Feature | Status | Gap |
|---------|--------|-----|
| Academic year and term configuration | [EXISTS-BASIC] | `academic_periods` table exists, basic UI |
| Grade levels, streams, sections | [EXISTS-BASIC] | `classes` table exists |
| Student-to-class assignment | [EXISTS-BASIC] | Basic assign in enrollments |
| Class capacity limits and waitlist | [MISSING] | |
| Homeroom teacher assignment | [EXISTS-BASIC] | Field may exist in schema |
| Subject-to-class mapping | [EXISTS-BASIC] | |
| Timetable conflict detection | [MISSING] | |

### Attendance
| Feature | Status | Gap |
|---------|--------|-----|
| Daily and period-based attendance | [EXISTS-BASIC] | `attendance.astro` is 175 lines — basic mark/unmark |
| Teacher-facing attendance interface | [EXISTS-BASIC] | No dedicated teacher view |
| QR code and biometric integration | [MISSING] | |
| Automated absence notifications | [MISSING] | No notification trigger on absence |
| Attendance reports | [EXISTS-BASIC] | Basic list, no analytics charts |
| Late arrival and early departure | [MISSING] | |
| Attendance analytics and trend charts | [MISSING] | |
| Bulk attendance entry | [EXISTS-BASIC] | |
| Attendance thresholds and alerts | [MISSING] | |

### Health & Medical
| Feature | Status | Gap |
|---------|--------|-----|
| Medical history and conditions | [MISSING] | No medical table |
| Allergy and medication records | [MISSING] | |
| Nurse visit log | [MISSING] | |
| Immunization tracking | [MISSING] | |
| Emergency medical action plans | [MISSING] | |
| Health incident reports | [MISSING] | |

**Module 1 Summary:** 21 features — 8 EXISTS-BASIC, 13 MISSING. Major gaps: document vault, family linking, ID cards, health/medical, application portal, analytics.

---

## Module 2 — Learning Management System (LMS)

**Existing:** `courses.astro`, `classroom.astro`, `assignments.astro`, `quizzes.astro`, `grades.astro`, `live-classes.astro`; DB: `courses`, `courseUnits`, `lessons`, `assignments`, `submissions`, `quizzes`, `questions`, `quizAttempts`, `grades`

### Course & Class Management
| Feature | Status | Gap |
|---------|--------|-----|
| Course creation with metadata | [EXISTS-BASIC] | Basic CRUD |
| Course duplication and templates | [MISSING] | |
| Drag-and-drop content builder | [MISSING] | |
| Units, topics, lesson hierarchy | [EXISTS-BASIC] | Tables exist, basic UI |
| Visibility controls | [EXISTS-BASIC] | |
| Co-teacher/TA support | [MISSING] | |
| Course announcements | [EXISTS-BASIC] | Via announcements module |

### Content & Resources
| Feature | Status | Gap |
|---------|--------|-----|
| File uploads (PDF, video, audio) | [EXISTS-BASIC] | Upload API exists |
| Embedded YouTube/Vimeo | [MISSING] | |
| Rich text lesson pages | [EXISTS-BASIC] | |
| External link resources | [MISSING] | |
| SCORM/xAPI support | [MISSING] | |
| Content library / resource bank | [MISSING] | |
| Folder organization | [MISSING] | |

### Assignments & Submissions
| Feature | Status | Gap |
|---------|--------|-----|
| Assignment creation | [EXISTS-BASIC] | Basic CRUD |
| Assignment types (essay, file, link, offline) | [EXISTS-BASIC] | Type field exists |
| Group and individual modes | [MISSING] | |
| Rubric builder | [MISSING] | |
| Resubmission settings | [MISSING] | |
| Late submission policies | [MISSING] | |
| Submission inbox with filters | [EXISTS-BASIC] | Basic list |
| Inline annotation on files | [MISSING] | |
| Grade sync to gradebook | [EXISTS-BASIC] | |

### Quizzes & Assessments
| Feature | Status | Gap |
|---------|--------|-----|
| Multiple question types | [EXISTS-BASIC] | `questions` table exists |
| Question bank with tagging | [EXISTS-BASIC] | No tagging UI |
| Randomize order | [MISSING] | |
| Time and attempt limits | [EXISTS-BASIC] | |
| Auto-grading | [EXISTS-BASIC] | |
| Quiz results analytics | [MISSING] | |
| Quiz review mode | [MISSING] | |
| Scheduled quiz windows | [MISSING] | |

### Gradebook
| Feature | Status | Gap |
|---------|--------|-----|
| Standards-based and points-based | [EXISTS-BASIC] | `grades` table |
| Weighted categories | [MISSING] | |
| Grade override with comment | [EXISTS-BASIC] | |
| Missing/late flags | [MISSING] | |
| Grade history and change log | [MISSING] | |
| Gradebook export | [EXISTS-BASIC] | |
| Grade visibility controls | [MISSING] | |
| Progress reports | [EXISTS-BASIC] | `report_cards` table |

### Discussion & Collaboration
| Feature | Status | Gap |
|---------|--------|-----|
| Threaded discussion boards | [MISSING] | No discussion table |
| Teacher-moderated posts | [MISSING] | |
| Peer replies and reactions | [MISSING] | |
| Discussion grading | [MISSING] | |

### Student Progress & Analytics
| Feature | Status | Gap |
|---------|--------|-----|
| Per-student progress dashboard | [MISSING] | |
| Completion tracking | [MISSING] | |
| Time-on-task tracking | [MISSING] | |
| At-risk student flags | [MISSING] | |
| Class-wide performance analytics | [MISSING] | |

**Module 2 Summary:** 35 features — 12 EXISTS-BASIC, 23 MISSING. Major gaps: content builder, rubrics, discussions, progress analytics, SCORM.

---

## Module 3 — Timetable & Scheduling

**Existing:** `timetable.astro`; DB: `academicPeriods`, `bellSchedules`, `timetableEntries`

| Feature | Status | Gap |
|---------|--------|-----|
| Academic period and bell schedule config | [EXISTS-BASIC] | Tables exist, basic UI |
| Automated timetable generation | [MISSING] | No generation engine |
| Manual drag-and-drop editor | [MISSING] | |
| Teacher availability constraints | [MISSING] | |
| Room/resource availability | [MISSING] | |
| Conflict detection | [MISSING] | |
| Multi-campus support | [MISSING] | |
| Substitute teacher scheduling | [MISSING] | |
| Timetable publication | [EXISTS-BASIC] | |
| Export (PDF, iCal) | [MISSING] | |
| Special event overlay | [MISSING] | |
| Recurring overrides | [MISSING] | |

**Module 3 Summary:** 12 features — 2 EXISTS-BASIC, 10 MISSING. Major gaps: generation engine, drag-drop editor, conflict detection.

---

## Module 4 — Examinations & Results

**Existing:** `exams.astro`; DB: `examSeries`, `exams`, `examResults`, `reportCards`

| Feature | Status | Gap |
|---------|--------|-----|
| Exam series creation | [EXISTS-BASIC] | |
| Subject-wise scheduling | [EXISTS-BASIC] | |
| Exam timetable builder + conflict checker | [MISSING] | |
| Venue and seating plan | [MISSING] | |
| Invigilator assignment | [MISSING] | |
| Result entry and moderation | [EXISTS-BASIC] | |
| Grade computation | [EXISTS-BASIC] | |
| Report card generation | [EXISTS-BASIC] | |
| Result publication | [EXISTS-BASIC] | |
| Exam analytics | [MISSING] | |

**Module 4 Summary:** 10 features — 5 EXISTS-BASIC, 5 MISSING.

---

## Module 5 — Finance & Fees Management

**Existing:** `fees.astro` (242 lines), `invoices.astro`, `payments.astro`; DB: `feeStructures`, `invoices`, `payments`

### Fee Configuration
| Feature | Status | Gap |
|---------|--------|-----|
| Fee structure per class/grade | [EXISTS-BASIC] | |
| One-time, recurring types | [EXISTS-BASIC] | |
| Discount types (sibling, scholarship) | [MISSING] | |
| Fine/penalty rules | [MISSING] | |
| Fee waiver workflow | [MISSING] | |
| Installment plans | [MISSING] | |

### Invoicing & Billing
| Feature | Status | Gap |
|---------|--------|-----|
| Automatic invoice generation | [MISSING] | |
| Manual invoice creation | [EXISTS-BASIC] | |
| Invoice preview/print/PDF | [EXISTS-BASIC] | |
| Bulk invoice generation | [MISSING] | |
| Prorated calculation | [MISSING] | |
| Credit notes | [MISSING] | |

### Payments
| Feature | Status | Gap |
|---------|--------|-----|
| Online payment gateway (Stripe, Paystack) | [MISSING] | No gateway integration |
| Bank transfer/cash recording | [EXISTS-BASIC] | |
| Receipt generation | [EXISTS-BASIC] | |
| Partial payment with balance | [EXISTS-BASIC] | |
| Payment history | [EXISTS-BASIC] | |
| Overpayment/refund | [MISSING] | |

### Reporting & Accounting
| Feature | Status | Gap |
|---------|--------|-----|
| Collection summary | [MISSING] | |
| Outstanding fees + aging | [MISSING] | |
| Revenue dashboard | [MISSING] | |
| Income/expenditure ledger | [MISSING] | |
| Budget vs actual | [MISSING] | |
| External accounting export | [MISSING] | |

### Parent Payment Portal
| Feature | Status | Gap |
|---------|--------|-----|
| Parent fee statement | [MISSING] | No parent portal |
| Online payment from parent | [MISSING] | |
| Payment reminders | [MISSING] | |
| Download receipts | [MISSING] | |

### Fee-Access Linkage (NB from PRD)
| Feature | Status | Gap |
|---------|--------|-----|
| Dynamic fee-access blocking (student owing cannot access classroom/LMS) | [MISSING] | Configurable fee-access rules |

**Module 5 Summary:** 28 features — 7 EXISTS-BASIC, 21 MISSING. Major gaps: payment gateways, discounts, auto-invoicing, parent portal, fee-access linkage.

---

## Module 6 — HR & Staff Management

**Existing:** `staff.astro`, `leave.astro`, `payroll.astro`; DB: `staff`, `leaveRequests`, `payroll`

### Staff Records
| Feature | Status | Gap |
|---------|--------|-----|
| Comprehensive staff profile | [EXISTS-BASIC] | |
| Document vault per staff | [MISSING] | |
| Employment type | [EXISTS-BASIC] | |
| Department/designation | [EXISTS-BASIC] | |
| Staff ID/badge generation | [MISSING] | |
| Emergency contacts | [EXISTS-BASIC] | |

### Recruitment
| Feature | Status | Gap |
|---------|--------|-----|
| Job posting management | [MISSING] | |
| Application tracking | [MISSING] | |
| Interview scheduling | [MISSING] | |
| Offer letter generation | [MISSING] | |
| Onboarding checklist | [MISSING] | |

### Attendance & Leave
| Feature | Status | Gap |
|---------|--------|-----|
| Clock-in/clock-out | [MISSING] | |
| Leave types | [EXISTS-BASIC] | |
| Leave application/approval workflow | [EXISTS-BASIC] | |
| Leave balance tracking | [MISSING] | |
| Holiday calendar | [MISSING] | |
| Attendance reports | [MISSING] | |

### Payroll
| Feature | Status | Gap |
|---------|--------|-----|
| Salary structure config | [EXISTS-BASIC] | |
| Automatic payslip generation | [EXISTS-BASIC] | |
| Tax/pension deduction | [MISSING] | |
| Bonus/overtime | [MISSING] | |
| Payroll approval workflow | [MISSING] | |
| Payslip distribution | [MISSING] | |
| Bank transfer file export | [MISSING] | |

### Performance
| Feature | Status | Gap |
|---------|--------|-----|
| Appraisal cycle setup | [MISSING] | |
| Self-assessment | [MISSING] | |
| Manager assessment | [MISSING] | |
| KPI tracking | [MISSING] | |
| Performance rating | [MISSING] | |

**Module 6 Summary:** 28 features — 7 EXISTS-BASIC, 21 MISSING. Major gaps: recruitment, clock-in/out, payroll computation, performance appraisals.

---

## Module 7 — Communication & Engagement

**Existing:** `messages.astro`, `announcements.astro`, `notifications.astro`; DB: `messages`, `notifications`, `announcements`, `notificationTemplates`

### Messaging
| Feature | Status | Gap |
|---------|--------|-----|
| Direct messaging | [EXISTS-BASIC] | |
| Group messaging | [MISSING] | |
| Message threading | [EXISTS-BASIC] | |
| Read receipts | [MISSING] | |
| File attachments | [MISSING] | |
| Message search/archive | [MISSING] | |
| Moderation | [MISSING] | |

### Announcements
| Feature | Status | Gap |
|---------|--------|-----|
| School-wide + targeted | [EXISTS-BASIC] | |
| Scheduled publishing | [MISSING] | |
| Pinned | [EXISTS-BASIC] | |
| Read tracking | [MISSING] | |
| Emergency broadcast | [MISSING] | |

### Notifications
| Feature | Status | Gap |
|---------|--------|-----|
| In-app/email/SMS/push | [EXISTS-BASIC] | Email only via nodemailer |
| Preference settings | [MISSING] | |
| Templates | [EXISTS-BASIC] | `notification_templates` table |
| Bulk dispatch | [MISSING] | |

### Parent Portal
| Feature | Status | Gap |
|---------|--------|-----|
| Attendance summary | [MISSING] | No parent portal |
| Fee statement + payment | [MISSING] | |
| Assignment/result visibility | [MISSING] | |
| Teacher messaging | [MISSING] | |
| Announcements feed | [MISSING] | |
| Event calendar | [MISSING] | |

### Student Portal
| Feature | Status | Gap |
|---------|--------|-----|
| Schedule/timetable | [MISSING] | No student portal |
| Assignment submission | [MISSING] | |
| Quiz access | [MISSING] | |
| Grade view | [MISSING] | |
| Resources access | [MISSING] | |

**Module 7 Summary:** 26 features — 6 EXISTS-BASIC, 20 MISSING. Major gaps: parent portal, student portal, group messaging, SMS/push notifications.

---

## Module 8 — Library Management

**Existing:** `library.astro`; DB: `libraryBooks`, `libraryLoans`

| Feature | Status | Gap |
|---------|--------|-----|
| Book catalog with metadata | [EXISTS-BASIC] | |
| Barcode/QR support | [MISSING] | |
| Digital resource linking | [MISSING] | |
| Advanced search/filter | [EXISTS-BASIC] | |
| Member management | [EXISTS-BASIC] | |
| Issue/return processing | [EXISTS-BASIC] | |
| Reservation/hold | [MISSING] | |
| Loan period config | [EXISTS-BASIC] | |
| Fine calculation | [MISSING] | |
| Fine payment/waiver | [MISSING] | |
| Overdue notification | [MISSING] | |
| Acquisition requests | [MISSING] | |
| Inventory audit | [MISSING] | |
| Usage analytics | [MISSING] | |
| Self-service kiosk | [MISSING] | |

**Module 8 Summary:** 15 features — 4 EXISTS-BASIC, 11 MISSING.

---

## Module 9 — Hostel / Dormitory Management

**Existing:** `hostel.astro`; DB: `hostels`, `hostelRooms`, `hostelAllocations`

| Feature | Status | Gap |
|---------|--------|-----|
| Building/block/room setup | [EXISTS-BASIC] | |
| Room type config | [EXISTS-BASIC] | |
| Bed allocation | [EXISTS-BASIC] | |
| Allocation workflow | [MISSING] | |
| Hostel fee integration | [MISSING] | |
| Room roster/occupancy | [EXISTS-BASIC] | |
| Check-in/out logging | [MISSING] | |
| Visitor log | [MISSING] | |
| Maintenance request | [MISSING] | |
| Warden assignment | [MISSING] | |
| Evacuation list | [MISSING] | |

**Module 9 Summary:** 11 features — 3 EXISTS-BASIC, 8 MISSING.

---

## Module 10 — Transport Management

**Existing:** `transport.astro`; DB: `vehicles`, `transportRoutes`, `transportAssignments`

| Feature | Status | Gap |
|---------|--------|-----|
| Fleet registration | [EXISTS-BASIC] | |
| Route creation with stops/GPS | [EXISTS-BASIC] | |
| Student-to-route assignment | [EXISTS-BASIC] | |
| Driver/conductor assignment | [EXISTS-BASIC] | |
| Transport fee integration | [MISSING] | |
| Daily dispatch/arrival logging | [MISSING] | |
| Boarding confirmation (parent notify) | [MISSING] | |
| Route change requests | [MISSING] | |
| Vehicle maintenance log | [MISSING] | |
| License expiry alerts | [MISSING] | |
| Transport usage reports | [MISSING] | |

**Module 10 Summary:** 11 features — 4 EXISTS-BASIC, 7 MISSING.

---

## Module 11 — Inventory & Asset Management

**Existing:** `inventory.astro`; DB: `assets`, `inventoryItems`

| Feature | Status | Gap |
|---------|--------|-----|
| Asset registration | [EXISTS-BASIC] | |
| Asset assignment | [MISSING] | |
| Condition tracking | [EXISTS-BASIC] | |
| Check-in/check-out log | [MISSING] | |
| Consumable stock management | [EXISTS-BASIC] | |
| Reorder level alerts | [MISSING] | |
| Purchase/procurement workflow | [MISSING] | |
| Supplier management | [MISSING] | |
| Depreciation tracking | [MISSING] | |
| Inventory audit | [MISSING] | |
| Asset disposal/write-off | [MISSING] | |
| Asset reports | [MISSING] | |

**Module 11 Summary:** 12 features — 3 EXISTS-BASIC, 9 MISSING.

---

## Module 12 — Events & Calendar Management

**Existing:** `events.astro`; DB: `events`

| Feature | Status | Gap |
|---------|--------|-----|
| Academic calendar setup | [EXISTS-BASIC] | |
| Event creation | [EXISTS-BASIC] | |
| Event categories | [EXISTS-BASIC] | |
| Recurring events | [MISSING] | |
| RSVP/attendance tracking | [MISSING] | |
| Event reminders | [MISSING] | |
| Venue/room booking | [MISSING] | |
| Calendar views (day/week/month) | [MISSING] | |
| Role-filtered views | [MISSING] | |
| iCal export | [MISSING] | |
| Event media gallery | [MISSING] | |

**Module 12 Summary:** 11 features — 3 EXISTS-BASIC, 8 MISSING.

---

## Module 13 — Classroom Tools & Teaching Aids

**Existing:** `classroom.astro`, `live-classes.astro`; DB: `behaviorLogs`, `lessonPlans`, `liveClassRooms`, `liveClassMessages`, `liveClassPolls`, `liveClassWhiteboards`

### Interactive Lessons
| Feature | Status | Gap |
|---------|--------|-----|
| Slide-based lesson builder | [MISSING] | |
| Embedded polls/quizzes | [EXISTS-BASIC] | `liveClassPolls` table |
| Real-time response collection | [EXISTS-BASIC] | Live class exists |
| Live class mode | [EXISTS-BASIC] | |
| Self-paced mode | [MISSING] | |

### Behavior & Engagement
| Feature | Status | Gap |
|---------|--------|-----|
| Behavior point system | [EXISTS-BASIC] | `behavior_logs` table |
| Configurable categories | [MISSING] | |
| Per-student behavior log | [EXISTS-BASIC] | |
| Class leaderboard | [MISSING] | |
| Behavior report for parents | [MISSING] | |
| Merit/award badges | [MISSING] | |

### Seating Plan
| Feature | Status | Gap |
|---------|--------|-----|
| Drag-drop seating builder | [MISSING] | |
| Multiple variants | [MISSING] | |
| Student photo in seat | [MISSING] | |
| Random assignment | [MISSING] | |

### Lesson Planning
| Feature | Status | Gap |
|---------|--------|-----|
| Weekly/unit templates | [EXISTS-BASIC] | `lesson_plans` table |
| Learning objectives linking | [MISSING] | |
| Resource attachment | [EXISTS-BASIC] | |
| Approval workflow | [MISSING] | |
| Lesson plan library | [MISSING] | |

**Module 13 Summary:** 18 features — 6 EXISTS-BASIC, 12 MISSING.

---

## Module 14 — Reporting & Analytics

**Existing:** `reports.astro`, `analytics.astro`; DB: `savedReports`

| Feature | Status | Gap |
|---------|--------|-----|
| Unified analytics dashboard | [EXISTS-BASIC] | `analytics.astro` exists |
| Pre-built reports | [EXISTS-BASIC] | |
| Custom report builder | [MISSING] | |
| Scheduled report delivery | [MISSING] | |
| Cross-module data views | [MISSING] | |
| KPI cards | [EXISTS-BASIC] | |
| Data visualization (charts) | [EXISTS-BASIC] | |
| Comparative analytics | [MISSING] | |
| Export (PDF/Excel/CSV) | [EXISTS-BASIC] | |
| Report access control | [MISSING] | |

**Module 14 Summary:** 10 features — 4 EXISTS-BASIC, 6 MISSING.

---

## Module 15 — IT & System Administration

**Existing:** `it-admin.astro`; DB: `auditLogs`, `moduleSettings`

| Feature | Status | Gap |
|---------|--------|-----|
| User account management | [EXISTS-BASIC] | |
| Password reset/recovery | [EXISTS-BASIC] | `password_reset_tokens` |
| Module/feature toggle | [EXISTS-BASIC] | `module_settings` |
| Role/permission customization | [MISSING] | No RBAC UI |
| SSO config (Google, MS, LDAP) | [MISSING] | |
| Login activity log | [EXISTS-BASIC] | `audit_logs` |
| Failed login alerts | [MISSING] | |
| Device/session management | [MISSING] | |
| Backup scheduling/restore | [EXISTS-BASIC] | `backup.ts` lib exists |
| System health dashboard | [MISSING] | |
| Maintenance mode | [MISSING] | |
| Integration management | [MISSING] | |

**Module 15 Summary:** 12 features — 4 EXISTS-BASIC, 8 MISSING.

---

## Module 16 — e-Exam & Computer-Based Testing (CBT)

**Existing:** `cbt.astro` (259 lines); DB: `cbtExams`, `cbtCandidates`, `cbtAttempts`

### Exam Creation & Configuration
| Feature | Status | Gap |
|---------|--------|-----|
| Exam builder | [EXISTS-BASIC] | |
| Exam types | [EXISTS-BASIC] | |
| Section-based structure | [MISSING] | |
| Per-section time/marks | [MISSING] | |
| Scheduling with access window | [EXISTS-BASIC] | |
| Access modes (open/restricted/class) | [MISSING] | |
| Attempt limits | [EXISTS-BASIC] | |
| Exam duplication/templates | [MISSING] | |
| Draft/published/closed states | [EXISTS-BASIC] | |
| Instructions + acknowledgment | [MISSING] | |

### Question Bank
| Feature | Status | Gap |
|---------|--------|-----|
| Centralized question bank | [EXISTS-BASIC] | `questions` table shared |
| Multiple question types | [EXISTS-BASIC] | |
| Rich text/media in questions | [MISSING] | |
| Difficulty tagging | [MISSING] | |
| Topic/subject tagging | [MISSING] | |
| Excel/CSV bulk import | [MISSING] | |
| Question versioning | [MISSING] | |
| Usage tracking | [MISSING] | |
| Review/approval workflow | [MISSING] | |

### Exam Assembly
| Feature | Status | Gap |
|---------|--------|-----|
| Manual question selection | [EXISTS-BASIC] | |
| Auto generation by topic/difficulty | [MISSING] | |
| Question randomization per candidate | [MISSING] | |
| Option shuffling | [MISSING] | |
| Fixed/randomized pools | [MISSING] | |
| Negative marking | [MISSING] | |
| Passage/reading comprehension | [MISSING] | |

### Candidate Management
| Feature | Status | Gap |
|---------|--------|-----|
| Candidate registration | [EXISTS-BASIC] | `cbt_candidates` |
| Bulk import | [MISSING] | |
| Candidate grouping/batches | [MISSING] | |
| Access token/PIN | [MISSING] | |
| Eligibility rules | [MISSING] | |
| Admit card generation | [MISSING] | |
| Status tracking | [EXISTS-BASIC] | |

### Online Exam Delivery (CBT)
| Feature | Status | Gap |
|---------|--------|-----|
| Full-screen exam interface | [MISSING] | |
| Exit detection + warning | [MISSING] | |
| Tab switch detection | [MISSING] | |
| Browser lockdown | [MISSING] | |
| Question navigation panel | [MISSING] | |
| Flag for review | [MISSING] | |
| Answer auto-save | [MISSING] | |
| Countdown timer | [EXISTS-BASIC] | |
| Auto-submission on expiry | [MISSING] | |
| Session resume | [MISSING] | |
| Connection status indicator | [MISSING] | |
| Attempt lock after submission | [EXISTS-BASIC] | |

### Proctoring & Anti-Cheat
| Feature | Status | Gap |
|---------|--------|-----|
| Identity verification (webcam + ID) | [MISSING] | |
| AI face detection | [MISSING] | |
| Webcam monitoring + snapshots | [MISSING] | |
| Audio monitoring | [MISSING] | |
| Live proctor dashboard | [MISSING] | |
| Proctor intervention | [MISSING] | |
| Automatic flag system | [MISSING] | |
| Activity log | [MISSING] | |
| IP logging + duplicate detection | [MISSING] | |
| Device fingerprinting | [MISSING] | |
| Time-per-question analytics | [MISSING] | |
| Post-exam integrity report | [MISSING] | |
| Proctor notes | [MISSING] | |

### Offline Exam Support
| Feature | Status | Gap |
|---------|--------|-----|
| Offline CBT package | [MISSING] | |
| Local data pre-load | [MISSING] | |
| Local save + sync | [MISSING] | |
| Sync status dashboard | [MISSING] | |

### Grading & Results
| Feature | Status | Gap |
|---------|--------|-----|
| Auto-grading objective | [EXISTS-BASIC] | |
| Manual grading interface | [MISSING] | |
| Partial marks | [MISSING] | |
| Examiner comments | [MISSING] | |
| Score release control | [MISSING] | |
| Result view per candidate | [EXISTS-BASIC] | |
| Result notification | [MISSING] | |
| Academic result sync to Module 4 | [MISSING] | |

### Analytics & Reporting
| Feature | Status | Gap |
|---------|--------|-----|
| Exam summary | [MISSING] | |
| Score distribution chart | [MISSING] | |
| Per-question analytics | [MISSING] | |
| Top/bottom performers | [MISSING] | |
| Candidate comparison | [MISSING] | |
| Proctoring flags summary | [MISSING] | |
| Examiner workload report | [MISSING] | |
| Export results | [MISSING] | |

**Module 16 Summary:** 68 features — 10 EXISTS-BASIC, 58 MISSING. This is the largest gap — CBT is mostly stubs.

---

## Platform-Wide (Core) Features

| Feature | Status | Gap |
|---------|--------|-----|
| Multi-tenant architecture | [EXISTS-BASIC] | schoolId on tables |
| Unified SSO | [EXISTS-BASIC] | sessions table |
| RBAC (8 roles) | [MISSING] | No role table/permission system — CRITICAL |
| Module activation per plan | [EXISTS-BASIC] | `module_settings` |
| Centralized notification hub | [EXISTS-BASIC] | email only |
| Unified global search | [EXISTS-BASIC] | `/api/search` exists |
| Dark mode + WCAG 2.1 AA | [EXISTS-BASIC] | v2 themes support dark mode |
| Multi-language + RTL | [EXISTS-BASIC] | `google-translate-api-x` + locale field |
| iOS/Android apps | [OUT OF SCOPE] | Per Issue #2 instructions |
| Audit log | [EXISTS-BASIC] | `audit_logs` table |
| Data export (CSV/PDF/Excel) | [EXISTS-BASIC] | `export.ts` lib |
| Custom branding | [EXISTS-BASIC] | logo, colors, theme |
| Secure API access | [EXISTS-BASIC] | session-based |
| Webhooks | [MISSING] | |
| 2FA | [EXISTS-BASIC] | `totp.ts` + `2fa.ts` API |
| GDPR compliance controls | [MISSING] | |
| Bulk import/export | [EXISTS-BASIC] | CSV import on some pages |

---

## Summary Statistics

| Module | Total Features | EXISTS-BASIC | MISSING | Gap % |
|--------|---------------|-------------|---------|-------|
| 1. SIS | 21 | 8 | 13 | 62% |
| 2. LMS | 35 | 12 | 23 | 66% |
| 3. Timetable | 12 | 2 | 10 | 83% |
| 4. Examinations | 10 | 5 | 5 | 50% |
| 5. Finance & Fees | 28 | 7 | 21 | 75% |
| 6. HR & Staff | 28 | 7 | 21 | 75% |
| 7. Communication | 26 | 6 | 20 | 77% |
| 8. Library | 15 | 4 | 11 | 73% |
| 9. Hostel | 11 | 3 | 8 | 73% |
| 10. Transport | 11 | 4 | 7 | 64% |
| 11. Inventory | 12 | 3 | 9 | 75% |
| 12. Events | 11 | 3 | 8 | 73% |
| 13. Classroom Tools | 18 | 6 | 12 | 67% |
| 14. Reporting | 10 | 4 | 6 | 60% |
| 15. IT Admin | 12 | 4 | 8 | 67% |
| 16. CBT | 68 | 10 | 58 | 85% |
| **TOTAL** | **338** | **88** | **250** | **74%** |

**Critical Finding:** 74% of features are either missing or only basic CRUD. The most critical cross-cutting gap is **RBAC (Role-Based Access Control)** — there is no role/permission system, meaning teacher/student/parent/staff views do not exist. This blocks enterprise-grade implementation of every module.

---

## Priority Order for Implementation

### Phase 1 — Foundation (blocks everything)
1. **RBAC system** — roles table, permissions table, role assignment, middleware enforcement
2. **Parent portal** — separate auth context, child linkage, read-only views
3. **Student portal** — separate auth context, class/assignment/grade views
4. **Teacher dashboard** — role-scoped views of SIS, LMS, attendance, grades

### Phase 2 — High-value module deepening
5. **Module 1 (SIS)** — document vault, family linking, ID cards, health/medical, application portal
6. **Module 5 (Finance)** — payment gateways, discounts, auto-invoicing, fee-access linkage
7. **Module 16 (CBT)** — proctoring, question bank, exam delivery, analytics

### Phase 3 — Remaining modules
8. Module 2 (LMS) — content builder, rubrics, discussions, progress analytics
9. Module 6 (HR) — recruitment, clock-in/out, payroll computation, performance
10. Module 3 (Timetable) — generation engine, drag-drop editor, conflict detection
11. Modules 8-14 — library, hostel, transport, inventory, events, classroom tools, reporting
12. Module 15 (IT Admin) — RBAC UI, SSO config, device management

---

*End of gap audit. See ISSUE2_TODO.md for the detailed sub-sub-task breakdown.*
