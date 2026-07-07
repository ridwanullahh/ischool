import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import {
  aiProviders, aiApiKeys, aiModels, aiConversations, aiMessages, aiSettings,
  students, staff, courses, attendance, invoices, payments, events, messages,
  announcements, faqs, classes, programs, blogPosts, enrollments, leaveRequests,
  libraryBooks, schoolMembers, schools, contactInfo, assignments, grades,
  schoolSupportTickets, schoolTicketReplies, liveClassRooms,
  exams, examSeries, timetableEntries, feeStructures, notifications, hostelRooms,
} from '../../../lib/db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { decrypt, stripPII, logAudit, sanitizeHtml, validateRequired } from '../../../lib/security.js';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const m = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return m?.schoolId || null;
}

function getActiveApiKey(): { key: string; baseUrl: string; modelId: string } | null {
  const db = getDb();
  const activeKey = db.select({
    key: aiApiKeys.apiKey, baseUrl: aiProviders.baseUrl, modelId: aiModels.modelId,
  }).from(aiApiKeys)
    .innerJoin(aiProviders, eq(aiApiKeys.providerId, aiProviders.id))
    .leftJoin(aiModels, eq(aiModels.providerId, aiProviders.id))
    .where(and(eq(aiApiKeys.isActive, true), eq(aiProviders.isActive, true)))
    .orderBy(aiApiKeys.usageCount)
    .get();
  if (!activeKey) return null;
  try {
    return { key: decrypt(activeKey.key), baseUrl: activeKey.baseUrl, modelId: activeKey.modelId };
  } catch {
    return { key: activeKey.key, baseUrl: activeKey.baseUrl, modelId: activeKey.modelId };
  }
}

const SYSTEM_PROMPT = `You are the iSchool AI Assistant — a helpful school management agent. You help school administrators manage their school efficiently. You can search students, check attendance, manage fees, send messages, create announcements, and more. Always be concise, professional, and helpful. When performing actions that modify data, confirm with the user first. You have access to tools that let you interact with the school's database.`;

