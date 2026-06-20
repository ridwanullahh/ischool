import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { payroll, staff, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';

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
  const status = url.searchParams.get('status');
  const month = url.searchParams.get('month');
  const year = url.searchParams.get('year');

  const action = url.searchParams.get('action');
  if (action === 'export') {
    const rows = db.select({
      staffName: staff.firstName,
      staffLastName: staff.lastName,
      department: staff.department,
      month: payroll.month,
      year: payroll.year,
      basicSalary: payroll.basicSalary,
      grossPay: payroll.grossPay,
      netPay: payroll.netPay,
      status: payroll.status,
    }).from(payroll)
      .leftJoin(staff, eq(payroll.staffId, staff.id))
      .where(eq(payroll.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'staffName', label: 'First Name' },
      { key: 'staffLastName', label: 'Last Name' },
      { key: 'department', label: 'Department' },
      { key: 'month', label: 'Month' },
      { key: 'year', label: 'Year' },
      { key: 'basicSalary', label: 'Basic Salary' },
      { key: 'grossPay', label: 'Gross Pay' },
      { key: 'netPay', label: 'Net Pay' },
      { key: 'status', label: 'Status' },
    ];
    return csvResponse(toCsv(rows, columns), 'payroll.csv');
  }

  let query = db.select({
    id: payroll.id,
    staffId: payroll.staffId,
    month: payroll.month,
    year: payroll.year,
    basicSalary: payroll.basicSalary,
    allowances: payroll.allowances,
    deductions: payroll.deductions,
    grossPay: payroll.grossPay,
    netPay: payroll.netPay,
    status: payroll.status,
    paidAt: payroll.paidAt,
    createdAt: payroll.createdAt,
    updatedAt: payroll.updatedAt,
    staffFirstName: staff.firstName,
    staffLastName: staff.lastName,
    staffIdentifier: staff.staffId,
    department: staff.department,
  }).from(payroll)
    .leftJoin(staff, eq(payroll.staffId, staff.id))
    .where(eq(payroll.schoolId, schoolId));

  if (status) {
    query = db.select({
      id: payroll.id,
      staffId: payroll.staffId,
      month: payroll.month,
      year: payroll.year,
      basicSalary: payroll.basicSalary,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      grossPay: payroll.grossPay,
      netPay: payroll.netPay,
      status: payroll.status,
      paidAt: payroll.paidAt,
      createdAt: payroll.createdAt,
      updatedAt: payroll.updatedAt,
      staffFirstName: staff.firstName,
      staffLastName: staff.lastName,
      staffIdentifier: staff.staffId,
      department: staff.department,
    }).from(payroll)
      .leftJoin(staff, eq(payroll.staffId, staff.id))
      .where(and(eq(payroll.schoolId, schoolId), eq(payroll.status, status as any)));
  }

  const records = query.orderBy(desc(payroll.createdAt)).all();
  return new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.staffId || !data.month || !data.year || !data.basicSalary) {
    return new Response(JSON.stringify({ error: 'staffId, month, year, and basicSalary are required' }), { status: 400 });
  }

  const allowances = data.allowances || [];
  const deductions = data.deductions || [];
  const allowanceTotal = allowances.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
  const deductionTotal = deductions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
  const grossPay = data.basicSalary + allowanceTotal;
  const netPay = grossPay - deductionTotal;

  const db = getDb();
  const result = db.insert(payroll).values({
    schoolId,
    staffId: data.staffId,
    month: data.month,
    year: data.year,
    basicSalary: data.basicSalary,
    allowances: JSON.stringify(allowances),
    deductions: JSON.stringify(deductions),
    grossPay,
    netPay,
    status: data.status || 'draft',
  }).returning().get();

  return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });

  const db = getDb();
  const existing = db.select().from(payroll).where(and(eq(payroll.id, data.id), eq(payroll.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Payroll record not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  if (updateData.allowances && typeof updateData.allowances === 'object') updateData.allowances = JSON.stringify(updateData.allowances);
  if (updateData.deductions && typeof updateData.deductions === 'object') updateData.deductions = JSON.stringify(updateData.deductions);
  if (updateData.status === 'paid') updateData.paidAt = new Date();

  db.update(payroll).set({ ...updateData, updatedAt: new Date() }).where(eq(payroll.id, id)).run();
  const updated = db.select().from(payroll).where(eq(payroll.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(payroll).where(and(eq(payroll.id, id), eq(payroll.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
