import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { transportRoutes, vehicles, transportAssignments, schoolMembers } from '../../../lib/db/schema.js';
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
  const routes = db.select({
    id: transportRoutes.id, name: transportRoutes.name, vehicleId: transportRoutes.vehicleId,
    stops: transportRoutes.stops, schedule: transportRoutes.schedule, createdAt: transportRoutes.createdAt,
    vehicleName: vehicles.name, vehiclePlate: vehicles.plateNumber, vehicleCapacity: vehicles.capacity,
    assignmentCount: sql<number>`(select count(*) from transport_assignments ta where ta.route_id = ${transportRoutes.id} and ta.status = 'active')`,
  }).from(transportRoutes)
    .leftJoin(vehicles, eq(transportRoutes.vehicleId, vehicles.id))
    .where(eq(transportRoutes.schoolId, schoolId))
    .orderBy(desc(transportRoutes.createdAt)).all();
  return new Response(JSON.stringify(routes), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'transport.create');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.name || !data.stops) return new Response(JSON.stringify({ error: 'name and stops required' }), { status: 400 });
  const db = getDb();
  const result = db.insert(transportRoutes).values({
    schoolId, name: data.name,
    vehicleId: data.vehicleId || null,
    stops: data.stops,
    schedule: data.schedule || null,
    createdAt: new Date(),
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
  db.update(transportRoutes).set({
    name: data.name, vehicleId: data.vehicleId, stops: data.stops, schedule: data.schedule,
    updatedAt: new Date(),
  }).where(and(eq(transportRoutes.id, data.id), eq(transportRoutes.schoolId, schoolId))).run();
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
  db.delete(transportRoutes).where(and(eq(transportRoutes.id, id), eq(transportRoutes.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
