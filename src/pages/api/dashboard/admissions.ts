import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getUserSchoolId, getSchoolIdForApi } from '../../../lib/school.js'; 
import { getDb } from '../../../lib/db/index.js';
import { admissionPeriods, admissionApplications, announcements } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });
  const schoolId = await getSchoolIdForApi(result.user);
  if (!schoolId) return new Response('No school found', { status: 404 });

  const form = await request.formData();
  const db = getDb();
  const action = form.get('action')?.toString();

  if (action === 'create_period') {
    const title = form.get('title')?.toString() || '';
    const academicYear = form.get('academicYear')?.toString() || '';
    const openDate = form.get('openDate')?.toString() || '';
    const closeDate = form.get('closeDate')?.toString() || '';
    const description = form.get('description')?.toString() || '';
    const autoAnnounce = form.get('autoAnnounce') === 'on';
    const eligibleGrades = form.get('eligibleGrades')?.toString() || null;
    const availableSeats = form.get('availableSeats') ? Number(form.get('availableSeats')) : null;
    const applicationFee = form.get('applicationFee') ? Number(form.get('applicationFee')) : null;
    const applicationFeeCurrency = form.get('applicationFeeCurrency')?.toString() || 'USD';
    const contactEmail = form.get('contactEmail')?.toString() || null;
    const contactPhone = form.get('contactPhone')?.toString() || null;
    const brochureUrl = form.get('brochureUrl')?.toString() || null;

    // Parse JSON fields — support both JSON string and textarea (one per line)
    let requirements: any[] = [];
    let processSteps: any[] = [];
    let importantDates: any[] = [];
    try { requirements = JSON.parse(form.get('requirements')?.toString() || '[]'); } catch (e: any) { console.error("Parse error:", e); }
    try { processSteps = JSON.parse(form.get('processSteps')?.toString() || '[]'); } catch (e: any) { console.error("Parse error:", e); }
    try { importantDates = JSON.parse(form.get('importantDates')?.toString() || '[]'); } catch (e: any) { console.error("Parse error:", e); }

    // If requirementsText is provided (textarea), convert to array
    const requirementsText = form.get('requirementsText')?.toString();
    if (requirementsText) {
      requirements = requirementsText.split('\n').map(s => s.trim()).filter(Boolean);
    }

    if (!title || !academicYear || !openDate || !closeDate) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Generate slug from title
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + academicYear.replace(/[^a-z0-9]/gi, '-');

    const [period] = db.insert(admissionPeriods).values({
      schoolId, title, slug, academicYear, openDate, closeDate,
      description: description || null,
      eligibleGrades: eligibleGrades || null,
      availableSeats: availableSeats || null,
      applicationFee: applicationFee || null,
      applicationFeeCurrency,
      requirements: requirements as any,
      processSteps: processSteps as any,
      importantDates: importantDates as any,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      brochureUrl: brochureUrl || null,
      isActive: true,
      autoAnnounce,
    } as any).returning().all();

    // Auto-generate announcement if enabled
    if (autoAnnounce && period) {
      try {
        const annSlug = `admissions-open-${academicYear}-${period.id}`;
        db.insert(announcements).values({
          schoolId,
          title: `Admissions Open: ${title}`,
          slug: annSlug,
          content: `We are now accepting applications for the ${academicYear} academic year. ${description} Applications open on ${openDate} and close on ${closeDate}. Apply now to secure your child's place.`,
          excerpt: `Admissions for ${academicYear} are now open. Apply by ${closeDate}.`,
          isPinned: true,
          published: true,
          publishedAt: new Date(),
        } as any).run();
      } catch (e) {
        // Announcement creation failed — not critical
      }
    }

    return new Response(null, { status: 303, headers: { Location: '/dashboard/admissions?success=period_created' } });
  }

  if (action === 'update_period') {
    const id = Number(form.get('id'));
    if (!id) return new Response('ID required', { status: 400 });

    const updates: any = { updatedAt: new Date() };
    if (form.get('title')) updates.title = form.get('title')?.toString();
    if (form.get('academicYear')) updates.academicYear = form.get('academicYear')?.toString();
    if (form.get('openDate')) updates.openDate = form.get('openDate')?.toString();
    if (form.get('closeDate')) updates.closeDate = form.get('closeDate')?.toString();
    if (form.get('description') !== null) updates.description = form.get('description')?.toString() || null;
    if (form.get('isActive') !== null) updates.isActive = form.get('isActive') === 'on';
    if (form.get('autoAnnounce') !== null) updates.autoAnnounce = form.get('autoAnnounce') === 'on';

    db.update(admissionPeriods).set(updates).where(and(eq(admissionPeriods.id, id), eq(admissionPeriods.schoolId, schoolId))).run();
    return new Response(null, { status: 303, headers: { Location: '/dashboard/admissions?success=period_updated' } });
  }

  if (action === 'delete_period') {
    const id = Number(form.get('id'));
    if (!id) return new Response('ID required', { status: 400 });
    db.delete(admissionPeriods).where(and(eq(admissionPeriods.id, id), eq(admissionPeriods.schoolId, schoolId))).run();
    return new Response(null, { status: 303, headers: { Location: '/dashboard/admissions?success=period_deleted' } });
  }

  if (action === 'update_application_status') {
    const id = Number(form.get('id'));
    const status = form.get('status')?.toString() || 'submitted';
    const reviewNotes = form.get('reviewNotes')?.toString() || null;
    const interviewDate = form.get('interviewDate')?.toString() || null;
    const interviewNotes = form.get('interviewNotes')?.toString() || null;

    if (!id) return new Response('ID required', { status: 400 });

    const updates: any = { status, updatedAt: new Date() };
    if (reviewNotes !== null) updates.reviewNotes = reviewNotes;
    if (interviewDate !== null) updates.interviewDate = interviewDate || null;
    if (interviewNotes !== null) updates.interviewNotes = interviewNotes || null;
    if (['accepted', 'rejected', 'waitlisted'].includes(status)) {
      updates.decisionDate = new Date().toISOString().split('T')[0];
      updates.decidedBy = result.user.id;
    }

    db.update(admissionApplications).set(updates).where(and(eq(admissionApplications.id, id), eq(admissionApplications.schoolId, schoolId))).run();
    return new Response(null, { status: 303, headers: { Location: '/dashboard/admissions?success=application_updated' } });
  }

  return new Response('Unknown action', { status: 400 });
};

export const GET: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const schoolId = await getSchoolIdForApi(result.user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  if (type === 'applications') {
    const apps = db.select().from(admissionApplications).where(eq(admissionApplications.schoolId, schoolId)).all();
    return new Response(JSON.stringify(apps), { headers: { 'Content-Type': 'application/json' } });
  }

  if (type === 'periods') {
    const periods = db.select().from(admissionPeriods).where(eq(admissionPeriods.schoolId, schoolId)).all();
    return new Response(JSON.stringify(periods), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown type' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
};
