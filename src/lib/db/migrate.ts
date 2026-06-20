import Database from 'better-sqlite3';
import { resolve } from 'path';

const DB_PATH = resolve(process.cwd(), 'ischool.db');

export function migrate() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'school_admin',
      avatar_url TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
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
      theme TEXT DEFAULT 'harmony',
      custom_domain TEXT,
      settings TEXT DEFAULT '{}',
      social_handles TEXT DEFAULT '{}',
      owner_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS school_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'editor',
      active INTEGER DEFAULT 1,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS about_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
      mission TEXT,
      vision TEXT,
      features TEXT DEFAULT '[]',
      value_proposition TEXT,
      stats TEXT DEFAULT '[]',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      excerpt TEXT,
      banner_image_url TEXT,
      cta_text TEXT,
      cta_url TEXT,
      is_pinned INTEGER DEFAULT 0,
      published INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL DEFAULT '',
      description TEXT,
      content TEXT,
      grade_level TEXT,
      teacher_name TEXT,
      capacity INTEGER,
      image_url TEXT,
      has_detail_page INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      cover_image_url TEXT,
      author_id INTEGER REFERENCES users(id),
      is_published INTEGER DEFAULT 0,
      published_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL DEFAULT '',
      description TEXT,
      content TEXT,
      duration TEXT,
      level TEXT,
      icon TEXT,
      image_url TEXT,
      has_detail_page INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT,
      image_url TEXT NOT NULL,
      caption TEXT,
      category TEXT DEFAULT 'General',
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS contact_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'general',
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS contact_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      form_type TEXT NOT NULL DEFAULT 'general',
      data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS navigation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      parent_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      is_external INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS platform_blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      excerpt TEXT,
      cover_image_url TEXT,
      author_id INTEGER REFERENCES users(id),
      category TEXT DEFAULT 'News',
      tags TEXT DEFAULT '[]',
      is_published INTEGER DEFAULT 0,
      published_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS platform_docs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      excerpt TEXT,
      category TEXT DEFAULT 'Getting Started',
      sort_order INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_email TEXT NOT NULL,
      from_email TEXT,
      subject TEXT NOT NULL,
      template TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      error TEXT,
      metadata TEXT,
      created_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);
    CREATE INDEX IF NOT EXISTS idx_school_members_school ON school_members(school_id);
    CREATE INDEX IF NOT EXISTS idx_school_members_user ON school_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_school ON blog_posts(school_id);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(school_id, slug);
    CREATE INDEX IF NOT EXISTS idx_announcements_school ON announcements(school_id);
    CREATE INDEX IF NOT EXISTS idx_announcements_slug ON announcements(school_id, slug);
    CREATE INDEX IF NOT EXISTS idx_contact_submissions_school ON contact_submissions(school_id);
    CREATE INDEX IF NOT EXISTS idx_platform_blog_slug ON platform_blog_posts(slug);
    CREATE INDEX IF NOT EXISTS idx_platform_docs_slug ON platform_docs(slug);

    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      user_fingerprint TEXT NOT NULL,
      reaction_type TEXT NOT NULL,
      created_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_reactions_entity ON reactions(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_school_members_active ON school_members(user_id, active);
  `);

  const alterStatements = [
    `ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN two_factor_secret TEXT`,
    `ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en'`,
    `ALTER TABLE schools ADD COLUMN active_modules TEXT DEFAULT '["cms","sis","lms","finance","communication"]'`,
    `ALTER TABLE schools ADD COLUMN locale TEXT DEFAULT 'en'`,
    `ALTER TABLE platform_settings ADD COLUMN type TEXT DEFAULT 'string'`,
    `ALTER TABLE platform_settings ADD COLUMN category TEXT DEFAULT 'general'`,
    `ALTER TABLE coupons ADD COLUMN name TEXT DEFAULT ''`,
    `ALTER TABLE coupons ADD COLUMN currency TEXT DEFAULT 'USD'`,
    `ALTER TABLE coupons ADD COLUMN min_amount INTEGER DEFAULT 0`,
    `ALTER TABLE school_support_tickets ADD COLUMN slug TEXT`,
  ];
  for (const sql of alterStatements) {
    try { db.exec(sql); } catch {}
  }

  const newTables = `
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id), student_id TEXT NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
      date_of_birth TEXT, gender TEXT, photo_url TEXT, email TEXT, phone TEXT, address TEXT,
      emergency_contact_name TEXT, emergency_contact_phone TEXT, medical_notes TEXT, allergies TEXT,
      parent_id INTEGER REFERENCES users(id), status TEXT NOT NULL DEFAULT 'active', enrollment_date TEXT,
      custom_fields TEXT DEFAULT '{}', documents TEXT DEFAULT '[]', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, class_id INTEGER REFERENCES classes(id),
      academic_year TEXT NOT NULL, term TEXT, status TEXT NOT NULL DEFAULT 'submitted', notes TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, date TEXT NOT NULL, period TEXT,
      status TEXT NOT NULL, marked_by INTEGER REFERENCES users(id), notes TEXT, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL, slug TEXT NOT NULL, description TEXT, subject TEXT, grade_level TEXT,
      teacher_id INTEGER REFERENCES users(id), cover_image_url TEXT, status TEXT NOT NULL DEFAULT 'draft',
      settings TEXT DEFAULT '{}', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS course_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT, sort_order INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT, unit_id INTEGER NOT NULL REFERENCES course_units(id) ON DELETE CASCADE,
      title TEXT NOT NULL, content TEXT, type TEXT DEFAULT 'text', file_url TEXT, external_url TEXT,
      duration INTEGER, sort_order INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE, title TEXT NOT NULL, instructions TEXT,
      type TEXT DEFAULT 'file_upload', due_date TEXT, max_points INTEGER DEFAULT 100,
      allow_late INTEGER DEFAULT 0, allow_resubmit INTEGER DEFAULT 0, is_group INTEGER DEFAULT 0,
      attachments TEXT DEFAULT '[]', rubric TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, content TEXT, file_url TEXT, link_url TEXT,
      status TEXT NOT NULL DEFAULT 'submitted', grade INTEGER, feedback TEXT,
      submitted_at INTEGER, graded_at INTEGER, graded_by INTEGER REFERENCES users(id),
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id), title TEXT NOT NULL, description TEXT, time_limit INTEGER,
      attempts INTEGER DEFAULT 1, passing_score INTEGER DEFAULT 50, randomize INTEGER DEFAULT 0,
      show_results INTEGER DEFAULT 1, scheduled_start TEXT, scheduled_end TEXT,
      status TEXT NOT NULL DEFAULT 'draft', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE, type TEXT NOT NULL,
      question TEXT NOT NULL, options TEXT, correct_answer TEXT, points INTEGER DEFAULT 1,
      difficulty TEXT DEFAULT 'medium', tags TEXT DEFAULT '[]', explanation TEXT,
      sort_order INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, answers TEXT NOT NULL,
      score INTEGER, total_points INTEGER, time_taken INTEGER, started_at INTEGER, completed_at INTEGER,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, course_id INTEGER REFERENCES courses(id),
      term TEXT, academic_year TEXT, category TEXT, score INTEGER, max_score INTEGER, grade TEXT, comment TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS academic_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, type TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
      parent_period_id INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS bell_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, periods TEXT NOT NULL, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS timetable_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      class_id INTEGER REFERENCES classes(id), course_id INTEGER REFERENCES courses(id),
      teacher_id INTEGER REFERENCES users(id), day_of_week INTEGER NOT NULL, period_number INTEGER NOT NULL,
      start_time TEXT NOT NULL, end_time TEXT NOT NULL, room TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS exam_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, type TEXT NOT NULL, academic_year TEXT, term TEXT,
      start_date TEXT, end_date TEXT, status TEXT NOT NULL DEFAULT 'draft', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT, series_id INTEGER NOT NULL REFERENCES exam_series(id) ON DELETE CASCADE,
      subject TEXT NOT NULL, class_id INTEGER REFERENCES classes(id), total_marks INTEGER NOT NULL,
      passing_marks INTEGER, duration INTEGER, date TEXT, venue TEXT, invigilator TEXT, instructions TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS exam_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, marks_obtained INTEGER,
      grade TEXT, rank INTEGER, remark TEXT, status TEXT NOT NULL DEFAULT 'present',
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS report_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, academic_year TEXT NOT NULL,
      term TEXT NOT NULL, results TEXT NOT NULL, class_teacher_comment TEXT, principal_remark TEXT,
      total_marks INTEGER, percentage INTEGER, class_rank INTEGER,
      promotion_status TEXT DEFAULT 'pending', generated_at INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS fee_structures (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, grade_level TEXT, category TEXT, items TEXT NOT NULL,
      total_amount INTEGER NOT NULL, frequency TEXT NOT NULL, academic_year TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, invoice_number TEXT NOT NULL,
      fee_structure_id INTEGER REFERENCES fee_structures(id), amount INTEGER NOT NULL, discount INTEGER DEFAULT 0,
      fine INTEGER DEFAULT 0, paid_amount INTEGER DEFAULT 0, balance INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', due_date TEXT, issued_at INTEGER,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE, amount INTEGER NOT NULL,
      method TEXT NOT NULL, reference TEXT, status TEXT NOT NULL DEFAULT 'completed',
      paid_by INTEGER REFERENCES users(id), notes TEXT, paid_at INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id), staff_id TEXT NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
      photo_url TEXT, department TEXT, designation TEXT, employment_type TEXT NOT NULL DEFAULT 'full_time',
      email TEXT, phone TEXT, address TEXT, qualifications TEXT DEFAULT '[]', certifications TEXT DEFAULT '[]',
      join_date TEXT, salary INTEGER, bank_details TEXT, emergency_contact TEXT, documents TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE, type TEXT NOT NULL,
      start_date TEXT NOT NULL, end_date TEXT NOT NULL, reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending', approved_by INTEGER REFERENCES users(id),
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE, month TEXT NOT NULL, year INTEGER NOT NULL,
      basic_salary INTEGER NOT NULL, allowances TEXT DEFAULT '[]', deductions TEXT DEFAULT '[]',
      gross_pay INTEGER NOT NULL, net_pay INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
      paid_at INTEGER, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id), recipient_id INTEGER REFERENCES users(id),
      group_id TEXT, subject TEXT, content TEXT NOT NULL, attachments TEXT DEFAULT '[]',
      parent_message_id INTEGER, is_read INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id), type TEXT NOT NULL DEFAULT 'info', title TEXT NOT NULL,
      body TEXT, link TEXT, channel TEXT NOT NULL DEFAULT 'in_app', is_read INTEGER DEFAULT 0,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS library_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL, author TEXT, isbn TEXT, publisher TEXT, genre TEXT, category TEXT,
      cover_url TEXT, description TEXT, total_copies INTEGER DEFAULT 1, available_copies INTEGER DEFAULT 1,
      shelf_location TEXT, barcode TEXT, purchase_date TEXT, price INTEGER,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS library_loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
      borrower_id INTEGER NOT NULL REFERENCES users(id), issued_by INTEGER REFERENCES users(id),
      issue_date TEXT NOT NULL, due_date TEXT NOT NULL, return_date TEXT,
      renewals INTEGER DEFAULT 0, fine INTEGER DEFAULT 0, status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS hostels (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, type TEXT DEFAULT 'mixed', warden_id INTEGER REFERENCES users(id),
      total_rooms INTEGER DEFAULT 0, total_beds INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS hostel_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT, hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
      room_number TEXT NOT NULL, floor INTEGER, type TEXT DEFAULT 'double', capacity INTEGER DEFAULT 2,
      occupants INTEGER DEFAULT 0, status TEXT NOT NULL DEFAULT 'available',
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS hostel_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      room_id INTEGER NOT NULL REFERENCES hostel_rooms(id), academic_year TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, plate_number TEXT, type TEXT DEFAULT 'bus', capacity INTEGER,
      driver_id INTEGER REFERENCES users(id), status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS transport_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, vehicle_id INTEGER REFERENCES vehicles(id), stops TEXT NOT NULL, schedule TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS transport_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      route_id INTEGER NOT NULL REFERENCES transport_routes(id), stop_name TEXT,
      status TEXT NOT NULL DEFAULT 'active', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, category TEXT, serial_number TEXT, description TEXT,
      purchase_date TEXT, purchase_price INTEGER, current_value INTEGER,
      assigned_to INTEGER REFERENCES users(id), location TEXT,
      condition TEXT NOT NULL DEFAULT 'good', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, category TEXT, quantity INTEGER DEFAULT 0, reorder_level INTEGER DEFAULT 5,
      unit TEXT, supplier TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT, category TEXT NOT NULL,
      start_date TEXT NOT NULL, end_date TEXT, start_time TEXT, end_time TEXT, venue TEXT,
      is_recurring INTEGER DEFAULT 0, recurrence_rule TEXT, audience TEXT DEFAULT '[]',
      rsvp_required INTEGER DEFAULT 0, image_url TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS behavior_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      type TEXT NOT NULL, category TEXT, description TEXT, points INTEGER DEFAULT 0,
      recorded_by INTEGER REFERENCES users(id), created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS lesson_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      teacher_id INTEGER NOT NULL REFERENCES users(id), course_id INTEGER REFERENCES courses(id),
      title TEXT NOT NULL, week TEXT, objectives TEXT, materials TEXT, activities TEXT, assessment TEXT,
      status TEXT NOT NULL DEFAULT 'draft', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS saved_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, module TEXT NOT NULL, config TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id), created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id), action TEXT NOT NULL, entity TEXT, entity_id INTEGER,
      details TEXT, ip_address TEXT, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS module_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      module TEXT NOT NULL, enabled INTEGER DEFAULT 1, settings TEXT DEFAULT '{}',
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS cbt_exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT, instructions TEXT, type TEXT NOT NULL,
      duration INTEGER, total_marks INTEGER, negative_marking INTEGER DEFAULT 0,
      negative_mark_value TEXT, access_mode TEXT NOT NULL DEFAULT 'restricted',
      scheduled_start TEXT, scheduled_end TEXT, max_attempts INTEGER DEFAULT 1,
      lockdown INTEGER DEFAULT 0, proctoring INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft', sections TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS cbt_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id), name TEXT NOT NULL, email TEXT, access_pin TEXT,
      status TEXT NOT NULL DEFAULT 'registered', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS cbt_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
      candidate_id INTEGER NOT NULL REFERENCES cbt_candidates(id) ON DELETE CASCADE,
      answers TEXT, score INTEGER, total_marks INTEGER, time_taken INTEGER,
      flags TEXT DEFAULT '[]', proctor_notes TEXT, ip_address TEXT,
      started_at INTEGER, submitted_at INTEGER, integrity_report TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS notification_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, channel TEXT NOT NULL, subject TEXT, body TEXT NOT NULL,
      variables TEXT DEFAULT '[]', created_at INTEGER, updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
    CREATE INDEX IF NOT EXISTS idx_students_status ON students(school_id, status);
    CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_courses_school ON courses(school_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_quizzes_school ON quizzes(school_id);
    CREATE INDEX IF NOT EXISTS idx_staff_school ON staff(school_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_library_books_school ON library_books(school_id);
    CREATE INDEX IF NOT EXISTS idx_events_school ON events(school_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_school ON audit_logs(school_id);
    CREATE INDEX IF NOT EXISTS idx_cbt_exams_school ON cbt_exams(school_id);
  `;

  // Execute new table creation separately (ALTER TABLE must run first)
  db.exec(newTables);

  const cmsTables = `
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL, subtitle TEXT, image_url TEXT NOT NULL, link_url TEXT, link_text TEXT,
      position TEXT NOT NULL DEFAULT 'hero', display_pages TEXT DEFAULT '["all"]',
      start_date TEXT, end_date TEXT, is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
      style_overrides TEXT DEFAULT '{}', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS popups (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL, content TEXT NOT NULL, image_url TEXT, link_url TEXT, link_text TEXT,
      trigger_type TEXT NOT NULL DEFAULT 'on_load', trigger_delay INTEGER DEFAULT 0,
      display_frequency TEXT NOT NULL DEFAULT 'once_per_session', display_pages TEXT DEFAULT '["all"]',
      start_date TEXT, end_date TEXT, is_active INTEGER DEFAULT 1,
      style_overrides TEXT DEFAULT '{}', created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS gallery_albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL, slug TEXT NOT NULL, description TEXT, cover_image_url TEXT,
      type TEXT NOT NULL DEFAULT 'custom', is_published INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS virtual_tours (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT, embed_url TEXT NOT NULL, thumbnail_url TEXT,
      location TEXT, is_published INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS media_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      uploaded_by INTEGER REFERENCES users(id), file_name TEXT NOT NULL, original_name TEXT NOT NULL,
      url TEXT NOT NULL, thumbnail_url TEXT, type TEXT NOT NULL, mime_type TEXT,
      size INTEGER, width INTEGER, height INTEGER, cloudinary_id TEXT, folder TEXT,
      tags TEXT DEFAULT '[]', created_at INTEGER, updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_banners_school ON banners(school_id);
    CREATE INDEX IF NOT EXISTS idx_popups_school ON popups(school_id);
    CREATE INDEX IF NOT EXISTS idx_gallery_albums_school ON gallery_albums(school_id);
    CREATE INDEX IF NOT EXISTS idx_virtual_tours_school ON virtual_tours(school_id);
    CREATE INDEX IF NOT EXISTS idx_media_uploads_school ON media_uploads(school_id);
  `;
  db.exec(cmsTables);

  try { db.exec(`ALTER TABLE gallery_items ADD COLUMN album_id INTEGER REFERENCES gallery_albums(id) ON DELETE SET NULL`); } catch {}

  const billingTables = `
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      monthly_price INTEGER NOT NULL DEFAULT 0,
      annual_price INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      billing_cycle TEXT NOT NULL DEFAULT 'both',
      max_schools INTEGER DEFAULT 1,
      max_students INTEGER DEFAULT 100,
      max_staff INTEGER DEFAULT 10,
      max_storage INTEGER DEFAULT 500,
      features TEXT NOT NULL DEFAULT '[]',
      module_access TEXT NOT NULL DEFAULT '[]',
      is_popular INTEGER DEFAULT 0,
      is_free INTEGER DEFAULT 0,
      trial_days INTEGER DEFAULT 14,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      custom_domain INTEGER DEFAULT 0,
      api_access INTEGER DEFAULT 0,
      priority_support INTEGER DEFAULT 0,
      white_label INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS school_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
      status TEXT NOT NULL DEFAULT 'trial',
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      current_period_start TEXT NOT NULL,
      current_period_end TEXT NOT NULL,
      trial_ends_at TEXT,
      cancelled_at TEXT,
      cancel_reason TEXT,
      auto_renew INTEGER DEFAULT 1,
      payment_method TEXT,
      external_id TEXT,
      coupon_id INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS platform_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      subscription_id INTEGER REFERENCES school_subscriptions(id),
      invoice_number TEXT NOT NULL UNIQUE,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      discount INTEGER DEFAULT 0,
      tax INTEGER DEFAULT 0,
      total_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      due_date TEXT NOT NULL,
      paid_at TEXT,
      period_start TEXT,
      period_end TEXT,
      line_items TEXT DEFAULT '[]',
      notes TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS platform_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES platform_invoices(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      gateway TEXT NOT NULL,
      gateway_reference TEXT,
      gateway_response TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      paid_at TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'percentage',
      value INTEGER NOT NULL,
      max_discount INTEGER,
      max_uses INTEGER,
      current_uses INTEGER DEFAULT 0,
      min_purchase INTEGER DEFAULT 0,
      applicable_plans TEXT DEFAULT '[]',
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER REFERENCES users(id),
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      invoice_id INTEGER REFERENCES platform_invoices(id),
      discount_amount INTEGER NOT NULL,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      assigned_to INTEGER REFERENCES users(id),
      resolved_at TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS support_ticket_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL,
      is_internal INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS platform_faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      sort_order INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_school_subscriptions_school ON school_subscriptions(school_id);
    CREATE INDEX IF NOT EXISTS idx_school_subscriptions_status ON school_subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_platform_invoices_school ON platform_invoices(school_id);
    CREATE INDEX IF NOT EXISTS idx_platform_payments_invoice ON platform_payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket ON support_ticket_replies(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_platform_faqs_category ON platform_faqs(category);
    CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);
  `;
  db.exec(billingTables);

  const aiTables = `
    CREATE TABLE IF NOT EXISTS ai_providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS ai_api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
      key_name TEXT NOT NULL,
      api_key TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      usage_count INTEGER DEFAULT 0,
      rate_limit_per_minute INTEGER DEFAULT 60,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS ai_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
      model_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      max_tokens INTEGER DEFAULT 4096,
      supports_tools INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      title TEXT DEFAULT 'New Conversation',
      agent_type TEXT NOT NULL DEFAULT 'admin',
      model_id INTEGER REFERENCES ai_models(id),
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      tool_results TEXT,
      tokens_used INTEGER DEFAULT 0,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS ai_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_ai_api_keys_provider ON ai_api_keys(provider_id);
    CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider_id);
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_school ON ai_conversations(school_id);
    CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_ai_settings_school ON ai_settings(school_id);
  `;
  db.exec(aiTables);

  const supportTables = `
    CREATE TABLE IF NOT EXISTS school_support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      ticket_number TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      channel TEXT DEFAULT 'web',
      source TEXT DEFAULT 'internal',
      created_by INTEGER REFERENCES users(id),
      created_by_name TEXT,
      created_by_email TEXT,
      assigned_to INTEGER REFERENCES users(id),
      resolved_at TEXT,
      closed_at TEXT,
      satisfaction_rating INTEGER,
      satisfaction_comment TEXT,
      metadata TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS school_ticket_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES school_support_tickets(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      user_name TEXT,
      user_role TEXT,
      content TEXT NOT NULL,
      attachments TEXT,
      is_internal INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS school_ticket_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      is_public INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS subscriber_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT,
      school_id INTEGER REFERENCES schools(id),
      verified INTEGER DEFAULT 0,
      verification_token TEXT,
      reset_token TEXT,
      reset_expires INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_school_support_tickets_school ON school_support_tickets(school_id);
    CREATE INDEX IF NOT EXISTS idx_school_support_tickets_status ON school_support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_school_support_tickets_number ON school_support_tickets(ticket_number);
    CREATE INDEX IF NOT EXISTS idx_school_ticket_replies_ticket ON school_ticket_replies(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_school_ticket_categories_school ON school_ticket_categories(school_id);
    CREATE INDEX IF NOT EXISTS idx_subscriber_accounts_email ON subscriber_accounts(email);
  `;
  db.exec(supportTables);

  const liveClassTables = `
    CREATE TABLE IF NOT EXISTS live_class_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      course_id INTEGER REFERENCES courses(id),
      class_id INTEGER REFERENCES classes(id),
      teacher_id INTEGER REFERENCES users(id),
      scheduled_start TEXT,
      scheduled_end TEXT,
      duration INTEGER,
      status TEXT DEFAULT 'scheduled',
      meeting_provider TEXT DEFAULT 'builtin',
      meeting_id TEXT,
      meeting_url TEXT,
      meeting_password TEXT,
      settings TEXT,
      recording_url TEXT,
      recording_duration INTEGER,
      attendance TEXT,
      max_participants INTEGER DEFAULT 100,
      is_recurring INTEGER DEFAULT 0,
      recurrence_rule TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS live_class_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES live_class_rooms(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      user_name TEXT,
      type TEXT DEFAULT 'chat',
      content TEXT,
      metadata TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS live_class_polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES live_class_rooms(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      responses TEXT,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER REFERENCES users(id),
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS live_class_whiteboards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES live_class_rooms(id) ON DELETE CASCADE,
      title TEXT DEFAULT 'Whiteboard',
      data TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_live_class_rooms_school ON live_class_rooms(school_id);
    CREATE INDEX IF NOT EXISTS idx_live_class_rooms_status ON live_class_rooms(status);
    CREATE INDEX IF NOT EXISTS idx_live_class_messages_room ON live_class_messages(room_id);
    CREATE INDEX IF NOT EXISTS idx_live_class_polls_room ON live_class_polls(room_id);
  `;
  db.exec(liveClassTables);

  const extraTables = `
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      created_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);

    CREATE INDEX IF NOT EXISTS idx_students_school_status ON students(school_id, status);
    CREATE INDEX IF NOT EXISTS idx_students_school_enrollment ON students(school_id, enrollment_date);
    CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON attendance(school_id, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_invoices_school_status ON invoices(school_id, status);
    CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
    CREATE INDEX IF NOT EXISTS idx_grades_course ON grades(course_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_school_read ON notifications(school_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_school_date ON audit_logs(school_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_email_logs_to ON email_logs(to_email);
    CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_school_user ON ai_conversations(school_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_school_status ON school_support_tickets(school_id, status);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_school_status ON leave_requests(school_id, status);
    CREATE INDEX IF NOT EXISTS idx_assignments_school_course ON assignments(school_id, course_id);
    CREATE INDEX IF NOT EXISTS idx_courses_school ON courses(school_id);
    CREATE INDEX IF NOT EXISTS idx_events_school_date ON events(school_id, start_date);
  `;
  db.exec(extraTables);

  const existingTemplates = db.prepare("SELECT count(*) as cnt FROM notification_templates").get() as any;
  if (existingTemplates.cnt === 0) {
    const templateSeeds = [
      { name: 'welcome', channel: 'email', subject: 'Welcome to {{schoolName}}!', body: 'Hello {{name}}, welcome to {{schoolName}}! Your account has been created successfully.', variables: '["name","schoolName"]' },
      { name: 'password_reset', channel: 'email', subject: 'Reset Your Password', body: 'Hi {{name}}, click the link to reset your password: {{resetUrl}}. This link expires in 1 hour.', variables: '["name","resetUrl"]' },
      { name: 'attendance_alert', channel: 'email', subject: 'Attendance Alert — {{studentName}}', body: '{{studentName}} was marked absent on {{date}}. Please contact the school if this is unexpected.', variables: '["studentName","date"]' },
      { name: 'fee_reminder', channel: 'email', subject: 'Fee Payment Reminder', body: 'A fee of ${{amount}} for {{studentName}} is due on {{dueDate}}. Please make the payment at your earliest convenience.', variables: '["amount","studentName","dueDate"]' },
      { name: 'grade_posted', channel: 'email', subject: 'New Grade Posted — {{courseName}}', body: 'A new grade ({{grade}}) has been posted for {{studentName}} in {{courseName}}.', variables: '["grade","studentName","courseName"]' },
      { name: 'assignment_created', channel: 'email', subject: 'New Assignment — {{courseName}}', body: 'A new assignment "{{title}}" has been created for {{courseName}}. Due: {{dueDate}}.', variables: '["title","courseName","dueDate"]' },
      { name: 'leave_approved', channel: 'email', subject: 'Leave Request Approved', body: 'Your leave request ({{type}}) from {{startDate}} to {{endDate}} has been approved.', variables: '["type","startDate","endDate"]' },
      { name: 'leave_rejected', channel: 'email', subject: 'Leave Request Rejected', body: 'Your leave request ({{type}}) from {{startDate}} to {{endDate}} has been rejected. Reason: {{reason}}.', variables: '["type","startDate","endDate","reason"]' },
      { name: 'payment_received', channel: 'email', subject: 'Payment Received', body: 'A payment of ${{amount}} via {{method}} has been received. Thank you!', variables: '["amount","method"]' },
      { name: 'enrollment_approved', channel: 'email', subject: 'Enrollment Approved', body: 'The enrollment for {{studentName}} has been approved. Welcome aboard!', variables: '["studentName"]' },
      { name: 'ticket_update', channel: 'email', subject: 'Ticket {{ticketNumber}} Updated', body: 'Your support ticket {{ticketNumber}} status has changed to: {{status}}.', variables: '["ticketNumber","status"]' },
      { name: 'event_reminder', channel: 'email', subject: 'Upcoming Event Reminder', body: "Don't forget: \"{{eventTitle}}\" is scheduled for {{startDate}}.", variables: '["eventTitle","startDate"]' },
      { name: 'announcement', channel: 'email', subject: '{{title}}', body: '{{content}}', variables: '["title","content"]' },
      { name: 'contact_submission', channel: 'email', subject: 'New {{formType}} Submission', body: 'A new {{formType}} submission has been received for {{schoolName}}.', variables: '["formType","schoolName"]' },
      { name: 'ai_interaction_log', channel: 'in_app', subject: 'AI Action Completed', body: 'AI performed {{action}} on {{entity}}.', variables: '["action","entity"]' },
    ];
    for (const t of templateSeeds) {
      db.prepare("INSERT INTO notification_templates (name, channel, subject, body, variables) VALUES (?, ?, ?, ?, ?)").run(t.name, t.channel, t.subject, t.body, t.variables);
    }
  }

  db.close();
  console.log('Database migrated successfully.');
}

migrate();
