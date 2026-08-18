import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { hostelAllocations, hostelRooms, hostels, students, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';


export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'hostel.view');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const allocations = db.select({
    id: hostelAllocations.id, studentId: hostelAllocations.studentId, roomId: hostelAllocations.roomId,
    academicYear: hostelAllocations.academicYear, status: hostelAllocations.status, createdAt: hostelAllocations.createdAt,
    studentName: students.firstName, studentLastName: students.lastName, studentCode: students.studentId,
    roomNumber: hostelRooms.roomNumber, hostelName: hostels.name, hostelType: hostels.type,
  }).from(hostelAllocations)
    .leftJoin(students, eq(hostelAllocations.studentId, students.id))
    .leftJoin(hostelRooms, eq(hostelAllocations.roomId, hostelRooms.id))
    .leftJoin(hostels, eq(hostelRooms.hostelId, hostels.id))
    .where(eq(hostelAllocations.schoolId, schoolId))
    .orderBy(desc(hostelAllocations.createdAt)).all();

  return new Response(JSON.stringify(allocations), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'hostel.create');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const db = getDb();

  if (data.action === 'deallocate') {
    if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    db.transaction(() => {
      const alloc = db.select().from(hostelAllocations).where(and(eq(hostelAllocations.id, data.id), eq(hostelAllocations.schoolId, schoolId))).get();
      if (!alloc) throw new Error('Allocation not found');
      db.update(hostelAllocations).set({ status: 'checked_out', updatedAt: new Date() }).where(eq(hostelAllocations.id, data.id)).run();
      const room = db.select().from(hostelRooms).where(eq(hostelRooms.id, alloc.roomId)).get();
      if (room) {
        const newOcc = Math.max(0, (room.occupants || 0) - 1);
        const newStatus = newOcc === 0 ? 'available' : (newOcc >= (room.capacity || 0) ? 'full' : 'available');
        db.update(hostelRooms).set({ occupants: newOcc, status: newStatus, updatedAt: new Date() }).where(eq(hostelRooms.id, room.id)).run();
      }
    });
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.studentId || !data.roomId || !data.academicYear) {
    return new Response(JSON.stringify({ error: 'studentId, roomId, academicYear required' }), { status: 400 });
  }

  // Transactional allocation (Phase 2.2)
  const result = db.transaction(() => {
    const room = db.select().from(hostelRooms).where(eq(hostelRooms.id, data.roomId)).get();
    if (!room) throw new Error('Room not found');
    if ((room.occupants || 0) >= (room.capacity || 0)) throw new Error('Room is full');
    const existing = db.select().from(hostelAllocations).where(and(
      eq(hostelAllocations.studentId, data.studentId),
      eq(hostelAllocations.status, 'active'),
      eq(hostelAllocations.schoolId, schoolId),
    )).get();
    if (existing) throw new Error('Student already has an active allocation');
    const alloc = db.insert(hostelAllocations).values({
      schoolId, studentId: data.studentId, roomId: data.roomId,
      academicYear: data.academicYear, status: 'active', createdAt: new Date(),
    }).returning().get();
    const newOcc = (room.occupants || 0) + 1;
    const newStatus = newOcc >= (room.capacity || 0) ? 'full' : 'available';
    db.update(hostelRooms).set({ occupants: newOcc, status: newStatus, updatedAt: new Date() }).where(eq(hostelRooms.id, room.id)).run();
    return alloc;
  });
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'hostel.delete');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(hostelAllocations).where(and(eq(hostelAllocations.id, id), eq(hostelAllocations.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
