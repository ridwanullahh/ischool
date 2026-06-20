import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
};

// ═══════════════════════════════════════════════════════
// CORE PLATFORM TABLES
// ═══════════════════════════════════════════════════════

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['super_admin', 'school_admin', 'teacher', 'student', 'parent', 'staff', 'accountant', 'librarian', 'it_admin'] }).notNull().default('school_admin'),
  avatarUrl: text('avatar_url'),
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).default(false),
  twoFactorSecret: text('two_factor_secret'),
  preferredLanguage: text('preferred_language').default('en'),
  ...timestamps,
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  used: integer('used', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const schools = sqliteTable('schools', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline'),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  primaryColor: text('primary_color').default('#2563eb'),
  theme: text('theme').default('harmony'),
  locale: text('locale').default('en'),
  customDomain: text('custom_domain'),
  settings: text('settings', { mode: 'json' }).default('{}'),
  socialHandles: text('social_handles', { mode: 'json' }).default('{}'),
  activeModules: text('active_modules', { mode: 'json' }).default('["cms","sis","lms","finance","communication"]'),
  ownerId: integer('owner_id').references(() => users.id),
  status: text('status', { enum: ['active', 'suspended', 'trial'] }).notNull().default('active'),
  ...timestamps,
});

export const schoolMembers = sqliteTable('school_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['admin', 'editor', 'teacher', 'student', 'parent', 'staff', 'accountant', 'librarian'] }).notNull().default('editor'),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ═══════════════════════════════════════════════════════
// WEBSITE CMS TABLES (existing)
// ═══════════════════════════════════════════════════════

export const aboutPages = sqliteTable('about_pages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }).unique(),
  mission: text('mission'),
  vision: text('vision'),
  features: text('features', { mode: 'json' }).default('[]'),
  valueProposition: text('value_proposition'),
  stats: text('stats', { mode: 'json' }).default('[]'),
  ...timestamps,
});

export const announcements = sqliteTable('announcements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  bannerImageUrl: text('banner_image_url'),
  ctaText: text('cta_text'),
  ctaUrl: text('cta_url'),
  isPinned: integer('is_pinned', { mode: 'boolean' }).default(false),
  published: integer('published', { mode: 'boolean' }).default(true),
  ...timestamps,
});

export const classes = sqliteTable('classes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  content: text('content'),
  gradeLevel: text('grade_level'),
  teacherName: text('teacher_name'),
  capacity: integer('capacity'),
  imageUrl: text('image_url'),
  hasDetailPage: integer('has_detail_page', { mode: 'boolean' }).default(true),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
});

export const blogPosts = sqliteTable('blog_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  coverImageUrl: text('cover_image_url'),
  authorId: integer('author_id').references(() => users.id),
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  ...timestamps,
});

export const programs = sqliteTable('programs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  content: text('content'),
  duration: text('duration'),
  level: text('level'),
  icon: text('icon'),
  imageUrl: text('image_url'),
  hasDetailPage: integer('has_detail_page', { mode: 'boolean' }).default(true),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
});

export const faqs = sqliteTable('faqs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category').default('General'),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
});

export const galleryItems = sqliteTable('gallery_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  albumId: integer('album_id'),
  title: text('title'),
  imageUrl: text('image_url').notNull(),
  caption: text('caption'),
  category: text('category').default('General'),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
});

export const contactInfo = sqliteTable('contact_info', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['general', 'admissions', 'head_office'] }).notNull().default('general'),
  label: text('label').notNull(),
  value: text('value').notNull(),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
});

export const contactSubmissions = sqliteTable('contact_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  formType: text('form_type', { enum: ['general', 'admissions'] }).notNull().default('general'),
  data: text('data', { mode: 'json' }).notNull(),
  status: text('status', { enum: ['new', 'read', 'replied'] }).notNull().default('new'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const navigationItems = sqliteTable('navigation_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  url: text('url').notNull(),
  parentId: integer('parent_id'),
  sortOrder: integer('sort_order').default(0),
  isExternal: integer('is_external', { mode: 'boolean' }).default(false),
  ...timestamps,
});

export const platformBlogPosts = sqliteTable('platform_blog_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  coverImageUrl: text('cover_image_url'),
  authorId: integer('author_id').references(() => users.id),
  category: text('category').default('News'),
  tags: text('tags', { mode: 'json' }).default('[]'),
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  ...timestamps,
});

export const platformDocs = sqliteTable('platform_docs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  category: text('category').default('Getting Started'),
  sortOrder: integer('sort_order').default(0),
  isPublished: integer('is_published', { mode: 'boolean' }).default(true),
  ...timestamps,
});

