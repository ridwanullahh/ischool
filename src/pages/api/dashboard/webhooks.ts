/**
 * Webhooks Management API
 *
 * POST   - create a webhook OR send a test event
 * PUT    - toggle webhook active status
 * DELETE - delete a webhook
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { webhooks } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';
import { dispatchWebhook, generateWebhookSecret } from '../../../lib/webhooks.js';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'it.modules.manage');
  if (denied) return denied;

  const body = await request.json();

  // Test event
  if (body.action === 'test' && body.id) {
    const db = getDb();
    const webhook = db.select().from(webhooks).where(eq(webhooks.id, body.id)).get();
    if (!webhook || webhook.schoolId !== (user as any).schoolId) {
      return new Response(JSON.stringify({ error: 'Webhook not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    await dispatchWebhook(webhook.schoolId, 'announcement.created' as any, { test: true, message: 'Test webhook delivery', timestamp: new Date().toISOString() });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Create webhook
  const { schoolId, url, events, generateSecret } = body;
  if (!schoolId || !url) {
    return new Response(JSON.stringify({ error: 'School ID and URL required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (schoolId !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'School mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const secret = generateSecret ? generateWebhookSecret() : null;
  const result = db.insert(webhooks).values({
    schoolId,
    url,
    events: JSON.stringify(events || []),
    secret,
    active: true,
    createdAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify({ ok: true, id: result.id, secret }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'it.modules.manage');
  if (denied) return denied;

  const body = await request.json();
  const { id, active } = body;

  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  db.update(webhooks).set({ active: !!active, updatedAt: new Date() }).where(eq(webhooks.id, id)).run();

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'it.modules.manage');
  if (denied) return denied;

  const body = await request.json();
  const { id } = body;

  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  db.delete(webhooks).where(eq(webhooks.id, id)).run();

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
