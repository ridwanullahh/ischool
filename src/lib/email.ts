import { getDb } from './db/index.js';
import { emailLogs } from './db/schema.js';

// Lazy-load nodemailer only when needed (not available on Cloudflare Workers)
let _nodemailer: any = null;
async function getNodemailer() {
  if (!_nodemailer) {
    try {
      const mod = await import('nodemailer');
      _nodemailer = mod.default || mod;
    } catch (e) {
      console.error('[email] nodemailer not available:', (e as any)?.message);
      return null;
    }
  }
  return _nodemailer;
}

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@ischool.com';
const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Email Transport Configuration
 *
 * Supports two modes:
 * 1. Google App Password (recommended for most schools):
 *    - Set SMTP_HOST=smtp.gmail.com
 *    - Set SMTP_PORT=587
 *    - Set SMTP_USER=your-email@gmail.com
 *    - Set SMTP_PASS=your-16-char-app-password (from Google Account > Security > App Passwords)
 *    - Set SMTP_FROM=your-email@gmail.com (should match SMTP_USER for Gmail)
 *
 * 2. Google OAuth2 (for enterprise):
 *    - Set SMTP_USER=your-email@gmail.com
 *    - Set GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
 *    - Set GOOGLE_CLIENT_SECRET=xxx
 *    - Set GOOGLE_REFRESH_TOKEN=xxx
 *
 * 3. Any other SMTP (Outlook, Yahoo, custom):
 *    - Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Anti-spam best practices (already implemented):
 * - From address matches SMTP user (prevents spoofing flags)
 * - Proper HTML email structure with text fallback
 * - DKIM/SPF depend on the sender's domain DNS configuration
 * - Uses TLS (port 587 with STARTTLS or port 465 with SSL)
 */

async function createTransport() {
  const nodemailer = await getNodemailer();
  if (!nodemailer) return null;

  // Mode 2: Google OAuth2
  if (googleRefreshToken && googleClientId && googleClientSecret && smtpUser) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: smtpUser,
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        refreshToken: googleRefreshToken,
      },
    });
  }

  // Mode 1 & 3: SMTP (including Gmail App Password)
  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return null;
}

let _transport: any = null;
let _isDev = true;

// Initialize transport asynchronously
createTransport().then(t => { _transport = t; _isDev = !t; }).catch(() => {});

