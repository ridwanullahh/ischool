/**
 * Student Documents API
 *
 * POST   - create a document record (after file upload)
 * DELETE - delete a document record
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { studentDocuments } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'students.documents.view');
  if (denied) return denied;

  const body = await request.json();
  const { studentId, schoolId, category, title, fileUrl, fileName, fileType } = body;

  if (!studentId || !schoolId || !category || !title || !fileUrl) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (schoolId !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'School mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const result = db.insert(studentDocuments).values({
    studentId,
    schoolId,
    category,
    title,
    fileUrl,
    fileName: fileName || null,
    fileType: fileType || null,
    uploadedBy: user.id,
    createdAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify({ ok: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'students.documents.view');
  if (denied) return denied;

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  db.delete(studentDocuments).where(eq(studentDocuments.id, id)).run();

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
