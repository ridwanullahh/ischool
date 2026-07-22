/**
 * Lightbase Auto-Seed
 * 
 * Runs on server startup to ensure essential data exists.
 * Uses upsert pattern — creates if not exists, does NOT overwrite if exists.
 */

import { LightbaseClient } from '../lightbase.js';

let _seeded = false;

export async function autoSeedLightbase(): Promise<void> {
  if (_seeded) return;
  _seeded = true;

  const client = new LightbaseClient();
  
  try {
    // Check if the demo school (alnoor) already exists
    const existing = await client.query('schools', {
      filter: { field: 'slug', op: 'eq', value: 'alnoor' },
      limit: 1,
    });
    if (existing.data && existing.data.length > 0) {
      console.log('[Seed] Al-Noor school already exists, skipping school seed.');
      await seedPlatformData(client);
      return;
    }

    console.log('[Seed] No Al-Noor school found, seeding essential data...');
    await seedPlatformData(client);
    await seedSchoolData(client);
    
    console.log('[Seed] All essential data seeded successfully.');
  } catch (e: any) {
    console.error('[Seed] Error during seeding:', e.message);
  }
}

async function seedPlatformData(client: LightbaseClient): Promise<void> {
  // Platform settings
  await seedIfNotExists(client, 'platform_settings', [
    { key: 'platform_name', value: 'iSchool' },
    { key: 'platform_tagline', value: 'All-in-One School Management Platform' },
    { key: 'platform_description', value: 'Comprehensive school management system with 16 modules covering every aspect of school operations.' },
    { key: 'platform_email', value: 'support@ischool.com' },
    { key: 'platform_phone', value: '+1 (555) 010-2025' },
    { key: 'platform_address', value: '123 Education Avenue, Lagos, Nigeria' },
  ], 'key');

  // Subscription plans
  await seedIfNotExists(client, 'subscription_plans', [
    { name: 'Starter', slug: 'starter', description: 'Perfect for small schools getting started', price_monthly: 4900, price_yearly: 49000, features: JSON.stringify(['Up to 100 students','Core SIS module','Attendance tracking','Basic reports','Email support']), max_students: 100, max_staff: 10, max_storage_gb: 5, is_active: true, sort_order: 1 },
    { name: 'Growth', slug: 'growth', description: 'For growing schools that need more modules', price_monthly: 9900, price_yearly: 99000, features: JSON.stringify(['Up to 500 students','All 16 modules','Parent and student portals','Advanced analytics','Priority support','Custom branding']), max_students: 500, max_staff: 30, max_storage_gb: 25, is_active: true, sort_order: 2 },
    { name: 'Enterprise', slug: 'enterprise', description: 'Full-featured for large institutions', price_monthly: 19900, price_yearly: 199000, features: JSON.stringify(['Unlimited students','All 16 modules','Multi-campus support','API access','Dedicated support','Custom integrations','White-label option','SLA guarantee']), max_students: 999999, max_staff: 999, max_storage_gb: 100, is_active: true, sort_order: 3 },
  ], 'slug');

  // Platform FAQs
  await seedIfNotExists(client, 'platform_faqs', [
    { question: 'What is iSchool?', answer: 'iSchool is a comprehensive school management platform with 16 integrated modules covering student information, learning management, finance, HR, library, hostel, transport, examinations, and more.', category: 'General', sort_order: 1, is_published: true },
    { question: 'How much does iSchool cost?', answer: 'We offer three plans: Starter at N4,900/month for small schools, Growth at N9,900/month for growing schools, and Enterprise at N19,900/month for large institutions. Annual billing saves two months.', category: 'Pricing', sort_order: 2, is_published: true },
    { question: 'Can I try iSchool before committing?', answer: 'Yes, we offer a 14-day free trial with full access to all features. No credit card required.', category: 'Pricing', sort_order: 3, is_published: true },
    { question: 'Is my school data secure?', answer: 'Absolutely. We use AES-256 encryption for sensitive data, bcrypt hashing for passwords, role-based access control, audit logging, and regular backups.', category: 'Security', sort_order: 4, is_published: true },
    { question: 'Do you support Islamic schools?', answer: 'Yes, iSchool is built with Islamic schools in mind. Our timetable system includes Adhan-aware prayer schedules aligned with the five daily prayers.', category: 'Features', sort_order: 5, is_published: true },
    { question: 'Can parents and students access the platform?', answer: 'Yes, iSchool includes dedicated portals for parents and students with attendance, fees, grades, and communication features.', category: 'Features', sort_order: 6, is_published: true },
    { question: 'What payment methods do you accept?', answer: 'We accept Stripe, Paystack, Flutterwave, and bank transfer.', category: 'Pricing', sort_order: 7, is_published: true },
    { question: 'Do you offer training and support?', answer: 'Yes, all plans include email support. Growth and Enterprise plans include priority support and onboarding training.', category: 'Support', sort_order: 8, is_published: true },
  ], 'question');

  // Platform blog posts
  await seedIfNotExists(client, 'platform_blog_posts', [
    { title: 'How iSchool Transforms School Management', slug: 'how-ischool-transforms-school-management', content: 'Managing a school involves coordinating hundreds of moving parts. iSchool brings all of this into one unified platform with 16 integrated modules.', excerpt: 'Discover how an all-in-one platform eliminates the chaos of spreadsheets and disconnected systems.', category: 'Product', tags: 'management,platform,efficiency', author: 'iSchool Team', status: 'published', is_published: true },
    { title: 'The Benefits of Adhan-Aware Prayer Schedules', slug: 'benefits-of-adhan-aware-prayer-schedules', content: 'For Islamic schools, aligning the daily schedule with the five prayers is essential. iSchool timetable module includes Adhan-aware prayer schedules.', excerpt: 'How Islamic schools can align their academic schedule with the five daily prayers.', category: 'Islamic Education', tags: 'prayer,islamic,timetable', author: 'iSchool Team', status: 'published', is_published: true },
    { title: '5 Ways to Improve Parent-Teacher Communication', slug: '5-ways-to-improve-parent-teacher-communication', content: 'Strong parent-teacher communication is correlated with better student outcomes. Here are five ways iSchool helps bridge the gap.', excerpt: 'Practical strategies for strengthening the parent-teacher relationship using technology.', category: 'Education', tags: 'communication,parents,engagement', author: 'iSchool Team', status: 'published', is_published: true },
  ], 'slug');

  // Platform docs
  await seedIfNotExists(client, 'platform_docs', [
    { title: 'Getting Started Guide', slug: 'getting-started', content: 'Welcome to iSchool! This guide will help you set up your school in under 30 minutes.', category: 'Guides', sort_order: 1, is_published: true },
    { title: 'Student Information System (SIS)', slug: 'sis-module', content: 'The SIS module is the foundation of your school management system.', category: 'Modules', sort_order: 2, is_published: true },
    { title: 'Learning Management System (LMS)', slug: 'lms-module', content: 'The LMS module lets you create courses, upload lessons, assign homework, and track student progress.', category: 'Modules', sort_order: 3, is_published: true },
    { title: 'Finance and Fee Management', slug: 'finance-module', content: 'The Finance module handles fee structures, invoices, payments, and financial reporting.', category: 'Modules', sort_order: 4, is_published: true },
    { title: 'Timetable and Prayer Schedules', slug: 'timetable-module', content: 'The Timetable module includes Adhan-aware prayer schedules, academic periods, and conflict-free class scheduling.', category: 'Modules', sort_order: 5, is_published: true },
    { title: 'API Documentation', slug: 'api-docs', content: 'iSchool exposes a REST API for third-party integrations.', category: 'Developer', sort_order: 6, is_published: true },
  ], 'slug');
}

