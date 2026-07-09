import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { resolve } from 'path';
import { existsSync } from 'fs';

const DB_PATH = resolve(process.cwd(), 'ischool.db');

let _db: ReturnType<typeof drizzle> | null = null;
let _migrated = false;

/**
 * Runs the full migration (all CREATE TABLE IF NOT EXISTS statements)
 * directly using raw SQL. This ensures the database schema is always
 * up-to-date when the app starts, even on fresh deployments.
 *
 * This is a self-contained migration that doesn't depend on the
 * migrate.ts script being run manually.
 */
function autoMigrate(sqlite: Database.Database) {
  if (_migrated) return;
  _migrated = true;

  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'school_admin',
      avatar_url TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      two_factor_secret TEXT,
      preferred_language TEXT DEFAULT 'en',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      tagline TEXT,
      logo_url TEXT,
      favicon_url TEXT,
      primary_color TEXT DEFAULT '#2563eb',
      theme TEXT DEFAULT 'aurora',
      custom_domain TEXT,
      settings TEXT DEFAULT '{}',
      social_handles TEXT DEFAULT '{}',
      owner_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'active',
      locale TEXT DEFAULT 'en',
      active_modules TEXT DEFAULT '[]',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS school_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'editor',
      active INTEGER DEFAULT 1,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS about_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
      value_proposition TEXT,
      mission TEXT,
      vision TEXT,
      history TEXT,
      features TEXT DEFAULT '[]',
      stats TEXT DEFAULT '[]',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT,
      excerpt TEXT,
      banner_image_url TEXT,
      cta_text TEXT,
      cta_url TEXT,
      is_pinned INTEGER DEFAULT 0,
      published INTEGER DEFAULT 1,
      published_at TEXT,
      author_id INTEGER REFERENCES users(id),
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT,
      section TEXT,
      description TEXT,
      content TEXT,
      grade_level TEXT,
      teacher_name TEXT,
      capacity INTEGER,
      image_url TEXT,
      has_detail_page INTEGER DEFAULT 0,
      homeroom_teacher_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT,
      excerpt TEXT,
      cover_image_url TEXT,
      author_id INTEGER REFERENCES users(id),
      is_published INTEGER DEFAULT 0,
      published_at TEXT,
      category TEXT,
      tags TEXT DEFAULT '[]',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      content TEXT,
      duration TEXT,
      level TEXT,
      icon TEXT,
      image_url TEXT,
      has_detail_page INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT,
      sort_order INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT,
      image_url TEXT NOT NULL,
      description TEXT,
      category TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS contact_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      label TEXT,
      value TEXT NOT NULL,
      type TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS contact_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS navigation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      parent_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      is_external INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      subtitle TEXT,
      link_url TEXT,
      link_text TEXT,
      image_url TEXT,
      position TEXT DEFAULT 'top',
      is_active INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      display_pages TEXT DEFAULT '["all"]',
      style_overrides TEXT DEFAULT '{}',
      created_at INTEGER,
      sort_order INTEGER,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS popups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT,
      image_url TEXT,
      link_url TEXT,
      link_text TEXT,
      trigger_type TEXT DEFAULT 'on_load',
      trigger_delay INTEGER DEFAULT 0,
      display_frequency TEXT DEFAULT 'once_per_session',
      is_active INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      display_pages TEXT DEFAULT '["all"]',
      created_at INTEGER,
      style_overrides TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      student_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT,
      gender TEXT,
      photo_url TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      medical_notes TEXT,
      allergies TEXT,
      parent_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'active',
      enrollment_date TEXT,
      custom_fields TEXT DEFAULT '{}',
      documents TEXT DEFAULT '[]',
      family_group_id INTEGER,
      blood_group TEXT,
      nationality TEXT,
      religion TEXT,
      previous_school TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id INTEGER REFERENCES classes(id),
      academic_period_id INTEGER,
      status TEXT DEFAULT 'enrolled',
      enrollment_date TEXT,
      created_at INTEGER,
      academic_year TEXT,
      term TEXT,
      notes TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id INTEGER,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'present',
      notes TEXT,
      marked_by INTEGER REFERENCES users(id),
      marked_at INTEGER,
      created_at INTEGER,
      period TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      subject TEXT,
      grade_level TEXT,
      teacher_id INTEGER REFERENCES users(id),
      is_published INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      slug TEXT,
      cover_image_url TEXT,
      status TEXT,
      settings TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      class_id INTEGER REFERENCES classes(id),
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      max_points REAL,
      created_by INTEGER REFERENCES users(id),
      created_at INTEGER,
      instructions TEXT,
      allow_late INTEGER,
      allow_resubmit INTEGER,
      is_group INTEGER,
      attachments TEXT,
      rubric TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      content TEXT,
      file_url TEXT,
      status TEXT DEFAULT 'submitted',
      score REAL,
      feedback TEXT,
      graded_by INTEGER REFERENCES users(id),
      graded_at INTEGER,
      submitted_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id),
      title TEXT NOT NULL,
      description TEXT,
      duration INTEGER,
      max_score REAL,
      max_attempts INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'draft',
      created_at INTEGER,
      time_limit INTEGER,
      passing_score INTEGER,
      randomize INTEGER,
      show_results INTEGER,
      scheduled_start TEXT,
      scheduled_end TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT,
      points INTEGER DEFAULT 1,
      difficulty TEXT DEFAULT 'medium',
      tags TEXT DEFAULT '[]',
      explanation TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      answers TEXT NOT NULL,
      score REAL,
      max_score REAL,
      status TEXT DEFAULT 'in_progress',
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      assignment_id INTEGER REFERENCES assignments(id),
      submission_id INTEGER REFERENCES submissions(id),
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id),
      assignment_title TEXT,
      exam_title TEXT,
      score REAL,
      max_score REAL,
      grade TEXT,
      feedback TEXT,
      graded_by INTEGER REFERENCES users(id),
      created_at INTEGER,
      term TEXT,
      academic_year TEXT,
      category TEXT,
      comment TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      staff_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      photo_url TEXT,
      department TEXT,
      designation TEXT,
      employment_type TEXT NOT NULL DEFAULT 'full_time',
      email TEXT,
      phone TEXT,
      address TEXT,
      qualifications TEXT DEFAULT '[]',
      certifications TEXT DEFAULT '[]',
      join_date TEXT,
      salary INTEGER,
      bank_details TEXT,
      emergency_contact TEXT,
      documents TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      invoice_number TEXT,
      description TEXT,
      amount INTEGER NOT NULL,
      amount_paid INTEGER DEFAULT 0,
      balance INTEGER NOT NULL,
      status TEXT DEFAULT 'unpaid',
      due_date TEXT,
      issued_at INTEGER,
      created_at INTEGER,
      fee_structure_id INTEGER,
      discount INTEGER,
      fine INTEGER,
      paid_amount INTEGER,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      method TEXT NOT NULL,
      reference TEXT,
      status TEXT DEFAULT 'completed',
      paid_by INTEGER REFERENCES users(id),
      notes TEXT,
      paid_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS fee_structures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount INTEGER,
      type TEXT DEFAULT 'one_time',
      class_id INTEGER REFERENCES classes(id),
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER,
      grade_level TEXT,
      category TEXT,
      items TEXT,
      total_amount INTEGER,
      frequency TEXT,
      academic_year TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      recipient_id INTEGER REFERENCES users(id),
      group_id TEXT,
      subject TEXT,
      content TEXT NOT NULL,
      attachments TEXT DEFAULT '[]',
      parent_message_id INTEGER,
      is_read INTEGER DEFAULT 0,
      read_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      school_id INTEGER REFERENCES schools(id),
      title TEXT NOT NULL,
      message TEXT,
      type TEXT,
      link TEXT,
      read_at INTEGER,
      body TEXT,
      channel TEXT,
      is_read INTEGER,
      updated_at TEXT,
      created_at INTEGER);

    CREATE TABLE IF NOT EXISTS library_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      author TEXT,
      isbn TEXT,
      publisher TEXT,
      genre TEXT,
      category TEXT,
      cover_url TEXT,
      description TEXT,
      total_copies INTEGER DEFAULT 1,
      available_copies INTEGER DEFAULT 1,
      shelf_location TEXT,
      barcode TEXT,
      purchase_date TEXT,
      price INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS library_loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
      borrower_id INTEGER NOT NULL REFERENCES users(id),
      issued_by INTEGER REFERENCES users(id),
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      return_date TEXT,
      renewals INTEGER DEFAULT 0,
      fine INTEGER DEFAULT 0,
      fine_paid INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS hostels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT,
      capacity INTEGER,
      warden_id INTEGER REFERENCES users(id),
      created_at INTEGER,
      total_rooms INTEGER,
      total_beds INTEGER,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS hostel_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
      room_number TEXT NOT NULL,
      type TEXT,
      capacity INTEGER DEFAULT 1,
      created_at INTEGER,
      floor INTEGER,
      occupants INTEGER,
      status TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS hostel_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      check_in_date TEXT,
      check_out_date TEXT,
      status TEXT DEFAULT 'active',
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS hostel_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      room_id INTEGER, type TEXT NOT NULL, timestamp TEXT NOT NULL, notes TEXT,
      recorded_by INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS hostel_visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      visitor_name TEXT NOT NULL, visitor_phone TEXT, visitor_relation TEXT,
      visiting_student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      hostel_id INTEGER, time_in TEXT NOT NULL, time_out TEXT,
      purpose TEXT, notes TEXT, recorded_by INTEGER,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS hostel_maintenance_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      hostel_id INTEGER NOT NULL, room_id INTEGER,
      title TEXT NOT NULL, description TEXT,
      category TEXT DEFAULT 'other', priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending', reported_by INTEGER,
      assigned_to TEXT, cost INTEGER, completed_at INTEGER, notes TEXT,
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      registration_number TEXT,
      type TEXT,
      capacity INTEGER,
      driver_name TEXT,
      driver_phone TEXT,
      condition TEXT,
      created_at INTEGER,
      plate_number TEXT,
      driver_id INTEGER,
      status TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS transport_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      stops TEXT,
      schedule TEXT,
      created_at INTEGER,
      vehicle_id INTEGER,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS transport_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      route_id INTEGER NOT NULL REFERENCES transport_routes(id),
      stop_name TEXT,
      status TEXT DEFAULT 'active',
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS vehicle_maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      vehicle_id INTEGER NOT NULL, service_type TEXT DEFAULT 'routine',
      description TEXT, service_date TEXT NOT NULL, next_service_date TEXT,
      odometer INTEGER, cost INTEGER, service_provider TEXT,
      status TEXT DEFAULT 'scheduled', notes TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS vehicle_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      vehicle_id INTEGER, driver_id INTEGER,
      document_type TEXT NOT NULL, document_number TEXT,
      issue_date TEXT, expiry_date TEXT NOT NULL, file_url TEXT, notes TEXT,
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT,
      serial_number TEXT,
      description TEXT,
      purchase_date TEXT,
      purchase_price INTEGER,
      current_value INTEGER,
      assigned_to INTEGER REFERENCES users(id),
      location TEXT,
      condition TEXT DEFAULT 'good',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER DEFAULT 0,
      unit TEXT,
      reorder_level INTEGER DEFAULT 0,
      created_at INTEGER,
      supplier TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      start_time TEXT,
      end_time TEXT,
      venue TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurrence_rule TEXT,
      audience TEXT DEFAULT '[]',
      rsvp_required INTEGER DEFAULT 0,
      image_url TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS event_rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
      response TEXT NOT NULL, number_of_guests INTEGER DEFAULT 0,
      notes TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS venues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, type TEXT DEFAULT 'other',
      capacity INTEGER, location TEXT, facilities TEXT DEFAULT '[]',
      status TEXT DEFAULT 'available', notes TEXT,
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS behavior_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      description TEXT,
      points INTEGER DEFAULT 0,
      logged_by INTEGER REFERENCES users(id),
      created_at INTEGER,
      category TEXT,
      recorded_by INTEGER,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS lesson_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      class_id INTEGER REFERENCES classes(id),
      subject TEXT,
      title TEXT NOT NULL,
      objectives TEXT,
      content TEXT,
      resources TEXT DEFAULT '[]',
      status TEXT DEFAULT 'draft',
      created_by INTEGER REFERENCES users(id),
      created_at INTEGER,
      teacher_id INTEGER,
      course_id INTEGER,
      week TEXT,
      materials TEXT,
      activities TEXT,
      assessment TEXT,
      updated_at INTEGER);
    CREATE TABLE IF NOT EXISTS seating_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      class_id INTEGER NOT NULL, name TEXT NOT NULL,
      layout TEXT NOT NULL, rows INTEGER DEFAULT 5, cols INTEGER DEFAULT 6,
      is_default INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS interactive_lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      teacher_id INTEGER NOT NULL, class_id INTEGER, course_id INTEGER,
      title TEXT NOT NULL, description TEXT, slides TEXT NOT NULL,
      mode TEXT DEFAULT 'live', status TEXT DEFAULT 'draft',
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS academic_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT,
      start_date TEXT,
      end_date TEXT,
      is_active INTEGER DEFAULT 0,
      created_at INTEGER,
      parent_period_id INTEGER,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS timetable_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      class_id INTEGER REFERENCES classes(id),
      subject_id INTEGER,
      teacher_id INTEGER,
      room_id INTEGER,
      day_of_week INTEGER,
      start_time TEXT,
      end_time TEXT,
      subject TEXT,
      teacher_name TEXT,
      room TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS substitute_teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      timetable_entry_id INTEGER,
      original_teacher_id INTEGER,
      substitute_teacher_id INTEGER,
      date TEXT NOT NULL,
      reason TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'pending',
      approved_by INTEGER,
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS exam_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      term TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'draft',
      created_at INTEGER,
      type TEXT,
      academic_year TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      series_id INTEGER REFERENCES exam_series(id),
      class_id INTEGER REFERENCES classes(id),
      subject TEXT,
      title TEXT NOT NULL,
      date TEXT,
      total_marks INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS exam_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      score INTEGER,
      grade TEXT,
      remarks TEXT,
      created_at INTEGER,
      marks_obtained INTEGER,
      rank INTEGER,
      status TEXT,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS report_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      academic_period_id INTEGER REFERENCES academic_periods(id),
      title TEXT,
      content TEXT,
      published INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      basic_salary INTEGER NOT NULL,
      allowances TEXT DEFAULT '[]',
      deductions TEXT DEFAULT '[]',
      gross_pay INTEGER NOT NULL,
      net_pay INTEGER NOT NULL,
      status TEXT DEFAULT 'draft',
      paid_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      approved_by INTEGER REFERENCES users(id),
      days INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS module_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      module TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      settings TEXT DEFAULT '{}',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS saved_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT,
      config TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS notification_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      channel TEXT,
      subject TEXT,
      body TEXT,
      variables TEXT,
      created_at INTEGER,
      school_id INTEGER,
      updated_at INTEGER);

    CREATE TABLE IF NOT EXISTS cbt_exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      type TEXT NOT NULL DEFAULT 'academic',
      duration INTEGER,
      total_marks INTEGER,
      negative_marking INTEGER DEFAULT 0,
      negative_mark_value TEXT,
      access_mode TEXT DEFAULT 'restricted',
      scheduled_start TEXT,
      scheduled_end TEXT,
      max_attempts INTEGER DEFAULT 1,
      lockdown INTEGER DEFAULT 0,
      proctoring INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      sections TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS cbt_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      email TEXT,
      access_pin TEXT,
      status TEXT DEFAULT 'registered',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS cbt_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
      candidate_id INTEGER NOT NULL REFERENCES cbt_candidates(id) ON DELETE CASCADE,
      answers TEXT,
      score INTEGER,
      total_marks INTEGER,
      time_taken INTEGER,
      flags TEXT DEFAULT '[]',
      proctor_notes TEXT,
      ip_address TEXT,
      device_fingerprint TEXT,
      started_at INTEGER,
      submitted_at INTEGER,
      integrity_report TEXT,
      status TEXT DEFAULT 'in_progress',
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Additional tables from later sessions
    CREATE TABLE IF NOT EXISTS student_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      category TEXT NOT NULL, title TEXT NOT NULL, file_url TEXT NOT NULL,
      file_name TEXT, file_type TEXT, uploaded_by INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS student_medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      type TEXT NOT NULL, title TEXT NOT NULL, description TEXT, severity TEXT,
      date TEXT, recorded_by INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS student_emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      name TEXT NOT NULL, relationship TEXT, phone TEXT NOT NULL, email TEXT,
      address TEXT, is_primary INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS family_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      family_name TEXT NOT NULL, primary_contact_name TEXT,
      primary_contact_phone TEXT, primary_contact_email TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      date TEXT NOT NULL, clock_in TEXT, clock_out TEXT, method TEXT DEFAULT 'manual',
      notes TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      year INTEGER NOT NULL, type TEXT NOT NULL, allocated INTEGER DEFAULT 0,
      used INTEGER DEFAULT 0, carried_over INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS role_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      role TEXT NOT NULL, permission TEXT NOT NULL, action TEXT NOT NULL, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS fee_access_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      enabled INTEGER DEFAULT 0, grace_period_days INTEGER DEFAULT 0,
      blocked_modules TEXT DEFAULT '[]', threshold_amount INTEGER DEFAULT 0,
      block_message TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS discussion_boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      course_id INTEGER, title TEXT NOT NULL, description TEXT,
      locked INTEGER DEFAULT 0, created_by INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS discussion_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL REFERENCES discussion_boards(id) ON DELETE CASCADE,
      parent_id INTEGER, author_id INTEGER NOT NULL, content TEXT NOT NULL,
      pinned INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      url TEXT NOT NULL, events TEXT DEFAULT '[]', secret TEXT,
      active INTEGER DEFAULT 1, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      event TEXT NOT NULL, payload TEXT, response_status INTEGER,
      response_body TEXT, delivered_at TEXT, status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT, slug TEXT NOT NULL,
      fields TEXT DEFAULT '[]', settings TEXT DEFAULT '{}', status TEXT DEFAULT 'draft',
      is_public INTEGER DEFAULT 1, requires_auth INTEGER DEFAULT 0,
      success_message TEXT, redirect_url TEXT, submit_button_text TEXT DEFAULT 'Submit',
      created_by INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS form_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      data TEXT NOT NULL, submitted_by INTEGER, submitted_by_name TEXT,
      submitted_by_email TEXT, ip_address TEXT, status TEXT DEFAULT 'new',
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS gallery_albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, description TEXT, cover_image_url TEXT,
      slug TEXT,
      type TEXT,
      is_published INTEGER,
      sort_order INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER);
    CREATE TABLE IF NOT EXISTS virtual_tours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT, tour_url TEXT,
      embed_url TEXT,
      thumbnail_url TEXT,
      location TEXT,
      is_published INTEGER,
      sort_order INTEGER,
      created_at INTEGER, updated_at INTEGER);
    CREATE TABLE IF NOT EXISTS media_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      url TEXT NOT NULL, file_name TEXT, file_type TEXT, file_size INTEGER,
      folder TEXT, uploaded_by INTEGER, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER, to_email TEXT, subject TEXT, body TEXT,
      status TEXT, error TEXT, sent_at INTEGER, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER, entity_type TEXT, entity_id INTEGER,
      user_id INTEGER, type TEXT, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS platform_blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, content TEXT,
      excerpt TEXT, cover_image_url TEXT, category TEXT, tags TEXT DEFAULT '[]',
      author_id INTEGER, is_published INTEGER DEFAULT 0, published_at TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS platform_docs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, content TEXT,
      category TEXT, sort_order INTEGER DEFAULT 0, is_published INTEGER DEFAULT 1,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT,
      monthly_price INTEGER NOT NULL DEFAULT 0, annual_price INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD', billing_cycle TEXT NOT NULL DEFAULT 'both',
      max_schools INTEGER DEFAULT 1, max_students INTEGER DEFAULT 100, max_staff INTEGER DEFAULT 10,
      max_storage INTEGER DEFAULT 500,
      features TEXT DEFAULT '[]', module_access TEXT DEFAULT '[]',
      is_popular INTEGER DEFAULT 0, is_free INTEGER DEFAULT 0, trial_days INTEGER DEFAULT 14,
      sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
      custom_domain INTEGER DEFAULT 0, api_access INTEGER DEFAULT 0,
      priority_support INTEGER DEFAULT 0, white_label INTEGER DEFAULT 0,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS school_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      plan_id INTEGER REFERENCES subscription_plans(id),
      status TEXT DEFAULT 'trial', billing_cycle TEXT DEFAULT 'monthly',
      current_period_start TEXT, current_period_end TEXT,
      trial_ends_at TEXT, cancelled_at TEXT, cancel_reason TEXT,
      auto_renew INTEGER DEFAULT 1, payment_method TEXT,
      external_id TEXT, coupon_id INTEGER,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE, name TEXT, description TEXT, type TEXT NOT NULL,
      value INTEGER NOT NULL, currency TEXT DEFAULT 'USD', min_amount INTEGER DEFAULT 0,
      max_discount INTEGER, applicable_plans TEXT DEFAULT '[]', max_uses INTEGER,
      current_uses INTEGER DEFAULT 0, start_date TEXT NOT NULL, end_date TEXT,
      is_active INTEGER DEFAULT 1, created_by INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      invoice_id INTEGER, discount_amount INTEGER NOT NULL, redeemed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'medium', school_id INTEGER, user_id INTEGER,
      assigned_to INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS support_ticket_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      user_id INTEGER, content TEXT NOT NULL, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS platform_faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL, answer TEXT NOT NULL, category TEXT,
      sort_order INTEGER DEFAULT 0, is_published INTEGER DEFAULT 1,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS platform_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE, value TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'string', category TEXT DEFAULT 'general',
      description TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS ai_providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, type TEXT, api_base_url TEXT, is_active INTEGER DEFAULT 1,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS ai_api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER REFERENCES ai_providers(id),
      key_name TEXT, encrypted_key TEXT, is_active INTEGER DEFAULT 1,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS ai_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER REFERENCES ai_providers(id),
      name TEXT NOT NULL, display_name TEXT, context_window INTEGER,
      is_active INTEGER DEFAULT 1, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER, user_id INTEGER, model_id INTEGER,
      title TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL, content TEXT, tokens_used INTEGER,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS ai_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER, key TEXT NOT NULL, value TEXT,
      provider_id INTEGER, model_id INTEGER,
      system_prompt TEXT, temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 1000, is_active INTEGER DEFAULT 1,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS school_support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER, subject TEXT NOT NULL, description TEXT,
      status TEXT DEFAULT 'open', priority TEXT DEFAULT 'medium',
      category TEXT, assigned_to INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS school_ticket_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES school_support_tickets(id) ON DELETE CASCADE,
      user_id INTEGER, content TEXT NOT NULL, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS school_ticket_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER, name TEXT NOT NULL, description TEXT,
      icon TEXT, is_public INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS subscriber_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE, password_hash TEXT, name TEXT,
      school_id INTEGER, status TEXT DEFAULT 'active',
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS live_class_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, description TEXT, teacher_id INTEGER,
      class_id INTEGER, scheduled_at TEXT, duration INTEGER,
      status TEXT DEFAULT 'scheduled', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS live_class_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES live_class_rooms(id) ON DELETE CASCADE,
      user_id INTEGER, content TEXT NOT NULL, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS live_class_polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES live_class_rooms(id) ON DELETE CASCADE,
      question TEXT NOT NULL, options TEXT, correct_answer TEXT,
      is_active INTEGER DEFAULT 1, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS live_class_whiteboards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES live_class_rooms(id) ON DELETE CASCADE,
      title TEXT DEFAULT 'Whiteboard', data TEXT, created_by INTEGER,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS platform_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER, plan_id INTEGER, amount INTEGER,
      status TEXT DEFAULT 'pending', due_date TEXT, paid_at TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS platform_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER, amount INTEGER, method TEXT, reference TEXT,
      status TEXT DEFAULT 'completed', paid_at TEXT, created_at INTEGER
    );

    -- Missing tables from migrate-patch.ts (added to autoMigrate for production)
    CREATE TABLE IF NOT EXISTS course_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT, sort_order INTEGER DEFAULT 0,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER REFERENCES course_units(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL, content TEXT, type TEXT DEFAULT 'text',
      sort_order INTEGER DEFAULT 0, is_published INTEGER DEFAULT 0,
      file_url TEXT,
      external_url TEXT,
      duration INTEGER,
      created_at INTEGER, updated_at INTEGER);
    CREATE TABLE IF NOT EXISTS prayer_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, applies_to TEXT NOT NULL DEFAULT 'weekday', periods TEXT NOT NULL,
      fajr_time TEXT, dhuhr_time TEXT, asr_time TEXT, maghrib_time TEXT, isha_time TEXT, jumuah_time TEXT,
      play_adhan INTEGER NOT NULL DEFAULT 0, adhan_audio_url TEXT, notes TEXT,
      created_at INTEGER, updated_at INTEGER);
    CREATE TABLE IF NOT EXISTS asset_checkouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      checked_out_to INTEGER NOT NULL REFERENCES users(id),
      checked_out_by INTEGER REFERENCES users(id),
      checkout_date TEXT NOT NULL, expected_return_date TEXT,
      actual_return_date TEXT, returned_to INTEGER REFERENCES users(id),
      condition_at_checkout TEXT, condition_at_return TEXT,
      notes TEXT, status TEXT DEFAULT 'active',
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, contact_person TEXT, email TEXT, phone TEXT,
      address TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS purchase_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      requested_by INTEGER NOT NULL REFERENCES users(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      items TEXT NOT NULL, total_amount INTEGER, reason TEXT,
      status TEXT DEFAULT 'pending', approved_by INTEGER REFERENCES users(id),
      approved_at TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS job_postings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL, department TEXT, description TEXT,
      requirements TEXT DEFAULT '[]', employment_type TEXT DEFAULT 'full_time',
      salary_range TEXT, start_date TEXT, application_deadline TEXT,
      status TEXT DEFAULT 'draft', created_by INTEGER REFERENCES users(id),
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS job_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
      applicant_name TEXT NOT NULL, applicant_email TEXT NOT NULL,
      applicant_phone TEXT, cover_letter TEXT, resume_url TEXT,
      status TEXT DEFAULT 'submitted', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      scheduled_at TEXT NOT NULL, duration INTEGER DEFAULT 60,
      location TEXT, interviewer_id INTEGER REFERENCES users(id),
      notes TEXT, status TEXT DEFAULT 'scheduled',
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS performance_appraisals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      cycle TEXT NOT NULL, type TEXT NOT NULL, kpis TEXT DEFAULT '[]',
      strengths TEXT, improvements TEXT, goals TEXT, overall_rating INTEGER,
      reviewer_id INTEGER REFERENCES users(id), status TEXT DEFAULT 'pending',
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS library_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT DEFAULT 'pending', reserved_at TEXT, fulfilled_at TEXT,
      expires_at TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS transport_dispatch (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      route_id INTEGER NOT NULL REFERENCES transport_routes(id),
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      date TEXT NOT NULL, type TEXT NOT NULL,
      departure_time TEXT, arrival_time TEXT,
      status TEXT DEFAULT 'scheduled', notes TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS transport_boarding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id INTEGER NOT NULL REFERENCES transport_dispatch(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      boarded_at TEXT, status TEXT DEFAULT 'boarded',
      parent_notified INTEGER DEFAULT 0,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS event_rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      response TEXT NOT NULL, number_of_guests INTEGER DEFAULT 0,
      notes TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS data_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      school_id INTEGER REFERENCES schools(id),
      type TEXT NOT NULL, details TEXT,
      status TEXT DEFAULT 'pending', processed_by INTEGER REFERENCES users(id),
      processed_at TEXT, response_note TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS cbt_proctoring_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL REFERENCES cbt_attempts(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL, timestamp TEXT NOT NULL,
      details TEXT, severity TEXT DEFAULT 'warning'
    );
    CREATE TABLE IF NOT EXISTS cbt_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT,
      time_limit INTEGER, marks INTEGER, question_count INTEGER,
      sort_order INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS cbt_question_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, type TEXT DEFAULT 'topic',
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      date TEXT NOT NULL, clock_in TEXT, clock_out TEXT,
      method TEXT DEFAULT 'manual', notes TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      year INTEGER NOT NULL, type TEXT NOT NULL,
      allocated INTEGER DEFAULT 0, used INTEGER DEFAULT 0, carried_over INTEGER DEFAULT 0,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS role_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      role TEXT NOT NULL, permission TEXT NOT NULL, action TEXT NOT NULL,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS fee_access_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      enabled INTEGER DEFAULT 0, grace_period_days INTEGER DEFAULT 0,
      blocked_modules TEXT DEFAULT '[]', threshold_amount INTEGER DEFAULT 0,
      block_message TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS discussion_boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT,
      locked INTEGER DEFAULT 0, created_by INTEGER REFERENCES users(id),
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS discussion_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL REFERENCES discussion_boards(id) ON DELETE CASCADE,
      parent_id INTEGER, author_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL, pinned INTEGER DEFAULT 0,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      url TEXT NOT NULL, events TEXT DEFAULT '[]', secret TEXT,
      active INTEGER DEFAULT 1, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      event TEXT NOT NULL, payload TEXT, response_status INTEGER,
      response_body TEXT, delivered_at TEXT, status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT, slug TEXT NOT NULL,
      fields TEXT DEFAULT '[]', settings TEXT DEFAULT '{}', status TEXT DEFAULT 'draft',
      is_public INTEGER DEFAULT 1, requires_auth INTEGER DEFAULT 0,
      success_message TEXT, redirect_url TEXT, submit_button_text TEXT DEFAULT 'Submit',
      created_by INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS form_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      data TEXT NOT NULL, submitted_by INTEGER,
      submitted_by_name TEXT, submitted_by_email TEXT,
      ip_address TEXT, status TEXT DEFAULT 'new',
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS student_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      category TEXT NOT NULL, title TEXT NOT NULL, file_url TEXT NOT NULL,
      file_name TEXT, file_type TEXT, uploaded_by INTEGER,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS student_medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      type TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
      severity TEXT, date TEXT, recorded_by INTEGER,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS student_emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      name TEXT NOT NULL, relationship TEXT, phone TEXT NOT NULL,
      email TEXT, address TEXT, is_primary INTEGER DEFAULT 0,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS family_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      family_name TEXT NOT NULL, primary_contact_name TEXT,
      primary_contact_phone TEXT, primary_contact_email TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS gallery_albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, description TEXT, cover_image_url TEXT,
      sort_order INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS virtual_tours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT, tour_url TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS media_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      url TEXT NOT NULL, file_name TEXT, file_type TEXT, file_size INTEGER,
      folder TEXT, uploaded_by INTEGER, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER, to_email TEXT, subject TEXT, body TEXT,
      status TEXT, error TEXT, sent_at INTEGER, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER, entity_type TEXT, entity_id INTEGER,
      user_id INTEGER, type TEXT, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS class_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_name TEXT NOT NULL,
      teacher_id INTEGER REFERENCES staff(id),
      course_id INTEGER REFERENCES courses(id),
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS admission_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT,
      academic_year TEXT NOT NULL,
      open_date TEXT NOT NULL,
      close_date TEXT NOT NULL,
      description TEXT,
      eligible_grades TEXT,
      available_seats INTEGER,
      application_fee INTEGER,
      application_fee_currency TEXT DEFAULT 'USD',
      requirements TEXT DEFAULT '[]',
      process_steps TEXT DEFAULT '[]',
      important_dates TEXT DEFAULT '[]',
      contact_email TEXT,
      contact_phone TEXT,
      brochure_url TEXT,
      faq_link TEXT,
      is_active INTEGER DEFAULT 1,
      auto_announce INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS admission_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      period_id INTEGER REFERENCES admission_periods(id),
      application_number TEXT NOT NULL UNIQUE,
      student_first_name TEXT NOT NULL,
      student_last_name TEXT NOT NULL,
      student_date_of_birth TEXT,
      student_gender TEXT,
      student_nationality TEXT,
      student_current_school TEXT,
      parent_name TEXT NOT NULL,
      parent_relationship TEXT,
      parent_email TEXT NOT NULL,
      parent_phone TEXT NOT NULL,
      parent_occupation TEXT,
      parent_address TEXT,
      program_id INTEGER,
      program_name TEXT,
      preferred_class TEXT,
      message TEXT,
      how_did_you_hear TEXT,
      documents TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'submitted',
      review_notes TEXT,
      interview_date TEXT,
      interview_notes TEXT,
      decision_date TEXT,
      decided_by INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS gmb_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      google_account_id TEXT, business_id TEXT, business_name TEXT,
      access_token TEXT, refresh_token TEXT, token_expiry TEXT,
      verification_status TEXT DEFAULT 'unverified',
      is_connected INTEGER DEFAULT 0, auto_sync INTEGER DEFAULT 1,
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS gmb_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      gmb_post_id TEXT, title TEXT, content TEXT, image_url TEXT,
      post_type TEXT DEFAULT 'what_new', start_date TEXT, end_date TEXT,
      status TEXT DEFAULT 'draft', cms_post_type TEXT, cms_post_id INTEGER,
      synced_at TEXT, created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS gmb_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      review_id TEXT NOT NULL, author TEXT, rating INTEGER, comment TEXT,
      response TEXT, response_at TEXT, review_date TEXT, synced_at TEXT,
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS social_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      platform TEXT NOT NULL, account_id TEXT, account_name TEXT,
      access_token TEXT, refresh_token TEXT, token_expiry TEXT,
      profile_url TEXT, followers_count INTEGER DEFAULT 0,
      is_connected INTEGER DEFAULT 1, auto_post_settings TEXT DEFAULT '{}',
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS social_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      platform_post_id TEXT, platform TEXT NOT NULL, content TEXT,
      media_urls TEXT DEFAULT '[]', scheduled_at TEXT, published_at TEXT,
      status TEXT DEFAULT 'draft', post_type TEXT DEFAULT 'manual',
      cms_post_id INTEGER, analytics TEXT DEFAULT '{}',
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS social_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      account_id INTEGER, date TEXT, followers INTEGER,
      impressions INTEGER, engagement INTEGER, clicks INTEGER,
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS social_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      post_id INTEGER, platform TEXT, comment_id TEXT, author TEXT,
      text TEXT, timestamp TEXT, is_resolved INTEGER DEFAULT 0,
      response TEXT, response_at TEXT, created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS email_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, description TEXT, subscriber_count INTEGER DEFAULT 0,
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS email_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      list_id INTEGER, email TEXT NOT NULL, first_name TEXT, last_name TEXT,
      custom_fields TEXT DEFAULT '{}', status TEXT DEFAULT 'active',
      source TEXT, engagement_score INTEGER DEFAULT 0,
      subscribed_at TEXT, unsubscribed_at TEXT,
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS email_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, subject TEXT, from_name TEXT, from_email TEXT,
      reply_to TEXT, html_content TEXT, plain_text TEXT,
      template_id INTEGER, list_id INTEGER, type TEXT DEFAULT 'regular',
      status TEXT DEFAULT 'draft', scheduled_at TEXT, sent_at TEXT,
      ab_variants TEXT, created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS email_campaign_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      sent INTEGER DEFAULT 0, delivered INTEGER DEFAULT 0,
      opens INTEGER DEFAULT 0, unique_opens INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0, unique_clicks INTEGER DEFAULT 0,
      bounces INTEGER DEFAULT 0, unsubscribes INTEGER DEFAULT 0,
      complaints INTEGER DEFAULT 0, date TEXT,
      created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS email_automations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, trigger TEXT, steps TEXT,
      status TEXT DEFAULT 'active', created_at INTEGER, updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, html_content TEXT, category TEXT,
      is_default INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
  `);

  // Add missing columns to existing tables (ALTER TABLE IF NOT EXISTS workaround)
  const addColumnIfMissing = (table: string, column: string, def: string) => {
    try {
      const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as any[];
      if (!cols.some(c => c.name === column)) {
        sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def};`);
      }
    } catch (e) {
      // Table might not exist yet, skip
    }
  };

  // Add indexes for performance (Phase 4.1) — idempotent
  const createIndexIfNotExists = (name: string, sql: string) => {
    try {
      sqlite.exec(`CREATE INDEX IF NOT EXISTS ${name} ON ${sql};`);
    } catch (e) {
      // Index might already exist or table missing, skip
    }
  };

  // Foreign key indexes (most critical for JOIN performance)
  createIndexIfNotExists('idx_students_school', 'students(school_id)');
  createIndexIfNotExists('idx_students_user', 'students(user_id)');
  createIndexIfNotExists('idx_students_parent', 'students(parent_id)');
  createIndexIfNotExists('idx_students_family', 'students(family_group_id)');
  createIndexIfNotExists('idx_students_status', 'students(status)');
  createIndexIfNotExists('idx_enrollments_student', 'enrollments(student_id)');
  createIndexIfNotExists('idx_enrollments_class', 'enrollments(class_id)');
  createIndexIfNotExists('idx_enrollments_status', 'enrollments(status)');
  createIndexIfNotExists('idx_attendance_student', 'attendance(student_id)');
  createIndexIfNotExists('idx_attendance_school', 'attendance(school_id)');
  createIndexIfNotExists('idx_attendance_date', 'attendance(date)');
  createIndexIfNotExists('idx_invoices_student', 'invoices(student_id)');
  createIndexIfNotExists('idx_invoices_status', 'invoices(status)');
  createIndexIfNotExists('idx_invoices_school', 'invoices(school_id)');
  createIndexIfNotExists('idx_invoices_due', 'invoices(due_date)');
  createIndexIfNotExists('idx_payments_invoice', 'payments(invoice_id)');
  createIndexIfNotExists('idx_payments_school', 'payments(school_id)');
  createIndexIfNotExists('idx_payments_status', 'payments(status)');
  createIndexIfNotExists('idx_grades_student', 'grades(student_id)');
  createIndexIfNotExists('idx_grades_course', 'grades(course_id)');
  createIndexIfNotExists('idx_grades_assignment', 'grades(assignment_id)');
  createIndexIfNotExists('idx_grades_school', 'grades(school_id)');
  createIndexIfNotExists('idx_exam_results_exam', 'exam_results(exam_id)');
  createIndexIfNotExists('idx_exam_results_student', 'exam_results(student_id)');
  createIndexIfNotExists('idx_library_loans_book', 'library_loans(book_id)');
  createIndexIfNotExists('idx_library_loans_borrower', 'library_loans(borrower_id)');
  createIndexIfNotExists('idx_library_loans_status', 'library_loans(status)');
  createIndexIfNotExists('idx_hostel_alloc_student', 'hostel_allocations(student_id)');
  createIndexIfNotExists('idx_hostel_alloc_room', 'hostel_allocations(room_id)');
  createIndexIfNotExists('idx_transport_assign_student', 'transport_assignments(student_id)');
  createIndexIfNotExists('idx_transport_assign_route', 'transport_assignments(route_id)');
  createIndexIfNotExists('idx_cbt_attempts_exam', 'cbt_attempts(exam_id)');
  createIndexIfNotExists('idx_cbt_attempts_candidate', 'cbt_attempts(candidate_id)');
  createIndexIfNotExists('idx_messages_sender', 'messages(sender_id)');
  createIndexIfNotExists('idx_messages_recipient', 'messages(recipient_id)');
  createIndexIfNotExists('idx_messages_school', 'messages(school_id)');
  createIndexIfNotExists('idx_notifications_user', 'notifications(user_id)');
  createIndexIfNotExists('idx_notifications_school', 'notifications(school_id)');
  createIndexIfNotExists('idx_notifications_read', 'notifications(is_read)');
  createIndexIfNotExists('idx_audit_logs_school', 'audit_logs(school_id)');
  createIndexIfNotExists('idx_audit_logs_user', 'audit_logs(user_id)');
  createIndexIfNotExists('idx_audit_logs_created', 'audit_logs(created_at)');

  // Composite indexes for common query patterns
  createIndexIfNotExists('idx_students_school_status', 'students(school_id, status)');
  createIndexIfNotExists('idx_invoices_school_status', 'invoices(school_id, status)');
  createIndexIfNotExists('idx_enrollments_school_status', 'enrollments(school_id, status)');
  createIndexIfNotExists('idx_attendance_school_date', 'attendance(school_id, date)');
  createIndexIfNotExists('idx_audit_logs_school_created', 'audit_logs(school_id, created_at)');
  createIndexIfNotExists('idx_messages_school_created', 'messages(school_id, created_at)');

  addColumnIfMissing('students', 'family_group_id', 'INTEGER');
  addColumnIfMissing('students', 'blood_group', 'TEXT');
  addColumnIfMissing('students', 'nationality', 'TEXT');
  addColumnIfMissing('students', 'religion', 'TEXT');
  addColumnIfMissing('students', 'previous_school', 'TEXT');
  addColumnIfMissing('cbt_attempts', 'device_fingerprint', 'TEXT');
  addColumnIfMissing('cbt_attempts', 'status', "TEXT NOT NULL DEFAULT 'in_progress'");
  addColumnIfMissing('leave_requests', 'days', 'INTEGER');
  addColumnIfMissing('library_loans', 'fine_paid', 'INTEGER DEFAULT 0');
  addColumnIfMissing('coupons', 'name', 'TEXT');
  addColumnIfMissing('coupons', 'currency', "TEXT DEFAULT 'USD'");
  addColumnIfMissing('coupons', 'min_amount', 'INTEGER DEFAULT 0');

  // Fix messages table — add missing columns for existing DBs that have the old schema
  addColumnIfMissing('messages', 'school_id', 'INTEGER');
  addColumnIfMissing('messages', 'group_id', 'TEXT');
  addColumnIfMissing('messages', 'subject', 'TEXT');
  addColumnIfMissing('messages', 'attachments', "TEXT DEFAULT '[]'");
  addColumnIfMissing('messages', 'parent_message_id', 'INTEGER');
  addColumnIfMissing('messages', 'is_read', 'INTEGER DEFAULT 0');
  addColumnIfMissing('messages', 'updated_at', 'INTEGER');

  // Fix exams table — add missing columns
  addColumnIfMissing('exams', 'type', "TEXT NOT NULL DEFAULT 'custom'");
  addColumnIfMissing('exams', 'passing_marks', 'INTEGER');
  addColumnIfMissing('exams', 'duration', 'INTEGER');
  addColumnIfMissing('exams', 'venue', 'TEXT');
  addColumnIfMissing('exams', 'invigilator', 'TEXT');
  addColumnIfMissing('exams', 'instructions', 'TEXT');

  // Fix gallery_items — add missing columns
  addColumnIfMissing('gallery_items', 'type', "TEXT NOT NULL DEFAULT 'image'");
  addColumnIfMissing('gallery_items', 'album_id', 'INTEGER');

  // Fix job_postings — add missing columns
  addColumnIfMissing('job_postings', 'type', 'TEXT');

  // Fix staff_attendance — add missing columns
  addColumnIfMissing('staff_attendance', 'type', 'TEXT');

  // Fix forms — add missing columns
  addColumnIfMissing('forms', 'type', "TEXT NOT NULL DEFAULT 'general'");

  // Fix platform_settings — add missing columns
  addColumnIfMissing('platform_settings', 'type', "TEXT NOT NULL DEFAULT 'string'");
  addColumnIfMissing('platform_settings', 'description', 'TEXT');

  // Fix about_pages — add missing columns
  addColumnIfMissing('about_pages', 'history', 'TEXT');

  // Fix lessons — add missing columns
  addColumnIfMissing('lessons', 'type', "TEXT DEFAULT 'text'");
  addColumnIfMissing('lessons', 'is_published', 'INTEGER DEFAULT 0');

  // Fix assignments — add missing columns
  addColumnIfMissing('assignments', 'type', "TEXT DEFAULT 'file_upload'");

  // Fix notifications — ensure type column
  addColumnIfMissing('notifications', 'type', 'TEXT');
  addColumnIfMissing('notifications', 'link', 'TEXT');

  // Fix behavior_logs — ensure type column
  addColumnIfMissing('behavior_logs', 'type', 'TEXT');

  // Fix academic_periods — ensure type column
  addColumnIfMissing('academic_periods', 'type', 'TEXT');

  // Fix leave_balances — ensure type column
  addColumnIfMissing('leave_balances', 'type', 'TEXT');

  // Fix performance_appraisals — ensure type column
  addColumnIfMissing('performance_appraisals', 'type', 'TEXT');

  // Fix transport_dispatch — ensure type column
  addColumnIfMissing('transport_dispatch', 'type', 'TEXT');

  // Fix cbt_exams — ensure type column
  addColumnIfMissing('cbt_exams', 'type', "TEXT NOT NULL DEFAULT 'academic'");

  // Fix cbt_question_tags — ensure type column
  addColumnIfMissing('cbt_question_tags', 'type', "TEXT NOT NULL DEFAULT 'topic'");

  // Fix data_requests — ensure type column
  addColumnIfMissing('data_requests', 'type', 'TEXT');

  // Fix hostels — ensure type column
  addColumnIfMissing('hostels', 'type', 'TEXT');

  // Fix hostel_rooms — ensure type column
  addColumnIfMissing('hostel_rooms', 'type', 'TEXT');

  // Fix vehicles — ensure type column
  addColumnIfMissing('vehicles', 'type', 'TEXT');

  // Fix media_uploads — ensure type column
  addColumnIfMissing('media_uploads', 'type', 'TEXT');

  // Fix coupons — ensure type column
  addColumnIfMissing('coupons', 'type', 'TEXT');

  // Fix live_class_messages — ensure type column
  addColumnIfMissing('live_class_messages', 'type', "TEXT DEFAULT 'chat'");

  // Fix announcements — add banner_image_url
  addColumnIfMissing('announcements', 'banner_image_url', 'TEXT');

  // Fix class_subjects — ensure id column exists (should be PK but just in case)
  addColumnIfMissing('class_subjects', 'description', 'TEXT');

  // Fix schools — add locale if missing (should exist but just in case)
  addColumnIfMissing('schools', 'locale', "TEXT DEFAULT 'en'");

  // Fix blog_posts — ensure category and tags columns
  addColumnIfMissing('blog_posts', 'category', 'TEXT');
  addColumnIfMissing('blog_posts', 'tags', "TEXT DEFAULT '[]'");

  // Fix classes — ensure homeroom_teacher_id and grade_level
  addColumnIfMissing('classes', 'homeroom_teacher_id', 'INTEGER');
  addColumnIfMissing('classes', 'grade_level', 'TEXT');

  // Fix gallery_items — ensure caption and album_id
  addColumnIfMissing('gallery_items', 'caption', 'TEXT');

  // Fix contact_info — ensure type column
  addColumnIfMissing('contact_info', 'type', 'TEXT');

  // Fix staff — ensure designation and employment_type
  addColumnIfMissing('staff', 'designation', 'TEXT');
  addColumnIfMissing('staff', 'employment_type', "TEXT NOT NULL DEFAULT 'full_time'");
  addColumnIfMissing('staff', 'salary', 'INTEGER');
  addColumnIfMissing('staff', 'bank_details', 'TEXT');
  addColumnIfMissing('staff', 'emergency_contact', 'TEXT');

  // Fix quizzes — ensure start_date, end_date, max_attempts
  addColumnIfMissing('quizzes', 'start_date', 'TEXT');
  addColumnIfMissing('quizzes', 'end_date', 'TEXT');
  addColumnIfMissing('quizzes', 'max_attempts', 'INTEGER DEFAULT 1');

  // Fix submissions — ensure score, feedback, graded_by, graded_at
  addColumnIfMissing('submissions', 'score', 'REAL');
  addColumnIfMissing('submissions', 'feedback', 'TEXT');
  addColumnIfMissing('submissions', 'graded_by', 'INTEGER');
  addColumnIfMissing('submissions', 'graded_at', 'INTEGER');
  addColumnIfMissing('submissions', 'school_id', 'INTEGER');

  // Fix quiz_attempts — ensure score, max_score, status
  addColumnIfMissing('quiz_attempts', 'score', 'REAL');
  addColumnIfMissing('quiz_attempts', 'max_score', 'REAL');
  addColumnIfMissing('quiz_attempts', 'status', "TEXT DEFAULT 'in_progress'");
  addColumnIfMissing('quiz_attempts', 'school_id', 'INTEGER');

  // Fix grades — ensure assignment_title, exam_title
  addColumnIfMissing('grades', 'assignment_title', 'TEXT');
  addColumnIfMissing('grades', 'exam_title', 'TEXT');

  // Fix invoices — ensure due_date
  addColumnIfMissing('invoices', 'due_date', 'TEXT');

  // Fix programs — ensure content, icon, has_detail_page
  addColumnIfMissing('programs', 'content', 'TEXT');
  addColumnIfMissing('programs', 'icon', 'TEXT');
  addColumnIfMissing('programs', 'has_detail_page', 'INTEGER DEFAULT 0');

  // Fix timetable_entries — ensure subject, teacher_name, room
  addColumnIfMissing('timetable_entries', 'subject', 'TEXT');
  addColumnIfMissing('timetable_entries', 'teacher_name', 'TEXT');
  addColumnIfMissing('timetable_entries', 'room', 'TEXT');
  addColumnIfMissing('timetable_entries', 'course_id', 'INTEGER');
  addColumnIfMissing('timetable_entries', 'period_number', 'INTEGER');

  // Fix submissions — add link_url and grade if missing
  addColumnIfMissing('submissions', 'link_url', 'TEXT');
  addColumnIfMissing('submissions', 'school_id', 'INTEGER');
  addColumnIfMissing('submissions', 'grade', 'INTEGER');

  // Fix quiz_attempts — add total_points and school_id if missing
  addColumnIfMissing('quiz_attempts', 'total_points', 'INTEGER');
  addColumnIfMissing('quiz_attempts', 'school_id', 'INTEGER');
  addColumnIfMissing('quiz_attempts', 'time_taken', 'INTEGER');
  addColumnIfMissing('quiz_attempts', 'max_score', 'INTEGER');
  addColumnIfMissing('quiz_attempts', 'status', "TEXT DEFAULT 'in_progress'");

  // Fix exams — ensure series_id
  addColumnIfMissing('exams', 'series_id', 'INTEGER');
  addColumnIfMissing('exams', 'class_id', 'INTEGER');
  addColumnIfMissing('exams', 'subject', 'TEXT');

  // Fix cbt_candidates — ensure access_pin
  addColumnIfMissing('cbt_candidates', 'access_pin', 'TEXT');

  // Fix live_class_rooms — ensure class_id, teacher_id
  addColumnIfMissing('live_class_rooms', 'class_id', 'INTEGER');
  addColumnIfMissing('live_class_rooms', 'teacher_id', 'INTEGER');
  addColumnIfMissing('live_class_rooms', 'duration', 'INTEGER');
  addColumnIfMissing('live_class_rooms', 'title', 'TEXT');
  addColumnIfMissing('live_class_rooms', 'course_id', 'INTEGER');
  addColumnIfMissing('live_class_rooms', 'scheduled_start', 'TEXT');
  addColumnIfMissing('live_class_rooms', 'scheduled_end', 'TEXT');
  addColumnIfMissing('live_class_rooms', 'meeting_provider', "TEXT DEFAULT 'builtin'");
  addColumnIfMissing('live_class_rooms', 'meeting_id', 'TEXT');
  addColumnIfMissing('live_class_rooms', 'meeting_url', 'TEXT');
  addColumnIfMissing('live_class_rooms', 'meeting_password', 'TEXT');

  // Fix password_reset_tokens — add 'used' column
  addColumnIfMissing('password_reset_tokens', 'used', 'INTEGER DEFAULT 0');

  // Fix school_support_tickets — add missing columns
  addColumnIfMissing('school_support_tickets', 'ticket_number', 'TEXT');
  addColumnIfMissing('school_support_tickets', 'title', 'TEXT');
  addColumnIfMissing('school_support_tickets', 'description', 'TEXT');
  addColumnIfMissing('school_support_tickets', 'category', 'TEXT');
  addColumnIfMissing('school_support_tickets', 'priority', "TEXT DEFAULT 'medium'");
  addColumnIfMissing('school_support_tickets', 'channel', "TEXT DEFAULT 'web'");
  addColumnIfMissing('school_support_tickets', 'source', "TEXT DEFAULT 'external'");
  addColumnIfMissing('school_support_tickets', 'created_by_name', 'TEXT');
  addColumnIfMissing('school_support_tickets', 'created_by_email', 'TEXT');
  addColumnIfMissing('school_support_tickets', 'metadata', "TEXT DEFAULT '{}'");

  // Fix contact_submissions — add status if missing
  addColumnIfMissing('contact_submissions', 'status', "TEXT DEFAULT 'new'");
  addColumnIfMissing('contact_submissions', 'form_type', "TEXT DEFAULT 'general'");
  addColumnIfMissing('contact_submissions', 'data', "TEXT DEFAULT '{}'");

  // Fix navigation_items — add parent_id and is_external if missing
  addColumnIfMissing('navigation_items', 'parent_id', 'INTEGER');
  addColumnIfMissing('navigation_items', 'is_external', 'INTEGER DEFAULT 0');

  // Fix programs — add image_url if missing
  addColumnIfMissing('programs', 'image_url', 'TEXT');

  // Fix classes — add columns missing from older CREATE TABLE versions
  addColumnIfMissing('classes', 'slug', 'TEXT');
  addColumnIfMissing('classes', 'content', 'TEXT');
  addColumnIfMissing('classes', 'teacher_name', 'TEXT');

  // Fix admission_periods — add extended columns if missing
  addColumnIfMissing('admission_periods', 'slug', 'TEXT');
  addColumnIfMissing('admission_periods', 'eligible_grades', 'TEXT');
  addColumnIfMissing('admission_periods', 'available_seats', 'INTEGER');
  addColumnIfMissing('admission_periods', 'application_fee', 'INTEGER');
  addColumnIfMissing('admission_periods', 'application_fee_currency', "TEXT DEFAULT 'USD'");
  addColumnIfMissing('admission_periods', 'requirements', "TEXT DEFAULT '[]'");
  addColumnIfMissing('admission_periods', 'process_steps', "TEXT DEFAULT '[]'");
  addColumnIfMissing('admission_periods', 'important_dates', "TEXT DEFAULT '[]'");
  addColumnIfMissing('admission_periods', 'contact_email', 'TEXT');
  addColumnIfMissing('admission_periods', 'contact_phone', 'TEXT');
  addColumnIfMissing('admission_periods', 'brochure_url', 'TEXT');
  addColumnIfMissing('admission_periods', 'faq_link', 'TEXT');
  addColumnIfMissing('classes', 'image_url', 'TEXT');
  addColumnIfMissing('classes', 'has_detail_page', 'INTEGER DEFAULT 0');
  addColumnIfMissing('enrollments', 'academic_year', 'TEXT');
  addColumnIfMissing('enrollments', 'term', 'TEXT');
  addColumnIfMissing('enrollments', 'notes', 'TEXT');
  addColumnIfMissing('attendance', 'period', 'TEXT');
  addColumnIfMissing('courses', 'slug', 'TEXT');
  addColumnIfMissing('courses', 'cover_image_url', 'TEXT');
  addColumnIfMissing('courses', 'status', 'TEXT');
  addColumnIfMissing('courses', 'settings', 'TEXT');
  addColumnIfMissing('lessons', 'file_url', 'TEXT');
  addColumnIfMissing('lessons', 'external_url', 'TEXT');
  addColumnIfMissing('lessons', 'duration', 'INTEGER');
  addColumnIfMissing('assignments', 'instructions', 'TEXT');
  addColumnIfMissing('assignments', 'allow_late', 'INTEGER');
  addColumnIfMissing('assignments', 'allow_resubmit', 'INTEGER');
  addColumnIfMissing('assignments', 'is_group', 'INTEGER');
  addColumnIfMissing('assignments', 'attachments', 'TEXT');
  addColumnIfMissing('assignments', 'rubric', 'TEXT');
  addColumnIfMissing('quizzes', 'time_limit', 'INTEGER');
  addColumnIfMissing('quizzes', 'attempts', 'INTEGER');
  addColumnIfMissing('quizzes', 'passing_score', 'INTEGER');
  addColumnIfMissing('quizzes', 'randomize', 'INTEGER');
  addColumnIfMissing('quizzes', 'show_results', 'INTEGER');
  addColumnIfMissing('quizzes', 'scheduled_start', 'TEXT');
  addColumnIfMissing('quizzes', 'scheduled_end', 'TEXT');
  addColumnIfMissing('grades', 'term', 'TEXT');
  addColumnIfMissing('grades', 'academic_year', 'TEXT');
  addColumnIfMissing('grades', 'category', 'TEXT');
  addColumnIfMissing('grades', 'comment', 'TEXT');
  addColumnIfMissing('grades', 'comments', 'TEXT');
  addColumnIfMissing('grades', 'assignment_id', 'INTEGER');
  addColumnIfMissing('grades', 'exam_id', 'INTEGER');
  addColumnIfMissing('academic_periods', 'parent_period_id', 'INTEGER');
  addColumnIfMissing('prayer_schedules', 'periods', 'TEXT');
  addColumnIfMissing('prayer_schedules', 'applies_to', "TEXT NOT NULL DEFAULT 'weekday'");
  addColumnIfMissing('prayer_schedules', 'fajr_time', 'TEXT');
  addColumnIfMissing('prayer_schedules', 'dhuhr_time', 'TEXT');
  addColumnIfMissing('prayer_schedules', 'asr_time', 'TEXT');
  addColumnIfMissing('prayer_schedules', 'maghrib_time', 'TEXT');
  addColumnIfMissing('prayer_schedules', 'isha_time', 'TEXT');
  addColumnIfMissing('prayer_schedules', 'jumuah_time', 'TEXT');
  addColumnIfMissing('prayer_schedules', 'play_adhan', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('prayer_schedules', 'adhan_audio_url', 'TEXT');
  addColumnIfMissing('prayer_schedules', 'notes', 'TEXT');
  addColumnIfMissing('exam_series', 'type', 'TEXT');
  addColumnIfMissing('exam_series', 'academic_year', 'TEXT');
  addColumnIfMissing('exam_results', 'marks_obtained', 'INTEGER');
  addColumnIfMissing('exam_results', 'rank', 'INTEGER');
  addColumnIfMissing('exam_results', 'remark', 'TEXT');
  addColumnIfMissing('exam_results', 'status', 'TEXT');
  addColumnIfMissing('exam_results', 'school_id', 'TEXT');
  addColumnIfMissing('fee_structures', 'grade_level', 'TEXT');
  addColumnIfMissing('fee_structures', 'category', 'TEXT');
  addColumnIfMissing('fee_structures', 'items', 'TEXT');
  addColumnIfMissing('fee_structures', 'total_amount', 'INTEGER');
  addColumnIfMissing('fee_structures', 'frequency', 'TEXT');
  addColumnIfMissing('fee_structures', 'academic_year', 'TEXT');
  addColumnIfMissing('invoices', 'fee_structure_id', 'INTEGER');
  addColumnIfMissing('invoices', 'discount', 'INTEGER');
  addColumnIfMissing('invoices', 'fine', 'INTEGER');
  addColumnIfMissing('invoices', 'paid_amount', 'INTEGER');
  addColumnIfMissing('notifications', 'body', 'TEXT');
  addColumnIfMissing('notifications', 'channel', 'TEXT');
  addColumnIfMissing('notifications', 'is_read', 'INTEGER');
  addColumnIfMissing('notifications', 'updated_at', 'TEXT');
  addColumnIfMissing('hostels', 'total_rooms', 'INTEGER');
  addColumnIfMissing('hostels', 'total_beds', 'INTEGER');
  addColumnIfMissing('hostel_rooms', 'floor', 'INTEGER');
  addColumnIfMissing('hostel_rooms', 'occupants', 'INTEGER');
  addColumnIfMissing('hostel_rooms', 'status', 'TEXT');
  addColumnIfMissing('vehicles', 'name', 'TEXT');
  addColumnIfMissing('vehicles', 'plate_number', 'TEXT');
  addColumnIfMissing('vehicles', 'driver_id', 'INTEGER');
  addColumnIfMissing('vehicles', 'status', 'TEXT');
  addColumnIfMissing('transport_routes', 'vehicle_id', 'INTEGER');
  addColumnIfMissing('inventory_items', 'supplier', 'TEXT');
  addColumnIfMissing('behavior_logs', 'category', 'TEXT');
  addColumnIfMissing('behavior_logs', 'recorded_by', 'INTEGER');
  addColumnIfMissing('lesson_plans', 'teacher_id', 'INTEGER');
  addColumnIfMissing('lesson_plans', 'course_id', 'INTEGER');
  addColumnIfMissing('lesson_plans', 'week', 'TEXT');
  addColumnIfMissing('lesson_plans', 'materials', 'TEXT');
  addColumnIfMissing('lesson_plans', 'activities', 'TEXT');
  addColumnIfMissing('lesson_plans', 'assessment', 'TEXT');
  addColumnIfMissing('notification_templates', 'school_id', 'INTEGER');
  addColumnIfMissing('banners', 'sort_order', 'INTEGER');
  addColumnIfMissing('popups', 'style_overrides', 'TEXT');
  addColumnIfMissing('gallery_albums', 'slug', 'TEXT');
  addColumnIfMissing('gallery_albums', 'type', 'TEXT');
  addColumnIfMissing('gallery_albums', 'is_published', 'INTEGER');
  addColumnIfMissing('virtual_tours', 'embed_url', 'TEXT');
  addColumnIfMissing('virtual_tours', 'thumbnail_url', 'TEXT');
  addColumnIfMissing('virtual_tours', 'location', 'TEXT');
  addColumnIfMissing('virtual_tours', 'is_published', 'INTEGER');
  addColumnIfMissing('virtual_tours', 'sort_order', 'INTEGER');
}

export function getDb() {
  if (!_db) {
    const sqlite = new Database(DB_PATH);
    autoMigrate(sqlite);
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export type DB = ReturnType<typeof getDb>;
