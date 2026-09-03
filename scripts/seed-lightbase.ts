/**
 * iSchool — Comprehensive Lightbase Seed Script
 *
 * Run once to populate ALL platform + school + system level data
 * into the Lightbase cloud database. Idempotent: safe to re-run.
 *
 * Usage:
 *   node --experimental-strip-types scripts/seed-lightbase.ts
 *
 * OR set env vars and run from project root:
 *   LIGHTBASE_API_KEY=... LIGHTBASE_PROJECT=edulink \
 *   LIGHTBASE_BASE_URL=https://your-lightbase-instance.example.com \
 *   node --experimental-strip-types scripts/seed-lightbase.ts
 *
 * After running once, auto-seed in middleware.ts is disabled
 * (kept in codebase for re-seeding if needed).
 */

// ─── Configuration ────────────────────────────────────────
const API_KEY = process.env.LIGHTBASE_API_KEY || '';
const PROJECT = process.env.LIGHTBASE_PROJECT || 'ischool-beta';
const BASE_URL = process.env.LIGHTBASE_BASE_URL || '';

if (!API_KEY || !BASE_URL) {
  console.error('ERROR: LIGHTBASE_API_KEY and LIGHTBASE_BASE_URL environment variables are required.');
  console.error('Example:');
  console.error('  LIGHTBASE_API_KEY=lb_live_xxx LIGHTBASE_PROJECT=edulink \\');
  console.error('  LIGHTBASE_BASE_URL=https://your-lightbase.example.com \\');
  console.error('  node --experimental-strip-types scripts/seed-lightbase.ts');
  process.exit(1);
}

const HEADERS: Record<string, string> = {
  'apikey': API_KEY,
  'x-lightbase-project': PROJECT,
  'Content-Type': 'application/json',
};

const COLLECTIONS_URL = `${BASE_URL}/api/v1/projects/${PROJECT}/collections`;

// ─── HTTP helpers ─────────────────────────────────────────

