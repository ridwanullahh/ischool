import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { hostelMaintenanceRequests, hostels, hostelRooms, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'hostel.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const reqs = db.select({
    id: hostelMaintenanceRequests.id, hostelId: hostelMaintenanceRequests.hostelId,
    roomId: hostelMaintenanceRequests.roomId, title: hostelMaintenanceRequests.title,
    description: hostelMaintenanceRequests.description, category: hostelMaintenanceRequests.category,
    priority: hostelMaintenanceRequests.priority, status: hostelMaintenanceRequests.status,
    assignedTo: hostelMaintenanceRequests.assignedTo, cost: hostelMaintenanceRequests.cost,
    completedAt: hostelMaintenanceRequests.completedAt, notes: hostelMaintenanceRequests.notes,
    createdAt: hostelMaintenanceRequests.createdAt,
    hostelName: hostels.name, roomNumber: hostelRooms.roomNumber,
  }).from(hostelMaintenanceRequests)
    .leftJoin(hostels, eq(hostelMaintenanceRequests.hostelId, hostels.id))
    .leftJoin(hostelRooms, eq(hostelMaintenanceRequests.roomId, hostelRooms.id))
    .where(eq(hostelMaintenanceRequests.schoolId, schoolId))
    .orderBy(desc(hostelMaintenanceRequests.createdAt)).all();
  return new Response(JSON.stringify(reqs), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'hostel.create');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const db = getDb();

  if (data.action === 'update_status') {
    if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    db.update(hostelMaintenanceRequests).set({
      status: data.status,
      assignedTo: data.assignedTo !== undefined ? data.assignedTo : undefined,
      cost: data.cost !== undefined ? data.cost : undefined,
      notes: data.notes !== undefined ? data.notes : undefined,
      completedAt: data.status === 'completed' ? new Date() : undefined,
      updatedAt: new Date(),
    } as any).where(and(eq(hostelMaintenanceRequests.id, data.id), eq(hostelMaintenanceRequests.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.hostelId || !data.title) {
    return new Response(JSON.stringify({ error: 'hostelId and title required' }), { status: 400 });
  }
  const result = db.insert(hostelMaintenanceRequests).values({
    schoolId, hostelId: data.hostelId,
    roomId: data.roomId || null,
    title: data.title, description: data.description || null,
    category: data.category || 'other',
    priority: data.priority || 'medium',
    status: 'pending',
    reportedBy: user.id,
    createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'hostel.delete');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(hostelMaintenanceRequests).where(and(eq(hostelMaintenanceRequests.id, id), eq(hostelMaintenanceRequests.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
