/**
 * Webhook Dispatch System
 *
 * Dispatches event notifications to registered webhook endpoints.
 * Schools register webhook URLs with event subscriptions, and when
 * those events fire, the system delivers JSON payloads with HMAC
 * signature verification.
 *
 * Supported events:
 * - student.enrolled, student.withdrawn, student.graduated
 * - attendance.marked, attendance.absent
 * - fee.paid, fee.overdue, invoice.created
 * - assignment.submitted, assignment.graded
 * - exam.scheduled, exam.result_published
 * - staff.hired, staff.terminated
 * - announcement.created
 */

import { getDb } from './db/index.js';
import { webhooks, webhookDeliveries } from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export type WebhookEvent =
  | 'student.enrolled' | 'student.withdrawn' | 'student.graduated'
  | 'attendance.marked' | 'attendance.absent'
  | 'fee.paid' | 'fee.overdue' | 'invoice.created'
  | 'assignment.submitted' | 'assignment.graded'
  | 'exam.scheduled' | 'exam.result_published'
  | 'staff.hired' | 'staff.terminated'
  | 'announcement.created';

/**
 * Dispatches a webhook event to all registered endpoints for the school
 * that are subscribed to this event.
 *
 * @param schoolId - The school ID
 * @param event - The event type
 * @param payload - The event payload (JSON-serializable)
 */
export async function dispatchWebhook(schoolId: number, event: WebhookEvent, payload: Record<string, any>): Promise<void> {
  const db = getDb();

  // Find all active webhooks for this school that subscribe to this event
  const schoolWebhooks = db.select().from(webhooks)
    .where(and(eq(webhooks.schoolId, schoolId), eq(webhooks.active, true)))
    .all();

  const matchingWebhooks = schoolWebhooks.filter(w => {
    const events = (w.events as string[]) || [];
    return events.includes(event) || events.includes('*');
  });

  for (const webhook of matchingWebhooks) {
    // Create a delivery record
    const delivery = db.insert(webhookDeliveries).values({
      webhookId: webhook.id,
      event,
      payload: JSON.stringify(payload),
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
    }).returning().get();

    // Attempt delivery
    await deliverWebhook(webhook, delivery.id, event, payload);
  }
}

/**
 * Delivers a single webhook payload with retry logic.
 */
async function deliverWebhook(
  webhook: typeof webhooks.$inferSelect,
  deliveryId: number,
  event: string,
  payload: Record<string, any>
): Promise<void> {
  const db = getDb();
  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  const signature = webhook.secret
    ? crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')
    : null;

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          ...(signature ? { 'X-Webhook-Signature': signature } : {}),
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseText = await res.text().catch(() => '');

      if (res.ok) {
        // Success
        db.update(webhookDeliveries).set({
          responseStatus: res.status,
          responseBody: responseText.slice(0, 1000),
          deliveredAt: new Date().toISOString(),
          status: 'delivered',
          attempts,
          updatedAt: new Date(),
        }).where(eq(webhookDeliveries.id, deliveryId)).run();
        return;
      } else {
        // Non-2xx response - retry
        db.update(webhookDeliveries).set({
          responseStatus: res.status,
          responseBody: responseText.slice(0, 1000),
          attempts,
          status: attempts < maxAttempts ? 'retry' : 'failed',
          updatedAt: new Date(),
        }).where(eq(webhookDeliveries.id, deliveryId)).run();

        if (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 2000 * attempts)); // exponential backoff
        }
      }
    } catch (e) {
      // Network error - retry
      db.update(webhookDeliveries).set({
        responseBody: String(e).slice(0, 1000),
        attempts,
        status: attempts < maxAttempts ? 'retry' : 'failed',
        updatedAt: new Date(),
      }).where(eq(webhookDeliveries.id, deliveryId)).run();

      if (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000 * attempts));
      }
    }
  }
}

/**
 * Generates a random webhook secret for signature verification.
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Returns all available webhook event types with descriptions.
 */
export function getAvailableEvents(): { event: WebhookEvent; label: string; description: string }[] {
  return [
    { event: 'student.enrolled', label: 'Student Enrolled', description: 'When a new student is enrolled' },
    { event: 'student.withdrawn', label: 'Student Withdrawn', description: 'When a student is withdrawn' },
    { event: 'student.graduated', label: 'Student Graduated', description: 'When a student graduates' },
    { event: 'attendance.marked', label: 'Attendance Marked', description: 'When attendance is marked for a class' },
    { event: 'attendance.absent', label: 'Student Absent', description: 'When a student is marked absent' },
    { event: 'fee.paid', label: 'Fee Paid', description: 'When a fee payment is completed' },
    { event: 'fee.overdue', label: 'Fee Overdue', description: 'When a fee becomes overdue' },
    { event: 'invoice.created', label: 'Invoice Created', description: 'When a new invoice is generated' },
    { event: 'assignment.submitted', label: 'Assignment Submitted', description: 'When a student submits an assignment' },
    { event: 'assignment.graded', label: 'Assignment Graded', description: 'When an assignment is graded' },
    { event: 'exam.scheduled', label: 'Exam Scheduled', description: 'When an exam is scheduled' },
    { event: 'exam.result_published', label: 'Result Published', description: 'When exam results are published' },
    { event: 'staff.hired', label: 'Staff Hired', description: 'When a new staff member is hired' },
    { event: 'staff.terminated', label: 'Staff Terminated', description: 'When a staff member is terminated' },
    { event: 'announcement.created', label: 'Announcement Created', description: 'When a new announcement is posted' },
  ];
}