export const emailLogs = sqliteTable('email_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  toEmail: text('to_email').notNull(),
  fromEmail: text('from_email'),
  subject: text('subject').notNull(),
  template: text('template'),
  status: text('status', { enum: ['sent', 'failed', 'queued'] }).notNull().default('queued'),
  error: text('error'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const reactions = sqliteTable('reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type', { enum: ['blog_post', 'announcement', 'program', 'class', 'platform_blog'] }).notNull(),
  entityId: integer('entity_id').notNull(),
  userFingerprint: text('user_fingerprint').notNull(),
  reactionType: text('reaction_type', { enum: ['like', 'love', 'helpful', 'celebrate'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ═══════════════════════════════════════════════════════
// MODULE 1: STUDENT INFORMATION SYSTEM (SIS)
// ═══════════════════════════════════════════════════════

export const students = sqliteTable('students', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id),
  studentId: text('student_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  dateOfBirth: text('date_of_birth'),
  gender: text('gender', { enum: ['male', 'female', 'other'] }),
  photoUrl: text('photo_url'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  medicalNotes: text('medical_notes'),
  allergies: text('allergies'),
  parentId: integer('parent_id').references(() => users.id),
  status: text('status', { enum: ['active', 'transferred', 'graduated', 'withdrawn', 'suspended'] }).notNull().default('active'),
  enrollmentDate: text('enrollment_date'),
  customFields: text('custom_fields', { mode: 'json' }).default('{}'),
  documents: text('documents', { mode: 'json' }).default('[]'),
  ...timestamps,
});

export const enrollments = sqliteTable('enrollments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  classId: integer('class_id').references(() => classes.id),
  academicYear: text('academic_year').notNull(),
  term: text('term'),
  status: text('status', { enum: ['submitted', 'reviewed', 'accepted', 'rejected', 'waitlisted'] }).notNull().default('submitted'),
  notes: text('notes'),
  ...timestamps,
});

export const attendance = sqliteTable('attendance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  period: text('period'),
  status: text('status', { enum: ['present', 'absent', 'late', 'excused', 'early_departure'] }).notNull(),
  markedBy: integer('marked_by').references(() => users.id),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ═══════════════════════════════════════════════════════
// MODULE 2: LEARNING MANAGEMENT SYSTEM (LMS)
// ═══════════════════════════════════════════════════════

export const courses = sqliteTable('courses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  subject: text('subject'),
  gradeLevel: text('grade_level'),
  teacherId: integer('teacher_id').references(() => users.id),
  coverImageUrl: text('cover_image_url'),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  settings: text('settings', { mode: 'json' }).default('{}'),
  ...timestamps,
});

export const courseUnits = sqliteTable('course_units', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
});

export const lessons = sqliteTable('lessons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  unitId: integer('unit_id').notNull().references(() => courseUnits.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'),
  type: text('type', { enum: ['text', 'video', 'file', 'link', 'interactive'] }).default('text'),
  fileUrl: text('file_url'),
  externalUrl: text('external_url'),
  duration: integer('duration'),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
});

export const assignments = sqliteTable('assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  instructions: text('instructions'),
  type: text('type', { enum: ['essay', 'file_upload', 'link', 'offline'] }).default('file_upload'),
  dueDate: text('due_date'),
  maxPoints: integer('max_points').default(100),
  allowLate: integer('allow_late', { mode: 'boolean' }).default(false),
  allowResubmit: integer('allow_resubmit', { mode: 'boolean' }).default(false),
  isGroup: integer('is_group', { mode: 'boolean' }).default(false),
  attachments: text('attachments', { mode: 'json' }).default('[]'),
  rubric: text('rubric', { mode: 'json' }),
  ...timestamps,
});

export const submissions = sqliteTable('submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assignmentId: integer('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  content: text('content'),
  fileUrl: text('file_url'),
  linkUrl: text('link_url'),
  status: text('status', { enum: ['submitted', 'graded', 'late', 'missing', 'returned'] }).notNull().default('submitted'),
  grade: integer('grade'),
  feedback: text('feedback'),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  gradedAt: integer('graded_at', { mode: 'timestamp' }),
  gradedBy: integer('graded_by').references(() => users.id),
  ...timestamps,
});

export const quizzes = sqliteTable('quizzes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').references(() => courses.id),
  title: text('title').notNull(),
  description: text('description'),
  timeLimit: integer('time_limit'),
  attempts: integer('attempts').default(1),
  passingScore: integer('passing_score').default(50),
  randomize: integer('randomize', { mode: 'boolean' }).default(false),
  showResults: integer('show_results', { mode: 'boolean' }).default(true),
  scheduledStart: text('scheduled_start'),
  scheduledEnd: text('scheduled_end'),
  status: text('status', { enum: ['draft', 'published', 'closed'] }).notNull().default('draft'),
  ...timestamps,
});

export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  quizId: integer('quiz_id').references(() => quizzes.id, { onDelete: 'cascade' }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching'] }).notNull(),
  question: text('question').notNull(),
  options: text('options', { mode: 'json' }),
  correctAnswer: text('correct_answer'),
  points: integer('points').default(1),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).default('medium'),
  tags: text('tags', { mode: 'json' }).default('[]'),
  explanation: text('explanation'),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
});

