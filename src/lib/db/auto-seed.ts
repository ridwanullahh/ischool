/**
 * Lightbase Auto-Seed
 * 
 * Runs on server startup to ensure essential data exists.
 * Uses upsert pattern — creates if not exists, does NOT overwrite if exists.
 * 
 * Triggered from middleware on first request after server start.
 */

import { LightbaseClient } from '../lightbase.js';
import type { LightbaseFilter } from '../lightbase.js';

let _seeded = false;

export async function autoSeedLightbase(): Promise<void> {
  if (_seeded) return;
  _seeded = true;

  const client = new LightbaseClient();
  
  try {
    // Check if already seeded (check if schools collection has data)
    const existing = await client.query('schools', { limit: 1 });
    if (existing.data && existing.data.length > 0) {
      console.log('[Seed] Data already exists, skipping seed.');
      return;
    }

    console.log('[Seed] No data found, seeding essential records...');

    // 1. Seed platform settings
    await seedIfNotExists(client, 'platform_settings', [
      { key: 'platform_name', value: 'iSchool' },
      { key: 'platform_tagline', value: 'All-in-One School Management Platform' },
      { key: 'platform_description', value: 'Comprehensive school management system with 16 modules covering every aspect of school operations.' },
      { key: 'platform_email', value: 'support@ischool.com' },
      { key: 'platform_phone', value: '+1 (555) 010-2025' },
      { key: 'platform_address', value: '123 Education Avenue, Lagos, Nigeria' },
    ], 'key');

    // 2. Seed subscription plans
    await seedIfNotExists(client, 'subscription_plans', [
      { name: 'Starter', slug: 'starter', description: 'Perfect for small schools getting started', price_monthly: 4900, price_yearly: 49000, features: JSON.stringify(['Up to 100 students','Core SIS module','Attendance tracking','Basic reports','Email support']), max_students: 100, max_staff: 10, max_storage_gb: 5, is_active: true, sort_order: 1 },
      { name: 'Growth', slug: 'growth', description: 'For growing schools that need more modules', price_monthly: 9900, price_yearly: 99000, features: JSON.stringify(['Up to 500 students','All 16 modules','Parent & student portals','Advanced analytics','Priority support','Custom branding']), max_students: 500, max_staff: 30, max_storage_gb: 25, is_active: true, sort_order: 2 },
      { name: 'Enterprise', slug: 'enterprise', description: 'Full-featured for large institutions', price_monthly: 19900, price_yearly: 199000, features: JSON.stringify(['Unlimited students','All 16 modules','Multi-campus support','API access','Dedicated support','Custom integrations','White-label option','SLA guarantee']), max_students: 999999, max_staff: 999, max_storage_gb: 100, is_active: true, sort_order: 3 },
    ], 'slug');

    // 3. Seed platform FAQs
    await seedIfNotExists(client, 'platform_faqs', [
      { question: 'What is iSchool?', answer: 'iSchool is a comprehensive school management platform with 16 integrated modules covering student information, learning management, finance, HR, library, hostel, transport, examinations, and more.', category: 'General', sort_order: 1, is_published: true },
      { question: 'How much does iSchool cost?', answer: 'We offer three plans: Starter at N4,900/month for small schools, Growth at N9,900/month for growing schools, and Enterprise at N19,900/month for large institutions. Annual billing saves two months.', category: 'Pricing', sort_order: 2, is_published: true },
      { question: 'Can I try iSchool before committing?', answer: 'Yes, we offer a 14-day free trial with full access to all features. No credit card required. You can set up your school, import students, and explore every module.', category: 'Pricing', sort_order: 3, is_published: true },
      { question: 'Is my school data secure?', answer: 'Absolutely. We use AES-256 encryption for sensitive data, bcrypt hashing for passwords, role-based access control, audit logging, and regular backups. Your data is isolated per school with multi-tenant architecture.', category: 'Security', sort_order: 4, is_published: true },
      { question: 'Do you support Islamic schools?', answer: 'Yes, iSchool is built with Islamic schools in mind. Our timetable system includes Adhan-aware prayer schedules aligned with the five daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) plus Jumu\'ah. We also support Hijri calendar awareness and Ramadan schedules.', category: 'Features', sort_order: 5, is_published: true },
      { question: 'Can parents and students access the platform?', answer: 'Yes, iSchool includes dedicated portals for parents and students. Parents can view attendance, fees, grades, and communicate with teachers. Students can access courses, assignments, quizzes, and their timetable.', category: 'Features', sort_order: 6, is_published: true },
      { question: 'What payment methods do you accept?', answer: 'We accept Stripe, Paystack, Flutterwave, and bank transfer. Schools can also pay annually via invoice. Parents can pay fees online through the parent portal.', category: 'Pricing', sort_order: 7, is_published: true },
      { question: 'Do you offer training and support?', answer: 'Yes, all plans include email support. Growth and Enterprise plans include priority support and onboarding training. We also provide comprehensive documentation and video tutorials.', category: 'Support', sort_order: 8, is_published: true },
    ], 'question');

    // 4. Seed platform blog posts
    await seedIfNotExists(client, 'platform_blog_posts', [
      { title: 'How iSchool Transforms School Management', slug: 'how-ischool-transforms-school-management', content: 'Managing a school involves coordinating hundreds of moving parts: student records, attendance, fees, exams, staff, communication, and more. iSchool brings all of this into one unified platform...', excerpt: 'Discover how an all-in-one platform eliminates the chaos of spreadsheets and disconnected systems.', category: 'Product', tags: 'management,platform,efficiency', author: 'iSchool Team', status: 'published' },
      { title: 'The Benefits of Adhan-Aware Prayer Schedules', slug: 'benefits-of-adhan-aware-prayer-schedules', content: 'For Islamic schools, aligning the daily schedule with the five prayers is essential. iSchool\'s timetable module includes Adhan-aware prayer schedules that automatically adjust...', excerpt: 'How Islamic schools can align their academic schedule with the five daily prayers.', category: 'Islamic Education', tags: 'prayer,islamic,timetable', author: 'iSchool Team', status: 'published' },
      { title: '5 Ways to Improve Parent-Teacher Communication', slug: '5-ways-to-improve-parent-teacher-communication', content: 'Strong parent-teacher communication is correlated with better student outcomes. Here are five ways iSchool helps bridge the gap...', excerpt: 'Practical strategies for strengthening the parent-teacher relationship using technology.', category: 'Education', tags: 'communication,parents,engagement', author: 'iSchool Team', status: 'published' },
    ], 'slug');

    // 5. Seed platform docs
    await seedIfNotExists(client, 'platform_docs', [
      { title: 'Getting Started Guide', slug: 'getting-started', content: 'Welcome to iSchool! This guide will help you set up your school in under 30 minutes...', category: 'Guides', sort_order: 1 },
      { title: 'Student Information System (SIS)', slug: 'sis-module', content: 'The SIS module is the foundation of your school management system...', category: 'Modules', sort_order: 2 },
      { title: 'Learning Management System (LMS)', slug: 'lms-module', content: 'The LMS module lets you create courses, upload lessons, assign homework, and track student progress...', category: 'Modules', sort_order: 3 },
      { title: 'Finance and Fee Management', slug: 'finance-module', content: 'The Finance module handles fee structures, invoices, payments, and financial reporting...', category: 'Modules', sort_order: 4 },
      { title: 'Timetable and Prayer Schedules', slug: 'timetable-module', content: 'The Timetable module includes Adhan-aware prayer schedules, academic periods, and conflict-free class scheduling...', category: 'Modules', sort_order: 5 },
      { title: 'API Documentation', slug: 'api-docs', content: 'iSchool exposes a REST API for third-party integrations. All endpoints require authentication via session cookie...', category: 'Developer', sort_order: 6 },
    ], 'slug');

    console.log('[Seed] Essential data seeded successfully.');
  } catch (e: any) {
    console.error('[Seed] Error during seeding:', e.message);
    // Don't crash the app — seeding is best-effort
  }
}

/**
 * Seed documents into a collection if they don't already exist.
 * Uses upsert pattern — checks by dedupField, inserts only if not found.
 * Does NOT overwrite existing data.
 */
async function seedIfNotExists(
  client: LightbaseClient,
  collection: string,
  documents: Record<string, any>[],
  dedupField: string,
): Promise<void> {
  for (const doc of documents) {
    try {
      const filter: LightbaseFilter = { field: dedupField, op: 'eq', value: doc[dedupField] };
      const existing = await client.query(collection, { filter, limit: 1 });
      if (existing.data && existing.data.length > 0) {
        continue; // Already exists — don't overwrite
      }
      // Insert new document
      await client.insert(collection, doc).catch((e) => {
        console.warn(`[Seed] Could not insert into ${collection}:`, e.message);
      });
    } catch (e: any) {
      console.warn(`[Seed] Could not seed ${collection}/${doc[dedupField]}:`, e.message);
    }
  }
}
