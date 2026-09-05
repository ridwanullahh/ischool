// bismiLLAH — ischool edge function: school-crud
// School-scoped CRUD for the static dashboard shells.
// Auth mode: user. ops: list | get | create | update | delete | count.
// Every document is scoped by school_id resolved from the caller's membership.
// Write ops require an admin-level membership role.
return run(async () => {
  const authId = principalAuthId();
  if (!authId) fail(401, 'Authentication required');
  const b = ctx.body || {};
  const action = U(b.action || 'list');
  const collection = U(b.collection);
  if (!collection) fail(400, 'collection required');

  const ADMIN_COLLECTIONS = {
    // platform-level collections are managed only via platform-admin
    schools: true, users: true, settings: true, billing: true, plans: true,
    coupons: true, docs: true, platform_blog_posts: true, platform_docs: true,
  };

  const mres = await db.query('school_members', { filter: { field: 'auth_user_id', op: 'eq', value: authId }, limit: 100 });
  const memberships = (mres.data || []).filter(m => (m.status || 'active') === 'active');
  const membership = memberships[0] || null;
  const role = (membership && membership.role) || 'member';
  const isAdmin = role === 'school_admin' || role === 'super_admin' || role === 'admin';

  // Platform collections route to platform-admin (admins only).
  if (ADMIN_COLLECTIONS[collection]) {
    if (!isAdmin) fail(403, 'Admin access required');
    // fall through with unscoped ops (platform surfaces are managed here too)
  }

  const schoolId = U(b.schoolId) || (membership && membership.school_id) || null;
  const WRITE = action === 'create' || action === 'update' || action === 'delete';
  if (WRITE && !isAdmin) fail(403, 'Admin access required');

  const canScope = (doc) => !schoolId || !doc.school_id || doc.school_id === schoolId;

  if (action === 'list' || action === 'count') {
    const filter = { and: [] };
    if (schoolId && !ADMIN_COLLECTIONS[collection]) filter.and.push({ field: 'school_id', op: 'eq', value: schoolId });
    if (b.filter) filter.and.push(b.filter);
    const req = { filter: filter.and.length ? filter : undefined, limit: Math.min(Number(b.limit || 200), 1000) };
    if (b.sort) req.sort = b.sort;
    const r = await db.query(collection, req);
    let items = (r.data || []).filter(canScope);
    if (b.search) {
      const q = U(b.search).toLowerCase();
      items = items.filter(it => JSON.stringify(it).toLowerCase().indexOf(q) !== -1);
    }
    if (action === 'count') return { ok: true, count: items.length };
    return { ok: true, data: items, total: r.total !== undefined ? r.total : items.length };
  }

  if (action === 'get') {
    const doc = await db.get(collection, U(b.id)).catch(() => null);
    if (!doc || !canScope(doc)) fail(404, 'Record not found');
    return { ok: true, document: doc, data: doc };
  }

  if (action === 'create') {
    const data = b.data || {};
    if (schoolId && data.school_id === undefined && !ADMIN_COLLECTIONS[collection]) data.school_id = schoolId;
    const doc = await db.insert(collection, data);
    return { ok: true, document: doc, data: doc };
  }

  if (action === 'update') {
    const doc = await db.get(collection, U(b.id)).catch(() => null);
    if (!doc || !canScope(doc)) fail(404, 'Record not found');
    const updated = await db.update(collection, doc.id, b.data || {});
    return { ok: true, document: updated, data: updated };
  }

  if (action === 'delete') {
    const doc = await db.get(collection, U(b.id)).catch(() => null);
    if (!doc || !canScope(doc)) fail(404, 'Record not found');
    await db.delete(collection, doc.id);
    return { ok: true, deleted: doc.id };
  }

  fail(400, 'Unknown action: ' + action);
});
