import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { jobPostings, jobApplications, interviews, schoolMembers, staff } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

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

  if (action === 'applications') {
    const jobId = url.searchParams.get('jobId');
    const apps = db.select({
      id: jobApplications.id, applicantName: jobApplications.applicantName, applicantEmail: jobApplications.applicantEmail,
      applicantPhone: jobApplications.applicantPhone, coverLetter: jobApplications.coverLetter, resumeUrl: jobApplications.resumeUrl,
      status: jobApplications.status, createdAt: jobApplications.createdAt,
      jobId: jobApplications.jobId, jobTitle: jobPostings.title,
    }).from(jobApplications)
      .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
      .where(eq(jobPostings.schoolId, schoolId));
    const list = jobId ? (db.select().from(jobApplications).where(eq(jobApplications.jobId, parseInt(jobId))).all()) : apps.all();
    return new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'interviews') {
    const ints = db.select({
      id: interviews.id, scheduledAt: interviews.scheduledAt, location: interviews.location,
      notes: interviews.notes, status: interviews.status,
      applicationId: interviews.applicationId,
      applicantName: jobApplications.applicantName, applicantEmail: jobApplications.applicantEmail,
      jobTitle: jobPostings.title,
    }).from(interviews)
      .leftJoin(jobApplications, eq(interviews.applicationId, jobApplications.id))
      .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
      .where(eq(jobPostings.schoolId, schoolId))
      .orderBy(desc(interviews.scheduledAt)).all();
    return new Response(JSON.stringify(ints), { headers: { 'Content-Type': 'application/json' } });
  }

  const jobs = db.select().from(jobPostings).where(eq(jobPostings.schoolId, schoolId)).orderBy(desc(jobPostings.createdAt)).all();
  return new Response(JSON.stringify(jobs), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const db = getDb();

  if (data.action === 'create_job') {
    if (!data.title) return new Response(JSON.stringify({ error: 'title required' }), { status: 400 });
    const result = db.insert(jobPostings).values({
      schoolId, title: data.title, department: data.department || null,
      description: data.description || null, requirements: data.requirements || null,
      employmentType: data.employmentType || 'full_time', salaryRange: data.salaryRange || null,
      status: data.status || 'open', postedDate: new Date().toISOString().split('T')[0],
      createdAt: new Date(),
    }).returning().get();
    return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }
  if (data.action === 'update_application_status') {
    if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    db.update(jobApplications).set({ status: data.status, updatedAt: new Date() }).where(eq(jobApplications.id, data.id)).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }
  if (data.action === 'schedule_interview') {
    if (!data.applicationId || !data.scheduledAt) return new Response(JSON.stringify({ error: 'applicationId and scheduledAt required' }), { status: 400 });
    const result = db.insert(interviews).values({
      schoolId, applicationId: data.applicationId, scheduledAt: data.scheduledAt,
      location: data.location || null, notes: data.notes || null,
      status: 'scheduled', createdAt: new Date(),
    }).returning().get();
    // Update application status
    db.update(jobApplications).set({ status: 'interviewed', updatedAt: new Date() }).where(eq(jobApplications.id, data.applicationId)).run();
    return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }
  if (data.action === 'hire_applicant') {
    if (!data.applicationId) return new Response(JSON.stringify({ error: 'applicationId required' }), { status: 400 });
    // Mark as hired
    db.update(jobApplications).set({ status: 'hired', updatedAt: new Date() }).where(eq(jobApplications.id, data.applicationId)).run();
    // Optionally create staff record
    if (data.createStaffRecord) {
      const app = db.select().from(jobApplications).where(eq(jobApplications.id, data.applicationId)).get();
      const job = app ? db.select().from(jobPostings).where(eq(jobPostings.id, app.jobId)).get() : null;
      if (app && job) {
        const [firstName, ...rest] = (app.applicantName || '').split(' ');
        const lastName = rest.join(' ');
        const staffId = `STF-${Date.now().toString().slice(-6)}`;
        db.insert(staff).values({
          schoolId, staffId, firstName, lastName: lastName || '—',
          email: app.applicantEmail, phone: app.applicantPhone || null,
          department: job.department || null, designation: job.title,
          employmentType: job.employmentType || 'full_time',
          joinDate: new Date().toISOString().split('T')[0],
          createdAt: new Date(),
        }).run();
      }
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  const db = getDb();
  db.update(jobPostings).set({
    title: data.title, department: data.department, description: data.description,
    requirements: data.requirements, employmentType: data.employmentType,
    salaryRange: data.salaryRange, status: data.status, updatedAt: new Date(),
  }).where(and(eq(jobPostings.id, data.id), eq(jobPostings.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(jobPostings).where(and(eq(jobPostings.id, id), eq(jobPostings.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
