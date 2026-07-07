import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { leaveRequests, staff, schoolMembers, users } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';
import { notifyLeaveStatusChanged } from '../../../lib/notifications.js';

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

  const action = url.searchParams.get('action');
  if (action === 'export') {
    const rows = db.select({
      staffName: staff.firstName,
      staffLastName: staff.lastName,
      department: staff.department,
      type: leaveRequests.type,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
    }).from(leaveRequests)
      .leftJoin(staff, eq(leaveRequests.staffId, staff.id))
      .where(eq(leaveRequests.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'staffName', label: 'First Name' },
      { key: 'staffLastName', label: 'Last Name' },
      { key: 'department', label: 'Department' },
      { key: 'type', label: 'Leave Type' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'endDate', label: 'End Date' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status' },
    ];
    return csvResponse(toCsv(rows, columns), 'leave-requests.csv');
  }

  let query = db.select({
    id: leaveRequests.id,
    staffId: leaveRequests.staffId,
    type: leaveRequests.type,
    startDate: leaveRequests.startDate,
    endDate: leaveRequests.endDate,
    reason: leaveRequests.reason,
    status: leaveRequests.status,
    approvedBy: leaveRequests.approvedBy,
    createdAt: leaveRequests.createdAt,
    updatedAt: leaveRequests.updatedAt,
    staffFirstName: staff.firstName,
    staffLastName: staff.lastName,
    staffIdentifier: staff.staffId,
    department: staff.department,
  }).from(leaveRequests)
    .leftJoin(staff, eq(leaveRequests.staffId, staff.id))
    .where(eq(leaveRequests.schoolId, schoolId));

  if (status) {
    query = db.select({
      id: leaveRequests.id,
      staffId: leaveRequests.staffId,
      type: leaveRequests.type,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      approvedBy: leaveRequests.approvedBy,
      createdAt: leaveRequests.createdAt,
      updatedAt: leaveRequests.updatedAt,
      staffFirstName: staff.firstName,
      staffLastName: staff.lastName,
      staffIdentifier: staff.staffId,
      department: staff.department,
    }).from(leaveRequests)
      .leftJoin(staff, eq(leaveRequests.staffId, staff.id))
      .where(and(eq(leaveRequests.schoolId, schoolId), eq(leaveRequests.status, status as any)));
  }

  const records = query.orderBy(desc(leaveRequests.createdAt)).all();
  return new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.staffId || !data.type || !data.startDate || !data.endDate) {
    return new Response(JSON.stringify({ error: 'staffId, type, startDate, and endDate are required' }), { status: 400 });
  }

  const db = getDb();
  const result = db.insert(leaveRequests).values({
    schoolId,
    staffId: data.staffId,
    type: data.type,
    startDate: data.startDate,
    endDate: data.endDate,
    reason: data.reason || null,
    status: data.status || 'pending',
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
  const existing = db.select().from(leaveRequests).where(and(eq(leaveRequests.id, data.id), eq(leaveRequests.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Leave request not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  if (updateData.status === 'approved' || updateData.status === 'rejected') {
    updateData.approvedBy = user.id;
  }

  db.update(leaveRequests).set({ ...updateData, updatedAt: new Date() }).where(eq(leaveRequests.id, id)).run();
  const updated = db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).get();

  if (updated && (updateData.status === 'approved' || updateData.status === 'rejected')) {
    const staffMember = db.select().from(staff).where(eq(staff.id, updated.staffId)).get();
    if (staffMember) {
      notifyLeaveStatusChanged(schoolId, `${staffMember.firstName} ${staffMember.lastName}`, updateData.status).catch(() => {});
    }
  }

  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(leaveRequests).where(and(eq(leaveRequests.id, id), eq(leaveRequests.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
