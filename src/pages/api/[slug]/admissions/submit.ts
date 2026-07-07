import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db/index.js';
import { schools, admissionApplications, admissionPeriods, programs } from '../../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const POST: APIRoute = async ({ request, params }) => {
  const slug = params.slug;
  if (!slug) return new Response(JSON.stringify({ error: 'School slug required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const school = db.select().from(schools).where(eq(schools.slug, slug)).get();
  if (!school) return new Response(JSON.stringify({ error: 'School not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  let data: any;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Validate required fields
  const required = ['studentFirstName', 'studentLastName', 'parentName', 'parentEmail', 'parentPhone'];
  for (const field of required) {
    if (!data[field] || !String(data[field]).trim()) {
      return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // Check if admissions are open (if there's an active period)
  const today = new Date().toISOString().split('T')[0];
  const activePeriod = db.select().from(admissionPeriods).where(eq(admissionPeriods.schoolId, school.id)).all()
    .find(p => p.isActive && p.openDate <= today && p.closeDate >= today);

  // If there are admission periods but none active, reject
  const allPeriods = db.select().from(admissionPeriods).where(eq(admissionPeriods.schoolId, school.id)).all();
  if (allPeriods.length > 0 && !activePeriod) {
    return new Response(JSON.stringify({ error: 'Admissions are currently closed. Please check back later.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // Generate unique application number
  const applicationNumber = `APP-${school.id}-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;

  // Get program name if programId provided
  let programName = data.programName || null;
  if (data.programId && !programName) {
    try {
      const program = db.select().from(programs).where(eq(programs.id, Number(data.programId))).get();
      if (program) programName = program.name;
    } catch {}
  }

  try {
    const [application] = db.insert(admissionApplications).values({
      schoolId: school.id,
      periodId: data.periodId || activePeriod?.id || null,
      applicationNumber,
      studentFirstName: data.studentFirstName.trim(),
      studentLastName: data.studentLastName.trim(),
      studentDateOfBirth: data.studentDateOfBirth || null,
      studentGender: data.studentGender || null,
      studentNationality: data.studentNationality || null,
      studentCurrentSchool: data.studentCurrentSchool || null,
      parentName: data.parentName.trim(),
      parentRelationship: data.parentRelationship || null,
      parentEmail: data.parentEmail.trim(),
      parentPhone: data.parentPhone.trim(),
      parentOccupation: data.parentOccupation || null,
      parentAddress: data.parentAddress || null,
      programId: data.programId ? Number(data.programId) : null,
      programName,
      preferredClass: data.preferredClass || null,
      message: data.message || null,
      howDidYouHear: data.howDidYouHear || null,
      documents: (data.documents || []) as any,
      status: 'submitted',
    } as any).returning().all();

    return new Response(JSON.stringify({
      success: true,
      applicationNumber: application.applicationNumber,
      message: 'Application submitted successfully. We will contact you soon.',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to submit application: ' + e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
