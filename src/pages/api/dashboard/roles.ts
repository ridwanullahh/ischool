/**
 * Roles & Permissions API
 *
 * GET  - list overrides for the school
 * POST - create or update an override (grant/revoke/reset)
 * DELETE - remove a single override (by id) or reset all overrides
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { roleOverrides } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { guardPermission, clearPermissionCache, type Role, type Permission, ALL_ROLES, PERMISSIONS } from '../../../lib/rbac.js';

export const GET: APIRoute = async ({ locals, url }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'it.roles.manage');
  if (denied) return denied;

  const schoolId = parseInt(url.searchParams.get('schoolId') || '0');
  if (!schoolId || schoolId !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'Invalid school' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const overrides = db.select().from(roleOverrides).where(eq(roleOverrides.schoolId, schoolId)).all();
  return new Response(JSON.stringify({ overrides }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'it.roles.manage');
  if (denied) return denied;

  const body = await request.json();
  const { role, permission, action, schoolId } = body;

  // Validate inputs
  if (!ALL_ROLES.includes(role) || role === 'super_admin') {
    return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!(permission in PERMISSIONS)) {
    return new Response(JSON.stringify({ error: 'Invalid permission' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (action !== '' && action !== 'grant' && action !== 'revoke') {
    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const sid = parseInt(schoolId);
  if (!sid || sid !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'Invalid school' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();

  // Remove any existing override for this role+permission+school
  db.delete(roleOverrides).where(
    and(eq(roleOverrides.schoolId, sid), eq(roleOverrides.role, role), eq(roleOverrides.permission, permission))
  ).run();

  // If action is empty, we've reset to default (just deleted the override)
  if (action === 'grant' || action === 'revoke') {
    db.insert(roleOverrides).values({
      schoolId: sid,
      role,
      permission,
      action,
      createdAt: new Date(),
    }).run();
  }

  // Clear the permission cache so the change takes effect immediately
  clearPermissionCache();

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'it.roles.manage');
  if (denied) return denied;

  const body = await request.json();
  const sid = parseInt(body.schoolId);
  if (!sid || sid !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'Invalid school' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();

  if (body.resetAll) {
    db.delete(roleOverrides).where(eq(roleOverrides.schoolId, sid)).run();
  } else {
    const id = parseInt(body.id);
    if (!id) {
      return new Response(JSON.stringify({ error: 'Invalid override id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    db.delete(roleOverrides).where(
      and(eq(roleOverrides.id, id), eq(roleOverrides.schoolId, sid))
    ).run();
  }

  clearPermissionCache();
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