export const quizAttempts = sqliteTable('quiz_attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  answers: text('answers', { mode: 'json' }).notNull(),
  score: integer('score'),
  totalPoints: integer('total_points'),
  timeTaken: integer('time_taken'),
  startedAt: integer('started_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  ...timestamps,
});

export const grades = sqliteTable('grades', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').references(() => courses.id),
  term: text('term'),
  academicYear: text('academic_year'),
  category: text('category'),
  score: integer('score'),
  maxScore: integer('max_score'),
  grade: text('grade'),
  comment: text('comment'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 3: TIMETABLE & SCHEDULING
// ═══════════════════════════════════════════════════════

export const academicPeriods = sqliteTable('academic_periods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['year', 'term', 'semester', 'quarter'] }).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  parentPeriodId: integer('parent_period_id'),
  ...timestamps,
});

export const bellSchedules = sqliteTable('bell_schedules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  periods: text('periods', { mode: 'json' }).notNull(),
  ...timestamps,
});

export const timetableEntries = sqliteTable('timetable_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId: integer('class_id').references(() => classes.id),
  courseId: integer('course_id').references(() => courses.id),
  teacherId: integer('teacher_id').references(() => users.id),
  dayOfWeek: integer('day_of_week').notNull(),
  periodNumber: integer('period_number').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  room: text('room'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 4: EXAMINATIONS & RESULTS
// ═══════════════════════════════════════════════════════

export const examSeries = sqliteTable('exam_series', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['midterm', 'final', 'mock', 'quiz', 'practical', 'custom'] }).notNull(),
  academicYear: text('academic_year'),
  term: text('term'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  status: text('status', { enum: ['draft', 'scheduled', 'active', 'completed'] }).notNull().default('draft'),
  ...timestamps,
});

export const exams = sqliteTable('exams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seriesId: integer('series_id').notNull().references(() => examSeries.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  classId: integer('class_id').references(() => classes.id),
  totalMarks: integer('total_marks').notNull(),
  passingMarks: integer('passing_marks'),
  duration: integer('duration'),
  date: text('date'),
  venue: text('venue'),
  invigilator: text('invigilator'),
  instructions: text('instructions'),
  ...timestamps,
});

export const examResults = sqliteTable('exam_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  examId: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  marksObtained: integer('marks_obtained'),
  grade: text('grade'),
  rank: integer('rank'),
  remark: text('remark'),
  status: text('status', { enum: ['present', 'absent', 'withheld'] }).notNull().default('present'),
  ...timestamps,
});

export const reportCards = sqliteTable('report_cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  academicYear: text('academic_year').notNull(),
  term: text('term').notNull(),
  results: text('results', { mode: 'json' }).notNull(),
  classTeacherComment: text('class_teacher_comment'),
  principalRemark: text('principal_remark'),
  totalMarks: integer('total_marks'),
  percentage: integer('percentage'),
  classRank: integer('class_rank'),
  promotionStatus: text('promotion_status', { enum: ['promoted', 'retained', 'pending'] }).default('pending'),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 5: FINANCE & FEES
// ═══════════════════════════════════════════════════════

export const feeStructures = sqliteTable('fee_structures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  gradeLevel: text('grade_level'),
  category: text('category'),
  items: text('items', { mode: 'json' }).notNull(),
  totalAmount: integer('total_amount').notNull(),
  frequency: text('frequency', { enum: ['one_time', 'monthly', 'termly', 'annual'] }).notNull(),
  academicYear: text('academic_year'),
  ...timestamps,
});

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  invoiceNumber: text('invoice_number').notNull(),
  feeStructureId: integer('fee_structure_id').references(() => feeStructures.id),
  amount: integer('amount').notNull(),
  discount: integer('discount').default(0),
  fine: integer('fine').default(0),
  paidAmount: integer('paid_amount').default(0),
  balance: integer('balance').notNull(),
  status: text('status', { enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'] }).notNull().default('pending'),
  dueDate: text('due_date'),
  issuedAt: integer('issued_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  ...timestamps,
});

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  method: text('method', { enum: ['cash', 'bank_transfer', 'stripe', 'paystack', 'flutterwave', 'paypal', 'other'] }).notNull(),
  reference: text('reference'),
  status: text('status', { enum: ['completed', 'pending', 'failed', 'refunded'] }).notNull().default('completed'),
  paidBy: integer('paid_by').references(() => users.id),
  notes: text('notes'),
  paidAt: integer('paid_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 6: HR & STAFF MANAGEMENT
// ═══════════════════════════════════════════════════════

export const staff = sqliteTable('staff', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id),
  staffId: text('staff_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  photoUrl: text('photo_url'),
  department: text('department'),
  designation: text('designation'),
  employmentType: text('employment_type', { enum: ['full_time', 'part_time', 'contract', 'volunteer'] }).notNull().default('full_time'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  qualifications: text('qualifications', { mode: 'json' }).default('[]'),
  certifications: text('certifications', { mode: 'json' }).default('[]'),
  joinDate: text('join_date'),
  salary: integer('salary'),
  bankDetails: text('bank_details', { mode: 'json' }),
  emergencyContact: text('emergency_contact', { mode: 'json' }),
  documents: text('documents', { mode: 'json' }).default('[]'),
  status: text('status', { enum: ['active', 'on_leave', 'terminated', 'resigned'] }).notNull().default('active'),
  ...timestamps,
});

export const leaveRequests = sqliteTable('leave_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  staffId: integer('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other'] }).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  reason: text('reason'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvedBy: integer('approved_by').references(() => users.id),
  ...timestamps,
});

export const payroll = sqliteTable('payroll', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  staffId: integer('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  month: text('month').notNull(),
  year: integer('year').notNull(),
  basicSalary: integer('basic_salary').notNull(),
  allowances: text('allowances', { mode: 'json' }).default('[]'),
  deductions: text('deductions', { mode: 'json' }).default('[]'),
  grossPay: integer('gross_pay').notNull(),
  netPay: integer('net_pay').notNull(),
  status: text('status', { enum: ['draft', 'approved', 'paid'] }).notNull().default('draft'),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 7: COMMUNICATION & ENGAGEMENT
// ═══════════════════════════════════════════════════════

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  senderId: integer('sender_id').notNull().references(() => users.id),
  recipientId: integer('recipient_id').references(() => users.id),
  groupId: text('group_id'),
  subject: text('subject'),
  content: text('content').notNull(),
  attachments: text('attachments', { mode: 'json' }).default('[]'),
  parentMessageId: integer('parent_message_id'),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  ...timestamps,
});

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id),
  type: text('type', { enum: ['info', 'warning', 'alert', 'success'] }).notNull().default('info'),
  title: text('title').notNull(),
  body: text('body'),
  link: text('link'),
  channel: text('channel', { enum: ['in_app', 'email', 'sms', 'push'] }).notNull().default('in_app'),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 8: LIBRARY MANAGEMENT
