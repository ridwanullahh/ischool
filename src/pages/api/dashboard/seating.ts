import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { seatingPlans, students, enrollments, classes, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';


export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'classroom.view');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const classId = url.searchParams.get('classId');
  if (classId) {
    const plans = db.select().from(seatingPlans).where(and(eq(seatingPlans.schoolId, schoolId), eq(seatingPlans.classId, parseInt(classId)))).orderBy(desc(seatingPlans.createdAt)).all();
    return new Response(JSON.stringify(plans), { headers: { 'Content-Type': 'application/json' } });
  }
  const plans = db.select().from(seatingPlans).where(eq(seatingPlans.schoolId, schoolId)).orderBy(desc(seatingPlans.createdAt)).all();
  return new Response(JSON.stringify(plans), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'classroom.create');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.classId || !data.name || !data.layout) {
    return new Response(JSON.stringify({ error: 'classId, name, and layout are required' }), { status: 400 });
  }
  const db = getDb();

  if (data.isDefault) {
    // Unset other defaults for this class
    db.update(seatingPlans).set({ isDefault: false, updatedAt: new Date() })
      .where(and(eq(seatingPlans.classId, data.classId), eq(seatingPlans.schoolId, schoolId))).run();
  }

  const result = db.insert(seatingPlans).values({
    schoolId, classId: data.classId, name: data.name,
    layout: data.layout, rows: data.rows || 5, cols: data.cols || 6,
    isDefault: data.isDefault || false,
    createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'classroom.edit');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  const db = getDb();

  if (data.isDefault) {
    const existing = db.select().from(seatingPlans).where(eq(seatingPlans.id, data.id)).get();
    if (existing) {
      db.update(seatingPlans).set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(seatingPlans.classId, existing.classId), eq(seatingPlans.schoolId, schoolId))).run();
    }
  }

  db.update(seatingPlans).set({
    name: data.name, layout: data.layout, rows: data.rows, cols: data.cols,
    isDefault: data.isDefault, updatedAt: new Date(),
  }).where(and(eq(seatingPlans.id, data.id), eq(seatingPlans.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'classroom.delete');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(seatingPlans).where(and(eq(seatingPlans.id, id), eq(seatingPlans.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
