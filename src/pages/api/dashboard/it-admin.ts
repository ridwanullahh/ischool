import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { moduleSettings, auditLogs, schoolMembers, schools, users } from '../../../lib/db/schema.js';
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

  const type = url.searchParams.get('type') || 'modules';
  const db = getDb();

  if (type === 'audit_logs') {
    const logs = db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      userName: users.name,
    }).from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.schoolId, schoolId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100)
      .all();
    return new Response(JSON.stringify(logs), { headers: { 'Content-Type': 'application/json' } });
  }

  if (type === 'members') {
    const members = db.select({
      id: schoolMembers.id,
      userId: schoolMembers.userId,
      role: schoolMembers.role,
      joinedAt: schoolMembers.createdAt,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      twoFactorEnabled: users.twoFactorEnabled,
    }).from(schoolMembers)
      .leftJoin(users, eq(schoolMembers.userId, users.id))
      .where(eq(schoolMembers.schoolId, schoolId))
      .all();
    return new Response(JSON.stringify(members), { headers: { 'Content-Type': 'application/json' } });
  }

  const allModules = db.select().from(moduleSettings).where(eq(moduleSettings.schoolId, schoolId)).all();
  const schoolData = db.select().from(schools).where(eq(schools.id, schoolId)).get();
  const activeModules = (schoolData?.activeModules as string[]) || ['cms', 'sis', 'lms', 'finance', 'communication'];

  const allModuleList = [
    { key: 'cms', label: 'Content Management', icon: '🌐' },
    { key: 'sis', label: 'Student Information', icon: '🎓' },
    { key: 'lms', label: 'Learning Management', icon: '📚' },
    { key: 'timetable', label: 'Timetable & Scheduling', icon: '📅' },
    { key: 'exams', label: 'Examinations', icon: '📝' },
    { key: 'finance', label: 'Finance & Fees', icon: '💰' },
    { key: 'hr', label: 'Human Resources', icon: '👥' },
    { key: 'communication', label: 'Communication', icon: '💬' },
    { key: 'library', label: 'Library', icon: '📖' },
    { key: 'hostel', label: 'Hostel', icon: '🏠' },
    { key: 'transport', label: 'Transport', icon: '🚌' },
    { key: 'inventory', label: 'Inventory & Assets', icon: '📦' },
    { key: 'events', label: 'Events', icon: '🎉' },
    { key: 'classroom', label: 'Classroom Tools', icon: '🏫' },
    { key: 'analytics', label: 'Analytics & Reports', icon: '📊' },
    { key: 'cbt', label: 'e-Exam / CBT', icon: '💻' },
  ];

  const modules = allModuleList.map(m => ({
    ...m,
    enabled: activeModules.includes(m.key),
    customSettings: allModules.find(ms => ms.module === m.key)?.settings || null,
    settingsId: allModules.find(ms => ms.module === m.key)?.id || null,
  }));

  return new Response(JSON.stringify({ modules, activeModules }), { headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const db = getDb();

  if (data.type === 'toggle_module') {
    if (!data.module) return new Response(JSON.stringify({ error: 'module is required' }), { status: 400 });
    const schoolData = db.select().from(schools).where(eq(schools.id, schoolId)).get();
    const activeModules: string[] = (schoolData?.activeModules as string[]) || ['cms', 'sis', 'lms', 'finance', 'communication'];
    const idx = activeModules.indexOf(data.module);
    if (idx >= 0 && !data.enabled) {
      activeModules.splice(idx, 1);
    } else if (idx < 0 && data.enabled) {
      activeModules.push(data.module);
    }
    db.update(schools).set({ activeModules, updatedAt: new Date() }).where(eq(schools.id, schoolId)).run();

    const existingSetting = db.select().from(moduleSettings).where(and(eq(moduleSettings.schoolId, schoolId), eq(moduleSettings.module, data.module))).get();
    if (existingSetting) {
      db.update(moduleSettings).set({ enabled: data.enabled, updatedAt: new Date() }).where(eq(moduleSettings.id, existingSetting.id)).run();
    } else {
      db.insert(moduleSettings).values({ schoolId, module: data.module, enabled: data.enabled }).returning().get();
    }

    db.insert(auditLogs).values({
      schoolId,
      userId: user.id,
      action: data.enabled ? 'module_enabled' : 'module_disabled',
      entity: 'module_settings',
      details: { module: data.module } as any,
    }).run();

    return new Response(JSON.stringify({ success: true, activeModules }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.type === 'update_member_role') {
    if (!data.memberId || !data.role) return new Response(JSON.stringify({ error: 'memberId and role are required' }), { status: 400 });
    db.update(schoolMembers).set({ role: data.role }).where(and(eq(schoolMembers.id, data.memberId), eq(schoolMembers.schoolId, schoolId))).run();

    db.insert(auditLogs).values({
      schoolId,
      userId: user.id,
      action: 'role_changed',
      entity: 'school_members',
      entityId: data.memberId,
      details: { newRole: data.role } as any,
    }).run();

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown type' }), { status: 400 });
};
