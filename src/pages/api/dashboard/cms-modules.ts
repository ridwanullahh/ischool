import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { moduleSettings } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

// CMS post types that can be enabled/disabled
export const CMS_POST_TYPES = [
  { key: 'about', label: 'About Page', nav: true },
  { key: 'announcements', label: 'Announcements', nav: true },
  { key: 'programs', label: 'Programs', nav: true },
  { key: 'classes', label: 'Classes', nav: true },
  { key: 'blog', label: 'Blog', nav: true },
  { key: 'gallery', label: 'Gallery', nav: true },
  { key: 'faqs', label: 'FAQs', nav: true },
  { key: 'contact', label: 'Contact', nav: true },
  { key: 'admissions', label: 'Admissions', nav: true },
  { key: 'banners', label: 'Banners', nav: false, disabled: true },
  { key: 'popups', label: 'Popups', nav: false },
  { key: 'forms', label: 'Form Builder', nav: false },
];

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });
  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response('No school found', { status: 404 });

  const db = getDb();
  const data = await request.json();

  if (data.action === 'toggle') {
    const module = data.module;
    const enabled = data.enabled;
    if (!module) return new Response('Module required', { status: 400 });

    const existing = db.select().from(moduleSettings).where(and(eq(moduleSettings.schoolId, schoolId), eq(moduleSettings.module, module))).get();
    if (existing) {
      db.update(moduleSettings).set({ enabled, updatedAt: new Date() }).where(eq(moduleSettings.id, existing.id)).run();
    } else {
      db.insert(moduleSettings).values({ schoolId, module, enabled, settings: {} }).run();
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'get_all') {
    const settings = db.select().from(moduleSettings).where(eq(moduleSettings.schoolId, schoolId)).all();
    const result: Record<string, boolean> = {};
    for (const mt of CMS_POST_TYPES) {
      const s = settings.find(s => s.module === mt.key);
      result[mt.key] = s ? s.enabled : (mt.disabled ? false : true);
    }
    return new Response(JSON.stringify({ modules: result }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response('Unknown action', { status: 400 });
};

export const GET: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const settings = db.select().from(moduleSettings).where(eq(moduleSettings.schoolId, schoolId)).all();
  const result2: Record<string, boolean> = {};
  for (const mt of CMS_POST_TYPES) {
    const s = settings.find(s => s.module === mt.key);
    result2[mt.key] = s ? s.enabled : (mt.disabled ? false : true);
  }
  return new Response(JSON.stringify({ modules: result2 }), { headers: { 'Content-Type': 'application/json' } });
};