const READ_TOOLS = [
  { name: 'search_students', description: 'Search students by name or ID', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] } },
  { name: 'get_student_details', description: 'Get full student profile', parameters: { type: 'object', properties: { studentId: { type: 'number' } }, required: ['studentId'] } },
  { name: 'get_attendance_summary', description: 'Get attendance summary for a date', parameters: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD' } }, required: [] } },
  { name: 'get_fee_summary', description: 'Get school-wide fee collection status', parameters: { type: 'object', properties: {} } },
  { name: 'get_school_stats', description: 'Get overview statistics', parameters: { type: 'object', properties: {} } },
  { name: 'list_courses', description: 'List all courses', parameters: { type: 'object', properties: {} } },
  { name: 'list_upcoming_events', description: 'List upcoming events', parameters: { type: 'object', properties: {} } },
  { name: 'get_unread_messages', description: 'Get unread messages count', parameters: { type: 'object', properties: {} } },
  { name: 'search_books', description: 'Search library catalog', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'list_enrollments', description: 'List enrollments by status', parameters: { type: 'object', properties: { status: { type: 'string' } }, required: [] } },
  { name: 'get_outstanding_fees', description: 'Get outstanding fees summary', parameters: { type: 'object', properties: {} } },
  { name: 'list_leave_requests', description: 'List leave requests', parameters: { type: 'object', properties: { status: { type: 'string' } }, required: [] } },
  { name: 'get_student_attendance', description: 'Get attendance records for a specific student', parameters: { type: 'object', properties: { studentId: { type: 'number' }, fromDate: { type: 'string' }, toDate: { type: 'string' } }, required: ['studentId'] } },
  { name: 'get_student_grades', description: 'Get grades for a specific student', parameters: { type: 'object', properties: { studentId: { type: 'number' } }, required: ['studentId'] } },
  { name: 'get_absent_students', description: 'Get list of students absent on a date', parameters: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD' } }, required: [] } },
  { name: 'search_staff', description: 'Search staff members by name or ID', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'get_staff_details', description: 'Get full staff profile', parameters: { type: 'object', properties: { staffId: { type: 'number' } }, required: ['staffId'] } },
  { name: 'get_notifications', description: 'Get recent notifications count and list', parameters: { type: 'object', properties: { count: { type: 'number', description: 'Number of notifications to return' } }, required: [] } },
  { name: 'get_course_details', description: 'Get detailed course information', parameters: { type: 'object', properties: { courseId: { type: 'number' } }, required: ['courseId'] } },
  { name: 'get_upcoming_exams', description: 'Get upcoming exams list', parameters: { type: 'object', properties: {} } },
  { name: 'get_timetable', description: 'Get timetable for a class on a specific day', parameters: { type: 'object', properties: { classId: { type: 'number' }, day: { type: 'string' } }, required: ['classId'] } },
  { name: 'get_student_invoices', description: 'Get invoices for a specific student', parameters: { type: 'object', properties: { studentId: { type: 'number' } }, required: ['studentId'] } },
  { name: 'get_revenue_report', description: 'Get revenue summary for a period', parameters: { type: 'object', properties: { period: { type: 'string', description: 'month, term, or year' } }, required: [] } },
  { name: 'get_attendance_report', description: 'Get attendance summary report for a period', parameters: { type: 'object', properties: { period: { type: 'string', description: 'month, term, or year' } }, required: [] } },
  { name: 'get_academic_performance', description: 'Get academic performance summary for a term', parameters: { type: 'object', properties: { term: { type: 'string' } }, required: [] } },
  { name: 'search_tickets', description: 'Search support tickets by query', parameters: { type: 'object', properties: { query: { type: 'string' }, status: { type: 'string' } }, required: [] } },
  { name: 'get_ticket_stats', description: 'Get support ticket statistics', parameters: { type: 'object', properties: {} } },
  { name: 'get_unassigned_tickets', description: 'Get tickets without an assigned agent', parameters: { type: 'object', properties: {} } },
];

const WRITE_TOOLS = [
  { name: 'add_student', description: 'Add a new student to the school', parameters: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, studentId: { type: 'string' }, email: { type: 'string' }, gender: { type: 'string' }, dateOfBirth: { type: 'string' } }, required: ['firstName', 'lastName', 'studentId'] } },
  { name: 'update_student', description: 'Update student information', parameters: { type: 'object', properties: { studentId: { type: 'number' }, field: { type: 'string' }, value: { type: 'string' } }, required: ['studentId', 'field', 'value'] } },
  { name: 'mark_attendance', description: 'Mark attendance for a student on a date', parameters: { type: 'object', properties: { studentId: { type: 'number' }, date: { type: 'string' }, status: { type: 'string', description: 'present, absent, late, excused' } }, required: ['studentId', 'date', 'status'] } },
  { name: 'approve_leave', description: 'Approve a leave request', parameters: { type: 'object', properties: { leaveId: { type: 'number' } }, required: ['leaveId'] } },
  { name: 'reject_leave', description: 'Reject a leave request', parameters: { type: 'object', properties: { leaveId: { type: 'number' }, reason: { type: 'string' } }, required: ['leaveId'] } },
  { name: 'create_announcement', description: 'Create a new school announcement', parameters: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, excerpt: { type: 'string' } }, required: ['title', 'content'] } },
  { name: 'send_message', description: 'Send a message to a user', parameters: { type: 'object', properties: { recipientId: { type: 'number' }, subject: { type: 'string' }, content: { type: 'string' } }, required: ['recipientId', 'content'] } },
  { name: 'create_event', description: 'Create a school event', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, category: { type: 'string' }, startDate: { type: 'string' }, venue: { type: 'string' } }, required: ['title', 'category', 'startDate'] } },
  { name: 'create_assignment', description: 'Create a new assignment for a course', parameters: { type: 'object', properties: { courseId: { type: 'number' }, title: { type: 'string' }, instructions: { type: 'string' }, dueDate: { type: 'string' } }, required: ['courseId', 'title'] } },
  { name: 'record_payment', description: 'Record a fee payment', parameters: { type: 'object', properties: { invoiceId: { type: 'number' }, amount: { type: 'number' }, method: { type: 'string' } }, required: ['invoiceId', 'amount', 'method'] } },
  { name: 'create_blog_post', description: 'Create a blog post', parameters: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, excerpt: { type: 'string' }, publish: { type: 'boolean' } }, required: ['title', 'content'] } },
  { name: 'create_ticket', description: 'Create a support ticket', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' }, category: { type: 'string' } }, required: ['title', 'description'] } },
  { name: 'schedule_live_class', description: 'Schedule a live class session', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, scheduledStart: { type: 'string' }, duration: { type: 'number' } }, required: ['title'] } },
  { name: 'update_school_settings', description: 'Update school settings like name, tagline, or theme', parameters: { type: 'object', properties: { field: { type: 'string' }, value: { type: 'string' } }, required: ['field', 'value'] } },
  { name: 'approve_enrollment', description: 'Approve a pending enrollment application', parameters: { type: 'object', properties: { enrollmentId: { type: 'number' } }, required: ['enrollmentId'] } },
  { name: 'reject_enrollment', description: 'Reject an enrollment application with reason', parameters: { type: 'object', properties: { enrollmentId: { type: 'number' }, reason: { type: 'string' } }, required: ['enrollmentId', 'reason'] } },
  { name: 'generate_invoice', description: 'Generate a fee invoice for a student', parameters: { type: 'object', properties: { studentId: { type: 'number' }, amount: { type: 'number' }, description: { type: 'string' }, dueDate: { type: 'string' } }, required: ['studentId', 'amount'] } },
  { name: 'update_ticket_status', description: 'Change the status of a support ticket', parameters: { type: 'object', properties: { ticketId: { type: 'number' }, status: { type: 'string', description: 'open, in_progress, waiting_customer, waiting_agent, resolved, closed' } }, required: ['ticketId', 'status'] } },
  { name: 'assign_ticket', description: 'Assign a support ticket to a staff member', parameters: { type: 'object', properties: { ticketId: { type: 'number' }, assigneeId: { type: 'number' } }, required: ['ticketId', 'assigneeId'] } },
  { name: 'reply_to_ticket', description: 'Add a reply to a support ticket', parameters: { type: 'object', properties: { ticketId: { type: 'number' }, content: { type: 'string' }, isInternal: { type: 'boolean' } }, required: ['ticketId', 'content'] } },
];

const ADMIN_ONLY_TOOLS = ['approve_leave', 'reject_leave', 'record_payment', 'update_school_settings', 'update_student', 'approve_enrollment', 'reject_enrollment', 'generate_invoice', 'assign_ticket', 'update_ticket_status'];
const TEACHER_TOOLS = ['mark_attendance', 'create_assignment', 'schedule_live_class', 'create_event', 'create_announcement', 'reply_to_ticket'];