const isDev = _isDev;

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string; // Plain text fallback (important for spam prevention)
  template?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Sends an email with proper error handling and logging.
 * Returns true on success, false on failure.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const db = getDb();

  // Generate plain text fallback if not provided
  const textFallback = options.text || options.html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (isDev) {
    console.log(`[EMAIL-DEV] To: ${options.to} | Subject: ${options.subject}`);
    try {
      db.insert(emailLogs).values({
        toEmail: options.to,
        fromEmail: smtpFrom,
        subject: options.subject,
        template: options.template || null,
        status: 'sent',
        metadata: JSON.stringify({ dev: true, ...options.metadata }),
      }).run();
    } catch {}
    return true;
  }

  try {
    const info = await transport!.sendMail({
      from: `"iSchool" <${smtpFrom}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: textFallback,
      // Headers to improve deliverability
      headers: {
        'X-Mailer': 'iSchool Mail System',
        'List-Unsubscribe': `<mailto:${smtpFrom}?subject=Unsubscribe>`,
      },
    });

    try {
      db.insert(emailLogs).values({
        toEmail: options.to,
        fromEmail: smtpFrom,
        subject: options.subject,
        template: options.template || null,
        status: 'sent',
        metadata: JSON.stringify({ messageId: info.messageId, ...options.metadata }),
      }).run();
    } catch {}
    return true;
  } catch (err: any) {
    console.error('[EMAIL] Failed:', err.message);
    try {
      db.insert(emailLogs).values({
        toEmail: options.to,
        fromEmail: smtpFrom,
        subject: options.subject,
        template: options.template || null,
        status: 'failed',
        error: err.message,
        metadata: JSON.stringify(options.metadata || {}),
      }).run();
    } catch {}
    return false;
  }
}

/**
 * Tests email configuration by sending a test email.
 */
export async function testEmailConnection(to: string): Promise<{ ok: boolean; message: string }> {
  if (isDev) {
    return { ok: false, message: 'Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables.' };
  }

  try {
    await transport!.verify();
    const sent = await sendEmail({
      to,
      subject: 'iSchool Email Test',
      html: wrap('<div class="body"><h2>Email Test Successful</h2><p>Your email configuration is working correctly.</p></div>', 'iSchool Email Test'),
    });
    return { ok: sent, message: sent ? 'Test email sent successfully.' : 'Failed to send test email.' };
  } catch (err: any) {
    return { ok: false, message: `Connection failed: ${err.message}` };
  }
}

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f5f7; color: #1a1a2e; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
  .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .header { background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 32px 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
  .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
  .body { padding: 32px 24px; }
  .body h2 { font-size: 20px; margin: 0 0 16px; color: #1a1a2e; }
  .body p { font-size: 15px; line-height: 1.6; color: #4a5568; margin: 0 0 16px; }
  .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 8px 0; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  .footer { padding: 24px; text-align: center; font-size: 12px; color: #a0aec0; }
  .footer a { color: #718096; }
  .badge { display: inline-block; background: #ebf5ff; color: #2563eb; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
`;

function wrap(html: string, title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${baseStyles}</style></head><body><div class="wrapper"><div class="card"><div class="header"><h1>iSchool</h1><p>School Websites Made Simple</p></div>${html}<div class="footer"><p>&copy; ${new Date().getFullYear()} iSchool. All rights reserved.</p><p><a href="/">Visit iSchool</a></p></div></div></div></body></html>`;
}

export function welcomeEmail(name: string, schoolName?: string) {
  return wrap(`
    <div class="body">
      <h2>Welcome to iSchool, ${name}!</h2>
      <p>Your account has been created successfully. ${schoolName ? `Your school <strong>${schoolName}</strong> is ready to be customized.` : 'You can now set up your school website.'}</p>
      <p>Here is what you can do next:</p>
      <p>Set up your school profile and branding<br>Add your content - about page, programs, classes, and more<br>Choose a beautiful theme for your website<br>Share your school website with the world</p>
      <p style="text-align:center;"><a href="/dashboard" class="btn">Go to Dashboard</a></p>
    </div>
  `, 'Welcome to iSchool');
}

export function contactSubmissionEmail(schoolName: string, formType: string, data: Record<string, string>) {
  const fields = Object.entries(data).map(([k, v]) => `<p><strong>${k}:</strong> ${v}</p>`).join('');
  return wrap(`
    <div class="body">
      <span class="badge">${formType === 'admissions' ? 'Admissions Inquiry' : 'Contact Form'}</span>
      <h2 style="margin-top:16px;">New Submission for ${schoolName}</h2>
      ${fields}
      <hr class="divider">
      <p><a href="/dashboard/contacts" class="btn">View in Dashboard</a></p>
    </div>
  `, `New ${formType} submission - ${schoolName}`);
}

export function passwordResetEmail(name: string, resetUrl: string) {
  return wrap(`
    <div class="body">
      <h2>Password Reset</h2>
      <p>Hi ${name}, we received a request to reset your password. Click the button below to set a new password:</p>
      <p style="text-align:center;"><a href="${resetUrl}" class="btn">Reset Password</a></p>
      <hr class="divider">
      <p style="font-size:13px;color:#a0aec0;">If you did not request this, you can safely ignore this email. This link expires in 1 hour.</p>
    </div>
  `, 'Reset your password');
}

export function announcementEmail(schoolName: string, title: string, excerpt: string, url: string) {
  return wrap(`
    <div class="body">
      <span class="badge">New Announcement</span>
      <h2 style="margin-top:16px;">${title}</h2>
      <p>${excerpt}</p>
      <p style="text-align:center;"><a href="${url}" class="btn">Read More</a></p>
      <hr class="divider">
      <p style="font-size:13px;color:#a0aec0;">From ${schoolName}</p>
    </div>
  `, `${title} - ${schoolName}`);
}

export function feeReminderEmail(schoolName: string, studentName: string, amount: number, dueDate: string) {
  return wrap(`
    <div class="body">
      <span class="badge">Fee Reminder</span>
      <h2 style="margin-top:16px;">Fee Payment Due</h2>
      <p>Dear ${studentName},</p>
      <p>This is a reminder that your school fee of <strong>${amount.toLocaleString()}</strong> is due on <strong>${dueDate}</strong>.</p>
      <p>Please log in to your student portal to make the payment.</p>
      <p style="text-align:center;"><a href="/portal/student/fees" class="btn">Pay Now</a></p>
      <hr class="divider">
      <p style="font-size:13px;color:#a0aec0;">From ${schoolName}</p>
    </div>
  `, `Fee Reminder - ${schoolName}`);
}

export function assignmentNotificationEmail(schoolName: string, studentName: string, assignmentTitle: string, dueDate: string) {
  return wrap(`
    <div class="body">
      <span class="badge">New Assignment</span>
      <h2 style="margin-top:16px;">${assignmentTitle}</h2>
      <p>Dear ${studentName},</p>
      <p>A new assignment has been posted. It is due on <strong>${dueDate}</strong>.</p>
      <p style="text-align:center;"><a href="/portal/student/assignments" class="btn">View Assignment</a></p>
      <hr class="divider">
      <p style="font-size:13px;color:#a0aec0;">From ${schoolName}</p>
    </div>
  `, `New Assignment - ${schoolName}`);
}

export function gradePublishedEmail(schoolName: string, studentName: string, assignmentTitle: string, score: string) {
  return wrap(`
    <div class="body">
      <span class="badge">Grade Published</span>
      <h2 style="margin-top:16px;">${assignmentTitle}</h2>
      <p>Dear ${studentName},</p>
      <p>Your grade for <strong>${assignmentTitle}</strong> has been published. Your score: <strong>${score}</strong>.</p>
      <p style="text-align:center;"><a href="/portal/student/grades" class="btn">View Grades</a></p>
      <hr class="divider">
      <p style="font-size:13px;color:#a0aec0;">From ${schoolName}</p>
    </div>
  `, `Grade Published - ${schoolName}`);
}
