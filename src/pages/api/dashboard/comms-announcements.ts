import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { announcements, notifications, users, schoolMembers, students, classes, enrollments, staff } from '../../../lib/db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const anns = db.select().from(announcements).where(eq(announcements.schoolId, schoolId)).all();
  return new Response(JSON.stringify(anns), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.title || !data.content) {
    return new Response(JSON.stringify({ error: 'title and content are required' }), { status: 400 });
  }
  const db = getDb();

  // Create announcement
  const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}-${Date.now().toString(36)}`;
  const ann = db.insert(announcements).values({
    schoolId, title: data.title, slug,
    content: data.content,
    excerpt: data.excerpt || data.content.substring(0, 150),
    isPinned: data.isPinned || false,
    published: data.published !== false,
    ctaText: data.ctaText || null,
    ctaUrl: data.ctaUrl || null,
    createdAt: new Date(),
  }).returning().get();

  // Broadcast to target audience via notifications
  if (data.broadcast !== false) {
    let targetUserIds: number[] = [];
    const audience = data.audience || 'all';

    // All users in school
    const schoolUserIds = db.select({ userId: schoolMembers.userId })
      .from(schoolMembers).where(eq(schoolMembers.schoolId, schoolId)).all().map(m => m.userId);

    if (audience === 'all') {
      targetUserIds = schoolUserIds;
    } else if (audience === 'staff' || audience === 'teachers') {
      const us = db.select().from(users).where(inArray(users.id, schoolUserIds)).all();
      targetUserIds = us.filter(u => ['school_admin', 'teacher', 'staff', 'accountant', 'librarian', 'it_admin'].includes(u.role)).map(u => u.id);
    } else if (audience === 'parents') {
      // Users with parent role in school
      const us = db.select().from(users).where(inArray(users.id, schoolUserIds)).all();
      targetUserIds = us.filter(u => u.role === 'parent').map(u => u.id);
    } else if (audience === 'students') {
      const us = db.select().from(users).where(inArray(users.id, schoolUserIds)).all();
      targetUserIds = us.filter(u => u.role === 'student').map(u => u.id);
    } else if (audience === 'class' && data.classId) {
      // Students in class
      const enr = db.select().from(enrollments)
        .where(and(eq(enrollments.classId, data.classId), eq(enrollments.status, 'accepted'))).all();
      const studentIds = enr.map(e => e.studentId);
      const studs = db.select().from(students).where(inArray(students.id, studentIds)).all();
      targetUserIds = studs.filter(s => s.userId).map(s => s.userId as number);
    } else if (audience === 'grade' && data.gradeLevel) {
      // Students in classes with this grade level
      const cs = db.select().from(classes).where(eq(classes.gradeLevel, data.gradeLevel)).all();
      const classIds = cs.map(c => c.id);
      if (classIds.length > 0) {
        const enr = db.select().from(enrollments).where(inArray(enrollments.classId, classIds)).all();
        const studentIds = enr.map(e => e.studentId);
        const studs = db.select().from(students).where(inArray(students.id, studentIds)).all();
        targetUserIds = studs.filter(s => s.userId).map(s => s.userId as number);
      }
    }

    // Create notifications
    const notifType = data.isEmergency ? 'alert' : 'info';
    for (const uid of targetUserIds) {
      db.insert(notifications).values({
        schoolId, userId: uid, type: notifType as any,
        title: data.title, body: data.excerpt || data.content.substring(0, 200),
        channel: 'in_app', isRead: false, createdAt: new Date(),
      }).run();
    }

    return new Response(JSON.stringify({ success: true, id: ann.id, recipients: targetUserIds.length }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ success: true, id: ann.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  const db = getDb();
  db.update(announcements).set({
    title: data.title, content: data.content, excerpt: data.excerpt,
    isPinned: data.isPinned, published: data.published,
    ctaText: data.ctaText, ctaUrl: data.ctaUrl, updatedAt: new Date(),
  }).where(and(eq(announcements.id, data.id), eq(announcements.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(announcements).where(and(eq(announcements.id, id), eq(announcements.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
