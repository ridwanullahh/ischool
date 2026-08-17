import type { APIRoute } from 'astro';
import { guardPermission } from '../../../lib/rbac.js';
import { getDb, isLightbase } from '../../../lib/db/index.js';
import { getLightbaseDb } from '../../../lib/db/lightbase-adapter.js';
import { schools, schoolMembers } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getPreset as getPalettePreset } from '../../../lib/palette-presets.js';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });

  const user = result.user as any;

  // Resolve schoolId: check middleware-populated user.schoolId first,
  // then fall back to querying school_members by user id.
  let schoolId: string | number | null = user.schoolId ?? user.school_id ?? null;

  if (!schoolId) {
    const db0 = getDb();
    try {
      const membership = await db0.select().from(schoolMembers).where(eq(schoolMembers.userId, user.id)).get();
      schoolId = membership?.schoolId ?? membership?.school_id ?? null;
    } catch { /* ignore */ }
  }

  if (!schoolId) return new Response('No school found for this user', { status: 404 });

  const db = getDb();

  // Fetch existing school record (await for Lightbase)
  let existing: any = null;
  try {
    existing = await db.select().from(schools).where(eq(schools.id, schoolId)).get();
  } catch (e: any) {
    // Lightbase fallback — query by id directly
    if (isLightbase()) {
      try {
        const r = await getLightbaseDb().raw.query('schools', {
          filter: { field: 'id', op: 'eq', value: schoolId },
          limit: 1,
        });
        existing = r.data?.[0] || null;
      } catch { /* ignore */ }
    }
  }

  if (!existing) return new Response('School not found', { status: 404 });

  const existingSettings = (existing.settings as any) || {};

  const paletteKeys = ['accent', 'backgroundLight', 'backgroundDark', 'surfaceLight', 'surfaceDark', 'textLight', 'textDark', 'mutedLight', 'mutedDark', 'borderLight', 'borderDark'];
  const palette: Record<string, string> = {};
  for (const key of paletteKeys) {
    const val = form.get(`palette_${key}`)?.toString();
    if (val) palette[key] = val;
  }

  // Apply palette preset if selected
  const palettePresetId = form.get('palettePresetId')?.toString();
  if (palettePresetId) {
    const preset = getPalettePreset(palettePresetId);
    if (preset) {
      for (const key of paletteKeys) {
        if (!palette[key]) palette[key] = (preset.palette as any)[key];
      }
    }
  }

  const socialKeys = ['facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'tiktok', 'whatsapp', 'email'];
  const socialHandles: Record<string, string> = {};
  for (const key of socialKeys) {
    const val = form.get(`social_${key}`)?.toString();
    if (val && val.trim()) socialHandles[key] = val.trim();
  }

  const fontPresetId = form.get('fontPresetId')?.toString() || '';

  const updatedSettings = {
    ...existingSettings,
    palette: Object.keys(palette).length > 0 ? palette : existingSettings.palette,
    fontPresetId: fontPresetId || undefined,
  };

  const newSlug = form.get('slug')?.toString()?.trim();

  const updateData: Record<string, any> = {
    name: form.get('name')?.toString() || existing.name,
    tagline: form.get('tagline')?.toString() || null,
    slug: newSlug || existing.slug,
    primary_color: form.get('primaryColor')?.toString() || '#05B34D',
    theme: form.get('theme')?.toString() || 'aurora',
    locale: form.get('locale')?.toString() || 'en',
    settings: typeof updatedSettings === 'object' ? JSON.stringify(updatedSettings) : updatedSettings,
    social_handles: typeof socialHandles === 'object' ? JSON.stringify(socialHandles) : socialHandles,
    updated_at: new Date().toISOString(),
    // Also include camelCase versions for SQLite compatibility
    primaryColor: form.get('primaryColor')?.toString() || '#05B34D',
    logoUrl: form.get('logoUrl')?.toString() || existing.logo_url || existing.logoUrl || null,
    faviconUrl: form.get('faviconUrl')?.toString() || existing.favicon_url || existing.faviconUrl || null,
    updatedAt: new Date().toISOString(),
  };

  try {
    if (isLightbase() && existing.id) {
      // Lightbase: use raw client to update by id
      await getLightbaseDb().raw.update('schools', existing.id, {
        name: updateData.name,
        tagline: updateData.tagline,
        slug: updateData.slug,
        primary_color: updateData.primary_color,
        theme: updateData.theme,
        locale: updateData.locale,
        settings: updateData.settings,
        social_handles: updateData.social_handles,
        logo_url: updateData.logoUrl,
        favicon_url: updateData.faviconUrl,
        updated_at: updateData.updated_at,
      });
    } else {
      // SQLite: use Drizzle
      await db.update(schools).set({
        name: updateData.name,
        tagline: updateData.tagline,
        slug: updateData.slug,
        primaryColor: updateData.primaryColor,
        theme: updateData.theme,
        locale: updateData.locale,
        settings: updatedSettings,
        socialHandles: socialHandles,
        logoUrl: updateData.logoUrl,
        faviconUrl: updateData.faviconUrl,
        updatedAt: new Date(),
      } as any).where(eq(schools.id, schoolId)).run();
    }
  } catch (e: any) {
    console.error('[settings API] Update error:', e.message);
    return new Response('Failed to save settings: ' + e.message, { status: 500 });
  }

  return new Response(null, { status: 302, headers: { Location: '/dashboard/settings?success=1' } });
};
