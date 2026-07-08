/**
 * Forms API
 * POST - create a form
 * PUT - update a form (fields, settings, status)
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db/index.js';
import { forms } from '../../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { guardPermission } from '../../../../lib/rbac.js';
import { getUserSchoolId } from '../../../../lib/school.js';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const denied = guardPermission(user, 'announcements.create');
  if (denied) return denied;

  const body = await request.json();
  const { schoolId, title, description, slug, isPublic, requiresAuth } = body;

  if (!schoolId || !title || !slug) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (schoolId !== getUserSchoolId(user.id)) {
    return new Response(JSON.stringify({ error: 'School mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const result = db.insert(forms).values({
    schoolId, title, description: description || null, slug,
    fields: [] as any, settings: {} as any, status: 'draft',
    isPublic: isPublic ?? true, requiresAuth: requiresAuth ?? false,
    submitButtonText: 'Submit',
    createdBy: user.id,
    createdAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify({ ok: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const denied = guardPermission(user, 'announcements.create');
  if (denied) return denied;

  const body = await request.json();
  const { formId, schoolId, fields, status, submitButtonText, successMessage } = body;

  if (!formId || !schoolId) {
    return new Response(JSON.stringify({ error: 'Missing formId or schoolId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (schoolId !== getUserSchoolId(user.id)) {
    return new Response(JSON.stringify({ error: 'School mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const existing = db.select().from(forms).where(and(eq(forms.id, formId), eq(forms.schoolId, schoolId))).get();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Form not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const updates: any = { updatedAt: new Date() };
  if (fields !== undefined) updates.fields = fields; // Drizzle json-mode auto-serializes
  if (status !== undefined) updates.status = status;
  if (submitButtonText !== undefined) updates.submitButtonText = submitButtonText;
  if (successMessage !== undefined) updates.successMessage = successMessage;

  db.update(forms).set(updates).where(eq(forms.id, formId)).run();

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
