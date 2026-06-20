import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { invoices, schoolMembers } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';

async function getUserSchoolId(userId: number) {
  const db = getDb();
  const m = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return m?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const schoolId = await getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const action = url.searchParams.get('action');
  if (action === 'export') {
    const all = db.select().from(invoices).where(eq(invoices.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'invoiceNumber', label: 'Invoice Number' },
      { key: 'studentId', label: 'Student ID' },
      { key: 'amount', label: 'Amount' },
      { key: 'discount', label: 'Discount' },
      { key: 'fine', label: 'Fine' },
      { key: 'paidAmount', label: 'Paid' },
      { key: 'balance', label: 'Balance' },
      { key: 'status', label: 'Status' },
      { key: 'dueDate', label: 'Due Date' },
    ];
    return csvResponse(toCsv(all, columns), 'invoices.csv');
  }

  const all = db.select().from(invoices).where(eq(invoices.schoolId, schoolId)).all();
  return new Response(JSON.stringify(all), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const schoolId = await getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const data = await request.json();
  if (!data.invoiceNumber || !data.studentId || !data.amount) {
    return new Response(JSON.stringify({ error: 'Invoice number, student, and amount are required' }), { status: 400 });
  }

  const amount = Number(data.amount);
  const discount = data.discount ? Number(data.discount) : 0;
  const fine = data.fine ? Number(data.fine) : 0;
  const total = amount - discount + fine;

  const result = db.insert(invoices).values({
    ...data,
    schoolId,
    studentId: Number(data.studentId),
    amount,
    discount,
    fine,
    balance: total,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const schoolId = await getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const { id } = await request.json();
  const existing = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!existing || existing.schoolId !== schoolId) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  db.delete(invoices).where(eq(invoices.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
