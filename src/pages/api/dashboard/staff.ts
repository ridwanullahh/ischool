import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { staff, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, like, or } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';
import { parseCsv, validateImportRows } from '../../../lib/import.js';

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

  if (action === 'export') {
    const allStaff = db.select().from(staff).where(eq(staff.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'staffId', label: 'Staff ID' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' },
      { key: 'employmentType', label: 'Employment Type' },
      { key: 'joinDate', label: 'Join Date' },
      { key: 'status', label: 'Status' },
    ];
    return csvResponse(toCsv(allStaff, columns), 'staff.csv');
  }

  const search = url.searchParams.get('search');
  if (search) {
    const results = db.select().from(staff).where(and(
      eq(staff.schoolId, schoolId),
      or(like(staff.firstName, `%${search}%`), like(staff.lastName, `%${search}%`), like(staff.staffId, `%${search}%`))
    )).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  const allStaff = db.select().from(staff).where(eq(staff.schoolId, schoolId)).all();
  return new Response(JSON.stringify(allStaff), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();

  if (data.action === 'bulk_import') {
    if (!data.csvContent) return new Response(JSON.stringify({ error: 'csvContent required' }), { status: 400 });
    const parsed = parseCsv(data.csvContent);
    if (parsed.errors.length) return new Response(JSON.stringify({ error: parsed.errors }), { status: 400 });
    const validated = validateImportRows(parsed.rows, ['first_name', 'last_name', 'staff_id']);
    if (validated.errors.length && !validated.valid.length) return new Response(JSON.stringify({ error: validated.errors }), { status: 400 });
    const db2 = getDb();
    let imported = 0;
    for (const row of validated.valid) {
      try {
        db2.insert(staff).values({
          schoolId, staffId: row.staff_id, firstName: row.first_name, lastName: row.last_name,
          department: row.department || null, designation: row.designation || null,
          email: row.email || null, phone: row.phone || null,
          employmentType: row.employment_type || 'full_time', status: 'active',
        }).run();
        imported++;
      } catch { /* skip duplicate */ }
    }
    return new Response(JSON.stringify({ success: true, imported, errors: validated.errors }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.firstName || !data.lastName || !data.staffId) {
    return new Response(JSON.stringify({ error: 'firstName, lastName, and staffId are required' }), { status: 400 });
  }

  const db = getDb();
  const result = db.insert(staff).values({
    schoolId,
    staffId: data.staffId,
    firstName: data.firstName,
    lastName: data.lastName,
    photoUrl: data.photoUrl || null,
    department: data.department || null,
    designation: data.designation || null,
    employmentType: data.employmentType || 'full_time',
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    qualifications: data.qualifications ? JSON.stringify(data.qualifications) : '[]',
    certifications: data.certifications ? JSON.stringify(data.certifications) : '[]',
    joinDate: data.joinDate || null,
    salary: data.salary || null,
    bankDetails: data.bankDetails ? JSON.stringify(data.bankDetails) : null,
    emergencyContact: data.emergencyContact ? JSON.stringify(data.emergencyContact) : null,
    documents: data.documents ? JSON.stringify(data.documents) : '[]',
    status: data.status || 'active',
    userId: data.userId || null,
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
  const existing = db.select().from(staff).where(and(eq(staff.id, data.id), eq(staff.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Staff not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  if (updateData.qualifications && typeof updateData.qualifications === 'object') updateData.qualifications = JSON.stringify(updateData.qualifications);
  if (updateData.certifications && typeof updateData.certifications === 'object') updateData.certifications = JSON.stringify(updateData.certifications);
  if (updateData.bankDetails && typeof updateData.bankDetails === 'object') updateData.bankDetails = JSON.stringify(updateData.bankDetails);
  if (updateData.emergencyContact && typeof updateData.emergencyContact === 'object') updateData.emergencyContact = JSON.stringify(updateData.emergencyContact);
  if (updateData.documents && typeof updateData.documents === 'object') updateData.documents = JSON.stringify(updateData.documents);

  db.update(staff).set({ ...updateData, updatedAt: new Date() }).where(eq(staff.id, id)).run();
  const updated = db.select().from(staff).where(eq(staff.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  const existing = db.select().from(staff).where(and(eq(staff.id, id), eq(staff.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Staff not found' }), { status: 404 });

  db.delete(staff).where(eq(staff.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
