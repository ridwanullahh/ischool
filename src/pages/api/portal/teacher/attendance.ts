/**
 * Teacher Portal - Attendance API
 *
 * POST - save attendance records for a class on a date
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db/index.js';
import { attendance } from '../../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { guardPermission } from '../../../../lib/rbac.js';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'attendance.mark');
  if (denied) return denied;

  const body = await request.json();
  const { classId, date, schoolId, records } = body;

  if (!classId || !date || !Array.isArray(records) || records.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (schoolId !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'School mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const now = new Date();
  let saved = 0;

  for (const rec of records) {
    if (!rec.studentId || !rec.status) continue;

    // Check if an attendance record already exists for this student+date
    const existing = db.select().from(attendance).where(
      and(eq(attendance.studentId, rec.studentId), eq(attendance.date, date))
    ).get();

    if (existing) {
      // Update existing
      db.update(attendance).set({
        status: rec.status,
        notes: rec.notes || null,
        markedBy: user.id,
        markedAt: now,
      }).where(eq(attendance.id, existing.id)).run();
    } else {
      // Create new
      db.insert(attendance).values({
        studentId: rec.studentId,
        classId,
        schoolId,
        date,
        status: rec.status,
        notes: rec.notes || null,
        markedBy: user.id,
        markedAt: now,
        createdAt: now,
      }).run();
    }
    saved++;
  }

  return new Response(JSON.stringify({ ok: true, saved }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
