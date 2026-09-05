// bismiLLAH — ischool edge-function shared prelude (prepended at deploy).
'use strict';
const nowIso = () => new Date().toISOString();
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const U = (s) => String(s == null ? '' : s);

function principalAuthId() {
  const p = ctx.principal;
  if (!p || !p.keyId) return null;
  const k = String(p.keyId);
  return k.startsWith('user:') ? k.slice(5) : null;
}

// Canonical lightbase user via /auth/me (the invoke route forwards the
// caller's Authorization header into ctx.headers).
async function lightbaseUser() {
  const auth = U(ctx.headers && (ctx.headers['authorization'] || ctx.headers['Authorization']));
  if (!auth) fail(401, 'Authentication required');
  const res = await fetch((ctx.env && ctx.env.LIGHTBASE_URL ? U(ctx.env.LIGHTBASE_URL).replace(/\/+$/, '') : '') + '/api/v1/auth/me?project=' + encodeURIComponent(ctx.projectId), {
    headers: { Authorization: auth },
  });
  if (!res.ok) fail(401, 'Invalid or expired session');
  const data = await res.json();
  return (data && data.user) ? data.user : data;
}

const one = async (col, filter) => {
  const r = await db.query(col, { filter, limit: 1 });
  return (r.data || [])[0] || null;
};

// Wrap the handler: HttpError -> raw JSON response with the right status.
const run = async (fn) => {
  try {
    return await fn();
  } catch (e) {
    const status = (e instanceof HttpError && e.status) || 500;
    const message = (e && e.message) || 'Internal error';
    if (status >= 500) console.error('[fn-error]', message);
    return { __response: { status, headers: { 'content-type': 'application/json' }, body: { ok: false, message } } };
  }
};
