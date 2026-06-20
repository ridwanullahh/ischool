import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { students, schoolMembers } from '../../../lib/db/schema.js';
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
  const search = url.searchParams.get('search');
  const status = url.searchParams.get('status');

  const action = url.searchParams.get('action');

  if (action === 'export') {
    const allStudents = db.select().from(students).where(eq(students.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'studentId', label: 'Student ID' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'gender', label: 'Gender' },
      { key: 'dateOfBirth', label: 'Date of Birth' },
      { key: 'status', label: 'Status' },
      { key: 'enrollmentDate', label: 'Enrollment Date' },
      { key: 'emergencyContactName', label: 'Emergency Contact' },
      { key: 'emergencyContactPhone', label: 'Emergency Phone' },
    ];
    return csvResponse(toCsv(allStudents, columns), 'students.csv');
  }

  let query = db.select().from(students).where(eq(students.schoolId, schoolId));

  if (search) {
    const allStudents = db.select().from(students)
      .where(and(
        eq(students.schoolId, schoolId),
        or(
          like(students.firstName, `%${search}%`),
          like(students.lastName, `%${search}%`),
          like(students.studentId, `%${search}%`),
        )
      )).all();
    return new Response(JSON.stringify(allStudents), { headers: { 'Content-Type': 'application/json' } });
  }

  if (status) {
    const filtered = db.select().from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.status, status as any))).all();
    return new Response(JSON.stringify(filtered), { headers: { 'Content-Type': 'application/json' } });
  }

  const allStudents = db.select().from(students).where(eq(students.schoolId, schoolId)).all();
  return new Response(JSON.stringify(allStudents), { headers: { 'Content-Type': 'application/json' } });
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
    const validated = validateImportRows(parsed.rows, ['first_name', 'last_name', 'student_id']);
    if (validated.errors.length && !validated.valid.length) return new Response(JSON.stringify({ error: validated.errors }), { status: 400 });
    const db2 = getDb();
    let imported = 0;
    for (const row of validated.valid) {
      try {
        db2.insert(students).values({
          schoolId, studentId: row.student_id, firstName: row.first_name, lastName: row.last_name,
          email: row.email || null, gender: row.gender || null, phone: row.phone || null,
          dateOfBirth: row.date_of_birth || null, status: 'active',
          enrollmentDate: new Date().toISOString().split('T')[0],
        }).run();
        imported++;
      } catch { /* skip duplicate */ }
    }
    return new Response(JSON.stringify({ success: true, imported, errors: validated.errors }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.firstName || !data.lastName || !data.studentId) {
    return new Response(JSON.stringify({ error: 'firstName, lastName, and studentId are required' }), { status: 400 });
  }

  const db = getDb();
  const result = db.insert(students).values({
    schoolId,
    studentId: data.studentId,
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth || null,
    gender: data.gender || null,
    photoUrl: data.photoUrl || null,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    emergencyContactName: data.emergencyContactName || null,
    emergencyContactPhone: data.emergencyContactPhone || null,
    medicalNotes: data.medicalNotes || null,
    allergies: data.allergies || null,
    parentId: data.parentId || null,
    status: data.status || 'active',
    enrollmentDate: data.enrollmentDate || new Date().toISOString().split('T')[0],
    customFields: data.customFields ? JSON.stringify(data.customFields) : '{}',
    documents: data.documents ? JSON.stringify(data.documents) : '[]',
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
  const existing = db.select().from(students).where(and(eq(students.id, data.id), eq(students.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Student not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  if (updateData.customFields && typeof updateData.customFields === 'object') updateData.customFields = JSON.stringify(updateData.customFields);
  if (updateData.documents && typeof updateData.documents === 'object') updateData.documents = JSON.stringify(updateData.documents);

  db.update(students).set({ ...updateData, updatedAt: new Date() }).where(eq(students.id, id)).run();
  const updated = db.select().from(students).where(eq(students.id, id)).get();

  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  const existing = db.select().from(students).where(and(eq(students.id, id), eq(students.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Student not found' }), { status: 404 });

  db.delete(students).where(eq(students.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
