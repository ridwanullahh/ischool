بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُوْلُ اللهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ الْعَلِيِّ الْعَظِيْمِ حَسْبِيَ اللهُ لَا إِلٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيْمِ سُبْحَانَ اللهِ وَالْحَمْدُ لِلّٰهِ وَلَا إِلٰهَ إِلَّا اللهُ وَاللهُ أَكْبَرُ

---

# All-in-One School SaaS Platform

## Product Requirements Document (PRD) — Features Specification

**Version:** 1.0 **Scope:** All modules excluding School Website CMS (already built) **Architecture:** Modular, multi-product SaaS — each module works independently or fully integrated

---

## Platform-Wide (Core) Features

- Multi-tenant architecture with school-level data isolation
- Unified single sign-on (SSO) across all modules
- Role-based access control (RBAC): Super Admin, School Admin, Teacher, Student, Parent, Staff, Accountant, Librarian, IT Admin
- Module activation/deactivation per school plan
- Centralized notification hub (in-app, email, SMS, push)
- Unified global search across all active modules
- Dark mode and accessibility (WCAG 2.1 AA) support
- Multi-language and RTL support (more note on this, the; this should not be for all the dashboard area, but make it general for all the entire platform, including each public area's theme - you have to update each theme to include support for this and the placement varies from theme to theme as applied. Also, generally you should add more important things including this and other you've discover to the theme philosphy related doc file for other developer to ensure more accurate and improved informations for they can use the refernce to implement theme(s) eaily) Also, the multilingual implementation, use the approach that was stated in the multilingual_guide md file check and use the approach.
- Dedicated iOS and Android apps (this is out scope for this current work, not your work for now, but just ensure the implementation use is easier for the upcoming development of those mobile native apps, bi'idniLah)
- Audit log and activity trail across all modules
- Data export (CSV, PDF, Excel) across all modules
- Custom branding per school (logo, colors, domain - this as already been done, you can only improve on it as neccessary)
- Secure API access for third-party integrations
- Webhooks for event-driven automation
- Two-factor authentication (2FA) for all user roles (should be implemented but made optional to use) 
- GDPR / data privacy compliance controls
- Bulk import/export via CSV or Excel for all major entities

---

## Module 1 — Student Information System (SIS)

_Rivals: PowerSchool, Infinite Campus, Classter_

### Student Records

- Comprehensive student profile: personal, medical, emergency contacts, documents
- Custom fields per school for student profiles
- Student photo management and ID card generation
- Sibling and family relationship linking
- Student status management: active, transferred, graduated, withdrawn, suspended
- Enrollment history and academic year tracking
- Document vault per student (birth cert, passport, health records)

### Enrollment & Admissions

- Online application portal with configurable forms
- Application workflow with stages: submitted, reviewed, accepted, rejected, waitlisted
- Document checklist and upload during application
- Automated acceptance/rejection communication
- Re-enrollment flow for returning students
- Bulk enrollment processing
- Transfer student intake with record import

### Class & Section Management

- Academic year and term/semester configuration
- Grade levels, streams, and section creation
- Student-to-class assignment and reassignment
- Class capacity limits and waitlist management
- Homeroom teacher assignment
- Subject-to-class mapping
- Timetable conflict detection

### Attendance

- Daily and period-based attendance marking
- Teacher-facing attendance interface (web and mobile)
- QR code and biometric attendance integration support
- Automated absence notifications to parents
- Attendance reports: by student, class, date range
- Late arrival and early departure logging
- Attendance analytics and trend charts
- Bulk attendance entry and corrections
- Attendance thresholds and alert rules

### Health & Medical

- Student medical history and conditions log
- Allergy and medication records
- Nurse visit log with notes
- Immunization tracking
- Emergency medical action plans
- Health incident reports

---

## Module 2 — Learning Management System (LMS)

_Rivals: Google Classroom, Canvas, Moodle, Schoology_

### Course & Class Management

- Course creation with title, description, subject, grade level
- Course duplication and templates
- Drag-and-drop course content builder
- Units, topics, and lesson hierarchy
- Course visibility controls (published, draft, archived)
- Co-teacher and teaching assistant support
- Course announcements and pinned notices

### Content & Resources

- File uploads: PDF, video, audio, image, documents
- Embedded YouTube/Vimeo video support
- Rich text lesson pages with inline media
- External link resources
- SCORM/xAPI content package support
- Content library and reusable resource bank
- Folder organization for course materials

### Assignments & Submissions

- Assignment creation with title, instructions, attachments, due dates
- Assignment types: essay, file upload, link submission, offline task
- Group and individual assignment modes
- Rubric builder and rubric-based grading
- Assignment resubmission settings
- Late submission policies (accept, block, penalize)
- Submission inbox with status filters (submitted, graded, late, missing)
- Inline annotation and comment on submitted files
- Assignment grade sync to gradebook

### Quizzes & Assessments

- Question types: multiple choice, true/false, short answer, essay, fill-in-the-blank, matching
- Question bank with tagging and search
- Randomize question and answer order
- Time limits and attempt limits
- Auto-grading for objective question types
- Quiz results analytics per question and per student
- Quiz review mode for students post-submission
- Scheduled quiz windows

### Gradebook

- Standards-based and points-based grading
- Weighted categories (assignments, quizzes, exams, participation)
- Grade override with comment
- Missing and late grade flags
- Grade history and change log
- Gradebook export (Excel, PDF)
- Grade visibility controls for students and parents
- Progress reports per term/semester

### Discussion & Collaboration

- Threaded discussion boards per course
- Teacher-moderated posts
- Student peer replies and reactions
- Announcement-only mode
- Discussion grading support
- Inline rich text in posts

### Student Progress & Analytics

- Per-student progress dashboard
- Completion tracking per lesson and unit
- Time-on-task tracking
- Learning gap identification
- At-risk student flags based on activity and grades
- Class-wide performance analytics

---

## Module 3 — Timetable & Scheduling

_Rivals: Untis, FET, aSc Timetables_

- Academic period and bell schedule configuration
- Automated timetable generation engine
- Manual drag-and-drop timetable editor
- Teacher availability and constraint settings
- Room and resource availability management
- Subject-period allocation rules
- Conflict detection and resolution alerts
- Multi-campus timetable support
- Substitute teacher scheduling
- Timetable publication to student and teacher dashboards
- Timetable export (PDF, iCal)
- Special event and exam schedule overlay
- Recurring and one-off schedule overrides

---

## Module 4 — Examinations & Results

_Rivals: ExamSoft, Edulastic, school ERP exam modules_

### Exam Planning 

- Exam series creation (midterm, final, mock, etc.)
- Subject-wise exam scheduling per class
- Exam timetable builder and conflict checker
- Exam venue and seating plan management
- Invigilator assignment per exam session
- Admit card / hall ticket generation per student
- Student exam schedule view

### Mark Entry & Processing

- Mark entry interface per subject and class
- Grade scale configuration (letters, percentages, GPA, custom)
- Subject weight and total marks configuration
- Automatic grade calculation
- Grade moderation and approval workflow
- Bulk mark import via Excel
- Absent and withheld result handling

### Report Cards & Transcripts

- Configurable report card templates (by level, term, year)
- Class teacher and subject teacher comments
- Behavioral and affective domain ratings
- Principal remarks
- Ranking: class rank, subject rank, overall rank
- Report card print and PDF generation
- Bulk report card generation and download
- Official transcript generation with school seal/stamp
- Promotion and retention decision tools

### Results Analytics

- Class performance summary per subject
- Student performance trend across terms
- Top/bottom performer identification
- Subject difficulty analytics
- Teacher performance correlation (optional)
- Board/external exam result import and comparison


---

## Module 5 — Finance & Fees Management

_Rivals: QuickBooks for Education, School Fee software, Tally_

### Fee Configuration

- Fee structure setup per class, grade, category
- One-time, recurring (monthly, termly, annual) fee types
- Discount types: sibling, scholarship, staff child, custom
- Fine/penalty rules for late payment
- Fee waiver approval workflow
- Installment plan configuration

### Invoicing & Billing

- Automatic invoice generation per student per term
- Manual invoice creation
- Invoice preview, print, and PDF download
- Bulk invoice generation
- Prorated fee calculation for mid-term joiners
- Credit note and adjustment issuance

### Payments

- Online payment gateway integration (Stripe, Paystack, Flutterwave, PayPal)
- Bank transfer and cash payment recording
- Payment receipt generation
- Partial payment support with balance tracking
- Payment history per student
- Overpayment and refund management

### Reporting & Accounting

- Fee collection summary by class, date, period
- Outstanding fees report with aging analysis
- Revenue dashboard with charts
- Daily, monthly, annual financial summaries
- Income and expenditure ledger
- Budget vs. actual tracking
- Financial export for external accounting software
- Audit-ready transaction log

### Parent Payment Portal

- Parent fee statement view
- Online payment from parent portal
- Payment reminder notifications (SMS, email, in-app)
- Download receipts and invoices from portal

NB: Ensure all this fee related are dynamicly linked to students accesses as neccessary inluding for other related module for example if a student is owing let say a term fee and it due with no extension then they shouldnt have access to classroom, lms, exam and other related (but shouldnt be rigid rather should be fully configurable by school for school to decide) or specific fee and likes - that just a side note idea. 
---

## Module 6 — HR & Staff Management

_Rivals: BambooHR, Workday (education), school ERP HR modules_

### Staff Records

- Comprehensive staff profile: personal, contact, qualifications, certifications
- Document vault per staff (contract, credentials, ID)
- Employment type: full-time, part-time, contract, volunteer
- Department and designation management
- Staff ID and badge generation
- Emergency contact records
- Staff photo management

### Recruitment

- Job posting creation and management
- Application intake and tracking
- Interview scheduling
- Offer letter generation
- Onboarding checklist and document collection

### Attendance & Leave

- Staff clock-in/clock-out (manual, biometric, QR)
- Leave types: annual, sick, maternity, unpaid, etc.
- Leave application and approval workflow
- Leave balance tracking and accrual
- Holiday calendar management
- Attendance reports per staff and department

### Payroll

- Salary structure configuration (basic, allowances, deductions)
- Automatic payslip generation
- Tax and pension deduction computation
- Bonus and overtime processing
- Payroll approval workflow
- Payslip distribution (email, portal download)
- Payroll history and audit trail
- Bank transfer file export

### Performance

- Appraisal cycle setup (annual, biannual)
- Self-assessment forms
- Manager assessment forms
- KPI tracking per staff
- Performance rating and comment
- Appraisal history per employee

---

## Module 7 — Communication & Engagement

_Rivals: ClassDojo, Remind, SchoolMessenger_

### Messaging

- Direct messaging between teachers, parents, students, staff
- Group messaging per class, grade, school
- Message threading and reply
- Message read receipts
- File and media attachments in messages
- Message search and archive
- Message moderation for student-to-student channels

### Announcements & Notices

- School-wide and targeted announcements (by class, grade, role)
- Scheduled announcement publishing
- Pinned announcements
- Announcement read tracking
- Emergency broadcast mode (high priority)

### Notifications

- In-app, email, SMS, and push notification delivery
- Notification preference settings per user
- Notification templates (attendance alert, fee due, result published, etc.)
- Bulk notification dispatch

### Parent Portal

- Student attendance summary view
- Fee statement and payment
- Assignment and result visibility (teacher-controlled)
- Direct teacher messaging
- School announcements feed
- Event calendar view
- Child profile and document uploads

### Student Portal

- Class schedule and timetable
- Assignment submission and tracking
- Quiz and assessment access
- Grade and result view
- Course resources access
- Notices and announcements feed

---

## Module 8 — Library Management

_Rivals: Destiny, Koha, OpenBiblio_

- Book and resource catalog with full metadata (ISBN, author, publisher, genre, cover)
- Barcode and QR code support for catalog items
- Digital resource linking (eBooks, online journals)
- Catalog search and advanced filtering
- Member management (students and staff as library members)
- Book issue and return processing
- Reservation/hold request system
- Loan period and renewal configuration
- Fine calculation for overdue returns
- Fine payment and waiver
- Overdue notification to members
- Acquisition requests and purchase tracking
- Inventory audit and stock management
- Library usage analytics (most borrowed, active members, etc.)
- Self-service kiosk mode for issue/return

---

## Module 9 — Hostel / Dormitory Management

_Rivals: school ERP hostel modules_

- Hostel and dormitory building/block/room setup
- Room type configuration (single, double, dormitory)
- Bed allocation per student
- Allocation request and approval workflow
- Hostel fee integration with finance module
- Student room roster and occupancy view
- Check-in and check-out logging
- Visitor log management
- Maintenance request reporting per room
- Hostel warden/staff assignment
- Evacuation list generation per building

---

## Module 10 — Transport Management

_Rivals: school ERP transport modules_

- Fleet registration: vehicles, capacity, driver, condition
- Route creation with stop points and GPS coordinates
- Student-to-route and stop assignment
- Driver and conductor assignment per route
- Transport fee integration with finance module
- Daily dispatch and arrival logging
- Student boarding confirmation (parent notification)
- Route change requests and approvals
- Vehicle maintenance and service log
- Driver license and document expiry alerts
- Transport usage reports

---

## Module 11 — Inventory & Asset Management

_Rivals: school ERP asset modules, Asset Panda_

- Asset registration: name, category, serial number, purchase date, value
- Asset assignment to staff, department, or location
- Asset condition tracking (new, good, fair, damaged, decommissioned)
- Asset check-in/check-out log
- Consumable stock management (stationery, lab supplies, etc.)
- Stock reorder level and alerts
- Purchase request and procurement workflow
- Supplier management
- Asset depreciation tracking
- Inventory audit tools
- Asset disposal and write-off recording
- Asset reports: by category, department, condition

---

## Module 12 — Events & Calendar Management

_Rivals: school ERP calendar modules, EventBrite education_

- School-wide academic calendar setup
- Event creation: title, date/time, venue, description, audience
- Event categories (academic, sports, cultural, holiday, exam)
- Recurring event support
- RSVP and attendance tracking for events
- Event reminders and notifications
- Venue/room booking for events
- Calendar view (day, week, month, agenda)
- Role-filtered calendar views (student sees relevant events only)
- iCal export and sync
- Event media gallery (post-event photos/videos)

---

## Module 13 — Classroom Tools & Teaching Aids

_Rivals: Nearpod, Kahoot!, Padlet, ClassDojo behavior tools_

### Interactive Lessons

- Slide-based interactive lesson builder
- Embed polls, quizzes, and activities inside lessons
- Student response collection in real-time
- Live class mode (teacher paces slides for all students)
- Self-paced mode for individual progress

### Behavior & Engagement Tracking

- Positive and negative behavior point system
- Behavior categories and descriptions (configurable)
- Per-student behavior log with timestamps
- Class behavior leaderboard (opt-in)
- Behavior report for parents
- Merit and award badges

### Seating Plan

- Drag-and-drop classroom seating plan builder
- Multiple seating plan variants per class
- Student photo in seat for visual reference
- Random seating assignment option

### Lesson Planning

- Weekly/unit lesson plan templates
- Learning objectives and outcomes linking
- Resource attachment per lesson plan
- Lesson plan approval by department head
- Lesson plan library and sharing

---




## Module 14 — Reporting & Analytics (Platform-Wide)

_Rivals: PowerSchool Analytics, Tableau for Education_

- Unified analytics dashboard for school admins
- Pre-built reports: attendance, academic, finance, HR, library
- Custom report builder with drag-and-drop fields
- Scheduled report delivery (email PDF)
- Cross-module data views (e.g., attendance vs. academic performance)
- KPI cards: enrollment numbers, fee collection rate, average attendance
- Data visualization: bar charts, line graphs, pie charts, heat maps
- Comparative analytics: term-over-term, year-over-year
- Export all reports to PDF, Excel, CSV
- Report access control by role

---

## Module 15 — IT & System Administration

_Rivals: GoGuardian, network admin tools_

- User account creation, deactivation, and bulk management
- Password reset and account recovery management
- Module and feature toggle per school
- Role and permission customization
- Single sign-on (SSO) configuration (Google, Microsoft, LDAP)
- Login activity and security log
- Failed login and suspicious activity alerts
- Device and session management per user
- Data backup scheduling and restore management
- System health and uptime dashboard
- Maintenance mode with scheduled notifications
- Integration management (API keys, webhooks, connected apps)


## Module 16 — e-Exam & Computer-Based Testing (CBT)

_Rivals: ExamSoft, Proctorio, ProctorU, JAMB CBT, Respondus_ _Integrates with: Module 4 (Examinations & Results) for academic score sync; standalone for any assessment use case_

> **Scope:** General-purpose assessment engine — usable for academic exams, student admission/enrollment assessments, staff recruitment/employment tests, scholarship screening, internal certifications, and any custom examination need beyond school academics.

### Exam Creation & Configuration

- Exam builder with title, description, subject, instructions, duration, total marks
- Exam types: academic term exam, mock/practice, entrance assessment, employment test, certification, custom
- Section-based exam structure (group questions by topic or subject)
- Per-section time limits and marks allocation
- Exam scheduling: start date/time, end date/time, access window
- Exam access modes: open (anyone with link), restricted (invited candidates only), class-based
- Exam availability: one-time attempt, multiple attempts with configurable limits
- Exam duplication and template saving
- Draft, published, closed, and archived exam states
- Exam instructions page with mandatory acknowledgment before start

### Question Bank

- Centralized question bank shared across all exam types
- Question types: multiple choice (single answer), multiple choice (multi-answer), true/false, short answer, fill-in-the-blank, matching pairs, ordering/ranking, image-based question
- Rich text and media support in questions and options (images, diagrams, math equations via LaTeX)
- Question difficulty tagging: easy, medium, hard
- Question topic, subject, and curriculum tagging
- Question import via Excel/CSV bulk upload
- Question versioning and edit history
- Question usage tracking (how many exams it has appeared in)
- Question review and approval workflow (for quality control)

### Exam Assembly

- Manual question selection from question bank
- Automatic exam generation by topic, difficulty mix, and count
- Question randomization per candidate (unique question order per student)
- Option/answer shuffling per candidate
- Fixed and randomized question pools per section
- Mark allocation per question or uniform per exam
- Negative marking configuration (optional, per exam)
- Passage/reading comprehension blocks with linked questions

### Candidate Management

- Candidate registration: individual, bulk import (CSV), or auto-sync from SIS (students) or HR (staff applicants)
- Candidate grouping and batch management
- Unique exam access token/PIN per candidate
- Candidate eligibility rules (grade, department, score threshold from prior assessments)
- Candidate admit card/instruction sheet generation
- Candidate exam status tracking: registered, started, submitted, absent, disqualified

### Online Exam Delivery (CBT)

- Distraction-free full-screen exam interface (forced full-screen on launch)
- Full-screen exit detection with warning and auto-flag
- Tab/window switch detection with automatic alert and logging
- Browser lockdown mode (blocks copy, paste, right-click, keyboard shortcuts)
- Configurable lockdown browser integration support
- Question navigation panel (jump to any question, flag for review)
- "Flag for review" marking per question
- Answer auto-save at configurable intervals (prevents data loss)
- Countdown timer with configurable warning alerts (e.g., 10 min, 5 min remaining)
- Auto-submission on timer expiry
- Session resume on accidental disconnection (within allowed window)
- Connection status indicator with offline detection
- Exam attempt lock after submission (no re-entry)

### Proctoring & Anti-Cheat

- Candidate identity verification at exam start (webcam photo capture + ID upload)
- AI-powered face detection: alerts if no face or multiple faces detected during exam
- Continuous webcam monitoring with snapshot capture at random intervals
- Audio monitoring (microphone access) with noise anomaly flagging
- Live proctor dashboard: view all active candidates in real-time (webcam thumbnails, status, flags)
- Proctor intervention: send warning message to candidate, pause or terminate session
- Automatic flag system: logs and timestamps every suspicious event (tab switch, full-screen exit, face not detected, copy attempt, multiple faces)
- Candidate activity log: full chronological event trail per attempt
- IP address logging and duplicate IP detection (flags multiple candidates from same IP)
- Device fingerprinting to detect shared devices
- Question and option randomization (every candidate sees a unique variant)
- Time-per-question analytics to detect abnormal answer speed
- Post-exam integrity report per candidate with flag summary
- Proctor notes per candidate attempt

### Offline Exam Support (CBT Offline Mode)

- Offline CBT package downloadable for low/no-internet environments
- Exam data pre-loaded onto local devices before exam day
- Candidate responses saved locally and synced to server when connection is restored
- Offline session integrity logging (timestamps, flags preserved locally)
- Sync status dashboard for exam coordinators

### Grading & Results

- Instant auto-grading for all objective question types on submission
- Manual grading interface for short-answer and essay questions
- Partial marks support for multi-answer and essay questions
- Examiner comment per question for manual-graded responses
- Score release control: immediate, scheduled, or manual release by admin
- Result view per candidate: score, percentage, pass/fail status, per-question breakdown
- Candidate result notification on release (email, SMS, in-app)
- Academic exam result sync to Module 4 (Examinations & Results) with one action
- Non-academic results (admission, HR) kept separate with own result workflow

### Analytics & Reporting

- Exam summary: total registered, total submitted, absent count, average score, pass rate
- Score distribution chart (histogram)
- Per-question analytics: correct rate, average time spent, most-chosen wrong option
- Top and bottom performers list
- Candidate comparison across multiple exam attempts
- Proctoring flags summary report: total flags, flagged candidates, flag type breakdown
- Examiner workload report (manual grading progress)
- Export: candidate results (Excel, PDF), integrity report, analytics summary

### Integration Points

- **Module 4 (Examinations & Results):** Push CBT scores directly into academic result sheet; exam timetable from Module 4 auto-creates CBT session
- **Module 1 (SIS):** Pull registered students as candidates for academic exams; enrollment assessment results linked to applicant profile
- **Module 6 (HR):** Pull job applicants as candidates for employment assessments; test result linked to applicant record
- **Module 7 (Communication):** Automated exam reminders, admit card distribution, result release notifications
- **Module 15 (IT Admin):** Device and session management for CBT lab setups  

---

سُبْحَانَكَ اللّٰهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوْبُ إِلَيْكَ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ الْعَلِيِّ الْعَظِيْمِ حَسْبِيَ اللهُ لَا إِلٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيْمِ سُبْحَانَ اللهِ ٣٣ • الْحَمْدُ لِلّٰهِ ٣٣ • اللهُ أَكْبَرُ ٣٣



