import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { examSeries, schoolMembers } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';


export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'exams.view');
  if (denied) return denied;
  const db = getDb();
  const schoolId = (user as any).schoolId ?? null;
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const all = db.select().from(examSeries).where(eq(examSeries.schoolId, schoolId)).all();
  return new Response(JSON.stringify(all), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'exams.create');
  if (denied) return denied;
  const db = getDb();
  const schoolId = (user as any).schoolId ?? null;
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const data = await request.json();
  if (!data.name || !data.type) return new Response(JSON.stringify({ error: 'Name and type are required' }), { status: 400 });

  const result = db.insert(examSeries).values({
    ...data,
    schoolId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'exams.edit');
  if (denied) return denied;
  const db = getDb();
  const schoolId = (user as any).schoolId ?? null;
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const data = await request.json();
  const existing = db.select().from(examSeries).where(eq(examSeries.id, data.id)).get();
  if (!existing || existing.schoolId !== schoolId) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  const result = db.update(examSeries).set({
    ...data,
    schoolId: undefined,
    updatedAt: new Date(),
  }).where(eq(examSeries.id, data.id)).returning().get();

  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'exams.delete');
  if (denied) return denied;
  const db = getDb();
  const schoolId = (user as any).schoolId ?? null;
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const { id } = await request.json();
  const existing = db.select().from(examSeries).where(eq(examSeries.id, id)).get();
  if (!existing || existing.schoolId !== schoolId) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  db.delete(examSeries).where(eq(examSeries.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