// ═══════════════════════════════════════════════════════

export const libraryBooks = sqliteTable('library_books', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  author: text('author'),
  isbn: text('isbn'),
  publisher: text('publisher'),
  genre: text('genre'),
  category: text('category'),
  coverUrl: text('cover_url'),
  description: text('description'),
  totalCopies: integer('total_copies').default(1),
  availableCopies: integer('available_copies').default(1),
  shelfLocation: text('shelf_location'),
  barcode: text('barcode'),
  purchaseDate: text('purchase_date'),
  price: integer('price'),
  ...timestamps,
});

export const libraryLoans = sqliteTable('library_loans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  bookId: integer('book_id').notNull().references(() => libraryBooks.id, { onDelete: 'cascade' }),
  borrowerId: integer('borrower_id').notNull().references(() => users.id),
  issuedBy: integer('issued_by').references(() => users.id),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  returnDate: text('return_date'),
  renewals: integer('renewals').default(0),
  fine: integer('fine').default(0),
  status: text('status', { enum: ['active', 'returned', 'overdue', 'lost'] }).notNull().default('active'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 9: HOSTEL / DORMITORY MANAGEMENT
// ═══════════════════════════════════════════════════════

export const hostels = sqliteTable('hostels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['boys', 'girls', 'mixed'] }).default('mixed'),
  wardenId: integer('warden_id').references(() => users.id),
  totalRooms: integer('total_rooms').default(0),
  totalBeds: integer('total_beds').default(0),
  ...timestamps,
});

export const hostelRooms = sqliteTable('hostel_rooms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hostelId: integer('hostel_id').notNull().references(() => hostels.id, { onDelete: 'cascade' }),
  roomNumber: text('room_number').notNull(),
  floor: integer('floor'),
  type: text('type', { enum: ['single', 'double', 'dormitory'] }).default('double'),
  capacity: integer('capacity').default(2),
  occupants: integer('occupants').default(0),
  status: text('status', { enum: ['available', 'full', 'maintenance'] }).notNull().default('available'),
  ...timestamps,
});

export const hostelAllocations = sqliteTable('hostel_allocations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  roomId: integer('room_id').notNull().references(() => hostelRooms.id),
  academicYear: text('academic_year').notNull(),
  status: text('status', { enum: ['active', 'checked_out', 'cancelled'] }).notNull().default('active'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 10: TRANSPORT MANAGEMENT
// ═══════════════════════════════════════════════════════

export const vehicles = sqliteTable('vehicles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  plateNumber: text('plate_number'),
  type: text('type', { enum: ['bus', 'van', 'car'] }).default('bus'),
  capacity: integer('capacity'),
  driverId: integer('driver_id').references(() => users.id),
  status: text('status', { enum: ['active', 'maintenance', 'retired'] }).notNull().default('active'),
  ...timestamps,
});

export const transportRoutes = sqliteTable('transport_routes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  vehicleId: integer('vehicle_id').references(() => vehicles.id),
  stops: text('stops', { mode: 'json' }).notNull(),
  schedule: text('schedule', { mode: 'json' }),
  ...timestamps,
});