function getToolsForRole(role: string) {
  const allowed = new Set<string>();
  READ_TOOLS.forEach(t => allowed.add(t.name));

  if (role === 'super_admin' || role === 'school_admin') {
    WRITE_TOOLS.forEach(t => allowed.add(t.name));
  } else if (role === 'teacher') {
    TEACHER_TOOLS.forEach(n => allowed.add(n));
  } else if (role === 'accountant') {
    allowed.add('record_payment');
  } else if (role === 'staff' || role === 'it_admin') {
    allowed.add('create_ticket');
    allowed.add('schedule_live_class');
  }

  return [...READ_TOOLS, ...WRITE_TOOLS].filter(t => allowed.has(t.name));
}

function executeTool(toolName: string, args: any, schoolId: number): string {
  const db = getDb();
  try {
    switch (toolName) {
      case 'search_students': {
        const q = `%${args.query}%`;
        const results = db.select({ id: students.id, studentId: students.studentId, name: sql`${students.firstName} || ' ' || ${students.lastName}`, email: students.email, status: students.status })
          .from(students).where(and(eq(students.schoolId, schoolId), sql`(${students.firstName} || ' ' || ${students.lastName} LIKE ${q} OR ${students.studentId} LIKE ${q})`)).limit(10).all();
        return JSON.stringify(results.length ? results : 'No students found');
      }
      case 'get_student_details': {
        const s = db.select().from(students).where(and(eq(students.id, args.studentId), eq(students.schoolId, schoolId))).get();
        return s ? JSON.stringify(s) : 'Student not found';
      }
      case 'get_attendance_summary': {
        const date = args.date || new Date().toISOString().split('T')[0];
        const records = db.select({ status: attendance.status, count: sql<number>`count(*)` })
          .from(attendance).where(and(eq(attendance.schoolId, schoolId), eq(attendance.date, date)))
          .groupBy(attendance.status).all();
        return JSON.stringify({ date, summary: records });
      }
      case 'get_fee_summary': {
        const total = db.select({ total: sql<number>`coalesce(sum(${invoices.amount}), 0)`, paid: sql<number>`coalesce(sum(${invoices.paidAmount}), 0)`, count: sql<number>`count(*)` })
          .from(invoices).where(eq(invoices.schoolId, schoolId)).get();
        return JSON.stringify(total);
      }
      case 'get_school_stats': {
        const sCount = db.select({ c: sql<number>`count(*)` }).from(students).where(eq(students.schoolId, schoolId)).get()?.c || 0;
        const stCount = db.select({ c: sql<number>`count(*)` }).from(staff).where(eq(staff.schoolId, schoolId)).get()?.c || 0;
        const cCount = db.select({ c: sql<number>`count(*)` }).from(courses).where(eq(courses.schoolId, schoolId)).get()?.c || 0;
        const eCount = db.select({ c: sql<number>`count(*)` }).from(events).where(eq(events.schoolId, schoolId)).get()?.c || 0;
        return JSON.stringify({ students: sCount, staff: stCount, courses: cCount, events: eCount });
      }
      case 'list_courses': {
        const c = db.select({ id: courses.id, title: courses.title, status: courses.status, subject: courses.subject })
          .from(courses).where(eq(courses.schoolId, schoolId)).limit(20).all();
        return JSON.stringify(c.length ? c : 'No courses found');
      }
      case 'list_upcoming_events': {
        const today = new Date().toISOString().split('T')[0];
        const e = db.select({ id: events.id, title: events.title, startDate: events.startDate, category: events.category })
          .from(events).where(and(eq(events.schoolId, schoolId), sql`${events.startDate} >= ${today}`)).orderBy(events.startDate).limit(10).all();
        return JSON.stringify(e.length ? e : 'No upcoming events');
      }
      case 'get_unread_messages': {
        const count = db.select({ c: sql<number>`count(*)` }).from(messages).where(and(eq(messages.schoolId, schoolId), eq(messages.isRead, false))).get()?.c || 0;
        return JSON.stringify({ unreadCount: count });
      }
      case 'search_books': {
        const q = `%${args.query}%`;
        const b = db.select({ id: libraryBooks.id, title: libraryBooks.title, author: libraryBooks.author, availableCopies: libraryBooks.availableCopies })
          .from(libraryBooks).where(and(eq(libraryBooks.schoolId, schoolId), sql`(${libraryBooks.title} LIKE ${q} OR ${libraryBooks.author} LIKE ${q})`)).limit(10).all();
        return JSON.stringify(b.length ? b : 'No books found');
      }
      case 'list_enrollments': {
        const filter = args.status ? eq(enrollments.status, args.status) : sql`1=1`;
        const e = db.select({ id: enrollments.id, status: enrollments.status, academicYear: enrollments.academicYear, studentName: sql`${students.firstName} || ' ' || ${students.lastName}` })
          .from(enrollments).leftJoin(students, eq(enrollments.studentId, students.id))
          .where(and(eq(enrollments.schoolId, schoolId), filter)).limit(20).all();
        return JSON.stringify(e.length ? e : 'No enrollments found');
      }
      case 'get_outstanding_fees': {
        const outstanding = db.select({ count: sql<number>`count(*)`, totalBalance: sql<number>`coalesce(sum(${invoices.balance}), 0)` })
          .from(invoices).where(and(eq(invoices.schoolId, schoolId), sql`${invoices.status} != 'paid'`)).get();
        return JSON.stringify(outstanding);
      }
      case 'list_leave_requests': {
        const filter = args.status ? eq(leaveRequests.status, args.status) : sql`1=1`;
        const l = db.select({ id: leaveRequests.id, type: leaveRequests.type, status: leaveRequests.status, startDate: leaveRequests.startDate, endDate: leaveRequests.endDate, staffName: sql`${staff.firstName} || ' ' || ${staff.lastName}` })
          .from(leaveRequests).leftJoin(staff, eq(leaveRequests.staffId, staff.id))
          .where(and(eq(leaveRequests.schoolId, schoolId), filter)).limit(20).all();
        return JSON.stringify(l.length ? l : 'No leave requests found');
      }
      case 'add_student': {
        const result = db.insert(students).values({
          schoolId, studentId: args.studentId, firstName: args.firstName, lastName: args.lastName,
          email: args.email || null, gender: args.gender || null, dateOfBirth: args.dateOfBirth || null,
          status: 'active', enrollmentDate: new Date().toISOString().split('T')[0],
        }).returning().get();
        return JSON.stringify({ success: true, student: result });
      }
      case 'update_student': {
        const existing = db.select().from(students).where(and(eq(students.id, args.studentId), eq(students.schoolId, schoolId))).get();
        if (!existing) return 'Student not found';
        const updateObj: any = { updatedAt: new Date() };
        updateObj[args.field] = args.value;
        db.update(students).set(updateObj).where(eq(students.id, args.studentId)).run();
        return JSON.stringify({ success: true, updated: args.field });
      }
      case 'mark_attendance': {
        const record = db.insert(attendance).values({
          schoolId, studentId: args.studentId, date: args.date,
          status: args.status,
        }).returning().get();
        return JSON.stringify({ success: true, record });
      }
      case 'approve_leave': {
        const lr = db.select().from(leaveRequests).where(and(eq(leaveRequests.id, args.leaveId), eq(leaveRequests.schoolId, schoolId))).get();
        if (!lr) return 'Leave request not found';
        db.update(leaveRequests).set({ status: 'approved', updatedAt: new Date() }).where(eq(leaveRequests.id, args.leaveId)).run();
        return JSON.stringify({ success: true, message: 'Leave approved' });
      }
      case 'reject_leave': {
        const lr2 = db.select().from(leaveRequests).where(and(eq(leaveRequests.id, args.leaveId), eq(leaveRequests.schoolId, schoolId))).get();
        if (!lr2) return 'Leave request not found';
        db.update(leaveRequests).set({ status: 'rejected', updatedAt: new Date() }).where(eq(leaveRequests.id, args.leaveId)).run();
        return JSON.stringify({ success: true, message: 'Leave rejected' + (args.reason ? ': ' + args.reason : '') });
      }
      case 'create_announcement': {
        const ann = db.insert(announcements).values({
          schoolId, title: args.title, content: args.content,
          excerpt: args.excerpt || null, published: true,
        }).returning().get();
        return JSON.stringify({ success: true, announcement: ann });
      }
      case 'send_message': {
        const msg = db.insert(messages).values({
          schoolId, senderId: 0, recipientId: args.recipientId,
          subject: args.subject || null, content: args.content,
        }).returning().get();
        return JSON.stringify({ success: true, message: msg });
      }
      case 'create_event': {
        const ev = db.insert(events).values({
          schoolId, title: args.title, description: args.description || null,
          category: args.category as any, startDate: args.startDate,
          venue: args.venue || null,
        }).returning().get();
        return JSON.stringify({ success: true, event: ev });
      }
      case 'create_assignment': {
        const a = db.insert(assignments).values({
          schoolId, courseId: args.courseId, title: args.title,
          instructions: args.instructions || null, dueDate: args.dueDate || null,
        }).returning().get();
        return JSON.stringify({ success: true, assignment: a });
      }
      case 'record_payment': {
        const inv = db.select().from(invoices).where(and(eq(invoices.id, args.invoiceId), eq(invoices.schoolId, schoolId))).get();
        if (!inv) return 'Invoice not found';
        const newPaid = (inv.paidAmount || 0) + args.amount;
        const newBalance = Math.max(0, inv.amount - newPaid);
        const payment = db.insert(payments).values({
          invoiceId: args.invoiceId, schoolId, amount: args.amount,
          method: args.method as any, status: 'completed',
        }).returning().get();
        db.update(invoices).set({
          paidAmount: newPaid, balance: newBalance,
          status: newBalance === 0 ? 'paid' : 'partial',
        }).where(eq(invoices.id, args.invoiceId)).run();
        return JSON.stringify({ success: true, payment, newBalance });
      }
      case 'create_blog_post': {
        const post = db.insert(blogPosts).values({
          schoolId, title: args.title, content: args.content,
          excerpt: args.excerpt || null, slug: args.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          isPublished: args.publish ? 1 : 0,
        }).returning().get();
        return JSON.stringify({ success: true, post });
      }
      case 'create_ticket': {
        const ticket = db.insert(schoolSupportTickets).values({
          schoolId,
          ticketNumber: `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          title: args.title, description: args.description,
          category: args.category || 'general',
          priority: args.priority || 'medium',
          status: 'open', source: 'internal', channel: 'ai_chat',
        }).returning().get();
        return JSON.stringify({ success: true, ticket });
      }
      case 'schedule_live_class': {
        const room = db.insert(liveClassRooms).values({
          schoolId, title: args.title, description: args.description || null,
          scheduledStart: args.scheduledStart || null,
          duration: args.duration || 60,
        }).returning().get();
        return JSON.stringify({ success: true, room });
      }
      case 'update_school_settings': {
        const allowed = ['name', 'tagline', 'primary_color', 'theme'];
        if (!allowed.includes(args.field)) return 'Field not allowed. Use: ' + allowed.join(', ');
        const updateObj: any = { updatedAt: new Date() };
        updateObj[args.field] = args.value;
        db.update(schools).set(updateObj).where(eq(schools.id, schoolId)).run();
        return JSON.stringify({ success: true, updated: args.field });
      }
      case 'approve_enrollment': {
        const e = db.select().from(enrollments).where(and(eq(enrollments.id, args.enrollmentId), eq(enrollments.schoolId, schoolId))).get();
        if (!e) return 'Enrollment not found';
        db.update(enrollments).set({ status: 'accepted', updatedAt: new Date() }).where(eq(enrollments.id, args.enrollmentId)).run();
        return JSON.stringify({ success: true, enrollment: args.enrollmentId, status: 'accepted' });
      }
      case 'reject_enrollment': {
        const e = db.select().from(enrollments).where(and(eq(enrollments.id, args.enrollmentId), eq(enrollments.schoolId, schoolId))).get();
        if (!e) return 'Enrollment not found';
        db.update(enrollments).set({ status: 'rejected', updatedAt: new Date() }).where(eq(enrollments.id, args.enrollmentId)).run();
        return JSON.stringify({ success: true, enrollment: args.enrollmentId, status: 'rejected', reason: args.reason });
      }
      case 'generate_invoice': {
        const student = db.select().from(students).where(and(eq(students.id, args.studentId), eq(students.schoolId, schoolId))).get();
        if (!student) return 'Student not found';
        const inv = db.insert(invoices).values({
          schoolId, studentId: args.studentId, amount: args.amount, paidAmount: 0,
          status: 'pending', dueDate: args.dueDate || null,
          description: args.description || 'Fee invoice',
          createdAt: new Date(), updatedAt: new Date(),
        }).returning().get();
        return JSON.stringify({ success: true, invoiceId: inv.id, amount: args.amount });
      }
      case 'get_student_attendance': {
        let conds = [and(eq(attendance.schoolId, schoolId), eq(attendance.studentId, args.studentId))];
        if (args.fromDate) conds.push(sql`${attendance.date} >= ${args.fromDate}`);
        if (args.toDate) conds.push(sql`${attendance.date} <= ${args.toDate}`);
        const records = db.select({ date: attendance.date, status: attendance.status })
          .from(attendance).where(and(...conds)).orderBy(desc(attendance.date)).limit(30).all();
        return JSON.stringify(records.length ? records : 'No attendance records found');
      }
      case 'get_student_grades': {
        const g = db.select({ courseTitle: courses.title, score: grades.score, grade: grades.grade, term: grades.term, category: grades.category })
          .from(grades).leftJoin(courses, eq(grades.courseId, courses.id))
          .where(and(eq(grades.schoolId, schoolId), eq(grades.studentId, args.studentId)))
          .orderBy(desc(grades.createdAt)).limit(20).all();
        return JSON.stringify(g.length ? g : 'No grades found');
      }
      case 'get_absent_students': {
        const date = args.date || new Date().toISOString().split('T')[0];
        const absent = db.select({ studentId: students.id, name: sql`${students.firstName} || ' ' || ${students.lastName}`, studentNumber: students.studentId })
          .from(attendance).leftJoin(students, eq(attendance.studentId, students.id))
          .where(and(eq(attendance.schoolId, schoolId), eq(attendance.date, date), eq(attendance.status, 'absent')))
          .limit(50).all();
        return JSON.stringify({ date, absentCount: absent.length, students: absent });
      }
      case 'search_staff': {
        const q = `%${args.query}%`;
        const results = db.select({ id: staff.id, staffId: staff.staffId, name: sql`${staff.firstName} || ' ' || ${staff.lastName}`, email: staff.email, designation: staff.designation })
          .from(staff).where(and(eq(staff.schoolId, schoolId), sql`(${staff.firstName} || ' ' || ${staff.lastName} LIKE ${q} OR ${staff.staffId} LIKE ${q} OR ${staff.email} LIKE ${q})`)).limit(10).all();
        return JSON.stringify(results.length ? results : 'No staff found');
      }
      case 'get_staff_details': {
        const s = db.select().from(staff).where(and(eq(staff.id, args.staffId), eq(staff.schoolId, schoolId))).get();
        return s ? JSON.stringify(s) : 'Staff not found';
      }
      case 'get_notifications': {
        const count = args.count || 10;
        const notifs = db.select({ id: notifications.id, title: notifications.title, body: notifications.body, isRead: notifications.isRead, createdAt: notifications.createdAt })
          .from(notifications).where(eq(notifications.schoolId, schoolId))
          .orderBy(desc(notifications.createdAt)).limit(count).all();
        const unread = db.select({ c: sql<number>`count(*)` }).from(notifications)
          .where(and(eq(notifications.schoolId, schoolId), eq(notifications.isRead, false))).get()?.c || 0;
        return JSON.stringify({ unreadCount: unread, notifications: notifs });
      }
      case 'get_course_details': {
        const c = db.select().from(courses).where(and(eq(courses.id, args.courseId), eq(courses.schoolId, schoolId))).get();
        if (!c) return 'Course not found';
        const studentCount = db.select({ c: sql<number>`count(*)` }).from(enrollments)
          .where(and(eq(enrollments.schoolId, schoolId), eq(enrollments.status, 'accepted'))).get()?.c || 0;
        return JSON.stringify({ ...c, enrolledStudents: studentCount });
      }
      case 'get_upcoming_exams': {
        const today = new Date().toISOString().split('T')[0];
        const e = db.select({ id: exams.id, title: exams.title, startDate: exams.startDate, endDate: exams.endDate, seriesName: examSeries.name })
          .from(exams).leftJoin(examSeries, eq(exams.seriesId, examSeries.id))
          .where(and(eq(exams.schoolId, schoolId), sql`${exams.startDate} >= ${today}`))
          .orderBy(exams.startDate).limit(10).all();
        return JSON.stringify(e.length ? e : 'No upcoming exams');
      }
      case 'get_timetable': {
        let conds = [eq(timetableEntries.schoolId, schoolId), eq(timetableEntries.classId, args.classId)];
        if (args.day) conds.push(eq(timetableEntries.dayOfWeek, args.day));
        const entries = db.select({ day: timetableEntries.dayOfWeek, period: timetableEntries.periodNumber, startTime: timetableEntries.startTime, endTime: timetableEntries.endTime, courseTitle: courses.title })
          .from(timetableEntries).leftJoin(courses, eq(timetableEntries.courseId, courses.id))
          .where(and(...conds)).orderBy(timetableEntries.periodNumber).all();
        return JSON.stringify(entries.length ? entries : 'No timetable entries found');
      }
      case 'get_student_invoices': {
        const invs = db.select({ id: invoices.id, amount: invoices.amount, paidAmount: invoices.paidAmount, status: invoices.status, dueDate: invoices.dueDate, description: invoices.description })
          .from(invoices).where(and(eq(invoices.schoolId, schoolId), eq(invoices.studentId, args.studentId)))
          .orderBy(desc(invoices.createdAt)).limit(20).all();
        return JSON.stringify(invs.length ? invs : 'No invoices found');
      }
      case 'get_revenue_report': {
        const period = args.period || 'month';
        const total = db.select({ total: sql<number>`coalesce(sum(${invoices.amount}), 0)`, paid: sql<number>`coalesce(sum(${invoices.paidAmount}), 0)`, count: sql<number>`count(*)` })
          .from(invoices).where(eq(invoices.schoolId, schoolId)).get();
        const payments_total = db.select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)`, count: sql<number>`count(*)` })
          .from(payments).where(eq(payments.schoolId, schoolId)).get();
        return JSON.stringify({ period, invoiced: total, paymentsReceived: payments_total, collectionRate: total?.paid && total?.total ? Math.round((total.paid / total.total) * 100) + '%' : '0%' });
      }
      case 'get_attendance_report': {
        const period = args.period || 'month';
        const stats = db.select({ status: attendance.status, count: sql<number>`count(*)` })
          .from(attendance).where(eq(attendance.schoolId, schoolId))
          .groupBy(attendance.status).all();
        const total = stats.reduce((sum: number, s: any) => sum + s.count, 0);
        const present = stats.find((s: any) => s.status === 'present')?.count || 0;
        return JSON.stringify({ period, totalRecords: total, breakdown: stats, attendanceRate: total > 0 ? Math.round((present / total) * 100) + '%' : '0%' });
      }
      case 'get_academic_performance': {
        const term = args.term || '';
        let conds = [eq(grades.schoolId, schoolId)];
        if (term) conds.push(eq(grades.term, term));
        const stats = db.select({ avgScore: sql<number>`avg(${grades.score})`, maxScore: sql<number>`max(${grades.score})`, minScore: sql<number>`min(${grades.score})`, count: sql<number>`count(*)` })
          .from(grades).where(and(...conds)).get();
        return JSON.stringify({ term: term || 'all', ...stats });
      }
      case 'search_tickets': {
        let conds = [eq(schoolSupportTickets.schoolId, schoolId)];
        if (args.status) conds.push(eq(schoolSupportTickets.status, args.status));
        if (args.query) conds.push(like(schoolSupportTickets.title, `%${args.query}%`));
        const t = db.select({ id: schoolSupportTickets.id, ticketNumber: schoolSupportTickets.ticketNumber, title: schoolSupportTickets.title, status: schoolSupportTickets.status, priority: schoolSupportTickets.priority })
          .from(schoolSupportTickets).where(and(...conds)).orderBy(desc(schoolSupportTickets.createdAt)).limit(15).all();
        return JSON.stringify(t.length ? t : 'No tickets found');
      }
      case 'get_ticket_stats': {
        const open = db.select({ c: sql<number>`count(*)` }).from(schoolSupportTickets).where(and(eq(schoolSupportTickets.schoolId, schoolId), eq(schoolSupportTickets.status, 'open'))).get()?.c || 0;
        const inProgress = db.select({ c: sql<number>`count(*)` }).from(schoolSupportTickets).where(and(eq(schoolSupportTickets.schoolId, schoolId), eq(schoolSupportTickets.status, 'in_progress'))).get()?.c || 0;
        const resolved = db.select({ c: sql<number>`count(*)` }).from(schoolSupportTickets).where(and(eq(schoolSupportTickets.schoolId, schoolId), eq(schoolSupportTickets.status, 'resolved'))).get()?.c || 0;
        const total = db.select({ c: sql<number>`count(*)` }).from(schoolSupportTickets).where(eq(schoolSupportTickets.schoolId, schoolId)).get()?.c || 0;
        return JSON.stringify({ open, inProgress, resolved, total });
      }
      case 'get_unassigned_tickets': {
        const t = db.select({ id: schoolSupportTickets.id, ticketNumber: schoolSupportTickets.ticketNumber, title: schoolSupportTickets.title, priority: schoolSupportTickets.priority, createdAt: schoolSupportTickets.createdAt })
          .from(schoolSupportTickets).where(and(eq(schoolSupportTickets.schoolId, schoolId), sql`${schoolSupportTickets.assignedTo} IS NULL`, eq(schoolSupportTickets.status, 'open')))
          .orderBy(desc(schoolSupportTickets.createdAt)).limit(20).all();
        return JSON.stringify(t.length ? t : 'No unassigned tickets');
      }
      case 'update_ticket_status': {
        const t = db.select().from(schoolSupportTickets).where(and(eq(schoolSupportTickets.id, args.ticketId), eq(schoolSupportTickets.schoolId, schoolId))).get();
        if (!t) return 'Ticket not found';
        const update: any = { status: args.status, updatedAt: new Date() };
        if (args.status === 'resolved') update.resolvedAt = new Date().toISOString();
        if (args.status === 'closed') update.closedAt = new Date().toISOString();
        db.update(schoolSupportTickets).set(update).where(eq(schoolSupportTickets.id, args.ticketId)).run();
        return JSON.stringify({ success: true, ticketId: args.ticketId, status: args.status });
      }
      case 'assign_ticket': {
        const t = db.select().from(schoolSupportTickets).where(and(eq(schoolSupportTickets.id, args.ticketId), eq(schoolSupportTickets.schoolId, schoolId))).get();
        if (!t) return 'Ticket not found';
        db.update(schoolSupportTickets).set({ assignedTo: args.assigneeId, status: 'in_progress', updatedAt: new Date() }).where(eq(schoolSupportTickets.id, args.ticketId)).run();
        return JSON.stringify({ success: true, ticketId: args.ticketId, assigneeId: args.assigneeId });
      }
      case 'reply_to_ticket': {
        const t = db.select().from(schoolSupportTickets).where(and(eq(schoolSupportTickets.id, args.ticketId), eq(schoolSupportTickets.schoolId, schoolId))).get();
        if (!t) return 'Ticket not found';
        const reply = db.insert(schoolTicketReplies).values({
          ticketId: args.ticketId, content: args.content, isInternal: args.isInternal ? 1 : 0,
          createdAt: new Date(),
        }).returning().get();
        db.update(schoolSupportTickets).set({ updatedAt: new Date() }).where(eq(schoolSupportTickets.id, args.ticketId)).run();
        return JSON.stringify({ success: true, replyId: reply.id });
      }
      default: return 'Unknown tool: ' + toolName;
    }
  } catch (e: any) {
    return 'Error: ' + e.message;
  }
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const db = getDb();
  const action = url.searchParams.get('action');

  if (action === 'conversations') {
    const convs = db.select().from(aiConversations)
      .where(and(eq(aiConversations.schoolId, schoolId), eq(aiConversations.userId, user.id)))
      .orderBy(desc(aiConversations.createdAt)).all();
    return new Response(JSON.stringify(convs), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'conversation' && url.searchParams.get('id')) {
    const convId = parseInt(url.searchParams.get('id')!);
    const conv = db.select().from(aiConversations).where(and(eq(aiConversations.id, convId), eq(aiConversations.schoolId, schoolId))).get();
    if (!conv) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    const msgs = db.select().from(aiMessages).where(eq(aiMessages.conversationId, convId)).orderBy(aiMessages.createdAt).all();
    return new Response(JSON.stringify({ conversation: conv, messages: msgs }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'settings') {
    const settings = db.select().from(aiSettings).where(eq(aiSettings.schoolId, schoolId)).all();
    return new Response(JSON.stringify(settings), { headers: { 'Content-Type': 'application/json' } });
  }

  const models = db.select({ id: aiModels.id, displayName: aiModels.displayName, modelId: aiModels.modelId, providerName: aiProviders.name })
    .from(aiModels).leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
    .where(and(eq(aiModels.isActive, true), eq(aiProviders.isActive, true))).all();
  return new Response(JSON.stringify({ models }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const db = getDb();
  const data = await request.json();

  if (data.action === 'delete_conversation') {
    if (!data.conversationId) return new Response(JSON.stringify({ error: 'conversationId required' }), { status: 400 });
    db.delete(aiConversations).where(and(eq(aiConversations.id, data.conversationId), eq(aiConversations.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'update_settings') {
    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        const existing = db.select().from(aiSettings).where(and(eq(aiSettings.schoolId, schoolId), eq(aiSettings.key, key))).get();
        if (existing) {
          db.update(aiSettings).set({ value: value as any, updatedAt: new Date() }).where(eq(aiSettings.id, existing.id)).run();
        } else {
          db.insert(aiSettings).values({ schoolId, key, value: value as any }).run();
        }
      }
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.message) return new Response(JSON.stringify({ error: 'message required' }), { status: 400 });

  const validationErr = validateRequired(data, ['message']);
  if (validationErr) return new Response(JSON.stringify({ error: validationErr }), { status: 400 });

  const apiConfig = getActiveApiKey();
  if (!apiConfig) return new Response(JSON.stringify({ error: 'No AI provider configured. Please contact platform admin.' }), { status: 503 });

  let conversationId = data.conversationId;
  if (!conversationId) {
    const conv = db.insert(aiConversations).values({ schoolId, userId: user.id, title: data.message.slice(0, 50), agentType: 'admin' }).returning().get();
    conversationId = conv.id;

    const retentionSetting = db.select().from(aiSettings).where(and(eq(aiSettings.schoolId, schoolId), eq(aiSettings.key, 'conversation_retention_days'))).get();
    if (retentionSetting?.value) {
      const days = parseInt(retentionSetting.value as string);
      if (days > 0) {
        const cutoff = new Date(Date.now() - days * 86400000);
        db.delete(aiConversations).where(and(eq(aiConversations.schoolId, schoolId), sql`${aiConversations.createdAt} < ${cutoff.toISOString()}`)).run();
      }
    }
  }

  const cleanedMessage = sanitizeHtml(data.message);
  db.insert(aiMessages).values({ conversationId, role: 'user', content: cleanedMessage }).run();

  const history = db.select({ role: aiMessages.role, content: aiMessages.content }).from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId)).orderBy(aiMessages.createdAt).all();

  const piiSetting = db.select().from(aiSettings).where(and(eq(aiSettings.schoolId, schoolId), eq(aiSettings.key, 'pii_stripping'))).get();
  const shouldStripPII = piiSetting?.value !== 'false';

  const processedHistory = shouldStripPII
    ? history.map(m => {
        const { cleaned } = stripPII(m.content);
        return { role: m.role, content: cleaned };
      })
    : history;

  const autonomousSetting = db.select().from(aiSettings).where(and(eq(aiSettings.schoolId, schoolId), eq(aiSettings.key, 'autonomous_mode'))).get();
  const isAutonomous = autonomousSetting?.value !== 'false';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + `\n\nCurrent user: ${user.name} (${user.role}). School ID: ${schoolId}. ${isAutonomous ? 'You are in AUTONOMOUS mode — execute actions directly.' : 'You are in CONFIRMATION mode — describe actions and ask for confirmation before executing.'}` },
    ...processedHistory,
  ];

  const wantsStream = data.stream === true;

  if (wantsStream) {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({
              model: apiConfig.modelId || 'gpt-4o-mini',
              messages,
              tools: getToolsForRole(user.role).map(t => ({ type: 'function', function: t })),
              max_tokens: 2048,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            send('error', { error: 'AI provider error: ' + response.status });
            controller.close();
            return;
          }

          const result = await response.json();
          const choice = result.choices?.[0];
          if (!choice) {
            send('error', { error: 'No response from AI' });
            controller.close();
            return;
          }

          let toolResults: any[] = [];
          if (choice.message?.tool_calls) {
            send('tools', { toolCalls: choice.message.tool_calls.map((tc: any) => ({ name: tc.function?.name, args: JSON.parse(tc.function?.arguments || '{}') })) });

            for (const tc of choice.message.tool_calls) {
              const toolName = tc.function?.name;
              const toolArgs = JSON.parse(tc.function?.arguments || '{}');
              const toolResult = executeTool(toolName, toolArgs, schoolId);
              toolResults.push({ tool: toolName, args: toolArgs, result: toolResult, id: tc.id });
              logAudit({ schoolId, userId: user.id, action: `ai_tool_${toolName}`, entity: toolName, details: { args: toolArgs, result: toolResult.slice(0, 200) } });
            }

            const followUp = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
              body: JSON.stringify({
                model: apiConfig.modelId || 'gpt-4o-mini',
                messages: [
                  ...messages,
                  choice.message,
                  ...toolResults.map(tr => ({ role: 'tool', content: tr.result, tool_call_id: tr.id })),
                ],
                max_tokens: 2048,
                temperature: 0.7,
              }),
            });

            if (followUp.ok) {
              const followResult = await followUp.json();
              const followChoice = followResult.choices?.[0];
              if (followChoice) {
                db.insert(aiMessages).values({
                  conversationId, role: 'assistant', content: followChoice.message?.content || '',
                  toolCalls: JSON.stringify(toolResults), tokensUsed: followResult.usage?.total_tokens || 0,
                }).run();
                send('done', { conversationId, response: followChoice.message?.content, toolResults, usage: followResult.usage });
                controller.close();
                return;
              }
            }
          }

          db.insert(aiMessages).values({
            conversationId, role: 'assistant', content: choice.message?.content || '',
            tokensUsed: result.usage?.total_tokens || 0,
          }).run();

          send('done', { conversationId, response: choice.message?.content, usage: result.usage });
        } catch (err: any) {
          send('error', { error: 'AI request failed: ' + err.message });
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
      body: JSON.stringify({
        model: apiConfig.modelId || 'gpt-4o-mini',
        messages,
        tools: getToolsForRole(user.role).map(t => ({ type: 'function', function: t })),
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: 'AI provider error: ' + response.status, details: errText }), { status: 502 });
    }

    const result = await response.json();
    const choice = result.choices?.[0];
    if (!choice) return new Response(JSON.stringify({ error: 'No response from AI' }), { status: 502 });

    let toolResults: any[] = [];
    if (choice.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        const toolName = tc.function?.name;
        const toolArgs = JSON.parse(tc.function?.arguments || '{}');
        const toolResult = executeTool(toolName, toolArgs, schoolId);
        toolResults.push({ tool: toolName, args: toolArgs, result: toolResult, id: tc.id });
        logAudit({ schoolId, userId: user.id, action: `ai_tool_${toolName}`, entity: toolName, details: { args: toolArgs, result: toolResult.slice(0, 200) } });
      }

      const followUp = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
        body: JSON.stringify({
          model: apiConfig.modelId || 'gpt-4o-mini',
          messages: [
            ...messages,
            choice.message,
            ...toolResults.map(tr => ({ role: 'tool', content: tr.result, tool_call_id: tr.id })),
          ],
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });
      if (followUp.ok) {
        const followResult = await followUp.json();
        const followChoice = followResult.choices?.[0];
        if (followChoice) {
          db.insert(aiMessages).values({
            conversationId, role: 'assistant', content: followChoice.message?.content || '',
            toolCalls: JSON.stringify(toolResults), tokensUsed: followResult.usage?.total_tokens || 0,
          }).run();
          return new Response(JSON.stringify({
            conversationId, response: followChoice.message?.content, toolResults,
            usage: followResult.usage,
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }
    }

    db.insert(aiMessages).values({
      conversationId, role: 'assistant', content: choice.message?.content || '',
      tokensUsed: result.usage?.total_tokens || 0,
    }).run();

    return new Response(JSON.stringify({
      conversationId, response: choice.message?.content, usage: result.usage,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'AI request failed: ' + err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  const { id } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  const db = getDb();
  db.delete(aiConversations).where(and(eq(aiConversations.id, id), eq(aiConversations.schoolId, schoolId!))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
