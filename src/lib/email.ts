import nodemailer from 'nodemailer';
import { getDb } from './db/index.js';
import { emailLogs } from './db/schema.js';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@ischool.com';
const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

function createTransport() {
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

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  return null;
}

const transport = createTransport();
const isDev = !transport;

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  template?: string;
  metadata?: Record<string, unknown>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const db = getDb();

  if (isDev) {
    console.log(`[EMAIL-DEV] To: ${options.to} | Subject: ${options.subject}`);
    db.insert(emailLogs).values({
      toEmail: options.to,
      fromEmail: smtpFrom,
      subject: options.subject,
      template: options.template || null,
      status: 'sent',
      metadata: JSON.stringify({ dev: true, ...options.metadata }),
    }).run();
    return true;
  }

  try {
    await transport!.sendMail({
      from: smtpFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    db.insert(emailLogs).values({
      toEmail: options.to,
      fromEmail: smtpFrom,
      subject: options.subject,
      template: options.template || null,
      status: 'sent',
      metadata: JSON.stringify(options.metadata || {}),
    }).run();
    return true;
  } catch (err: any) {
    db.insert(emailLogs).values({
      toEmail: options.to,
      fromEmail: smtpFrom,
      subject: options.subject,
      template: options.template || null,
      status: 'failed',
      error: err.message,
      metadata: JSON.stringify(options.metadata || {}),
    }).run();
    console.error('[EMAIL] Failed:', err.message);
    return false;
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
  const html = wrap(`
    <div class="body">
      <h2>Welcome to iSchool, ${name}!</h2>
      <p>Your account has been created successfully. ${schoolName ? `Your school <strong>${schoolName}</strong> is ready to be customized.` : 'You can now set up your school website.'}</p>
      <p>Here's what you can do next:</p>
      <p>✦ Set up your school profile and branding<br>✦ Add your content — about page, programs, classes, and more<br>✦ Choose a beautiful theme for your website<br>✦ Share your school website with the world!</p>
      <p style="text-align:center;"><a href="/dashboard" class="btn">Go to Dashboard</a></p>
    </div>
  `, 'Welcome to iSchool');
  return html;
}

export function contactSubmissionEmail(schoolName: string, formType: string, data: Record<string, string>) {
  const fields = Object.entries(data).map(([k, v]) => `<p><strong>${k}:</strong> ${v}</p>`).join('');
  const html = wrap(`
    <div class="body">
      <span class="badge">${formType === 'admissions' ? 'Admissions Inquiry' : 'Contact Form'}</span>
      <h2 style="margin-top:16px;">New Submission for ${schoolName}</h2>
      ${fields}
      <hr class="divider">
      <p><a href="/dashboard/contacts" class="btn">View in Dashboard</a></p>
    </div>
  `, `New ${formType} submission — ${schoolName}`);
  return html;
}

export function passwordResetEmail(name: string, resetUrl: string) {
  const html = wrap(`
    <div class="body">
      <h2>Password Reset</h2>
      <p>Hi ${name}, we received a request to reset your password. Click the button below to set a new password:</p>
      <p style="text-align:center;"><a href="${resetUrl}" class="btn">Reset Password</a></p>
      <hr class="divider">
      <p style="font-size:13px;color:#a0aec0;">If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>
    </div>
  `, 'Reset your password');
  return html;
}

export function announcementEmail(schoolName: string, title: string, excerpt: string, url: string) {
  const html = wrap(`
    <div class="body">
      <span class="badge">New Announcement</span>
      <h2 style="margin-top:16px;">${title}</h2>
      <p>${excerpt}</p>
      <p style="text-align:center;"><a href="${url}" class="btn">Read More</a></p>
      <hr class="divider">
      <p style="font-size:13px;color:#a0aec0;">From ${schoolName}</p>
    </div>
  `, `${title} — ${schoolName}`);
  return html;
}