export const transportAssignments = sqliteTable('transport_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  routeId: integer('route_id').notNull().references(() => transportRoutes.id),
  stopName: text('stop_name'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 11: INVENTORY & ASSET MANAGEMENT
// ═══════════════════════════════════════════════════════

export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category'),
  serialNumber: text('serial_number'),
  description: text('description'),
  purchaseDate: text('purchase_date'),
  purchasePrice: integer('purchase_price'),
  currentValue: integer('current_value'),
  assignedTo: integer('assigned_to').references(() => users.id),
  location: text('location'),
  condition: text('condition', { enum: ['new', 'good', 'fair', 'damaged', 'decommissioned'] }).notNull().default('good'),
  ...timestamps,
});

export const inventoryItems = sqliteTable('inventory_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category'),
  quantity: integer('quantity').default(0),
  reorderLevel: integer('reorder_level').default(5),
  unit: text('unit'),
  supplier: text('supplier'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 12: EVENTS & CALENDAR
// ═══════════════════════════════════════════════════════

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category', { enum: ['academic', 'sports', 'cultural', 'holiday', 'exam', 'meeting', 'other'] }).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  venue: text('venue'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  recurrenceRule: text('recurrence_rule'),
  audience: text('audience', { mode: 'json' }).default('[]'),
  rsvpRequired: integer('rsvp_required', { mode: 'boolean' }).default(false),
  imageUrl: text('image_url'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 13: CLASSROOM TOOLS & TEACHING AIDS
// ═══════════════════════════════════════════════════════

export const behaviorLogs = sqliteTable('behavior_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['positive', 'negative'] }).notNull(),
  category: text('category'),
  description: text('description'),
  points: integer('points').default(0),
  recordedBy: integer('recorded_by').references(() => users.id),
  ...timestamps,
});

export const lessonPlans = sqliteTable('lesson_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  teacherId: integer('teacher_id').notNull().references(() => users.id),
  courseId: integer('course_id').references(() => courses.id),
  title: text('title').notNull(),
  week: text('week'),
  objectives: text('objectives'),
  materials: text('materials'),
  activities: text('activities'),
  assessment: text('assessment'),
  status: text('status', { enum: ['draft', 'submitted', 'approved'] }).notNull().default('draft'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 14: REPORTING & ANALYTICS
// ═══════════════════════════════════════════════════════

export const savedReports = sqliteTable('saved_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  module: text('module').notNull(),
  config: text('config', { mode: 'json' }).notNull(),
  createdBy: integer('created_by').references(() => users.id),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 15: IT & SYSTEM ADMINISTRATION
// ═══════════════════════════════════════════════════════

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity'),
  entityId: integer('entity_id'),
  details: text('details', { mode: 'json' }),
  ipAddress: text('ip_address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const moduleSettings = sqliteTable('module_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  module: text('module').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  settings: text('settings', { mode: 'json' }).default('{}'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// MODULE 16: e-EXAM & CBT
// ═══════════════════════════════════════════════════════

export const cbtExams = sqliteTable('cbt_exams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  instructions: text('instructions'),
  type: text('type', { enum: ['academic', 'entrance', 'employment', 'certification', 'custom'] }).notNull(),
  duration: integer('duration'),
  totalMarks: integer('total_marks'),
  negativeMarking: integer('negative_marking', { mode: 'boolean' }).default(false),
  negativeMarkValue: text('negative_mark_value'),
  accessMode: text('access_mode', { enum: ['open', 'restricted', 'class_based'] }).notNull().default('restricted'),
  scheduledStart: text('scheduled_start'),
  scheduledEnd: text('scheduled_end'),
  maxAttempts: integer('max_attempts').default(1),
  lockdown: integer('lockdown', { mode: 'boolean' }).default(false),
  proctoring: integer('proctoring', { mode: 'boolean' }).default(false),
  status: text('status', { enum: ['draft', 'published', 'closed', 'archived'] }).notNull().default('draft'),
  sections: text('sections', { mode: 'json' }),
  ...timestamps,
});

export const cbtCandidates = sqliteTable('cbt_candidates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  examId: integer('exam_id').notNull().references(() => cbtExams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id),
  name: text('name').notNull(),
  email: text('email'),
  accessPin: text('access_pin'),
  status: text('status', { enum: ['registered', 'started', 'submitted', 'absent', 'disqualified'] }).notNull().default('registered'),
  ...timestamps,
});

export const cbtAttempts = sqliteTable('cbt_attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  examId: integer('exam_id').notNull().references(() => cbtExams.id, { onDelete: 'cascade' }),
  candidateId: integer('candidate_id').notNull().references(() => cbtCandidates.id, { onDelete: 'cascade' }),
  answers: text('answers', { mode: 'json' }),
  score: integer('score'),
  totalMarks: integer('total_marks'),
  timeTaken: integer('time_taken'),
  flags: text('flags', { mode: 'json' }).default('[]'),
  proctorNotes: text('proctor_notes'),
  ipAddress: text('ip_address'),
  startedAt: integer('started_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }),
  integrityReport: text('integrity_report', { mode: 'json' }),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// SHARED: NOTIFICATIONS HUB
// ═══════════════════════════════════════════════════════

export const notificationTemplates = sqliteTable('notification_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  channel: text('channel', { enum: ['email', 'sms', 'push', 'in_app'] }).notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  variables: text('variables', { mode: 'json' }).default('[]'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// WEBSITE CMS: BANNERS, POPUPS, GALLERY ALBUMS, VIRTUAL TOURS, MEDIA
// ═══════════════════════════════════════════════════════

export const banners = sqliteTable('banners', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  imageUrl: text('image_url').notNull(),
  linkUrl: text('link_url'),
  linkText: text('link_text'),
  position: text('position', { enum: ['top', 'header_below', 'hero', 'sidebar', 'footer'] }).notNull().default('hero'),
  displayPages: text('display_pages', { mode: 'json' }).default('["all"]'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  sortOrder: integer('sort_order').default(0),
  styleOverrides: text('style_overrides', { mode: 'json' }).default('{}'),
  ...timestamps,
});

export const popups = sqliteTable('popups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  linkUrl: text('link_url'),
  linkText: text('link_text'),
  triggerType: text('trigger_type', { enum: ['on_load', 'scroll', 'exit_intent', 'timed', 'click'] }).notNull().default('on_load'),
  triggerDelay: integer('trigger_delay').default(0),
  displayFrequency: text('display_frequency', { enum: ['every_visit', 'once_per_session', 'once_per_day', 'once'] }).notNull().default('once_per_session'),
  displayPages: text('display_pages', { mode: 'json' }).default('["all"]'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  styleOverrides: text('style_overrides', { mode: 'json' }).default('{}'),
  ...timestamps,
});

export const galleryAlbums = sqliteTable('gallery_albums', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  type: text('type', { enum: ['campus', 'facilities', 'students', 'activities', 'events', 'sports', 'virtual_tour', 'custom'] }).notNull().default('custom'),
  isPublished: integer('is_published', { mode: 'boolean' }).default(true),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
});

export const virtualTours = sqliteTable('virtual_tours', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  embedUrl: text('embed_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  location: text('location'),
  isPublished: integer('is_published', { mode: 'boolean' }).default(true),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
});

export const mediaUploads = sqliteTable('media_uploads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  fileName: text('file_name').notNull(),
  originalName: text('original_name').notNull(),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  type: text('type', { enum: ['image', 'video', 'document', 'audio'] }).notNull(),
  mimeType: text('mime_type'),
  size: integer('size'),
  width: integer('width'),
  height: integer('height'),
  cloudinaryId: text('cloudinary_id'),
  folder: text('folder'),
  tags: text('tags', { mode: 'json' }).default('[]'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// PLATFORM BILLING & SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════

export const subscriptionPlans = sqliteTable('subscription_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  monthlyPrice: integer('monthly_price').notNull().default(0),
  annualPrice: integer('annual_price').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  billingCycle: text('billing_cycle', { enum: ['monthly', 'annual', 'both'] }).notNull().default('both'),
  maxSchools: integer('max_schools').default(1),
  maxStudents: integer('max_students').default(100),
  maxStaff: integer('max_staff').default(10),
  maxStorage: integer('max_storage').default(500),
  features: text('features', { mode: 'json' }).notNull().default('[]'),
  moduleAccess: text('module_access', { mode: 'json' }).notNull().default('[]'),
  isPopular: integer('is_popular', { mode: 'boolean' }).default(false),
  isFree: integer('is_free', { mode: 'boolean' }).default(false),
  trialDays: integer('trial_days').default(14),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  customDomain: integer('custom_domain', { mode: 'boolean' }).default(false),
  apiAccess: integer('api_access', { mode: 'boolean' }).default(false),
  prioritySupport: integer('priority_support', { mode: 'boolean' }).default(false),
  whiteLabel: integer('white_label', { mode: 'boolean' }).default(false),
  ...timestamps,
});

export const schoolSubscriptions = sqliteTable('school_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  planId: integer('plan_id').notNull().references(() => subscriptionPlans.id),
  status: text('status', { enum: ['active', 'trial', 'expired', 'cancelled', 'suspended', 'past_due'] }).notNull().default('trial'),
  billingCycle: text('billing_cycle', { enum: ['monthly', 'annual'] }).notNull().default('monthly'),
  currentPeriodStart: text('current_period_start').notNull(),
  currentPeriodEnd: text('current_period_end').notNull(),
  trialEndsAt: text('trial_ends_at'),
  cancelledAt: text('cancelled_at'),
  cancelReason: text('cancel_reason'),
  autoRenew: integer('auto_renew', { mode: 'boolean' }).default(true),
  paymentMethod: text('payment_method'),
  externalId: text('external_id'),
  couponId: integer('coupon_id'),
  ...timestamps,
});

export const platformInvoices = sqliteTable('platform_invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  subscriptionId: integer('subscription_id').references(() => schoolSubscriptions.id),
  invoiceNumber: text('invoice_number').notNull().unique(),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  discount: integer('discount').default(0),
  tax: integer('tax').default(0),
  totalAmount: integer('total_amount').notNull(),
  status: text('status', { enum: ['draft', 'pending', 'paid', 'failed', 'refunded', 'cancelled'] }).notNull().default('pending'),
  dueDate: text('due_date').notNull(),
  paidAt: text('paid_at'),
  periodStart: text('period_start'),
  periodEnd: text('period_end'),
  lineItems: text('line_items', { mode: 'json' }).notNull().default('[]'),
  notes: text('notes'),
  ...timestamps,
});

export const platformPayments = sqliteTable('platform_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').references(() => platformInvoices.id),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  gateway: text('gateway', { enum: ['stripe', 'paypal', 'paystack', 'flutterwave', 'coupon', 'manual', 'bank_transfer'] }).notNull(),
  gatewayReference: text('gateway_reference'),
  gatewayResponse: text('gateway_response', { mode: 'json' }),
  status: text('status', { enum: ['pending', 'completed', 'failed', 'refunded', 'disputed'] }).notNull().default('pending'),
  refundAmount: integer('refund_amount'),
  refundReason: text('refund_reason'),
  metadata: text('metadata', { mode: 'json' }),
  paidBy: integer('paid_by').references(() => users.id),
  paidAt: text('paid_at'),
  ...timestamps,
});

export const coupons = sqliteTable('coupons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', { enum: ['percentage', 'fixed', 'free_trial'] }).notNull(),
  value: integer('value').notNull(),
  currency: text('currency').default('USD'),
  minAmount: integer('min_amount').default(0),
  maxDiscount: integer('max_discount'),
  applicablePlans: text('applicable_plans', { mode: 'json' }).default('[]'),
  maxUses: integer('max_uses'),
  currentUses: integer('current_uses').default(0),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdBy: integer('created_by').references(() => users.id),
  ...timestamps,
});

export const couponRedemptions = sqliteTable('coupon_redemptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  couponId: integer('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  invoiceId: integer('invoice_id').references(() => platformInvoices.id),
  discountAmount: integer('discount_amount').notNull(),
  redeemedAt: integer('redeemed_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const supportTickets = sqliteTable('support_tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketNumber: text('ticket_number').notNull().unique(),
  schoolId: integer('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  category: text('category', { enum: ['billing', 'technical', 'account', 'feature_request', 'bug_report', 'general'] }).notNull().default('general'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
  status: text('status', { enum: ['open', 'in_progress', 'waiting', 'resolved', 'closed'] }).notNull().default('open'),
  assignedTo: integer('assigned_to').references(() => users.id),
  resolvedAt: text('resolved_at'),
  resolutionNotes: text('resolution_notes'),
  attachments: text('attachments', { mode: 'json' }).default('[]'),
  ...timestamps,
});

export const supportTicketReplies = sqliteTable('support_ticket_replies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  isInternal: integer('is_internal', { mode: 'boolean' }).default(false),
  attachments: text('attachments', { mode: 'json' }).default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const platformFaqs = sqliteTable('platform_faqs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category').notNull().default('General'),
  sortOrder: integer('sort_order').default(0),
  isPublished: integer('is_published', { mode: 'boolean' }).default(true),
  ...timestamps,
});

export const platformSettings = sqliteTable('platform_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  type: text('type', { enum: ['string', 'number', 'boolean', 'json'] }).notNull().default('string'),
  category: text('category').default('general'),
  description: text('description'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// AI INTEGRATION
// ═══════════════════════════════════════════════════════

export const aiProviders = sqliteTable('ai_providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
});

export const aiApiKeys = sqliteTable('ai_api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerId: integer('provider_id').notNull().references(() => aiProviders.id, { onDelete: 'cascade' }),
  keyName: text('key_name').notNull(),
  apiKey: text('api_key').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  usageCount: integer('usage_count').default(0),
  rateLimitPerMinute: integer('rate_limit_per_minute').default(60),
  ...timestamps,
});

export const aiModels = sqliteTable('ai_models', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerId: integer('provider_id').notNull().references(() => aiProviders.id, { onDelete: 'cascade' }),
  modelId: text('model_id').notNull(),
  displayName: text('display_name').notNull(),
  maxTokens: integer('max_tokens').default(4096),
  supportsTools: integer('supports_tools', { mode: 'boolean' }).default(true),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  ...timestamps,
});

