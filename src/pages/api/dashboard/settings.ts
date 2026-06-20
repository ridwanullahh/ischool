import type { APIRoute } from 'astro';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { schools } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });

  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response('No school found', { status: 404 });

  const db = getDb();
  const existing = db.select().from(schools).where(eq(schools.id, schoolId)).get();
  const existingSettings = (existing?.settings as any) || {};

  const paletteKeys = ['accent', 'backgroundLight', 'backgroundDark', 'surfaceLight', 'surfaceDark', 'textLight', 'textDark', 'mutedLight', 'mutedDark', 'borderLight', 'borderDark'];
  const palette: Record<string, string> = {};
  for (const key of paletteKeys) {
    const val = form.get(`palette_${key}`)?.toString();
    if (val) palette[key] = val;
  }

  const socialKeys = ['facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'tiktok', 'whatsapp', 'email'];
  const socialHandles: Record<string, string> = {};
  for (const key of socialKeys) {
    const val = form.get(`social_${key}`)?.toString();
    if (val && val.trim()) socialHandles[key] = val.trim();
  }

  const updatedSettings = {
    ...existingSettings,
    palette: Object.keys(palette).length > 0 ? palette : existingSettings.palette,
  };

  const newSlug = form.get('slug')?.toString()?.trim();

  db.update(schools).set({
    name: form.get('name')?.toString() || existing!.name,
    tagline: form.get('tagline')?.toString() || null,
    slug: newSlug || existing!.slug,
    logoUrl: form.get('logoUrl')?.toString() || null,
    faviconUrl: form.get('faviconUrl')?.toString() || null,
    primaryColor: form.get('primaryColor')?.toString() || '#2563eb',
    theme: form.get('theme')?.toString() || 'harmony',
    locale: form.get('locale')?.toString() || 'en',
    settings: updatedSettings,
    socialHandles: socialHandles,
    updatedAt: new Date(),
  }).where(eq(schools.id, schoolId)).run();

  return new Response(null, { status: 302, headers: { Location: '/dashboard/settings?success=1' } });
};
