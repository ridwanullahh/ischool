BismiLlah Ar-Rahman Ar-Roheem

# iSchool Gaps Implementation Plan (gaps_b.md)

## Audit Summary: PRD vs Current Codebase

### Architecture Status: STRONG
- Database schema covers all 16 modules with proper relationships
- Auth system (session-based, bcrypt) is functional
- Middleware handles role-based access control
- 22 CMS themes with palette system
- Billing/subscription system is comprehensive
- Seed data is thorough

### Functional Status: MANY STUB PAGES
Most dashboard module pages exist as files but contain only empty placeholder UI ("No X found"). They lack:
- Working CRUD forms (add/edit modals with validation)
- Working delete with confirmation
- Search/filter functionality
- School-scoped data queries (many APIs return ALL data globally)
- Client-side interactivity (buttons have no event handlers)
- Error handling

### Code Quality Issues Found
1. `courses.astro` references `course.name` and `course.credits` - schema has `course.title`, no credits field
2. `staff.astro` references `member.employeeId` and `member.position` - schema has `staffId` and `designation`
3. `students.astro` references `student.gradeLevel` - no such column exists
4. API endpoints return data without school scoping
5. env.d.ts User type only has 'super_admin' | 'school_admin' but schema has 9 roles

---

## Implementation Plan

### PHASE 1: Fix Existing Page Bugs & Make CRUD Functional
Priority: CRITICAL - these pages exist but are broken or non-functional

#### Task 1.1: Fix Dashboard Overview
- Add module-wide stats (students, staff, courses, revenue, etc.)
- Add quick action links
- Add recent activity feed

#### Task 1.2: Fix Students Page (Module 1 - SIS)
- Fix `gradeLevel` reference (remove, use enrollment class instead)
- Add working add/edit modal with full form
- Add working delete with confirmation
- Add search/filter by name, status, class
- Add school-scoping to API
- Add enrollment status display

#### Task 1.3: Fix Staff Page (Module 6 - HR)
- Fix `employeeId` -> `staffId`, `position` -> `designation`
- Add working add/edit modal
- Add working delete with confirmation
- Add search/filter
- Add school-scoping to API

#### Task 1.4: Fix Courses Page (Module 2 - LMS)
- Fix `course.name` -> `course.title`, remove `course.credits`
- Add working add/edit modal
- Add working delete with confirmation
- Add school-scoping to API
- Add status badges

#### Task 1.5: Fix Exams Page (Module 4)
- Load exam data from DB with series info
- Add working create exam modal
- Add exam list with status, date, class info
- Add school-scoping

#### Task 1.6: Fix Fees Page (Module 5)
- Load fee structures from DB
- Add working create/edit fee structure form
- Add fee items display
- Add school-scoping

#### Task 1.7: Fix Library Page (Module 8)
- Load books from DB
- Add working add/edit book form
- Add search/filter
- Add availability display
- Add school-scoping

#### Task 1.8: Fix CBT Page (Module 16)
- Load CBT exams from DB with stats
- Add working create CBT exam form
- Add candidate count, status display
- Add school-scoping

### PHASE 2: Make Critical Missing Pages Functional
Priority: HIGH - sidebar references pages that don't exist as files

#### Task 2.1: Attendance Page Enhancement
- Load attendance data with student names
- Add mark attendance interface (bulk)
- Add date picker and class filter
- Add attendance summary stats

#### Task 2.2: Enrollments Page Enhancement
- Load enrollment data with student and class names
- Add enrollment workflow (submit/review/accept/reject)
- Add bulk enrollment
- Add filter by status

#### Task 2.3: Messages Page Enhancement
- Load messages with sender info
- Add compose message form
- Add message threading
- Add read/unread status

#### Task 2.4: Events Page Enhancement
- Load events from DB
- Add create/edit event form
- Add calendar view option
- Add RSVP tracking

#### Task 2.5: Notifications Page Enhancement
- Load notifications with pagination
- Add notification preferences
- Add mark as read/bulk actions

#### Task 2.6: Leave Management Page Enhancement
- Load leave requests with staff info
- Add leave application form
- Add approval/rejection workflow
- Add leave balance display

