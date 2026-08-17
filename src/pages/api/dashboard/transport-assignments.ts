import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { transportAssignments, transportRoutes, students, vehicles, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'transport.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const assignments = db.select({
    id: transportAssignments.id, studentId: transportAssignments.studentId,
    routeId: transportAssignments.routeId, stopName: transportAssignments.stopName,
    status: transportAssignments.status, createdAt: transportAssignments.createdAt,
    studentName: students.firstName, studentLastName: students.lastName, studentCode: students.studentId,
    routeName: transportRoutes.name, vehicleName: vehicles.name, vehiclePlate: vehicles.plateNumber,
  }).from(transportAssignments)
    .leftJoin(students, eq(transportAssignments.studentId, students.id))
    .leftJoin(transportRoutes, eq(transportAssignments.routeId, transportRoutes.id))
    .leftJoin(vehicles, eq(transportRoutes.vehicleId, vehicles.id))
    .where(eq(transportAssignments.schoolId, schoolId))
    .orderBy(desc(transportAssignments.createdAt)).all();
  return new Response(JSON.stringify(assignments), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'transport.create');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.studentId || !data.routeId) return new Response(JSON.stringify({ error: 'studentId and routeId required' }), { status: 400 });
  const db = getDb();

  // Check student not already actively assigned to a route
  const existing = db.select().from(transportAssignments).where(and(
    eq(transportAssignments.studentId, data.studentId),
    eq(transportAssignments.status, 'active'),
    eq(transportAssignments.schoolId, schoolId),
  )).get();
  if (existing) return new Response(JSON.stringify({ error: 'Student already has an active transport assignment' }), { status: 400 });

  const result = db.insert(transportAssignments).values({
    schoolId, studentId: data.studentId, routeId: data.routeId,
    stopName: data.stopName || null, status: 'active', createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'transport.edit');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  const db = getDb();
  db.update(transportAssignments).set({
    routeId: data.routeId, stopName: data.stopName, status: data.status, updatedAt: new Date(),
  }).where(and(eq(transportAssignments.id, data.id), eq(transportAssignments.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'transport.delete');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(transportAssignments).where(and(eq(transportAssignments.id, id), eq(transportAssignments.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
