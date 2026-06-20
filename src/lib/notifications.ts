import { getDb } from './db/index.js';
import { notifications, notificationTemplates } from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import { sendEmail } from './email.js';

export interface NotifyOptions {
  schoolId: number;
  userId?: number;
  type: 'info' | 'warning' | 'alert' | 'success';
  title: string;
  body: string;
  link?: string;
  channel?: 'in_app' | 'email' | 'sms' | 'push';
  email?: string;
}

export async function sendNotification(opts: NotifyOptions): Promise<void> {
  const db = getDb();
  db.insert(notifications).values({
    schoolId: opts.schoolId,
    userId: opts.userId || null,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    link: opts.link || null,
    channel: opts.channel || 'in_app',
  }).run();

  if (opts.channel === 'email' && opts.email) {
    const html = wrapNotification(opts.title, opts.body, opts.link);
    await sendEmail({ to: opts.email, subject: opts.title, html, template: opts.title });
  }
}

function wrapNotification(title: string, body: string, link?: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f4f5f7;color:#1a1a2e}
    .w{max-width:600px;margin:0 auto;padding:20px}
    .c{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
    .h{background:linear-gradient(135deg,#2563eb,#7c3aed);padding:32px 24px;text-align:center}
    .h h1{color:#fff;margin:0;font-size:22px;font-weight:700}
    .b{padding:32px 24px}
    .b h2{font-size:20px;margin:0 0 16px;color:#1a1a2e}
    .b p{font-size:15px;line-height:1.6;color:#4a5568;margin:0 0 16px}
    .btn{display:inline-block;background:#2563eb;color:#fff!important;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin:8px 0}
    .f{padding:24px;text-align:center;font-size:12px;color:#a0aec0}
  </style></head><body><div class="w"><div class="c">
    <div class="h"><h1>iSchool</h1></div>
    <div class="b"><h2>${title}</h2><p>${body}</p>${link ? `<p style="text-align:center"><a href="${link}" class="btn">View Details</a></p>` : ''}</div>
    <div class="f"><p>&copy; ${new Date().getFullYear()} iSchool</p></div>
  </div></div></body></html>`;
}

// Template-based notification
export async function sendTemplateNotification(templateName: string, schoolId: number, variables: Record<string, string>, userId?: number, email?: string) {
  const db = getDb();
  const template = db.select().from(notificationTemplates)
    .where(and(eq(notificationTemplates.name, templateName), eq(notificationTemplates.channel, 'email')))
    .get();

  if (!template) {
    console.log(`[NOTIFY] Template "${templateName}" not found, skipping`);
    return;
  }

  let subject = template.subject || templateName;
  let body = template.body;
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(pattern, value);
    body = body.replace(pattern, value);
  }

  const html = wrapNotification(subject, body, variables.link);
  await sendNotification({
    schoolId,
    userId,
    type: (template as any).type || 'info',
    title: subject,
    body,
    link: variables.link,
    channel: email ? 'email' : 'in_app',
    email,
  });
}

// Predefined notification helpers
export async function notifyAttendanceAlert(schoolId: number, studentName: string, date: string, parentEmail?: string, userId?: number) {
  await sendNotification({
    schoolId, userId, type: 'warning',
    title: 'Attendance Alert',
    body: `${studentName} was marked absent on ${date}. Please contact the school if this is unexpected.`,
    link: '/portal/attendance',
    channel: parentEmail ? 'email' : 'in_app',
    email: parentEmail,
  });
}

export async function notifyFeeReminder(schoolId: number, studentName: string, amount: number, dueDate: string, parentEmail?: string, userId?: number) {
  await sendNotification({
    schoolId, userId, type: 'alert',
    title: 'Fee Payment Reminder',
    body: `A fee of $${amount.toFixed(2)} for ${studentName} is due on ${dueDate}. Please make the payment at your earliest convenience.`,
    link: '/portal/fees',
    channel: parentEmail ? 'email' : 'in_app',
    email: parentEmail,
  });
}

export async function notifyGradePosted(schoolId: number, studentName: string, courseName: string, grade: string, parentEmail?: string, userId?: number) {
  await sendNotification({
    schoolId, userId, type: 'info',
    title: 'New Grade Posted',
    body: `A new grade (${grade}) has been posted for ${studentName} in ${courseName}.`,
    link: '/portal/grades',
    channel: parentEmail ? 'email' : 'in_app',
    email: parentEmail,
  });
}

export async function notifyAssignmentCreated(schoolId: number, courseTitle: string, assignmentTitle: string, dueDate: string, studentEmails: string[]) {
  for (const email of studentEmails) {
    await sendNotification({
      schoolId, type: 'info',
      title: 'New Assignment',
      body: `A new assignment "${assignmentTitle}" has been created for ${courseTitle}. Due: ${dueDate}.`,
      link: '/portal/assignments',
      channel: 'email',
      email,
    });
  }
}

export async function notifyLeaveStatusChanged(schoolId: number, staffName: string, status: string, staffEmail?: string, userId?: number) {
  await sendNotification({
    schoolId, userId, type: status === 'approved' ? 'success' : 'warning',
    title: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    body: `The leave request for ${staffName} has been ${status}.`,
    link: '/dashboard/leave',
    channel: staffEmail ? 'email' : 'in_app',
    email: staffEmail,
  });
}

export async function notifyPasswordReset(email: string, name: string, resetUrl: string) {
  const { passwordResetEmail } = await import('./email.js');
  const html = passwordResetEmail(name, resetUrl);
  await sendEmail({ to: email, subject: 'Reset your iSchool password', html, template: 'password_reset' });
}

export async function notifyNewEnrollment(schoolId: number, studentName: string, status: string) {
  await sendNotification({
    schoolId, type: 'info',
    title: `Enrollment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    body: `Enrollment for ${studentName} has been ${status.toLowerCase()}.`,
    link: '/dashboard/enrollments',
  });
}

export async function notifyTicketUpdate(schoolId: number, ticketNumber: string, status: string, userEmail?: string, userId?: number) {
  await sendNotification({
    schoolId, userId, type: 'info',
    title: `Ticket ${ticketNumber} Updated`,
    body: `Your support ticket ${ticketNumber} status has changed to: ${status}.`,
    link: '/dashboard/tickets',
    channel: userEmail ? 'email' : 'in_app',
    email: userEmail,
  });
}

export async function notifyPaymentReceived(schoolId: number, amount: number, method: string, parentEmail?: string, userId?: number) {
  await sendNotification({
    schoolId, userId, type: 'success',
    title: 'Payment Received',
    body: `A payment of $${amount.toFixed(2)} via ${method} has been received. Thank you!`,
    link: '/portal/fees',
    channel: parentEmail ? 'email' : 'in_app',
    email: parentEmail,
  });
}

export async function notifyEventReminder(schoolId: number, eventTitle: string, startDate: string, emails: string[]) {
  for (const email of emails) {
    await sendNotification({
      schoolId, type: 'info',
      title: 'Upcoming Event Reminder',
      body: `Don't forget: "${eventTitle}" is scheduled for ${startDate}.`,
      link: '/dashboard/events',
      channel: 'email',
      email,
    });
  }
}