#### Task 2.7: Payroll Page Enhancement
- Load payroll data with staff names
- Add generate payroll form
- Add approval workflow
- Add payslip view

#### Task 2.8: Grades/Gradebook Page Enhancement
- Load grades with student and course info
- Add grade entry form
- Add grade export
- Add weighted category display

#### Task 2.9: Timetable Page Enhancement
- Load timetable entries with class/course/teacher info
- Add visual timetable grid
- Add create/edit entry form
- Add conflict detection display

#### Task 2.10: Hostel Page Enhancement
- Load hostels, rooms with occupancy info
- Add building/room management forms
- Add allocation view

#### Task 2.11: Transport Page Enhancement
- Load vehicles with driver info
- Load routes with stops
- Add vehicle/route management forms

#### Task 2.12: Inventory Page Enhancement
- Load assets with condition/assignment info
- Load stock items with reorder alerts
- Add asset/stock management forms

#### Task 2.13: Analytics/Reports Page Enhancement
- Add KPI cards (enrollment, attendance rate, fee collection, etc.)
- Add charts (bar, line, pie)
- Add date range filter
- Add module-specific report views

#### Task 2.14: Classroom/Lesson Plans Page Enhancement
- Load lesson plans with course info
- Add create/edit lesson plan form
- Add approval status display

### PHASE 3: Fix All API Endpoints
Priority: CRITICAL - data security issue

#### Task 3.1: School-scope all dashboard APIs
- students.ts: Add schoolId filter
- staff.ts: Add schoolId filter
- courses.ts: Add schoolId filter
- exams.ts: Add schoolId filter
- events.ts: Add schoolId filter
- library.ts: Add schoolId filter
- cbt.ts: Add schoolId filter
- All other dashboard APIs

#### Task 3.2: Add proper validation to all POST endpoints
- Validate required fields
- Sanitize input
- Return proper error responses

#### Task 3.3: Add PUT/PATCH handlers for edit operations
- students.ts: Add PUT
- staff.ts: Add PUT
- courses.ts: Add PUT
- All other dashboard APIs

### PHASE 4: Fix env.d.ts and Type System
#### Task 4.1: Update User type to include all 9 roles

### PHASE 5: Add 5 New Professional Themes
#### Task 5.1: Theme - "Atlas" (Geographic/Explorer theme)
#### Task 5.2: Theme - "Meridian" (Corporate/Professional theme)
#### Task 5.3: Theme - "Radiance" (Warm/Welcoming theme)
#### Task 5.4: Theme - "Vertex" (Tech/Modern theme)
#### Task 5.5: Theme - "Crestwood" (Traditional/Classic theme)

### PHASE 6: Build, Test, Cleanup
#### Task 6.1: Run database migration
#### Task 6.2: Run production build
#### Task 6.3: Test all pages in production mode
#### Task 6.4: Fix any build errors
#### Task 6.5: Delete build artifacts

---

## Execution Priority (Given ~70 API calls)

1. Create this plan (1 call) - DONE
2. Fix env.d.ts types (1 call)
3. Fix all API endpoints with school-scoping + PUT handlers (batch: 3-4 calls)
4. Fix + implement students page fully (2 calls: page + API)
5. Fix + implement staff page fully (2 calls)
6. Fix + implement courses page fully (2 calls)
7. Fix + implement exams page fully (2 calls)
8. Fix + implement fees page fully (2 calls)
9. Fix + implement library page fully (2 calls)
10. Fix + implement CBT page fully (2 calls)
11. Fix + implement attendance, enrollments (2 calls)
12. Fix + implement messages, notifications (2 calls)
13. Fix + implement events, leave, payroll (3 calls)
14. Fix + implement grades, timetable (2 calls)
15. Fix + implement hostel, transport, inventory (3 calls)
16. Fix + implement analytics, classroom (2 calls)
17. Fix dashboard overview (1 call)
18. Add 5 new themes (5 calls)
19. Register themes in index.ts (1 call)
20. Build and test (3-4 calls)
21. Cleanup (1 call)

Total: ~42-45 calls for implementation, leaving buffer for fixes

---

BismiLlah Ar-Rahman Ar-Roheem