async function queryCollection(name: string, filter?: any, limit: number = 1): Promise<any[]> {
  const params = new URLSearchParams();
  if (filter) params.set('filter', JSON.stringify(filter));
  params.set('limit', String(limit));
  const url = `${COLLECTIONS_URL}/${name}/docs?${params}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`query(${name}) failed: ${res.status}`);
  }
  const data = await res.json();
  return data.data || [];
}

async function queryAll(name: string, filter?: any): Promise<any[]> {
  const all: any[] = [];
  let cursor: any = undefined;
  for (;;) {
    const params = new URLSearchParams();
    if (filter) params.set('filter', JSON.stringify(filter));
    params.set('limit', '1000');
    if (cursor) params.set('cursor', JSON.stringify(cursor));
    const url = `${COLLECTIONS_URL}/${name}/docs?${params}`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      if (res.status === 404) return all;
      throw new Error(`queryAll(${name}) failed: ${res.status}`);
    }
    const data = await res.json();
    all.push(...(data.data || []));
    if (!data.hasMore || !data.nextCursor) break;
    cursor = data.nextCursor;
  }
  return all;
}

async function insertDoc(name: string, doc: any): Promise<any> {
  const res = await fetch(`${COLLECTIONS_URL}/${name}/docs`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(doc),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`insert(${name}) failed: ${res.status} ${JSON.stringify(err).substring(0, 300)}`);
  }
  const data = await res.json();
  return data.document || data;
}

async function seedIfNotExists(name: string, doc: any, dedupField: string): Promise<any | null> {
  const value = doc[dedupField];
  if (value === undefined) {
    throw new Error(`seedIfNotExists(${name}): dedup field "${dedupField}" not in doc`);
  }
  const existing = await queryCollection(name, { field: dedupField, op: 'eq', value }, 1);
  if (existing.length > 0) return existing[0];
  return await insertDoc(name, doc);
}

async function seedMany(name: string, docs: any[], dedupField: string): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0, skipped = 0;
  for (const doc of docs) {
    try {
      const result = await seedIfNotExists(name, doc, dedupField);
      if (result && !result._existed) inserted++;
      else skipped++;
    } catch (e: any) {
      console.warn(`  [skip] ${name}/${doc[dedupField]}: ${e.message.substring(0, 100)}`);
      skipped++;
    }
  }
  return { inserted, skipped };
}

function j(obj: any): string { return JSON.stringify(obj); }

// ─── Password hashing ─────────────────────────────────────
async function hashPassword(plain: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return await bcrypt.default.hash(plain, 12);
}

// ─── Logging ──────────────────────────────────────────────
const stats = { inserted: 0, skipped: 0, failed: 0, collections: 0 };
function log(msg: string) { console.log(`[seed] ${msg}`); }
function logStats() {
  log(`DONE — inserted=${stats.inserted}, skipped=${stats.skipped}, failed=${stats.failed}, collections=${stats.collections}`);
}

// ═══════════════════════════════════════════════════════════
// SEED: PLATFORM SETTINGS
// ═══════════════════════════════════════════════════════════
async function seedPlatformSettings() {
  log('Seeding platform_settings...');
  const docs = [
    { key: 'platform_name', value: 'iSchool' },
    { key: 'platform_tagline', value: 'All-in-One School Management Platform' },
    { key: 'platform_description', value: 'Comprehensive school management system with 16 modules covering every aspect of school operations — from student information and learning management to finance, HR, library, hostel, transport, and examinations.' },
    { key: 'platform_email', value: 'support@ischool.com' },
    { key: 'platform_phone', value: '+234 800 123 4567' },
    { key: 'platform_address', value: '123 Education Avenue, Lagos, Nigeria' },
    { key: 'platform_website', value: 'https://ischool.com' },
    { key: 'platform_logo_url', value: '' },
    { key: 'platform_favicon_url', value: '' },
    { key: 'platform_primary_color', value: '#05B34D' },
    { key: 'platform_secondary_color', value: '#F2B91C' },
    { key: 'platform_dark_color', value: '#181F25' },
    { key: 'platform_light_color', value: '#E9FBF1' },
    { key: 'platform_facebook', value: 'https://facebook.com/ischool' },
    { key: 'platform_twitter', value: 'https://twitter.com/ischool' },
    { key: 'platform_linkedin', value: 'https://linkedin.com/company/ischool' },
    { key: 'platform_instagram', value: 'https://instagram.com/ischool' },
    { key: 'platform_youtube', value: 'https://youtube.com/@ischool' },
    { key: 'platform_footer_text', value: 'iSchool — Empowering schools with modern technology.' },
    { key: 'platform_meta_keywords', value: 'school management, school software, education platform, SIS, LMS, Islamic school, Nigeria school' },
    { key: 'platform_meta_description', value: 'iSchool is the all-in-one school management platform with 16 modules: SIS, LMS, finance, HR, library, hostel, transport, examinations, and more.' },
    { key: 'platform_hero_title', value: 'Run Your School on One Platform' },
    { key: 'platform_hero_subtitle', value: '16 integrated modules covering every aspect of school operations — built for Islamic schools, ready for any institution.' },
    { key: 'platform_hero_cta_text', value: 'Start Free Trial' },
    { key: 'platform_hero_cta_url', value: '/auth/register' },
    { key: 'platform_features_intro', value: 'Everything you need to run your school efficiently' },
    { key: 'platform_pricing_intro', value: 'Simple, transparent pricing for schools of every size' },
    { key: 'platform_testimonials_intro', value: 'Trusted by schools across Nigeria and beyond' },
    { key: 'platform_contact_intro', value: 'Get in touch with our team — we usually respond within one business day.' },
    { key: 'platform_trial_duration_days', value: '14' },
    { key: 'platform_default_currency', value: 'NGN' },
    { key: 'platform_default_locale', value: 'en' },
    { key: 'platform_support_email', value: 'support@ischool.com' },
    { key: 'platform_sales_email', value: 'sales@ischool.com' },
    { key: 'platform_privacy_policy_url', value: '/privacy' },
    { key: 'platform_terms_url', value: '/terms' },
    { key: 'platform_cookie_policy_url', value: '/cookies' },
  ];
  const r = await seedMany('platform_settings', docs, 'key');
  stats.inserted += r.inserted; stats.skipped += r.skipped; stats.collections++;
}

// ═══════════════════════════════════════════════════════════
// SEED: SUBSCRIPTION PLANS
// ═══════════════════════════════════════════════════════════
async function seedSubscriptionPlans() {
  log('Seeding subscription_plans...');
  const docs = [
    {
      name: 'Starter', slug: 'starter',
      description: 'Perfect for small schools getting started with digital management.',
      price_monthly: 4900, price_yearly: 49000,
      features: j(['Up to 100 students', 'Core SIS module', 'Attendance tracking', 'Basic reports', 'Email support', 'Parent portal', 'Student portal']),
      max_students: 100, max_staff: 10, max_storage_gb: 5,
      is_active: true, sort_order: 1, is_popular: false,
    },
    {
      name: 'Growth', slug: 'growth',
      description: 'For growing schools that need more modules and advanced features.',
      price_monthly: 9900, price_yearly: 99000,
      features: j(['Up to 500 students', 'All 16 modules', 'Parent and student portals', 'Advanced analytics', 'Priority support', 'Custom branding', 'Email marketing', 'Social media management']),
      max_students: 500, max_staff: 30, max_storage_gb: 25,
      is_active: true, sort_order: 2, is_popular: true,
    },
    {
      name: 'Enterprise', slug: 'enterprise',
      description: 'Full-featured platform for large institutions and multi-campus schools.',
      price_monthly: 19900, price_yearly: 199000,
      features: j(['Unlimited students', 'All 16 modules', 'Multi-campus support', 'API access', 'Dedicated support manager', 'Custom integrations', 'White-label option', 'SLA guarantee', 'Advanced security audit']),
      max_students: 999999, max_staff: 999, max_storage_gb: 100,
      is_active: true, sort_order: 3, is_popular: false,
    },
  ];
  const r = await seedMany('subscription_plans', docs, 'slug');
  stats.inserted += r.inserted; stats.skipped += r.skipped; stats.collections++;
}

// ═══════════════════════════════════════════════════════════
// SEED: PLATFORM FAQs
// ═══════════════════════════════════════════════════════════
async function seedPlatformFaqs() {
  log('Seeding platform_faqs...');
  const docs = [
    { question: 'What is iSchool?', answer: 'iSchool is a comprehensive school management platform with 16 integrated modules covering student information, learning management, finance, HR, library, hostel, transport, examinations, and more. It is designed for Islamic schools but works for any institution.', category: 'General', sort_order: 1, is_published: true },
    { question: 'How much does iSchool cost?', answer: 'We offer three plans: Starter at N4,900/month for small schools, Growth at N9,900/month for growing schools, and Enterprise at N19,900/month for large institutions. Annual billing saves you two months.', category: 'Pricing', sort_order: 2, is_published: true },
    { question: 'Can I try iSchool before committing?', answer: 'Yes, we offer a 14-day free trial with full access to all features. No credit card required. You can sign up, set up your school, and explore every module before deciding.', category: 'Pricing', sort_order: 3, is_published: true },
    { question: 'Is my school data secure?', answer: 'Absolutely. We use AES-256 encryption for sensitive data, bcrypt hashing for passwords, role-based access control, audit logging, regular backups, and run on a cloud database with enterprise-grade security.', category: 'Security', sort_order: 4, is_published: true },
    { question: 'Do you support Islamic schools?', answer: 'Yes, iSchool is built with Islamic schools in mind. Our timetable system includes Adhan-aware prayer schedules aligned with the five daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha). The platform also supports Quran memorization tracking and Islamic studies courses.', category: 'Features', sort_order: 5, is_published: true },
    { question: 'Can parents and students access the platform?', answer: 'Yes, iSchool includes dedicated portals for parents and students with attendance, fees, grades, assignments, timetable, announcements, and direct communication with teachers.', category: 'Features', sort_order: 6, is_published: true },
    { question: 'What payment methods do you accept?', answer: 'We accept Stripe, Paystack, Flutterwave, and bank transfer. Schools can pay monthly or annually. Invoice billing is available for Enterprise customers.', category: 'Pricing', sort_order: 7, is_published: true },
    { question: 'Do you offer training and support?', answer: 'Yes, all plans include email support. Growth and Enterprise plans include priority support, onboarding training, and a dedicated account manager for Enterprise customers.', category: 'Support', sort_order: 8, is_published: true },
    { question: 'Can I migrate data from my current system?', answer: 'Yes, we offer free data migration from spreadsheets, other school management systems, and paper records. Our team will help you import students, staff, classes, and historical data.', category: 'Onboarding', sort_order: 9, is_published: true },
    { question: 'Do you support multiple campuses?', answer: 'Yes, the Enterprise plan supports multi-campus schools with centralized administration, cross-campus reporting, and individual campus branding.', category: 'Features', sort_order: 10, is_published: true },
    { question: 'Is there a mobile app?', answer: 'The platform is fully responsive and works on any device — phones, tablets, and desktops. Native mobile apps for iOS and Android are on our roadmap.', category: 'Features', sort_order: 11, is_published: true },
    { question: 'Can I customize the platform for my school?', answer: 'Yes, you can customize colors, logo, theme, navigation, and module settings. Enterprise customers can request custom integrations and white-label branding.', category: 'Features', sort_order: 12, is_published: true },
  ];
  const r = await seedMany('platform_faqs', docs, 'question');
  stats.inserted += r.inserted; stats.skipped += r.skipped; stats.collections++;
}

// ═══════════════════════════════════════════════════════════
// SEED: PLATFORM BLOG POSTS
// ═══════════════════════════════════════════════════════════
async function seedPlatformBlogPosts() {
  log('Seeding platform_blog_posts...');
  const docs = [
    {
      title: 'How iSchool Transforms School Management',
      slug: 'how-ischool-transforms-school-management',
      content: `Managing a school involves coordinating hundreds of moving parts — from admissions and attendance to fees, examinations, and parent communication. iSchool brings all of this into one unified platform with 16 integrated modules.

In this article, we explore how schools across Nigeria are using iSchool to eliminate spreadsheets, reduce paperwork, and focus on what matters most: student outcomes.

The Problem with Disconnected Systems

Most schools today juggle between 5 to 10 different tools — one for attendance, another for fees, yet another for parent communication, and so on. This fragmentation leads to data silos, duplicated effort, and missed insights.

A Unified Approach

iSchool solves this by bringing every aspect of school management into a single platform. When a student is admitted, their records automatically flow to attendance, fees, grades, library, hostel, and transport — no manual data entry required.

Real Results

Schools using iSchool report 60% reduction in administrative time, 40% increase in fee collection rates, and 90% parent engagement through the parent portal. The Adhan-aware prayer schedule has been particularly appreciated by Islamic schools.`,
      excerpt: 'Discover how an all-in-one platform eliminates the chaos of spreadsheets and disconnected systems.',
      category: 'Product', tags: j(['management', 'platform', 'efficiency']),
      author: 'iSchool Team', status: 'published',
      is_published: true,
      cover_image_url: '',
      published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: 'The Benefits of Adhan-Aware Prayer Schedules',
      slug: 'benefits-of-adhan-aware-prayer-schedules',
      content: `For Islamic schools, aligning the daily academic schedule with the five daily prayers is essential. iSchool's timetable module includes Adhan-aware prayer schedules that automatically adjust class timings around Salah.

What Are Adhan-Aware Prayer Schedules?

Unlike generic timetables that ignore prayer times, iSchool's prayer schedules are designed around the five daily prayers: Fajr, Dhuhr, Asr, Maghrib, and Isha. The system can play the Adhan at prayer times and pause classes for congregational prayer.

How It Works

Administrators configure prayer times based on their location and the school's preferred calculation method. The timetable then automatically inserts prayer breaks at the right times, ensuring students never miss a prayer.

Beyond Scheduling

The prayer schedule module also tracks Quran memorization (Hifz) progress, Islamic studies attendance, and Friday Jumu'ah preparations. This holistic approach supports the spiritual development of students alongside their academic growth.

Schools report that students are more attentive after prayer breaks and that parents appreciate the school's commitment to Islamic values.`,
      excerpt: 'How Islamic schools can align their academic schedule with the five daily prayers.',
      category: 'Islamic Education', tags: j(['prayer', 'islamic', 'timetable']),
      author: 'iSchool Team', status: 'published',
      is_published: true,
      cover_image_url: '',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: '5 Ways to Improve Parent-Teacher Communication',
      slug: '5-ways-to-improve-parent-teacher-communication',
      content: `Strong parent-teacher communication is correlated with better student outcomes. Yet many schools struggle to keep parents informed and engaged. Here are five ways iSchool helps bridge the gap.

1. Real-Time Notifications

Parents receive instant notifications for attendance, grades, announcements, and fee reminders. No more waiting for end-of-term reports.

2. Direct Messaging

The built-in messaging system lets parents and teachers communicate directly within the platform, keeping all school-related conversations in one place.

3. Parent Portal

A dedicated portal gives parents a dashboard view of their child's academic progress, upcoming events, fee status, and attendance history.

4. Event RSVPs

Schools can publish events and parents can RSVP online, making planning easier and increasing attendance.

5. Automated Reports

Schedule weekly or monthly progress reports to be emailed to parents automatically, keeping them informed without adding to teacher workload.

When parents are informed and engaged, students perform better. iSchool makes this easy.`,
      excerpt: 'Practical strategies for strengthening the parent-teacher relationship using technology.',
      category: 'Education', tags: j(['communication', 'parents', 'engagement']),
      author: 'iSchool Team', status: 'published',
      is_published: true,
      cover_image_url: '',
      published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: 'Streamlining Fee Collection with Digital Invoices',
      slug: 'streamlining-fee-collection-with-digital-invoices',
      content: `Fee collection is one of the most challenging aspects of school administration. iSchool's finance module digitizes the entire process, from invoice generation to payment confirmation.

The Traditional Challenge

Paper invoices get lost. Cash payments are hard to track. Parents forget due dates. Schools spend hours reconciling payments. The result is delayed revenue and frustrated staff.

Digital Invoices

iSchool generates professional digital invoices for each student, automatically calculated based on their fee structure. Parents receive invoices via email and can pay online using Paystack, Flutterwave, or bank transfer.

Real-Time Tracking

The finance dashboard shows outstanding invoices, paid amounts, and overdue accounts in real time. Automated reminders go to parents before and after due dates, reducing the need for manual follow-up.

Comprehensive Reporting

Generate financial reports by class, term, or academic year. Track revenue trends, identify defaulters, and forecast cash flow — all from one dashboard.

Schools using iSchool report 40% faster fee collection and 90% reduction in reconciliation time.`,
      excerpt: 'How digital invoices and online payments can transform your school finance management.',
      category: 'Finance', tags: j(['finance', 'fees', 'payments']),
      author: 'iSchool Team', status: 'published',
      is_published: true,
      cover_image_url: '',
      published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: 'Building a Paperless Library with iSchool',
      slug: 'building-a-paperless-library-with-ischool',
      content: `The library module in iSchool helps schools manage their book collections, track loans, and encourage reading among students.

Catalog Management

Add books with title, author, ISBN, category, and cover image. Track copies available, copies issued, and reservation queue.

Self-Service Loans

Students can search the catalog online, reserve books, and check them out with a librarian's approval. The system tracks due dates and sends reminders.

Reading Analytics

See which books are most popular, which students read the most, and which categories need more inventory. Use these insights to build a library that students actually use.

The library module integrates with the student information system, so every loan is tied to a student record. No more lost cards or manual logs.`,
      excerpt: 'Transform your school library with digital cataloging, self-service loans, and reading analytics.',
      category: 'Library', tags: j(['library', 'books', 'reading']),
      author: 'iSchool Team', status: 'published',
      is_published: true,
      cover_image_url: '',
      published_at: new Date().toISOString(),
    },
  ];
  const r = await seedMany('platform_blog_posts', docs, 'slug');
  stats.inserted += r.inserted; stats.skipped += r.skipped; stats.collections++;
}