export const aiConversations = sqliteTable('ai_conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id),
  title: text('title').default('New Conversation'),
  agentType: text('agent_type', { enum: ['admin', 'public'] }).notNull().default('admin'),
  modelId: integer('model_id').references(() => aiModels.id),
  ...timestamps,
});

export const aiMessages = sqliteTable('ai_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id').notNull().references(() => aiConversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system', 'tool'] }).notNull(),
  content: text('content').notNull(),
  toolCalls: text('tool_calls', { mode: 'json' }),
  toolResults: text('tool_results', { mode: 'json' }),
  tokensUsed: integer('tokens_used').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const aiSettings = sqliteTable('ai_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value', { mode: 'json' }),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// SUPPORT TICKET SYSTEM
// ═══════════════════════════════════════════════════════

export const schoolSupportTickets = sqliteTable('school_support_tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  ticketNumber: text('ticket_number').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').default('general'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).default('medium'),
  status: text('status', { enum: ['open', 'in_progress', 'waiting_customer', 'waiting_agent', 'resolved', 'closed'] }).default('open'),
  channel: text('channel').default('web'),
  source: text('source', { enum: ['internal', 'external', 'platform'] }).default('internal'),
  createdBy: integer('created_by').references(() => users.id),
  createdByName: text('created_by_name'),
  createdByEmail: text('created_by_email'),
  assignedTo: integer('assigned_to').references(() => users.id),
  resolvedAt: text('resolved_at'),
  closedAt: text('closed_at'),
  satisfactionRating: integer('satisfaction_rating'),
  satisfactionComment: text('satisfaction_comment'),
  metadata: text('metadata', { mode: 'json' }),
  ...timestamps,
});

