// bismiLLAH — ischool edge function: dashboard-bootstrap
// Port of the former SSR middleware/dashboard context for the static shell.
// Auth mode: user (lightbase JWT). Returns { user, school, memberships, stats }.
return run(async () => {
  const authId = principalAuthId();
  if (!authId) fail(401, 'Authentication required');
  const lbUser = await lightbaseUser();

  // Memberships link the lightbase user to schools (school_members docs carry
  // auth_user_id + school_id + role).
  const mres = await db.query('school_members', { filter: { field: 'auth_user_id', op: 'eq', value: authId }, limit: 100 });
  const memberships = (mres.data || []).map(m => ({ id: m.id, school_id: m.school_id, role: m.role, status: m.status || 'active' }));

  let membership = memberships.find(m => m.status === 'active') || memberships[0] || null;
  let school = null;
  if (membership && membership.school_id) {
    school = await db.get('schools', membership.school_id).catch(() => null);
  }

  const role = (membership && membership.role) || (lbUser.customFields && lbUser.customFields.role) || lbUser.role || 'member';

  // Live counts scoped to the school (dashboard overview cards).
  const stats = {};
  if (school) {
    const sid = school.id;
    const members = await db.query('school_members', { filter: { field: 'school_id', op: 'eq', value: sid }, limit: 1000 }).catch(() => ({ data: [] }));
    const staff = (members.data || []).filter(m => m.role === 'teacher' || m.role === 'staff' || m.role === 'school_admin').length;
    const one = async (col) => {
      const r = await db.query(col, { filter: { field: 'school_id', op: 'eq', value: sid }, limit: 1000 }).catch(() => null);
      return (r && (r.total !== undefined ? r.total : (r.data || []).length)) || 0;
    };
    stats.students = (await db.query('students', { filter: { field: 'school_id', op: 'eq', value: sid }, limit: 1000 }).catch(() => ({ data: [] }))).data?.length || 0;
    stats.staff = staff;
    stats.announcements = await one('announcements');
    stats.posts = await one('blog_posts');
    stats.classes = await one('classes');
    stats.programs = await one('programs');
    stats.gallery = await one('gallery_items');
    stats.faqs = await one('faqs');
    stats.applications = await one('admission_applications');
  }

  return {
    user: {
      id: lbUser.id,
      email: lbUser.email,
      name: lbUser.name || '',
      role: role,
      customFields: lbUser.customFields || {},
    },
    school: school || null,
    memberships: memberships,
    stats: school ? stats : null,
  };
});