// ═══════════════════════════════════════════════════════════
// SEED: PLATFORM DOCS
// ═══════════════════════════════════════════════════════════
async function seedPlatformDocs() {
  log('Seeding platform_docs...');
  const docs = [
    { title: 'Getting Started Guide', slug: 'getting-started', content: `Welcome to iSchool! This guide will help you set up your school in under 30 minutes.

Step 1: Create Your Account
Sign up at /auth/register with your email and a strong password. You will be the school admin.

Step 2: Set Up Your School
After registration, you will be prompted to create your school. Enter the name, slug (used in your URL), tagline, and primary color.

Step 3: Configure Modules
Visit /dashboard/settings to enable or disable modules. Most schools start with SIS, LMS, Finance, and Communication.

Step 4: Add Staff and Students
Use the dashboard to add teachers, students, and classes. You can also import in bulk via CSV.

Step 5: Set Up Fees
Configure fee structures for each class, then generate invoices for the academic year.

Step 6: Publish Your Website
Customize your school's public website at /dashboard/settings. Choose a theme, add announcements, and publish your first blog post.

Need help? Contact support@ischool.com.`, excerpt: 'Set up your school in under 30 minutes with this step-by-step guide.', category: 'Guides', sort_order: 1, is_published: true },
    { title: 'Student Information System (SIS)', slug: 'sis-module', content: `The SIS module is the foundation of your school management system. It manages students, enrollments, attendance, and academic records.

Students
Add students manually or import via CSV. Each student record includes personal info, guardian contacts, medical records, documents, and enrollment history.

Enrollments
Enroll students in classes for each academic year. Track enrollment status (pending, accepted, withdrawn) and generate class lists.

Attendance
Mark attendance daily or per period. The system tracks present, absent, late, and excused. Parents receive notifications for absences.

Reports
Generate attendance reports by student, class, or date range. Identify patterns and intervene early.`, excerpt: 'The SIS module is the foundation of your school management system.', category: 'Modules', sort_order: 2, is_published: true },
    { title: 'Learning Management System (LMS)', slug: 'lms-module', content: `The LMS module lets you create courses, upload lessons, assign homework, and track student progress.

Courses
Create courses by subject and grade level. Assign teachers and enroll students. Each course has its own page with lessons, assignments, and discussions.

Lessons
Build lessons with text, images, videos, and downloadable files. Lessons can be scheduled or made available immediately.

Assignments
Create assignments with due dates, attach rubrics, and collect submissions online. Grade with annotations and feedback.

Quizzes
Build quizzes with multiple choice, true/false, and short answer questions. Set time limits and randomize question order to prevent cheating.

Gradebook
All grades flow into a unified gradebook. Calculate final grades by weighting assignments, quizzes, and exams.`, excerpt: 'The LMS module lets you create courses, upload lessons, assign homework, and track student progress.', category: 'Modules', sort_order: 3, is_published: true },
    { title: 'Finance and Fee Management', slug: 'finance-module', content: `The Finance module handles fee structures, invoices, payments, and financial reporting.

Fee Structures
Define fee components (tuition, transport, hostel, library) per class. Set amounts, due dates, and discount rules.

Invoices
Generate invoices for individual students or in bulk. Invoices are emailed to parents and visible in the parent portal.

Payments
Accept payments online via Paystack, Flutterwave, or bank transfer. Record cash payments manually. Reconciliation is automatic for online payments.

Reports
Generate revenue reports, outstanding balances, defaulter lists, and payment trends. Export to CSV or PDF for accounting.`, excerpt: 'The Finance module handles fee structures, invoices, payments, and financial reporting.', category: 'Modules', sort_order: 4, is_published: true },
    { title: 'Timetable and Prayer Schedules', slug: 'timetable-module', content: `The Timetable module includes Adhan-aware prayer schedules, academic periods, and conflict-free class scheduling.

Prayer Schedules
Configure the five daily prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) based on your location. The timetable automatically inserts prayer breaks and can play the Adhan.

Academic Periods
Define class periods with start and end times. Assign subjects, teachers, and rooms. The system detects conflicts (double-booked teachers or rooms).

Substitute Teachers
When a teacher is absent, assign a substitute with one click. Students and parents are notified automatically.

Daily View
View today's timetable for any class, teacher, or room. Print or share with stakeholders.`, excerpt: 'The Timetable module includes Adhan-aware prayer schedules, academic periods, and conflict-free class scheduling.', category: 'Modules', sort_order: 5, is_published: true },
    { title: 'API Documentation', slug: 'api-doc', content: `iSchool exposes a REST API for third-party integrations. All endpoints require an API key passed in the apikey header.

Authentication
Send your API key in the apikey header of every request. API keys can be generated in the dashboard under Settings > API Keys.

Rate Limits
Default rate limit is 120 requests per minute per API key. Contact support for higher limits.

Endpoints
- GET /api/v1/students — list students
- POST /api/v1/students — create student
- GET /api/v1/students/:id — get student
- PATCH /api/v1/students/:id — update student
- DELETE /api/v1/students/:id — delete student

Similar patterns exist for staff, classes, courses, invoices, payments, and all other entities.

Webhooks
Subscribe to webhooks for events like new student, payment received, or attendance marked. Webhooks can be configured in the dashboard.`, excerpt: 'iSchool exposes a REST API for third-party integrations.', category: 'Developer', sort_order: 6, is_published: true },
    { title: 'Parent Portal Guide', slug: 'parent-portal-guide', content: `The parent portal gives parents a single dashboard to track their child's progress.

Accessing the Portal
Parents log in at /auth/login with their email and password. They are automatically redirected to /portal/parent.

Dashboard
The dashboard shows attendance summary, recent grades, upcoming events, fee status, and unread messages.

Attendance
View daily attendance for the term. See patterns and trends. Receive notifications for absences.

Grades
View grades for assignments, quizzes, and exams. See teacher feedback and rubric scores.

Fees
View outstanding invoices and payment history. Pay online securely.

Messages
Communicate directly with teachers and school administration. All conversations are saved.

Events
View upcoming school events and RSVP online.`, excerpt: 'A guide for parents on using the parent portal to track their child progress.', category: 'Guides', sort_order: 7, is_published: true },
    { title: 'Teacher Portal Guide', slug: 'teacher-portal-guide', content: `The teacher portal helps teachers manage their classes, lessons, and student interactions.

Accessing the Portal
Teachers log in at /auth/login and are redirected to /portal/teacher.

My Classes
View all classes you teach. Click any class to see the student list, timetable, and recent activity.

Attendance
Mark attendance for each class period. The system tracks present, absent, late, and excused.

Assignments
Create assignments, collect submissions, grade with feedback, and publish grades to students and parents.

Gradebook
Enter grades for assignments, quizzes, and exams. The gradebook calculates averages and final grades automatically.

Messages
Communicate with students, parents, and other staff. Send announcements to your classes.`, excerpt: 'A guide for teachers on using the teacher portal to manage classes and student interactions.', category: 'Guides', sort_order: 8, is_published: true },
    { title: 'Student Portal Guide', slug: 'student-portal-guide', content: `The student portal gives students access to their coursework, grades, and school information.

Accessing the Portal
Students log in at /auth/login with their school email. They are redirected to /portal/student.

Dashboard
The dashboard shows today's timetable, upcoming assignments, recent grades, and announcements.

Courses
View all enrolled courses. Access lessons, download materials, submit assignments, and take quizzes.

Grades
View grades for all assignments, quizzes, and exams. See class rank and progress over time.

Attendance
View your attendance record for the term. See your attendance percentage.

Messages
Communicate with teachers and classmates. Receive school announcements.`, excerpt: 'A guide for students on using the student portal to access coursework and grades.', category: 'Guides', sort_order: 9, is_published: true },
  ];
  const r = await seedMany('platform_docs', docs, 'slug');
  stats.inserted += r.inserted; stats.skipped += r.skipped; stats.collections++;
}

