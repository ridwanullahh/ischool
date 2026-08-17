import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { performanceAppraisals, staff, schoolMembers, users } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'hr.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const staffId = url.searchParams.get('staffId');

  const rows = db.select({
    id: performanceAppraisals.id, staffId: performanceAppraisals.staffId,
    cycle: performanceAppraisals.cycle, type: performanceAppraisals.type,
    kpis: performanceAppraisals.kpis, strengths: performanceAppraisals.strengths,
    improvements: performanceAppraisals.improvements, goals: performanceAppraisals.goals,
    overallRating: performanceAppraisals.overallRating, status: performanceAppraisals.status,
    createdAt: performanceAppraisals.createdAt,
    staffName: staff.firstName, staffLastName: staff.lastName, staffCode: staff.staffId,
    designation: staff.designation, department: staff.department,
  }).from(performanceAppraisals)
    .leftJoin(staff, eq(performanceAppraisals.staffId, staff.id))
    .where(eq(performanceAppraisals.schoolId, schoolId));

  const list = staffId ? rows.where(eq(performanceAppraisals.staffId, parseInt(staffId))).all() : rows.orderBy(desc(performanceAppraisals.createdAt)).all();
  return new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'hr.create');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.staffId || !data.cycle || !data.type) {
    return new Response(JSON.stringify({ error: 'staffId, cycle, and type are required' }), { status: 400 });
  }
  const db = getDb();
  const result = db.insert(performanceAppraisals).values({
    schoolId, staffId: parseInt(data.staffId),
    cycle: data.cycle, type: data.type,
    kpis: (data.kpis || []) as any,
    strengths: data.strengths || null,
    improvements: data.improvements || null,
    goals: data.goals || null,
    overallRating: data.overallRating || null,
    reviewerId: user.id,
    status: data.status || 'submitted',
    createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'hr.edit');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  const db = getDb();
  db.update(performanceAppraisals).set({
    kpis: data.kpis, strengths: data.strengths, improvements: data.improvements,
    goals: data.goals, overallRating: data.overallRating, status: data.status,
    updatedAt: new Date(),
  }).where(and(eq(performanceAppraisals.id, data.id), eq(performanceAppraisals.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'hr.delete');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(performanceAppraisals).where(and(eq(performanceAppraisals.id, id), eq(performanceAppraisals.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
