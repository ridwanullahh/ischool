# iSchool — Full Platform Implementation Plan

BismiLLah Ar-Rahman Ar-Roheem

## Scope
Implement all 16 modules from school_softwares.md + multilingual system + sidebar mega menu restructuring.

## Architecture Decisions
- **Schema**: All 16 modules in `schema.ts` — core tables for each module
- **Dashboard Pages**: One page per module with list + CRUD in single `.astro` file
- **API Routes**: Generic CRUD pattern per module in `/api/modules/`
- **Sidebar**: Mega menu with collapsible groups, current CMS items nested under "Website"
- **Multilingual**: Adapted from multilingual_guides.md for Astro SSR (no React)
- **RTL**: CSS-based direction flipping, language selector in each theme header

## Batches

### Batch 1: Schema Expansion
- Add all module tables to `src/lib/db/schema.ts`
- Tables: students, enrollments, attendance, courses, assignments, quizzes, questions, submissions, grades, timetables, exams, examResults, reportCards, feeStructures, invoices, payments, staff, leaveRequests, payroll, messages, notifications, libraryBooks, loans, hostels, rooms, vehicles, routes, assets, events, behaviorLogs, seatingPlans, lessonPlans, auditLogs, moduleSettings

### Batch 2: Migration & Seed
- Update migrate.ts, run migration
- Add seed data for all modules

### Batch 3: Multilingual System (Astro-adapted)
- `src/lib/i18n/translation-service.ts` — server-side translation service
- `src/pages/api/translate.ts` — API endpoint using google-translate-api-x
- `src/components/LanguageSelector.astro` — dropdown component
- Auto-translate script (client-side, MutationObserver-based)
- RTL CSS additions to global.css

### Batch 4: Dashboard Sidebar Mega Menu
- Rewrite DashboardLayout.astro with grouped navigation
- Groups: Platform, Website CMS, SIS, LMS, Timetable, Exams, Finance, HR, Communication, Library, Hostel, Transport, Inventory, Events, Classroom, Analytics, IT Admin, e-Exam
- Collapsible sections with icons

### Batch 5-12: Module Dashboard Pages + APIs
Each module gets:
- `src/pages/dashboard/{module}/index.astro` — list view with create/edit
- `src/pages/api/modules/{module}.ts` — CRUD API

### Batch 13: Theme RTL/Multilingual Integration
- Add LanguageSelector to each theme header
- Add RTL CSS support
- Update theme philosophy docs

### Batch 14: Testing
- Verify all routes, all modules functional

Wa billahi at-tawfiq.
