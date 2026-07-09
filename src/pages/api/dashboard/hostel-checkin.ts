import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { hostelCheckins, hostelVisitors, students, hostels, hostelRooms, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const action = url.searchParams.get('action');

  if (action === 'visitors') {
    const visitors = db.select({
      id: hostelVisitors.id, visitorName: hostelVisitors.visitorName, visitorPhone: hostelVisitors.visitorPhone,
      visitorRelation: hostelVisitors.visitorRelation, timeIn: hostelVisitors.timeIn, timeOut: hostelVisitors.timeOut,
      purpose: hostelVisitors.purpose, notes: hostelVisitors.notes,
      visitingStudentName: students.firstName, visitingStudentLastName: students.lastName,
      hostelName: hostels.name,
    }).from(hostelVisitors)
      .leftJoin(students, eq(hostelVisitors.visitingStudentId, students.id))
      .leftJoin(hostels, eq(hostelVisitors.hostelId, hostels.id))
      .where(eq(hostelVisitors.schoolId, schoolId))
      .orderBy(desc(hostelVisitors.createdAt)).all();
    return new Response(JSON.stringify(visitors), { headers: { 'Content-Type': 'application/json' } });
  }

  // Default: check-ins
  const checkins = db.select({
    id: hostelCheckins.id, studentId: hostelCheckins.studentId, roomId: hostelCheckins.roomId,
    type: hostelCheckins.type, timestamp: hostelCheckins.timestamp, notes: hostelCheckins.notes,
    studentName: students.firstName, studentLastName: students.lastName, studentCode: students.studentId,
    roomNumber: hostelRooms.roomNumber,
  }).from(hostelCheckins)
    .leftJoin(students, eq(hostelCheckins.studentId, students.id))
    .leftJoin(hostelRooms, eq(hostelCheckins.roomId, hostelRooms.id))
    .where(eq(hostelCheckins.schoolId, schoolId))
    .orderBy(desc(hostelCheckins.timestamp)).all();
  return new Response(JSON.stringify(checkins), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const db = getDb();

  // Check-in/out
  if (data.action === 'checkin' || data.action === 'checkout') {
    if (!data.studentId) return new Response(JSON.stringify({ error: 'studentId required' }), { status: 400 });
    const result = db.insert(hostelCheckins).values({
      schoolId, studentId: data.studentId,
      roomId: data.roomId || null,
      type: data.action === 'checkin' ? 'check_in' : 'check_out',
      timestamp: new Date().toISOString(),
      notes: data.notes || null,
      recordedBy: user.id,
      createdAt: new Date(),
    }).returning().get();
    return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // Visitor sign-in
  if (data.action === 'visitor_in') {
    if (!data.visitorName || !data.timeIn) return new Response(JSON.stringify({ error: 'visitorName and timeIn required' }), { status: 400 });
    const result = db.insert(hostelVisitors).values({
      schoolId, visitorName: data.visitorName,
      visitorPhone: data.visitorPhone || null,
      visitorRelation: data.visitorRelation || null,
      visitingStudentId: data.visitingStudentId || null,
      hostelId: data.hostelId || null,
      timeIn: data.timeIn,
      purpose: data.purpose || null,
      notes: data.notes || null,
      recordedBy: user.id,
      createdAt: new Date(),
    }).returning().get();
    return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // Visitor sign-out
  if (data.action === 'visitor_out') {
    if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    db.update(hostelVisitors).set({
      timeOut: data.timeOut || new Date().toISOString(),
      updatedAt: new Date(),
    }).where(and(eq(hostelVisitors.id, data.id), eq(hostelVisitors.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id, type } = await request.json();
  const db = getDb();
  if (type === 'visitor') {
    db.delete(hostelVisitors).where(and(eq(hostelVisitors.id, id), eq(hostelVisitors.schoolId, schoolId))).run();
  } else {
    db.delete(hostelCheckins).where(and(eq(hostelCheckins.id, id), eq(hostelCheckins.schoolId, schoolId))).run();
  }
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
