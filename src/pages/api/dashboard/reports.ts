/**
 * Custom Reports API
 * GET - get a saved report by ID
 * POST - generate a new report
 * DELETE - delete a saved report
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { savedReports, students, staff, attendance, invoices, payments, grades } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

export const GET: APIRoute = async ({ locals, url }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const denied = guardPermission(user, 'reports.view');
  if (denied) return denied;

  const id = parseInt(url.searchParams.get('id') || '0');
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const report = db.select().from(savedReports).where(eq(savedReports.id, id)).get();
  if (!report) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const config = JSON.parse(report.config || '{}');
  const rows = await generateReport(db, (user as any).schoolId, config.type, config.fields || []);
  return new Response(JSON.stringify({ ok: true, name: report.name, fields: config.fields, rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const denied = guardPermission(user, 'reports.view');
  if (denied) return denied;

  const body = await request.json();
  const { schoolId, name, type, fields, save } = body;

  if (!schoolId || !type) return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const rows = await generateReport(db, schoolId, type, fields || []);

  if (save) {
    db.insert(savedReports).values({
      schoolId, name: name || type + ' Report', type,
      config: JSON.stringify({ type, fields }),
      createdBy: user.id,
      createdAt: new Date(),
    }).run();
  }

  return new Response(JSON.stringify({ ok: true, rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const denied = guardPermission(user, 'reports.view');
  if (denied) return denied;

  const body = await request.json();
  const { id } = body;
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  db.delete(savedReports).where(eq(savedReports.id, id)).run();
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

async function generateReport(db: any, schoolId: number, type: string, fields: string[]) {
  let rows: any[] = [];
  try {
    switch (type) {
      case 'students':
        rows = db.select().from(students).where(eq(students.schoolId, schoolId)).all();
        break;
      case 'attendance':
        rows = db.select().from(attendance).where(eq(attendance.schoolId, schoolId)).all();
        break;
      case 'finance':
        rows = db.select().from(invoices).where(eq(invoices.schoolId, schoolId)).all();
        break;
      case 'payments':
        rows = db.select().from(payments).where(eq(payments.schoolId, schoolId)).all();
        break;
      case 'grades':
        rows = db.select().from(grades).where(eq(grades.schoolId, schoolId)).all();
        break;
      case 'staff':
        rows = db.select().from(staff).where(eq(staff.schoolId, schoolId)).all();
        break;
      default:
        rows = [];
    }
  } catch (e) {
    rows = [];
  }

  // Filter to only requested fields
  if (fields.length > 0) {
    rows = rows.map((row: any) => {
      const filtered: any = {};
      for (const f of fields) {
        filtered[f] = row[f] ?? null;
      }
      return filtered;
    });
  }

  return rows;
}
