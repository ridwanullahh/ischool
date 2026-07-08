import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { platformSettings } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

// Platform-level module control — affects ALL schools
export const PLATFORM_MODULES = [
  { key: 'cms', label: 'CMS (Website Builder)', status: 'active' },
  { key: 'sis', label: 'Student Information System', status: 'active' },
  { key: 'lms', label: 'Learning Management', status: 'active' },
  { key: 'finance', label: 'Finance & Fees', status: 'active' },
  { key: 'hr', label: 'HR & Staff', status: 'active' },
  { key: 'exams', label: 'Exams & CBT', status: 'active' },
  { key: 'library', label: 'Library', status: 'active' },
  { key: 'transport', label: 'Transport', status: 'active' },
  { key: 'hostel', label: 'Hostel', status: 'active' },
  { key: 'inventory', label: 'Inventory', status: 'active' },
  { key: 'events', label: 'Events', status: 'active' },
  { key: 'communication', label: 'Communication', status: 'active' },
  { key: 'banners', label: 'Banners', status: 'coming_soon' },
  { key: 'popups', label: 'Popups', status: 'active' },
  { key: 'forms', label: 'Form Builder', status: 'active' },
  { key: 'it_admin', label: 'IT Admin', status: 'active' },
  { key: 'analytics', label: 'Analytics', status: 'active' },
  { key: 'ai', label: 'AI Assistant', status: 'active' },
];

function getModuleStatus(db: any, key: string): string {
  try {
    const row = db.select().from(platformSettings).where(eq(platformSettings.key, 'module_status_' + key)).get();
    if (row) return row.value;
    const mod = PLATFORM_MODULES.find(m => m.key === key);
    return mod?.status || 'active';
  } catch { return 'active'; }
}

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || user.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const modules = PLATFORM_MODULES.map(m => ({
    ...m,
    status: getModuleStatus(db, m.key),
  }));

  return new Response(JSON.stringify({ modules }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || user.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const data = await request.json();
  const { module, status } = data;

  if (!module || !['active', 'disabled', 'maintenance', 'coming_soon'].includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid parameters' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const key = 'module_status_' + module;
  const existing = db.select().from(platformSettings).where(eq(platformSettings.key, key)).get();
  if (existing) {
    db.update(platformSettings).set({ value: status, updatedAt: new Date() }).where(eq(platformSettings.id, existing.id)).run();
  } else {
    db.insert(platformSettings).values({ key, value: status, type: 'string', category: 'module_control', description: `Status for ${module} module` }).run();
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