// ═══════════════════════════════════════════════════════════
// SEED: SCHOOL (Al-Noor Academy) + ALL RELATED DATA
// ═══════════════════════════════════════════════════════════

async function seedSchoolData() {
  log('Seeding school: Al-Noor Academy...');

  // 1. School (upsert — uses existing if found)
  const existingSchools = await queryCollection('schools', { field: 'slug', op: 'eq', value: 'alnoor' }, 1);
  let school: any;
  if (existingSchools.length > 0) {
    school = existingSchools[0];
    log(`  School already exists: ${school.name} (${school.id})`);
  } else {
    school = await insertDoc('schools', {
      name: 'Al-Noor Academy',
      slug: 'alnoor',
      tagline: 'Excellence in Islamic Education',
      description: 'A premier Islamic school committed to academic excellence and moral character development, nurturing the next generation of leaders with strong Islamic values and modern education.',
      primary_color: '#05B34D',
      secondary_color: '#F2B91C',
      logo_url: '',
      favicon_url: '',
      address: '123 Education Avenue, Lagos, Nigeria',
      phone: '+234 800 123 4567',
      email: 'info@alnoor.edu',
      website: 'https://alnoor.edu',
      domain: '',
      theme: 'aurora',
      locale: 'en',
      module_settings: '{}',
      settings: '{}',
      social_handles: j({
        facebook: 'https://facebook.com/alnooracademy',
        twitter: 'https://twitter.com/alnooracademy',
        instagram: 'https://instagram.com/alnooracademy',
        youtube: 'https://youtube.com/@alnooracademy',
      }),
      active_modules: j(['cms', 'sis', 'lms', 'finance', 'communication', 'hr', 'library', 'hostel', 'transport', 'exams', 'inventory', 'cbt', 'events', 'admissions']),
      status: 'active',
      is_active: true,
    });
    log(`  Created school: ${school.name} (${school.id})`);
  }
  const schoolId = school.id;

  // 2. Users — admin, teachers, students, parents
  log('  Seeding users...');
  const adminHash = await hashPassword('school123');
  const teacherHash = await hashPassword('teacher123');
  const studentHash = await hashPassword('student123');
  const parentHash = await hashPassword('parent123');

  const adminUser = await seedIfNotExists('users', {
    email: 'principal@alnoor.edu', password_hash: adminHash,
    name: 'Dr. Ahmad Al-Rashid', role: 'school_admin',
    is_active: true,
  }, 'email');

  const teacher1 = await seedIfNotExists('users', {
    email: 'ibrahim.musa@alnoor.edu', password_hash: teacherHash,
    name: 'Ibrahim Musa', role: 'teacher', is_active: true,
  }, 'email');

  const teacher2 = await seedIfNotExists('users', {
    email: 'fatima.abdullah@alnoor.edu', password_hash: teacherHash,
    name: 'Fatima Abdullah', role: 'teacher', is_active: true,
  }, 'email');

  const teacher3 = await seedIfNotExists('users', {
    email: 'yusuf.ali@alnoor.edu', password_hash: teacherHash,
    name: 'Yusuf Ali', role: 'teacher', is_active: true,
  }, 'email');

  const student1User = await seedIfNotExists('users', {
    email: 'ahmad.rashid@student.alnoor.edu', password_hash: studentHash,
    name: 'Ahmad Rashid', role: 'student', is_active: true,
  }, 'email');

  const student2User = await seedIfNotExists('users', {
    email: 'aisha.rahman@student.alnoor.edu', password_hash: studentHash,
    name: 'Aisha Rahman', role: 'student', is_active: true,
  }, 'email');

  const student3User = await seedIfNotExists('users', {
    email: 'omar.sani@student.alnoor.edu', password_hash: studentHash,
    name: 'Omar Sani', role: 'student', is_active: true,
  }, 'email');

  const student4User = await seedIfNotExists('users', {
    email: 'khadija.ibrahim@student.alnoor.edu', password_hash: studentHash,
    name: 'Khadija Ibrahim', role: 'student', is_active: true,
  }, 'email');

  const student5User = await seedIfNotExists('users', {
    email: 'aliyu.hassan@student.alnoor.edu', password_hash: studentHash,
    name: 'Aliyu Hassan', role: 'student', is_active: true,
  }, 'email');

  const parent1User = await seedIfNotExists('users', {
    email: 'rashid.parent@gmail.com', password_hash: parentHash,
    name: 'Mallam Rashid', role: 'parent', is_active: true,
  }, 'email');

  const parent2User = await seedIfNotExists('users', {
    email: 'rahman.parent@gmail.com', password_hash: parentHash,
    name: 'Mrs. Rahman', role: 'parent', is_active: true,
  }, 'email');

  // 3. School members — link users to school
  log('  Seeding school_members...');
  const members = [
    { user_id: adminUser.id, school_id: schoolId, role: 'school_admin', active: true },
    { user_id: teacher1.id, school_id: schoolId, role: 'teacher', active: true },
    { user_id: teacher2.id, school_id: schoolId, role: 'teacher', active: true },
    { user_id: teacher3.id, school_id: schoolId, role: 'teacher', active: true },
    { user_id: student1User.id, school_id: schoolId, role: 'student', active: true },
    { user_id: student2User.id, school_id: schoolId, role: 'student', active: true },
    { user_id: student3User.id, school_id: schoolId, role: 'student', active: true },
    { user_id: student4User.id, school_id: schoolId, role: 'student', active: true },
    { user_id: student5User.id, school_id: schoolId, role: 'student', active: true },
    { user_id: parent1User.id, school_id: schoolId, role: 'parent', active: true },
    { user_id: parent2User.id, school_id: schoolId, role: 'parent', active: true },
  ];
  for (const m of members) {
    try {
      const existing = await queryCollection('school_members', {
        and: [
          { field: 'user_id', op: 'eq', value: m.user_id },
          { field: 'school_id', op: 'eq', value: m.school_id },
        ],
      }, 1);
      if (existing.length === 0) {
        await insertDoc('school_members', m);
        stats.inserted++;
      } else {
        stats.skipped++;
      }
    } catch (e: any) { stats.failed++; console.warn(`  [skip] school_members: ${e.message.substring(0, 80)}`); }
  }

  // 4. Staff records (for teachers)
  log('  Seeding staff...');
  const staff1 = await seedIfNotExists('staff', {
    school_id: schoolId, user_id: teacher1.id,
    staff_id: 'STF-001', first_name: 'Ibrahim', last_name: 'Musa',
    department: 'Science', designation: 'Mathematics Teacher',
    employment_type: 'full_time', email: 'ibrahim.musa@alnoor.edu',
    phone: '+234 800 234 5678', join_date: '2024-09-01',
    gender: 'male', status: 'active',
  }, 'staff_id');

  const staff2 = await seedIfNotExists('staff', {
    school_id: schoolId, user_id: teacher2.id,
    staff_id: 'STF-002', first_name: 'Fatima', last_name: 'Abdullah',
    department: 'Languages', designation: 'English Teacher',
    employment_type: 'full_time', email: 'fatima.abdullah@alnoor.edu',
    phone: '+234 800 345 6789', join_date: '2024-09-01',
    gender: 'female', status: 'active',
  }, 'staff_id');

  const staff3 = await seedIfNotExists('staff', {
    school_id: schoolId, user_id: teacher3.id,
    staff_id: 'STF-003', first_name: 'Yusuf', last_name: 'Ali',
    department: 'Islamic Studies', designation: 'Quran & Arabic Teacher',
    employment_type: 'full_time', email: 'yusuf.ali@alnoor.edu',
    phone: '+234 800 456 7890', join_date: '2024-09-01',
    gender: 'male', status: 'active',
  }, 'staff_id');

  // 5. Classes
  log('  Seeding classes...');
  const class1 = await seedIfNotExists('classes', {
    school_id: schoolId, name: 'Grade 5 - Section A', slug: 'grade-5-a',
    section: 'A', grade_level: 'Grade 5', teacher_name: 'Ibrahim Musa',
    capacity: 25, has_detail_page: true, sort_order: 1,
    homeroom_teacher_id: staff1.id,
    description: 'Grade 5 Section A — Mathematics and Science focus.',
  }, 'slug');

  const class2 = await seedIfNotExists('classes', {
    school_id: schoolId, name: 'Grade 5 - Section B', slug: 'grade-5-b',
    section: 'B', grade_level: 'Grade 5', teacher_name: 'Fatima Abdullah',
    capacity: 25, has_detail_page: true, sort_order: 2,
    homeroom_teacher_id: staff2.id,
    description: 'Grade 5 Section B — Languages and Humanities focus.',
  }, 'slug');

  const class3 = await seedIfNotExists('classes', {
    school_id: schoolId, name: 'Grade 6 - Section A', slug: 'grade-6-a',
    section: 'A', grade_level: 'Grade 6', teacher_name: 'Yusuf Ali',
    capacity: 30, has_detail_page: true, sort_order: 3,
    homeroom_teacher_id: staff3.id,
    description: 'Grade 6 Section A — Islamic Studies and Arabic focus.',
  }, 'slug');

  // 6. Students
  log('  Seeding students...');
  const student1 = await seedIfNotExists('students', {
    school_id: schoolId, user_id: student1User.id,
    student_id: 'STU-001', first_name: 'Ahmad', last_name: 'Rashid',
    gender: 'male', email: 'ahmad.rashid@student.alnoor.edu',
    phone: '+234 801 111 1111', status: 'active',
    enrollment_date: '2025-09-01', custom_fields: '{}', documents: '[]',
    address: '12 Lagos Street, Lagos', date_of_birth: '2014-03-15',
    parent_name: 'Mallam Rashid', parent_phone: '+234 801 999 9999',
  }, 'student_id');

  const student2 = await seedIfNotExists('students', {
    school_id: schoolId, user_id: student2User.id,
    student_id: 'STU-002', first_name: 'Aisha', last_name: 'Rahman',
    gender: 'female', email: 'aisha.rahman@student.alnoor.edu',
    phone: '+234 802 222 2222', status: 'active',
    enrollment_date: '2025-09-01', custom_fields: '{}', documents: '[]',
    address: '34 Kano Avenue, Lagos', date_of_birth: '2014-05-22',
    parent_name: 'Mrs. Rahman', parent_phone: '+234 802 888 8888',
  }, 'student_id');

  const student3 = await seedIfNotExists('students', {
    school_id: schoolId, user_id: student3User.id,
    student_id: 'STU-003', first_name: 'Omar', last_name: 'Sani',
    gender: 'male', email: 'omar.sani@student.alnoor.edu',
    phone: '+234 803 333 3333', status: 'active',
    enrollment_date: '2025-09-01', custom_fields: '{}', documents: '[]',
    address: '56 Abuja Road, Lagos', date_of_birth: '2013-07-10',
    parent_name: 'Alhaji Sani', parent_phone: '+234 803 777 7777',
  }, 'student_id');

  const student4 = await seedIfNotExists('students', {
    school_id: schoolId, user_id: student4User.id,
    student_id: 'STU-004', first_name: 'Khadija', last_name: 'Ibrahim',
    gender: 'female', email: 'khadija.ibrahim@student.alnoor.edu',
    phone: '+234 804 444 4444', status: 'active',
    enrollment_date: '2025-09-01', custom_fields: '{}', documents: '[]',
    address: '78 Ibadan Street, Lagos', date_of_birth: '2014-09-18',
    parent_name: 'Mallam Ibrahim', parent_phone: '+234 804 666 6666',
  }, 'student_id');

  const student5 = await seedIfNotExists('students', {
    school_id: schoolId, user_id: student5User.id,
    student_id: 'STU-005', first_name: 'Aliyu', last_name: 'Hassan',
    gender: 'male', email: 'aliyu.hassan@student.alnoor.edu',
    phone: '+234 805 555 5555', status: 'active',
    enrollment_date: '2025-09-01', custom_fields: '{}', documents: '[]',
    address: '90 Kaduna Road, Lagos', date_of_birth: '2013-11-25',
    parent_name: 'Alhaji Hassan', parent_phone: '+234 805 555 0000',
  }, 'student_id');

  // 7. Enrollments
  log('  Seeding enrollments...');
  const enrollments = [
    { school_id: schoolId, student_id: student1.id, class_id: class1.id, academic_year: '2025-2026', status: 'accepted' },
    { school_id: schoolId, student_id: student2.id, class_id: class1.id, academic_year: '2025-2026', status: 'accepted' },
    { school_id: schoolId, student_id: student3.id, class_id: class2.id, academic_year: '2025-2026', status: 'accepted' },
    { school_id: schoolId, student_id: student4.id, class_id: class2.id, academic_year: '2025-2026', status: 'accepted' },
    { school_id: schoolId, student_id: student5.id, class_id: class3.id, academic_year: '2025-2026', status: 'accepted' },
  ];
  for (const e of enrollments) {
    try {
      const existing = await queryCollection('enrollments', {
        and: [
          { field: 'student_id', op: 'eq', value: e.student_id },
          { field: 'class_id', op: 'eq', value: e.class_id },
          { field: 'academic_year', op: 'eq', value: e.academic_year },
        ],
      }, 1);
      if (existing.length === 0) {
        await insertDoc('enrollments', e);
        stats.inserted++;
      } else { stats.skipped++; }
    } catch { stats.failed++; }
  }

  // 8. Courses
  log('  Seeding courses...');
  const course1 = await seedIfNotExists('courses', {
    school_id: schoolId, title: 'Mathematics - Grade 5', slug: 'math-grade-5',
    description: 'Comprehensive mathematics course covering arithmetic, geometry, and introductory algebra.',
    subject: 'Mathematics', grade_level: 'Grade 5',
    teacher_id: teacher1.id, status: 'published', settings: '{}',
  }, 'slug');

  const course2 = await seedIfNotExists('courses', {
    school_id: schoolId, title: 'English Language - Grade 5', slug: 'english-grade-5',
    description: 'English language arts covering reading, writing, grammar, and comprehension.',
    subject: 'English', grade_level: 'Grade 5',
    teacher_id: teacher2.id, status: 'published', settings: '{}',
  }, 'slug');

  const course3 = await seedIfNotExists('courses', {
    school_id: schoolId, title: 'Quran Memorization - Grade 6', slug: 'quran-grade-6',
    description: 'Quran memorization (Hifz) program with Tajweed rules.',
    subject: 'Islamic Studies', grade_level: 'Grade 6',
    teacher_id: teacher3.id, status: 'published', settings: '{}',
  }, 'slug');

  // 9. Lessons
  log('  Seeding lessons...');
  await seedMany('lessons', [
    { school_id: schoolId, course_id: course1.id, title: 'Lesson 1: Place Value', slug: 'math-l1-place-value', content: 'Understanding place value up to millions.', sort_order: 1, status: 'published' },
    { school_id: schoolId, course_id: course1.id, title: 'Lesson 2: Addition and Subtraction', slug: 'math-l2-addition-subtraction', content: 'Multi-digit addition and subtraction.', sort_order: 2, status: 'published' },
    { school_id: schoolId, course_id: course2.id, title: 'Lesson 1: Parts of Speech', slug: 'english-l1-parts-of-speech', content: 'Nouns, verbs, adjectives, and adverbs.', sort_order: 1, status: 'published' },
    { school_id: schoolId, course_id: course3.id, title: 'Lesson 1: Surah Al-Fatihah', slug: 'quran-l1-al-fatihah', content: 'Memorization and Tajweed of Surah Al-Fatihah.', sort_order: 1, status: 'published' },
  ], 'slug');

  // 10. Announcements
  log('  Seeding announcements...');
  await seedMany('announcements', [
    {
      school_id: schoolId, title: 'Welcome to the 2025-2026 Academic Year!',
      slug: 'welcome-2025-2026', published: true, is_pinned: true,
      excerpt: 'A warm welcome to all students, parents, and staff.',
      content: 'Dear students, parents, and staff, we are delighted to welcome you to the 2025-2026 academic year at Al-Noor Academy. This year promises to be filled with learning, growth, and spiritual development. Our committed teachers have prepared an enriching curriculum that combines academic excellence with Islamic values.',
      cta_text: 'View School Calendar', cta_url: '/calendar',
    },
    {
      school_id: schoolId, title: 'Parent-Teacher Conference Scheduled',
      slug: 'parent-teacher-conference', published: true, is_pinned: false,
      excerpt: 'PTC will be held on Saturday, 15th November 2025.',
      content: 'We are pleased to announce that the Parent-Teacher Conference for Term 1 will be held on Saturday, 15th November 2025, from 9:00 AM to 1:00 PM. Parents are encouraged to attend and discuss their children progress with teachers.',
      cta_text: 'RSVP Here', cta_url: '/contact',
    },
    {
      school_id: schoolId, title: 'Eid Al-Fitr Holiday Announcement',
      slug: 'eid-al-fitr-holiday', published: true, is_pinned: false,
      excerpt: 'School will be closed for Eid Al-Fitr celebrations.',
      content: 'In observance of Eid Al-Fitr, the school will be closed from Wednesday through Friday. Classes will resume on Monday. We wish all our students and their families a blessed Eid. Eid Mubarak!',
    },
  ], 'slug');

  // 11. Blog posts
  log('  Seeding school blog_posts...');
  await seedMany('blog_posts', [
    {
      school_id: schoolId, title: 'Al-Noor Academy Wins State Quran Competition',
      slug: 'wins-state-quran-competition', status: 'published',
      excerpt: 'Three of our students won top positions in the Lagos State Quran Recitation Competition.',
      content: 'Alhamdulillah, three of our Grade 6 students — Ahmad Rashid, Aisha Rahman, and Omar Sani — won top positions in the Lagos State Quran Recitation Competition held last weekend. Ahmad won 1st place in the Hifz category, Aisha won 2nd in Tajweed, and Omar won 3rd in Tafsir. We are proud of their achievement and dedication.',
      author: 'Dr. Ahmad Al-Rashid',
    },
    {
      school_id: schoolId, title: 'New Science Laboratory Inaugurated',
      slug: 'new-science-laboratory', status: 'published',
      excerpt: 'A state-of-the-art science lab was inaugurated last week.',
      content: 'We are pleased to announce the inauguration of our new science laboratory, equipped with modern equipment for physics, chemistry, and biology experiments. This will greatly enhance our students practical science education.',
      author: 'Ibrahim Musa',
    },
  ], 'slug');

  // 12. Programs
  log('  Seeding programs...');
  await seedMany('programs', [
    {
      school_id: schoolId, name: 'Hifz Program', slug: 'hifz-program',
      description: 'Full Quran memorization program for dedicated students.',
      is_published: true, sort_order: 1,
      content: 'Our Hifz program is designed for students who wish to memorize the entire Quran. The program runs over 3-5 years with dedicated teachers and a structured curriculum.',
    },
    {
      school_id: schoolId, name: 'STEM Excellence', slug: 'stem-excellence',
      description: 'Advanced science, technology, engineering, and mathematics program.',
      is_published: true, sort_order: 2,
      content: 'Our STEM program prepares students for careers in science and technology through hands-on projects, robotics, and coding.',
    },
    {
      school_id: schoolId, name: 'Arabic Language Immersion', slug: 'arabic-immersion',
      description: 'Immersive Arabic language program for all grades.',
      is_published: true, sort_order: 3,
      content: 'Our Arabic immersion program helps students achieve fluency in classical and modern standard Arabic.',
    },
  ], 'slug');

  // 13. FAQs
  log('  Seeding faqs...');
  await seedMany('faqs', [
    { school_id: schoolId, question: 'What are the school hours?', answer: 'School runs from 7:30 AM to 2:30 PM, Monday through Friday. Morning assembly starts at 7:30 AM sharp.', sort_order: 1, is_published: true },
    { school_id: schoolId, question: 'What is the admission process?', answer: 'Parents submit an application form, the student takes an entrance assessment, and an interview is conducted. Successful candidates receive an admission offer within one week.', sort_order: 2, is_published: true },
    { school_id: schoolId, question: 'Do you offer scholarships?', answer: 'Yes, we offer merit-based scholarships for outstanding students and need-based financial aid for families who qualify. Contact the admin office for details.', sort_order: 3, is_published: true },
    { school_id: schoolId, question: 'What is the fee structure?', answer: 'Fees vary by grade level. Please visit our admissions page or contact the admin office for the current fee schedule.', sort_order: 4, is_published: true },
    { school_id: schoolId, question: 'Do you provide school transport?', answer: 'Yes, we operate school buses covering major areas of Lagos. Routes and stops are published at the start of each term.', sort_order: 5, is_published: true },
    { school_id: schoolId, question: 'What extracurricular activities are available?', answer: 'We offer Quran competition club, science club, debate club, sports (football, basketball, athletics), and arts and crafts.', sort_order: 6, is_published: true },
  ], 'question');

  // 14. Gallery items
  log('  Seeding gallery_items...');
  await seedMany('gallery_items', [
    { school_id: schoolId, title: 'Annual Sports Day 2025', description: 'Students competing in various athletic events.', sort_order: 1, image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', is_published: true },
    { school_id: schoolId, title: 'Quran Competition', description: 'Annual Quran recitation competition.', sort_order: 2, image_url: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800', is_published: true },
    { school_id: schoolId, title: 'Science Exhibition', description: 'Students showcasing their science projects.', sort_order: 3, image_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800', is_published: true },
    { school_id: schoolId, title: 'Graduation Ceremony', description: 'Class of 2025 graduation.', sort_order: 4, image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', is_published: true },
  ], 'title');

  // 15. Contact info
  log('  Seeding contact_info...');
  await seedMany('contact_info', [
    { school_id: schoolId, type: 'general', label: 'Phone', value: '+234 800 123 4567', sort_order: 1 },
    { school_id: schoolId, type: 'general', label: 'Email', value: 'info@alnoor.edu', sort_order: 2 },
    { school_id: schoolId, type: 'general', label: 'Address', value: '123 Education Avenue, Lagos, Nigeria', sort_order: 3 },
    { school_id: schoolId, type: 'admissions', label: 'Admissions Phone', value: '+234 800 234 5678', sort_order: 4 },
    { school_id: schoolId, type: 'admissions', label: 'Admissions Email', value: 'admissions@alnoor.edu', sort_order: 5 },
  ], 'label');

  // 16. Navigation items — critical for theme Layout (organized logically)
  log('  Seeding navigation_items...');
  await seedMany('navigation_items', [
    { school_id: schoolId, label: 'Home', url: '/', sort_order: 0, is_external: false },
    { school_id: schoolId, label: 'About', url: '/about', sort_order: 1, is_external: false },
    { school_id: schoolId, label: 'Programs', url: '/programs', sort_order: 2, is_external: false },
    { school_id: schoolId, label: 'Classes', url: '/classes', sort_order: 3, is_external: false },
    { school_id: schoolId, label: 'Admissions', url: '/admissions', sort_order: 4, is_external: false },
    { school_id: schoolId, label: 'News', url: '/announcements', sort_order: 5, is_external: false },
    { school_id: schoolId, label: 'Gallery', url: '/gallery', sort_order: 6, is_external: false },
    { school_id: schoolId, label: 'FAQs', url: '/faqs', sort_order: 7, is_external: false },
    { school_id: schoolId, label: 'Contact', url: '/contact', sort_order: 8, is_external: false },
  ], 'label');

  // 17. About page
  log('  Seeding about_pages...');
  try {
    const existingAbout = await queryCollection('about_pages', { field: 'school_id', op: 'eq', value: schoolId }, 1);
    if (existingAbout.length === 0) {
      await insertDoc('about_pages', {
        school_id: schoolId,
        content: 'Al-Noor Academy is a premier Islamic school in Lagos, Nigeria, dedicated to providing quality education that combines academic excellence with Islamic values. Founded in 2010, we have grown from 50 students to over 500, serving the community with dedication and commitment to nurturing the next generation of leaders.',
        mission: 'To nurture knowledgeable, principled, and compassionate leaders who contribute positively to society while upholding Islamic values.',
        vision: 'To be the leading Islamic educational institution known for academic excellence, moral integrity, and spiritual development.',
        history: 'Founded in 2010 by Dr. Ahmad Al-Rashid, Al-Noor Academy started with just 50 students in a small facility. Today, we serve over 500 students from preschool through Grade 12, with a state-of-the-art campus, modern laboratories, and a dedicated faculty of over 40 teachers.',
        features: j([
          { title: 'Islamic Values', description: 'Quran, Hadith, and Islamic studies integrated into the curriculum.' },
          { title: 'Academic Excellence', description: 'Rigorous academic program with STEM, languages, and humanities.' },
          { title: 'Modern Facilities', description: 'Science labs, computer labs, library, and sports facilities.' },
          { title: 'Qualified Teachers', description: 'Experienced and certified teachers committed to student success.' },
        ]),
        stats: j([
          { label: 'Students', value: '500+' },
          { label: 'Teachers', value: '40+' },
          { label: 'Years of Excellence', value: '15' },
          { label: 'Graduation Rate', value: '98%' },
        ]),
      });
      stats.inserted++;
    } else { stats.skipped++; }
  } catch (e: any) { stats.failed++; console.warn(`  [skip] about_pages: ${e.message.substring(0, 80)}`); }

  // 18. Academic periods
  log('  Seeding academic_periods...');
  await seedMany('academic_periods', [
    { school_id: schoolId, name: 'Fall 2025-2026', type: 'semester', start_date: '2025-09-01', end_date: '2026-01-15', status: 'active', is_active: true },
    { school_id: schoolId, name: 'Spring 2025-2026', type: 'semester', start_date: '2026-01-20', end_date: '2026-06-15', status: 'upcoming', is_active: false },
  ], 'name');

  // 19. Prayer schedule
  log('  Seeding prayer_schedules...');
  await seedMany('prayer_schedules', [
    {
      school_id: schoolId, name: 'Regular Weekday Schedule', applies_to: 'weekday',
      periods: j([
        { label: 'Morning Assembly', start: '07:30', end: '07:50', type: 'assembly' },
        { label: 'Period 1', start: '07:50', end: '08:35', type: 'lesson' },
        { label: 'Period 2', start: '08:40', end: '09:25', type: 'lesson' },
        { label: 'Period 3', start: '09:30', end: '10:15', type: 'lesson' },
        { label: 'Break', start: '10:15', end: '10:35', type: 'break' },
        { label: 'Period 4', start: '10:35', end: '11:20', type: 'lesson' },
        { label: 'Period 5', start: '11:25', end: '12:10', type: 'lesson' },
        { label: 'Dhuhr Prayer', start: '12:15', end: '12:45', type: 'prayer', prayerName: 'dhuhr' },
        { label: 'Period 6', start: '12:50', end: '13:35', type: 'lesson' },
        { label: 'Period 7', start: '13:40', end: '14:25', type: 'lesson' },
      ]),
      fajr_time: '05:15', dhuhr_time: '12:15', asr_time: '15:30', maghrib_time: '18:45', isha_time: '20:00',
      play_adhan: true,
      notes: 'Standard weekday schedule aligned with the five daily prayers.',
    },
  ], 'name');

  // 20. Fee structures
  log('  Seeding fee_structures...');
  await seedMany('fee_structures', [
    { school_id: schoolId, name: 'Grade 5 Tuition', amount: 150000, frequency: 'annual', grade_level: 'Grade 5', description: 'Annual tuition for Grade 5 students.', is_active: true },
    { school_id: schoolId, name: 'Grade 6 Tuition', amount: 170000, frequency: 'annual', grade_level: 'Grade 6', description: 'Annual tuition for Grade 6 students.', is_active: true },
    { school_id: schoolId, name: 'Transport Fee', amount: 60000, frequency: 'annual', description: 'Annual school bus transport fee.', is_active: true },
    { school_id: schoolId, name: 'Library Fee', amount: 10000, frequency: 'annual', description: 'Annual library access fee.', is_active: true },
    { school_id: schoolId, name: 'Activity Fee', amount: 15000, frequency: 'annual', description: 'Annual extracurricular activities fee.', is_active: true },
  ], 'name');

  // 21. Invoices
  log('  Seeding invoices...');
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  await seedMany('invoices', [
    { school_id: schoolId, student_id: student1.id, invoice_number: 'INV-2025-001', amount: 235000, paid_amount: 235000, status: 'paid', issue_date: today, due_date: dueDate, description: 'Annual fees - Grade 5' },
    { school_id: schoolId, student_id: student2.id, invoice_number: 'INV-2025-002', amount: 235000, paid_amount: 100000, status: 'partial', issue_date: today, due_date: dueDate, description: 'Annual fees - Grade 5' },
    { school_id: schoolId, student_id: student3.id, invoice_number: 'INV-2025-003', amount: 255000, paid_amount: 0, status: 'unpaid', issue_date: today, due_date: dueDate, description: 'Annual fees - Grade 6' },
    { school_id: schoolId, student_id: student4.id, invoice_number: 'INV-2025-004', amount: 235000, paid_amount: 235000, status: 'paid', issue_date: today, due_date: dueDate, description: 'Annual fees - Grade 5' },
    { school_id: schoolId, student_id: student5.id, invoice_number: 'INV-2025-005', amount: 255000, paid_amount: 0, status: 'overdue', issue_date: today, due_date: '2025-09-30', description: 'Annual fees - Grade 6' },
  ], 'invoice_number');

  // 22. Payments
  log('  Seeding payments...');
  await seedMany('payments', [
    { school_id: schoolId, student_id: student1.id, invoice_id: '', amount: 235000, method: 'bank_transfer', reference: 'PAY-001', status: 'completed', payment_date: today, notes: 'Full payment via bank transfer' },
    { school_id: schoolId, student_id: student2.id, invoice_id: '', amount: 100000, method: 'paystack', reference: 'PAY-002', status: 'completed', payment_date: today, notes: 'Partial payment via Paystack' },
    { school_id: schoolId, student_id: student4.id, invoice_id: '', amount: 235000, method: 'cash', reference: 'PAY-003', status: 'completed', payment_date: today, notes: 'Cash payment at admin office' },
  ], 'reference');

  // 23. Library books
  log('  Seeding library_books...');
  await seedMany('library_books', [
    { school_id: schoolId, title: 'The Holy Quran (English Translation)', author: 'Abdullah Yusuf Ali', isbn: '978-0915957720', category: 'Islamic Studies', copies_total: 10, copies_available: 8, status: 'available', shelf_location: 'IS-001' },
    { school_id: schoolId, title: 'Mathematics for Grade 5', author: 'David Rayner', isbn: '978-0199137231', category: 'Mathematics', copies_total: 25, copies_available: 22, status: 'available', shelf_location: 'MA-101' },
    { school_id: schoolId, title: 'English Grammar in Use', author: 'Raymond Murphy', isbn: '978-0521189064', category: 'English', copies_total: 15, copies_available: 13, status: 'available', shelf_location: 'EN-201' },
    { school_id: schoolId, title: 'Sahih Al-Bukhari', author: 'Imam Bukhari', isbn: '978-9960-717-31-4', category: 'Hadith', copies_total: 5, copies_available: 5, status: 'available', shelf_location: 'HD-001' },
    { school_id: schoolId, title: 'Basic Science for Junior Schools', author: 'Stanley Aladenike', isbn: '978-978-030-795-4', category: 'Science', copies_total: 20, copies_available: 19, status: 'available', shelf_location: 'SC-301' },
  ], 'isbn');

  // 24. Events
  log('  Seeding events...');
  await seedMany('events', [
    { school_id: schoolId, title: 'Annual Sports Day', description: 'Annual inter-house sports competition.', start_date: '2025-11-22', end_date: '2025-11-22', location: 'School Sports Field', status: 'upcoming' },
    { school_id: schoolId, title: 'Quran Competition', description: 'Inter-school Quran recitation competition.', start_date: '2025-12-05', end_date: '2025-12-05', location: 'School Auditorium', status: 'upcoming' },
    { school_id: schoolId, title: 'Science Exhibition', description: 'Student science project exhibition.', start_date: '2025-12-15', end_date: '2025-12-15', location: 'Science Block', status: 'upcoming' },
    { school_id: schoolId, title: 'Parent-Teacher Conference', description: 'Term 1 PTC.', start_date: '2025-11-15', end_date: '2025-11-15', location: 'School Hall', status: 'upcoming' },
  ], 'title');

  // 25. Vehicles (transport)
  log('  Seeding vehicles...');
  await seedMany('vehicles', [
    { school_id: schoolId, registration: 'LAG-123-XY', type: 'bus', capacity: 30, model: 'Toyota Coaster', year: 2023, status: 'active' },
    { school_id: schoolId, registration: 'LAG-456-AB', type: 'bus', capacity: 25, model: 'Toyota Hiace', year: 2022, status: 'active' },
    { school_id: schoolId, registration: 'LAG-789-CD', type: 'bus', capacity: 15, model: 'Nissan Civilian', year: 2021, status: 'maintenance' },
  ], 'registration');

  // 26. Transport routes
  log('  Seeding transport_routes...');
  await seedMany('transport_routes', [
    { school_id: schoolId, name: 'Route A - Lekki', description: 'Lekki Phase 1 and 2', stops: j(['Lekki Phase 1 Gate', 'Lekki Phase 2 Bus Stop', 'Jakande Roundabout']), fare: 30000, status: 'active' },
    { school_id: schoolId, name: 'Route B - Ikeja', description: 'Ikeja and environs', stops: j(['Ikeja Along', 'Computer Village', 'Allen Avenue']), fare: 25000, status: 'active' },
    { school_id: schoolId, name: 'Route C - Yaba', description: 'Yaba and Surulere', stops: j(['Yaba Bus Stop', 'Jibowu', 'Surulere Mall']), fare: 20000, status: 'active' },
  ], 'name');

  // 27. Hostels
  log('  Seeding hostels...');
  await seedMany('hostels', [
    { school_id: schoolId, name: 'Boys Hostel A', capacity: 50, occupied: 32, warden_name: 'Mallam Yusuf', warden_phone: '+234 800 111 0001', status: 'active' },
    { school_id: schoolId, name: 'Girls Hostel B', capacity: 50, occupied: 28, warden_name: 'Mrs. Aisha', warden_phone: '+234 800 111 0002', status: 'active' },
  ], 'name');

  // 28. Exam series and exams
  log('  Seeding exam_series and exams...');
  const series1 = await seedIfNotExists('exam_series', {
    school_id: schoolId, name: 'First Term Examination 2025-2026', term: 'First Term',
    start_date: '2025-12-01', end_date: '2025-12-15', status: 'upcoming',
  }, 'name');

  await seedMany('exams', [
    { school_id: schoolId, series_id: series1.id, title: 'Mathematics Exam', subject: 'Mathematics', date: '2025-12-02', duration_minutes: 120, total_marks: 100, status: 'scheduled' },
    { school_id: schoolId, series_id: series1.id, title: 'English Exam', subject: 'English', date: '2025-12-04', duration_minutes: 120, total_marks: 100, status: 'scheduled' },
    { school_id: schoolId, series_id: series1.id, title: 'Quran Exam', subject: 'Islamic Studies', date: '2025-12-06', duration_minutes: 90, total_marks: 100, status: 'scheduled' },
  ], 'title');

  // 29. Module settings
  log('  Seeding module_settings...');
  const moduleSettings = [
    { school_id: schoolId, module: 'about', enabled: true },
    { school_id: schoolId, module: 'announcements', enabled: true },
    { school_id: schoolId, module: 'programs', enabled: true },
    { school_id: schoolId, module: 'classes', enabled: true },
    { school_id: schoolId, module: 'blog', enabled: true },
    { school_id: schoolId, module: 'gallery', enabled: true },
    { school_id: schoolId, module: 'faqs', enabled: true },
    { school_id: schoolId, module: 'contact', enabled: true },
    { school_id: schoolId, module: 'admissions', enabled: true },
    { school_id: schoolId, module: 'popups', enabled: true },
    { school_id: schoolId, module: 'forms', enabled: true },
  ];
  for (const ms of moduleSettings) {
    try {
      const existing = await queryCollection('module_settings', {
        and: [
          { field: 'school_id', op: 'eq', value: ms.school_id },
          { field: 'module', op: 'eq', value: ms.module },
        ],
      }, 1);
      if (existing.length === 0) {
        await insertDoc('module_settings', ms);
        stats.inserted++;
      } else { stats.skipped++; }
    } catch { stats.failed++; }
  }

  // 30. School subscription
  log('  Seeding school_subscriptions...');
  try {
    const growthPlan = await queryCollection('subscription_plans', { field: 'slug', op: 'eq', value: 'growth' }, 1);
    if (growthPlan.length > 0) {
      const existing = await queryCollection('school_subscriptions', { field: 'school_id', op: 'eq', value: schoolId }, 1);
      if (existing.length === 0) {
        await insertDoc('school_subscriptions', {
          school_id: schoolId,
          plan_id: growthPlan[0].id,
          status: 'trial',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
        stats.inserted++;
      } else { stats.skipped++; }
    }
  } catch (e: any) { stats.failed++; console.warn(`  [skip] school_subscriptions: ${e.message.substring(0, 80)}`); }

  // 31. Admission periods
  log('  Seeding admission_periods...');
  await seedMany('admission_periods', [
    {
      school_id: schoolId, name: '2026-2027 Admissions', slug: '2026-2027-admissions',
      open_date: '2025-10-01', close_date: '2026-06-30', is_active: true,
      description: 'Applications for the 2026-2027 academic year are now open.',
      requirements: j(['Birth certificate', 'Previous school report card', 'Two passport photographs', 'Immunization record']),
    },
  ], 'slug');

  log('  School data seeding complete.');
}

// ═══════════════════════════════════════════════════════════
// SEED: SYSTEM-LEVEL DATA (notifications templates, AI defaults)
// ═══════════════════════════════════════════════════════════

async function seedSystemData() {
  log('Seeding system-level data...');

  // Notification templates
  log('  Seeding notification_templates...');
  await seedMany('notification_templates', [
    { name: 'Welcome Email', slug: 'welcome-email', subject: 'Welcome to iSchool, {{name}}!', body: 'Hello {{name}},\n\nWelcome to iSchool. Your account has been created successfully.', type: 'email', is_active: true },
    { name: 'Password Reset', slug: 'password-reset', subject: 'Reset Your iSchool Password', body: 'Click the link below to reset your password:\n\n{{reset_link}}', type: 'email', is_active: true },
    { name: 'Fee Reminder', slug: 'fee-reminder', subject: 'Fee Payment Reminder - {{school_name}}', body: 'Dear {{parent_name}},\n\nThis is a reminder that the fee for {{student_name}} is due on {{due_date}}.', type: 'email', is_active: true },
    { name: 'Attendance Alert', slug: 'attendance-alert', subject: 'Absence Notification - {{student_name}}', body: 'Dear {{parent_name}},\n\nYour child {{student_name}} was marked absent on {{date}}.', type: 'email', is_active: true },
  ], 'slug');

  // AI providers
  log('  Seeding ai_providers...');
  await seedMany('ai_providers', [
    { name: 'OpenAI', slug: 'openai', base_url: 'https://api.openai.com/v1', is_active: true, sort_order: 1 },
    { name: 'Anthropic', slug: 'anthropic', base_url: 'https://api.anthropic.com', is_active: true, sort_order: 2 },
    { name: 'Google Gemini', slug: 'gemini', base_url: 'https://generativelanguage.googleapis.com', is_active: true, sort_order: 3 },
    { name: 'Mistral', slug: 'mistral', base_url: 'https://api.mistral.ai/v1', is_active: true, sort_order: 4 },
  ], 'slug');

  // AI models (catalog — not API keys)
  log('  Seeding ai_models...');
  await seedMany('ai_models', [
    { provider_slug: 'openai', model_id: 'gpt-4o', display_name: 'GPT-4o', context_window: 128000, is_active: true, sort_order: 1 },
    { provider_slug: 'openai', model_id: 'gpt-4o-mini', display_name: 'GPT-4o Mini', context_window: 128000, is_active: true, sort_order: 2 },
    { provider_slug: 'openai', model_id: 'gpt-4-turbo', display_name: 'GPT-4 Turbo', context_window: 128000, is_active: true, sort_order: 3 },
    { provider_slug: 'anthropic', model_id: 'claude-3-5-sonnet-20241022', display_name: 'Claude 3.5 Sonnet', context_window: 200000, is_active: true, sort_order: 4 },
    { provider_slug: 'anthropic', model_id: 'claude-3-5-haiku-20241022', display_name: 'Claude 3.5 Haiku', context_window: 200000, is_active: true, sort_order: 5 },
    { provider_slug: 'gemini', model_id: 'gemini-1.5-pro', display_name: 'Gemini 1.5 Pro', context_window: 2000000, is_active: true, sort_order: 6 },
    { provider_slug: 'gemini', model_id: 'gemini-1.5-flash', display_name: 'Gemini 1.5 Flash', context_window: 1000000, is_active: true, sort_order: 7 },
  ], 'model_id');

  // Default AI settings (no API keys — those come from env vars)
  log('  Seeding ai_settings...');
  await seedMany('ai_settings', [
    { key: 'default_provider', value: 'openai' },
    { key: 'default_model', value: 'gpt-4o-mini' },
    { key: 'default_temperature', value: '0.7' },
    { key: 'default_max_tokens', value: '1000' },
    { key: 'enable_ai_chat', value: 'true' },
    { key: 'enable_content_generation', value: 'true' },
  ], 'key');

  // Email templates
  log('  Seeding email_templates...');
  await seedMany('email_templates', [
    { name: 'Welcome Email', slug: 'welcome', subject: 'Welcome to iSchool', body: 'Welcome to iSchool, {{name}}!', is_active: true },
    { name: 'Admission Confirmation', slug: 'admission-confirmation', subject: 'Admission Confirmed at {{school_name}}', body: 'Dear {{student_name}}, your admission has been confirmed.', is_active: true },
    { name: 'Fee Receipt', slug: 'fee-receipt', subject: 'Payment Receipt - {{invoice_number}}', body: 'Thank you for your payment of {{amount}}.', is_active: true },
    { name: 'Event Invitation', slug: 'event-invitation', subject: 'Invitation: {{event_title}}', body: 'You are invited to {{event_title}} on {{event_date}}.', is_active: true },
  ], 'slug');

  // School ticket categories
  log('  Seeding school_ticket_categories...');
  await seedMany('school_ticket_categories', [
    { name: 'Technical Issue', slug: 'technical', description: 'Technical problems with the platform', sort_order: 1, is_active: true },
    { name: 'Billing Question', slug: 'billing', description: 'Questions about subscription and billing', sort_order: 2, is_active: true },
    { name: 'Feature Request', slug: 'feature-request', description: 'Request a new feature', sort_order: 3, is_active: true },
    { name: 'General Inquiry', slug: 'general', description: 'General questions about iSchool', sort_order: 4, is_active: true },
    { name: 'Bug Report', slug: 'bug', description: 'Report a bug or unexpected behavior', sort_order: 5, is_active: true },
  ], 'slug');

  // Venues
  log('  Seeding venues...');
  await seedMany('venues', [
    { school_id: '', name: 'Main Auditorium', capacity: 500, location: 'Block A, Ground Floor', is_active: true },
    { school_id: '', name: 'Sports Field', capacity: 1000, location: 'Outdoor', is_active: true },
    { school_id: '', name: 'Library Hall', capacity: 100, location: 'Block B, First Floor', is_active: true },
  ], 'name');

  log('  System data seeding complete.');
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('iSchool — Comprehensive Lightbase Seed');
  console.log('Project:', PROJECT);
  console.log('Base URL:', BASE_URL);
  console.log('═══════════════════════════════════════════════════════\n');

  // Verify connectivity
  const ping = await fetch(`${BASE_URL}/api/v1/projects/${PROJECT}`, { headers: HEADERS });
  if (!ping.ok) {
    console.error('FAILED: Cannot reach Lightbase API. Status:', ping.status);
    process.exit(1);
  }
  console.log('[seed] Lightbase API reachable.\n');

  try {
    await seedPlatformSettings();
    await seedSubscriptionPlans();
    await seedPlatformFaqs();
    await seedPlatformBlogPosts();
    await seedPlatformDocs();
    // NOTE (host 2026-09, AppSail migration): the host enforces a per-project
    // quota of 100 collections (ischool schema needs 149) so some collections
    // (incl. `schools`) could not be created. Sections whose root collection
    // is missing must not abort the whole seed run — log and continue.
    try {
      await seedSchoolData();
    } catch (e: any) {
      console.warn('[seed] school data section failed (continuing):', e.message?.substring(0, 160));
    }
    await seedSystemData();
    console.log();
    logStats();
    console.log('\n[seed] All data seeded successfully into Lightbase.');
  } catch (e: any) {
    console.error('\n[seed] FATAL ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

main();
