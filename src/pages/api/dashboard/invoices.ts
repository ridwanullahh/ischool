import type { APIRoute } from 'astro';
import { guardPermission } from '../../../lib/rbac.js';
import { getDb } from '../../../lib/db/index.js';
import { invoices, students, feeStructures, schoolMembers, payments } from '../../../lib/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';


export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'invoices.view');
  if (denied) return denied;
  const db = getDb();
  const schoolId = (user as any).schoolId ?? null;
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

  // Return joined with student info
  const all = db.select({
    id: invoices.id, invoiceNumber: invoices.invoiceNumber, studentId: invoices.studentId,
    feeStructureId: invoices.feeStructureId, amount: invoices.amount, discount: invoices.discount,
    fine: invoices.fine, paidAmount: invoices.paidAmount, balance: invoices.balance,
    status: invoices.status, dueDate: invoices.dueDate, issuedAt: invoices.issuedAt,
    studentName: students.firstName, studentLastName: students.lastName, studentCode: students.studentId,
  }).from(invoices)
    .leftJoin(students, eq(invoices.studentId, students.id))
    .where(eq(invoices.schoolId, schoolId)).all();
  return new Response(JSON.stringify(all), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'invoices.view');
  if (denied) return denied;
  const db = getDb();
  const schoolId = (user as any).schoolId ?? null;
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const data = await request.json();

  // Bulk invoice generation for all students (or by grade level)
  if (data.action === 'bulk_generate') {
    if (!data.feeStructureId) return new Response(JSON.stringify({ error: 'feeStructureId required' }), { status: 400 });
    const feeStructure = db.select().from(feeStructures).where(and(eq(feeStructures.id, data.feeStructureId), eq(feeStructures.schoolId, schoolId))).get();
    if (!feeStructure) return new Response(JSON.stringify({ error: 'Fee structure not found' }), { status: 404 });

    let studentsList = db.select().from(students).where(and(eq(students.schoolId, schoolId), eq(students.status, 'active'))).all();
    if (data.gradeLevel) studentsList = studentsList.filter(s => (s as any).gradeLevel === data.gradeLevel);
    let created = 0;
    const prefix = `INV-${new Date().getFullYear()}-`;
    const existing = db.select({ num: invoices.invoiceNumber }).from(invoices).where(eq(invoices.schoolId, schoolId)).all();
    let maxNum = 0;
    for (const e of existing) {
      const match = e.num?.match(/INV-\d+-(\d+)/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
    }
    for (const s of studentsList) {
      maxNum++;
      const total = feeStructure.totalAmount;
      db.insert(invoices).values({
        schoolId, studentId: s.id, invoiceNumber: `${prefix}${String(maxNum).padStart(4, '0')}`,
        feeStructureId: feeStructure.id, amount: total, discount: 0, fine: 0,
        paidAmount: 0, balance: total, status: 'pending',
        dueDate: data.dueDate || null, issuedAt: new Date(), createdAt: new Date(),
      }).run();
      created++;
    }
    return new Response(JSON.stringify({ success: true, created }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.invoiceNumber || !data.studentId || !data.amount) {
    return new Response(JSON.stringify({ error: 'Invoice number, student, and amount are required' }), { status: 400 });
  }

  const amount = Number(data.amount);
  const discount = data.discount ? Number(data.discount) : 0;
  const fine = data.fine ? Number(data.fine) : 0;
  const total = amount - discount + fine;

  const result = db.insert(invoices).values({
    schoolId,
    invoiceNumber: data.invoiceNumber,
    studentId: Number(data.studentId),
    feeStructureId: data.feeStructureId || null,
    amount,
    discount,
    fine,
    paidAmount: 0,
    balance: total,
    status: 'pending',
    dueDate: data.dueDate || null,
    issuedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'invoices.view');
  if (denied) return denied;
  const db = getDb();
  const schoolId = (user as any).schoolId ?? null;
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  const existing = db.select().from(invoices).where(and(eq(invoices.id, data.id), eq(invoices.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  const amount = data.amount !== undefined ? Number(data.amount) : existing.amount;
  const discount = data.discount !== undefined ? Number(data.discount) : (existing.discount || 0);
  const fine = data.fine !== undefined ? Number(data.fine) : (existing.fine || 0);
  const total = amount - discount + fine;
  // Recompute status based on paidAmount
  const paidAmount = existing.paidAmount || 0;
  let status = 'pending';
  if (paidAmount >= total) status = 'paid';
  else if (paidAmount > 0) status = 'partial';
  else if (existing.dueDate && new Date(existing.dueDate) < new Date()) status = 'overdue';

  db.update(invoices).set({
    amount, discount, fine, balance: total - paidAmount, status,
    dueDate: data.dueDate !== undefined ? data.dueDate : existing.dueDate,
    updatedAt: new Date(),
  }).where(eq(invoices.id, data.id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'invoices.view');
  if (denied) return denied;
  const db = getDb();
  const schoolId = (user as any).schoolId ?? null;
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const { id } = await request.json();
  const existing = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!existing || existing.schoolId !== schoolId) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  db.delete(invoices).where(eq(invoices.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
