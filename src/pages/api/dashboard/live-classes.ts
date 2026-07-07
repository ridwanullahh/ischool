import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import {
  liveClassRooms, liveClassMessages, liveClassPolls, liveClassWhiteboards,
  schoolMembers,
} from '../../../lib/db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

function generateMeetingId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let id = '';
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const action = url.searchParams.get('action');
  const status = url.searchParams.get('status');

  if (action === 'stats') {
    const scheduled = db.select({ count: sql<number>`count(*)` }).from(liveClassRooms)
      .where(and(eq(liveClassRooms.schoolId, schoolId), eq(liveClassRooms.status, 'scheduled'))).get();
    const live = db.select({ count: sql<number>`count(*)` }).from(liveClassRooms)
      .where(and(eq(liveClassRooms.schoolId, schoolId), eq(liveClassRooms.status, 'live'))).get();
    const ended = db.select({ count: sql<number>`count(*)` }).from(liveClassRooms)
      .where(and(eq(liveClassRooms.schoolId, schoolId), eq(liveClassRooms.status, 'ended'))).get();
    const total = db.select({ count: sql<number>`count(*)` }).from(liveClassRooms)
      .where(eq(liveClassRooms.schoolId, schoolId)).get();
    return new Response(JSON.stringify({
      scheduled: scheduled?.count || 0, live: live?.count || 0,
      ended: ended?.count || 0, total: total?.count || 0,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'detail') {
    const roomId = url.searchParams.get('id');
    if (!roomId) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    const room = db.select().from(liveClassRooms)
      .where(and(eq(liveClassRooms.id, parseInt(roomId)), eq(liveClassRooms.schoolId, schoolId))).get();
    if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 });
    const messages = db.select().from(liveClassMessages)
      .where(eq(liveClassMessages.roomId, room.id)).orderBy(liveClassMessages.createdAt).all();
    const polls = db.select().from(liveClassPolls)
      .where(eq(liveClassPolls.roomId, room.id)).all();
    return new Response(JSON.stringify({ room, messages, polls }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'messages') {
    const roomId = url.searchParams.get('roomId');
    if (!roomId) return new Response(JSON.stringify({ error: 'roomId required' }), { status: 400 });
    const messages = db.select().from(liveClassMessages)
      .where(eq(liveClassMessages.roomId, parseInt(roomId)))
      .orderBy(liveClassMessages.createdAt).all();
    return new Response(JSON.stringify(messages), { headers: { 'Content-Type': 'application/json' } });
  }

  let conditions = [eq(liveClassRooms.schoolId, schoolId)];
  if (status) conditions.push(eq(liveClassRooms.status, status as any));

  const rooms = db.select().from(liveClassRooms)
    .where(and(...conditions)).orderBy(desc(liveClassRooms.createdAt)).all();
  return new Response(JSON.stringify(rooms), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const data = await request.json();

  if (data.action === 'start') {
    if (!data.roomId) return new Response(JSON.stringify({ error: 'roomId required' }), { status: 400 });
    const meetingId = generateMeetingId();
    db.update(liveClassRooms).set({
      status: 'live',
      meetingId,
      meetingUrl: `/live/${meetingId}`,
      updatedAt: new Date(),
    }).where(and(eq(liveClassRooms.id, data.roomId), eq(liveClassRooms.schoolId, schoolId))).run();
    const room = db.select().from(liveClassRooms).where(eq(liveClassRooms.id, data.roomId)).get();
    return new Response(JSON.stringify(room), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'end') {
    if (!data.roomId) return new Response(JSON.stringify({ error: 'roomId required' }), { status: 400 });
    db.update(liveClassRooms).set({ status: 'ended', updatedAt: new Date() })
      .where(and(eq(liveClassRooms.id, data.roomId), eq(liveClassRooms.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'cancel') {
    if (!data.roomId) return new Response(JSON.stringify({ error: 'roomId required' }), { status: 400 });
    db.update(liveClassRooms).set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(liveClassRooms.id, data.roomId), eq(liveClassRooms.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'chat') {
    if (!data.roomId || !data.content) return new Response(JSON.stringify({ error: 'roomId and content required' }), { status: 400 });
    const msg = db.insert(liveClassMessages).values({
      roomId: data.roomId,
      userId: user.id,
      userName: user.name,
      type: data.type || 'chat',
      content: data.content,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    }).returning().get();
    return new Response(JSON.stringify(msg), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'poll') {
    if (!data.roomId || !data.question || !data.options) return new Response(JSON.stringify({ error: 'roomId, question, options required' }), { status: 400 });
    const poll = db.insert(liveClassPolls).values({
      roomId: data.roomId,
      question: data.question,
      options: JSON.stringify(data.options),
      responses: '[]',
      createdBy: user.id,
    }).returning().get();
    return new Response(JSON.stringify(poll), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'poll_vote') {
    if (!data.pollId || data.optionIndex === undefined) return new Response(JSON.stringify({ error: 'pollId and optionIndex required' }), { status: 400 });
    const poll = db.select().from(liveClassPolls).where(eq(liveClassPolls.id, data.pollId)).get();
    if (!poll) return new Response(JSON.stringify({ error: 'Poll not found' }), { status: 404 });
    const responses = Array.isArray(poll.responses) ? poll.responses : [];
    responses.push({ userId: user.id, userName: user.name, optionIndex: data.optionIndex });
    db.update(liveClassPolls).set({ responses: JSON.stringify(responses) }).where(eq(liveClassPolls.id, data.pollId)).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'whiteboard_save') {
    if (!data.roomId || !data.data) return new Response(JSON.stringify({ error: 'roomId and data required' }), { status: 400 });
    const existing = db.select().from(liveClassWhiteboards)
      .where(and(eq(liveClassWhiteboards.roomId, data.roomId), eq(liveClassWhiteboards.createdBy, user.id))).get();
    if (existing) {
      db.update(liveClassWhiteboards).set({ data: JSON.stringify(data.data), updatedAt: new Date() }).where(eq(liveClassWhiteboards.id, existing.id)).run();
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    }
    db.insert(liveClassWhiteboards).values({
      roomId: data.roomId,
      title: data.title || 'Whiteboard',
      data: JSON.stringify(data.data),
      createdBy: user.id,
    }).run();
    return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'record_attendance') {
    if (!data.roomId || !data.attendees) return new Response(JSON.stringify({ error: 'roomId and attendees required' }), { status: 400 });
    db.update(liveClassRooms).set({
      attendance: JSON.stringify(data.attendees),
      updatedAt: new Date(),
    }).where(and(eq(liveClassRooms.id, data.roomId), eq(liveClassRooms.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.title) return new Response(JSON.stringify({ error: 'title required' }), { status: 400 });

  const room = db.insert(liveClassRooms).values({
    schoolId,
    title: data.title,
    description: data.description || null,
    courseId: data.courseId || null,
    classId: data.classId || null,
    teacherId: data.teacherId || user.id,
    scheduledStart: data.scheduledStart || null,
    scheduledEnd: data.scheduledEnd || null,
    duration: data.duration || 60,
    status: 'scheduled',
    meetingProvider: data.meetingProvider || 'builtin',
    settings: data.settings ? JSON.stringify(data.settings) : '{}',
    maxParticipants: data.maxParticipants || 100,
    isRecurring: data.isRecurring ? 1 : 0,
    recurrenceRule: data.recurrenceRule || null,
  }).returning().get();

  return new Response(JSON.stringify(room), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  const db = getDb();
  const existing = db.select().from(liveClassRooms)
    .where(and(eq(liveClassRooms.id, data.id), eq(liveClassRooms.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  if (updateData.settings && typeof updateData.settings === 'object') updateData.settings = JSON.stringify(updateData.settings);

  db.update(liveClassRooms).set({ ...updateData, updatedAt: new Date() }).where(eq(liveClassRooms.id, id)).run();
  const updated = db.select().from(liveClassRooms).where(eq(liveClassRooms.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  const existing = db.select().from(liveClassRooms)
    .where(and(eq(liveClassRooms.id, id), eq(liveClassRooms.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 });

  db.delete(liveClassRooms).where(eq(liveClassRooms.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
