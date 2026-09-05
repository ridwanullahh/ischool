// bismiLLAH — ischool edge function: platform-admin
// Platform admin workspaces for the static admin shells.
// Auth mode: user; every op verifies the caller is a platform admin
// (lightbase user role/admin scope or PLATFORM_ADMINS membership doc).
return run(async () => {
  const authId = principalAuthId();
  if (!authId) fail(401, 'Authentication required');
  const lbUser = await lightbaseUser();
  const isAdmin = lbUser.role === 'admin' || lbUser.role === 'super_admin' ||
    (lbUser.customFields && (lbUser.customFields.role === 'super_admin' || lbUser.customFields.role === 'platform_admin'));
  if (!isAdmin) fail(403, 'Platform admin access required');

  const b = ctx.body || {};
  const action = U(b.action || 'overview');

  if (action === 'overview') {
    const countAll = async (col) => {
      try {
        const r = await db.query(col, { limit: 1 });
        return (r && (r.total !== undefined ? r.total : (r.data || []).length)) || 0;
      } catch { return 0; } // collection not provisioned yet
    };
    return {
      ok: true,
      schools: await countAll('schools'),
      users: await countAll('school_members'),
      plans: await countAll('billing_plans'),
      coupons: await countAll('coupons'),
      posts: await countAll('platform_blog_posts'),
      docs: await countAll('platform_docs'),
    };
  }

  // Generic platform CRUD: action create|update|delete on {collection,id,data}
  const PLATFORM_COLLECTIONS = ['schools', 'platform_blog_posts', 'platform_docs', 'billing_plans', 'coupons', 'school_members'];
  if (['create', 'update', 'delete', 'get', 'list'].indexOf(action) !== -1) {
    const collection = U(b.collection);
    if (PLATFORM_COLLECTIONS.indexOf(collection) === -1) fail(400, 'collection not platform-manageable: ' + collection);
    if (action === 'list') {
      const r = await db.query(collection, { limit: Math.min(Number(b.limit || 200), 1000) });
      return { ok: true, data: r.data || [] };
    }
    if (action === 'get') {
      const doc = await db.get(collection, U(b.id)).catch(() => null);
      if (!doc) fail(404, 'Record not found');
      return { ok: true, document: doc, data: doc };
    }
    if (action === 'create') {
      const doc = await db.insert(collection, b.data || {});
      return { ok: true, document: doc, data: doc };
    }
    if (action === 'update') {
      const updated = await db.update(collection, U(b.id), b.data || {});
      return { ok: true, document: updated, data: updated };
    }
    if (action === 'delete') {
      await db.delete(collection, U(b.id));
      return { ok: true, deleted: U(b.id) };
    }
  }

  fail(400, 'Unknown action: ' + action);
});