async function seedSchoolData(client: LightbaseClient): Promise<void> {
  const bcrypt = await import('bcryptjs');
  
  // 1. Create demo school — Al-Noor Academy
  const schoolResult = await client.insert('schools', {
    name: 'Al-Noor Academy',
    slug: 'alnoor',
    tagline: 'Excellence in Islamic Education',
    description: 'A premier Islamic school committed to academic excellence and moral character development, nurturing the next generation of leaders.',
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
    module_settings: '{}',
    is_active: true,
  }).catch(e => { console.warn('[Seed] School insert failed:', e.message); return null; });
  
  if (!schoolResult) return;
  const schoolId = schoolResult.id;
  console.log('[Seed] Created school:', schoolResult.name, 'ID:', schoolId);

  // 2. Create admin user
  const adminHash = await bcrypt.default.hash('school123', 12);
  const adminUser = await client.insert('users', {
    email: 'principal@alnoor.edu',
    password_hash: adminHash,
    name: 'Dr. Ahmad Al-Rashid',
    role: 'school_admin',
    is_active: true,
  }).catch(e => { console.warn('[Seed] Admin user failed:', e.message); return null; });
  
  if (adminUser) {
    await client.insert('school_members', {
      user_id: adminUser.id,
      school_id: schoolId,
      role: 'school_admin',
      active: true,
    }).catch(() => {});
    console.log('[Seed] Created admin user:', adminUser.email);
  }

  // 3. Create teacher user
  const teacherHash = await bcrypt.default.hash('teacher123', 12);
  const teacherUser = await client.insert('users', {
    email: 'ibrahim.musa@alnoor.edu',
    password_hash: teacherHash,
    name: 'Ibrahim Musa',
    role: 'teacher',
    is_active: true,
  }).catch(() => null);
  
  if (teacherUser) {
    await client.insert('school_members', {
      user_id: teacherUser.id,
      school_id: schoolId,
      role: 'teacher',
      active: true,
    }).catch(() => {});
  }

  // 4. Create staff record for teacher
  let teacherStaffId: string | null = null;
  if (teacherUser) {
    const teacherStaff = await client.insert('staff', {
      school_id: schoolId,
      user_id: teacherUser.id,
      staff_id: 'STF-001',
      first_name: 'Ibrahim',
      last_name: 'Musa',
      department: 'Science',
      designation: 'Mathematics Teacher',
      employment_type: 'full_time',
      email: 'ibrahim.musa@alnoor.edu',
      phone: '+234 800 234 5678',
      join_date: '2024-09-01',
    }).catch(() => null);
    teacherStaffId = teacherStaff?.id || null;
  }

  // 5. Create class
  const cls = await client.insert('classes', {
    school_id: schoolId,
    name: 'Grade 5 - Section A',
    slug: 'grade-5-a',
    section: 'A',
    grade_level: 'Grade 5',
    teacher_name: 'Ibrahim Musa',
    capacity: 25,
    has_detail_page: true,
    sort_order: 1,
    homeroom_teacher_id: teacherStaffId,
  }).catch(() => null);

  // 6. Create course
  const course = await client.insert('courses', {
    school_id: schoolId,
    title: 'Mathematics - Grade 5',
    slug: 'math-grade-5',
    description: 'Comprehensive mathematics course covering arithmetic, geometry, and introductory algebra.',
    subject: 'Mathematics',
    grade_level: 'Grade 5',
    teacher_id: teacherUser?.id,
    status: 'published',
    settings: '{}',
  }).catch(() => null);

  // 7. Create student users
  const student1Hash = await bcrypt.default.hash('student123', 12);
  const student1User = await client.insert('users', {
    email: 'ahmad.rashid@student.alnoor.edu',
    password_hash: student1Hash,
    name: 'Ahmad Rashid',
    role: 'student',
    is_active: true,
  }).catch(() => null);

  const student2Hash = await bcrypt.default.hash('student123', 12);
  const student2User = await client.insert('users', {
    email: 'aisha.rahman@student.alnoor.edu',
    password_hash: student2Hash,
    name: 'Aisha Rahman',
    role: 'student',
    is_active: true,
  }).catch(() => null);

  // 8. Create student records
  if (student1User) {
    const student1 = await client.insert('students', {
      school_id: schoolId,
      user_id: student1User.id,
      student_id: 'STU-001',
      first_name: 'Ahmad',
      last_name: 'Rashid',
      gender: 'male',
      email: 'ahmad.rashid@student.alnoor.edu',
      status: 'active',
      enrollment_date: '2025-09-01',
      custom_fields: '{}',
      documents: '[]',
    }).catch(() => null);
    
    if (student1 && cls) {
      await client.insert('enrollments', {
        school_id: schoolId,
        student_id: student1.id,
        class_id: cls.id,
        academic_year: '2025-2026',
        status: 'accepted',
      }).catch(() => {});
    }
    
    await client.insert('school_members', {
      user_id: student1User.id,
      school_id: schoolId,
      role: 'student',
      active: true,
    }).catch(() => {});
  }

  if (student2User) {
    const student2 = await client.insert('students', {
      school_id: schoolId,
      user_id: student2User.id,
      student_id: 'STU-002',
      first_name: 'Aisha',
      last_name: 'Rahman',
      gender: 'female',
      email: 'aisha.rahman@student.alnoor.edu',
      status: 'active',
      enrollment_date: '2025-09-01',
      custom_fields: '{}',
      documents: '[]',
    }).catch(() => null);
    
    if (student2 && cls) {
      await client.insert('enrollments', {
        school_id: schoolId,
        student_id: student2.id,
        class_id: cls.id,
        academic_year: '2025-2026',
        status: 'accepted',
      }).catch(() => {});
    }
    
    await client.insert('school_members', {
      user_id: student2User.id,
      school_id: schoolId,
      role: 'student',
      active: true,
    }).catch(() => {});
  }

  // 9. Create academic period
  await client.insert('academic_periods', {
    school_id: schoolId,
    name: 'Fall 2025-2026',
    type: 'semester',
    start_date: '2025-09-01',
    end_date: '2026-01-15',
    status: 'active',
  }).catch(() => {});

  // 10. Create prayer schedule
  await client.insert('prayer_schedules', {
    school_id: schoolId,
    name: 'Regular Weekday Schedule',
    applies_to: 'weekday',
    periods: JSON.stringify([
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
    fajr_time: '05:15',
    dhuhr_time: '12:15',
    asr_time: '15:30',
    maghrib_time: '18:45',
    isha_time: '20:00',
    play_adhan: true,
    notes: 'Standard weekday schedule aligned with the five daily prayers.',
  }).catch(() => {});

  // 11. Create about page
  await client.insert('about_pages', {
    school_id: schoolId,
    content: 'Al-Noor Academy is a premier Islamic school in Lagos, Nigeria, dedicated to providing quality education that combines academic excellence with Islamic values.',
    mission: 'To nurture knowledgeable, principled, and compassionate leaders who contribute positively to society.',
    vision: 'To be the leading Islamic educational institution known for academic excellence and moral integrity.',
    history: 'Founded in 2010, Al-Noor Academy has grown from 50 students to over 500, serving the community with dedication.',
  }).catch(() => {});

  // 12. Create contact info
  await client.insert('contact_info', {
    school_id: schoolId,
    phone: '+234 800 123 4567',
    email: 'info@alnoor.edu',
    address: '123 Education Avenue, Lagos, Nigeria',
    map_url: '',
    latitude: '6.5244',
    longitude: '3.3792',
  }).catch(() => {});

  // 13. Create school subscription
  const growthPlan = await client.query('subscription_plans', {
    filter: { field: 'slug', op: 'eq', value: 'growth' },
    limit: 1,
  });
  if (growthPlan.data?.[0]?.id) {
    await client.insert('school_subscriptions', {
      school_id: schoolId,
      plan_id: growthPlan.data[0].id,
      status: 'trial',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    }).catch(() => {});
  }

  console.log('[Seed] School data seeded: school, admin, teacher, 2 students, class, course, prayer schedule, about page, contact info, subscription');
}

async function seedIfNotExists(
  client: LightbaseClient,
  collection: string,
  documents: Record<string, any>[],
  dedupField: string,
): Promise<void> {
  for (const doc of documents) {
    try {
      const filter = { field: dedupField, op: 'eq', value: doc[dedupField] };
      const existing = await client.query(collection, { filter, limit: 1 });
      if (existing.data && existing.data.length > 0) {
        continue;
      }
      await client.insert(collection, doc).catch((e) => {
        console.warn(`[Seed] Could not insert into ${collection}:`, e.message);
      });
    } catch (e: any) {
      console.warn(`[Seed] Could not seed ${collection}/${doc[dedupField]}:`, e.message);
    }
  }
}
