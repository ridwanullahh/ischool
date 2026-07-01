/**
 * Staff Attendance (Clock-in/out) API
 *
 * POST - clock in or clock out
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { staffAttendance } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  const { staffId, schoolId, date, action } = body;

  if (!staffId || !schoolId || !date || !action) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (schoolId !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'School mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const now = new Date().toTimeString().split(' ')[0];
  const db = getDb();

  // Check if a record already exists for today
  const existing = db.select().from(staffAttendance)
    .where(and(eq(staffAttendance.staffId, staffId), eq(staffAttendance.date, date)))
    .get();

  if (action === 'in') {
    if (existing?.clockIn) {
      return new Response(JSON.stringify({ error: 'Already clocked in today' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (existing) {
      db.update(staffAttendance).set({ clockIn: now, updatedAt: new Date() }).where(eq(staffAttendance.id, existing.id)).run();
    } else {
      db.insert(staffAttendance).values({
        staffId, schoolId, date, clockIn: now, method: 'manual', createdAt: new Date(),
      }).run();
    }
  } else if (action === 'out') {
    if (!existing?.clockIn) {
      return new Response(JSON.stringify({ error: 'Must clock in first' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (existing.clockOut) {
      return new Response(JSON.stringify({ error: 'Already clocked out' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    db.update(staffAttendance).set({ clockOut: now, updatedAt: new Date() }).where(eq(staffAttendance.id, existing.id)).run();
  }

  return new Response(JSON.stringify({ ok: true, time: now }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