export const schoolTicketReplies = sqliteTable('school_ticket_replies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id').notNull().references(() => schoolSupportTickets.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id),
  userName: text('user_name'),
  userRole: text('user_role'),
  content: text('content').notNull(),
  attachments: text('attachments', { mode: 'json' }),
  isInternal: integer('is_internal').default(0),
  ...timestamps,
});

export const schoolTicketCategories = sqliteTable('school_ticket_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  isPublic: integer('is_public').default(1),
  sortOrder: integer('sort_order').default(0),
  ...timestamps,
});

export const subscriberAccounts = sqliteTable('subscriber_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  schoolId: integer('school_id').references(() => schools.id),
  verified: integer('verified').default(0),
  verificationToken: text('verification_token'),
  resetToken: text('reset_token'),
  resetExpires: integer('reset_expires'),
  ...timestamps,
});

// ═══════════════════════════════════════════════════════
// LIVE CLASSES / VIRTUAL CLASSROOM
// ═══════════════════════════════════════════════════════

export const liveClassRooms = sqliteTable('live_class_rooms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  courseId: integer('course_id').references(() => courses.id),
  classId: integer('class_id').references(() => classes.id),
  teacherId: integer('teacher_id').references(() => users.id),
  scheduledStart: text('scheduled_start'),
  scheduledEnd: text('scheduled_end'),
  duration: integer('duration'),
  status: text('status', { enum: ['scheduled', 'live', 'ended', 'cancelled'] }).default('scheduled'),
  meetingProvider: text('meeting_provider').default('builtin'),
  meetingId: text('meeting_id'),
  meetingUrl: text('meeting_url'),
  meetingPassword: text('meeting_password'),
  settings: text('settings', { mode: 'json' }),
  recordingUrl: text('recording_url'),
  recordingDuration: integer('recording_duration'),
  attendance: text('attendance', { mode: 'json' }),
  maxParticipants: integer('max_participants').default(100),
  isRecurring: integer('is_recurring').default(0),
  recurrenceRule: text('recurrence_rule'),
  ...timestamps,
});

export const liveClassMessages = sqliteTable('live_class_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: integer('room_id').notNull().references(() => liveClassRooms.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id),
  userName: text('user_name'),
  type: text('type', { enum: ['chat', 'system', 'poll', 'reaction', 'hand_raise'] }).default('chat'),
  content: text('content'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const liveClassPolls = sqliteTable('live_class_polls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: integer('room_id').notNull().references(() => liveClassRooms.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  options: text('options', { mode: 'json' }).notNull(),
  responses: text('responses', { mode: 'json' }),
  isActive: integer('is_active').default(1),
  createdBy: integer('created_by').references(() => users.id),
  ...timestamps,
});

export const liveClassWhiteboards = sqliteTable('live_class_whiteboards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: integer('room_id').notNull().references(() => liveClassRooms.id, { onDelete: 'cascade' }),
  title: text('title').default('Whiteboard'),
  data: text('data', { mode: 'json' }),
  createdBy: integer('created_by').references(() => users.id),
  ...timestamps,
});
