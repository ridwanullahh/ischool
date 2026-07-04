/**
 * Migration Patch: Add all missing tables and columns that were added
 * to schema.ts after the initial migration was written.
 *
 * This is idempotent — safe to run multiple times.
 */
import Database from 'better-sqlite3';
import { resolve } from 'path';

const DB_PATH = resolve(process.cwd(), 'ischool.db');

export function migratePatch() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // ── Add missing columns to existing tables ──
  const addColumnIfMissing = (table: string, column: string, def: string) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    if (!cols.some(c => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def};`);
      console.log(`  Added column ${table}.${column}`);
    }
  };

  // students table new columns
  addColumnIfMissing('students', 'family_group_id', 'INTEGER');
  addColumnIfMissing('students', 'blood_group', 'TEXT');
  addColumnIfMissing('students', 'nationality', 'TEXT');
  addColumnIfMissing('students', 'religion', 'TEXT');
  addColumnIfMissing('students', 'previous_school', 'TEXT');

  // cbt_attempts new columns
  addColumnIfMissing('cbt_attempts', 'device_fingerprint', 'TEXT');
  addColumnIfMissing('cbt_attempts', 'status', "TEXT NOT NULL DEFAULT 'in_progress'");

  // leave_requests new column
  addColumnIfMissing('leave_requests', 'days', 'INTEGER');

  // library_loans new column
  addColumnIfMissing('library_loans', 'fine_paid', 'INTEGER DEFAULT 0');

  // coupons new columns
  addColumnIfMissing('coupons', 'name', 'TEXT');
  addColumnIfMissing('coupons', 'currency', "TEXT DEFAULT 'USD'");
  addColumnIfMissing('coupons', 'min_amount', 'INTEGER DEFAULT 0');

  // ── Create missing tables ──
  db.exec(`
    -- SIS: Student Documents
    CREATE TABLE IF NOT EXISTS student_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_name TEXT,
      file_type TEXT,
      uploaded_by INTEGER REFERENCES users(id),
      created_at INTEGER,
      updated_at INTEGER
    );

    -- SIS: Student Medical Records
    CREATE TABLE IF NOT EXISTS student_medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT,
      date TEXT,
      recorded_by INTEGER REFERENCES users(id),
      created_at INTEGER,
      updated_at INTEGER
    );

    -- SIS: Student Emergency Contacts
    CREATE TABLE IF NOT EXISTS student_emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      relationship TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      is_primary INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- SIS: Family Groups
    CREATE TABLE IF NOT EXISTS family_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      family_name TEXT NOT NULL,
      primary_contact_name TEXT,
      primary_contact_phone TEXT,
      primary_contact_email TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- HR: Staff Attendance
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      clock_in TEXT,
      clock_out TEXT,
      method TEXT NOT NULL DEFAULT 'manual',
      notes TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- HR: Leave Balances
    CREATE TABLE IF NOT EXISTS leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      type TEXT NOT NULL,
      allocated INTEGER DEFAULT 0,
      used INTEGER DEFAULT 0,
      carried_over INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- HR: Job Postings
    CREATE TABLE IF NOT EXISTS job_postings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      department TEXT,
      description TEXT,
      requirements TEXT DEFAULT '[]',
      employment_type TEXT NOT NULL DEFAULT 'full_time',
      salary_range TEXT,
      start_date TEXT,
      application_deadline TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_by INTEGER REFERENCES users(id),
      created_at INTEGER,
      updated_at INTEGER
    );

    -- HR: Job Applications
    CREATE TABLE IF NOT EXISTS job_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
      applicant_name TEXT NOT NULL,
      applicant_email TEXT NOT NULL,
      applicant_phone TEXT,
      cover_letter TEXT,
      resume_url TEXT,
      status TEXT NOT NULL DEFAULT 'submitted',
      created_at INTEGER,
      updated_at INTEGER
    );

    -- HR: Interviews
    CREATE TABLE IF NOT EXISTS interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      scheduled_at TEXT NOT NULL,
      duration INTEGER DEFAULT 60,
      location TEXT,
      interviewer_id INTEGER REFERENCES users(id),
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at INTEGER,
      updated_at INTEGER
    );

    -- HR: Performance Appraisals
    CREATE TABLE IF NOT EXISTS performance_appraisals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      cycle TEXT NOT NULL,
      type TEXT NOT NULL,
      kpis TEXT DEFAULT '[]',
      strengths TEXT,
      improvements TEXT,
      goals TEXT,
      overall_rating INTEGER,
      reviewer_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Library: Reservations
    CREATE TABLE IF NOT EXISTS library_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      reserved_at TEXT,
      fulfilled_at TEXT,
      expires_at TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Transport: Dispatch
    CREATE TABLE IF NOT EXISTS transport_dispatch (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      route_id INTEGER NOT NULL REFERENCES transport_routes(id),
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      departure_time TEXT,
      arrival_time TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      notes TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Transport: Boarding
    CREATE TABLE IF NOT EXISTS transport_boarding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id INTEGER NOT NULL REFERENCES transport_dispatch(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      boarded_at TEXT,
      status TEXT NOT NULL DEFAULT 'boarded',
      parent_notified INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Inventory: Asset Checkouts
    CREATE TABLE IF NOT EXISTS asset_checkouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      checked_out_to INTEGER NOT NULL REFERENCES users(id),
      checked_out_by INTEGER REFERENCES users(id),
      checkout_date TEXT NOT NULL,
      expected_return_date TEXT,
      actual_return_date TEXT,
      returned_to INTEGER REFERENCES users(id),
      condition_at_checkout TEXT,
      condition_at_return TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Inventory: Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Inventory: Purchase Requests
    CREATE TABLE IF NOT EXISTS purchase_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      requested_by INTEGER NOT NULL REFERENCES users(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      items TEXT NOT NULL,
      total_amount INTEGER,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      approved_by INTEGER REFERENCES users(id),
      approved_at TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Events: RSVPs
    CREATE TABLE IF NOT EXISTS event_rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      response TEXT NOT NULL,
      number_of_guests INTEGER DEFAULT 0,
      notes TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- RBAC: Role Overrides
    CREATE TABLE IF NOT EXISTS role_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      permission TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at INTEGER
    );

    -- Finance: Fee Access Rules
    CREATE TABLE IF NOT EXISTS fee_access_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      enabled INTEGER DEFAULT 0,
      grace_period_days INTEGER DEFAULT 0,
      blocked_modules TEXT DEFAULT '[]',
      threshold_amount INTEGER DEFAULT 0,
      block_message TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- LMS: Discussion Boards
    CREATE TABLE IF NOT EXISTS discussion_boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      locked INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at INTEGER,
      updated_at INTEGER
    );

    -- LMS: Discussion Posts
    CREATE TABLE IF NOT EXISTS discussion_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL REFERENCES discussion_boards(id) ON DELETE CASCADE,
      parent_id INTEGER,
      author_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      pinned INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- CBT: Proctoring Logs
    CREATE TABLE IF NOT EXISTS cbt_proctoring_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL REFERENCES cbt_attempts(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      details TEXT,
      severity TEXT NOT NULL DEFAULT 'warning'
    );

    -- CBT: Sections
    CREATE TABLE IF NOT EXISTS cbt_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      time_limit INTEGER,
      marks INTEGER,
      question_count INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- CBT: Question Tags
    CREATE TABLE IF NOT EXISTS cbt_question_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'topic',
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Platform: Webhooks
    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      events TEXT DEFAULT '[]',
      secret TEXT,
      active INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Platform: Webhook Deliveries
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      payload TEXT,
      response_status INTEGER,
      response_body TEXT,
      delivered_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Platform: GDPR Data Requests
    CREATE TABLE IF NOT EXISTS data_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      school_id INTEGER REFERENCES schools(id),
      type TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      processed_by INTEGER REFERENCES users(id),
      processed_at TEXT,
      response_note TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
  `);

  console.log('Migration patch applied successfully');
  db.close();
}

// Run if called directly
migratePatch();
