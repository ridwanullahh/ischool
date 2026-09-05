// bismiLLAH Ar-Rahman Ar-Raheem
// Kaatib.AI — Lightbase Edge Functions deploy script.
//
// Registers every lightbase-functions/*.js on a lightbase project:
//   - `_prelude.js` is NOT deployed on its own; it is PREPENDED to every
//     function source so all functions share the same helpers.
//   - Auth modes are read from each file's `Auth mode: <mode>` header
//     comment (default `user`).
//   - Function env vars are merged from --env-file (JSON) + CLI flags so
//     secrets (uploads storage key, AI keys) never live in the source.
//
// Idempotent: existing functions are UPDATED (source/env/auth), missing ones
// are CREATED. Use --prune to delete functions not present in the directory.
//
// Usage:
//   LIGHTBASE_BASE_URL=http://localhost:4400 \
//   LIGHTBASE_PROJECT=kaatibai \
//   LIGHTBASE_API_KEY=lb_live_... \
//   node scripts/lightbase-functions-deploy.mjs \
//     [--env-file scripts/lightbase-functions.env.json] \
//     [--env LB_STORAGE_KEY=lb_live_... --env LIGHTBASE_URL=https://...] \
//     [--prune]

const fs = require('node:fs');
const path = require('node:path');

const BASE = (process.env.LIGHTBASE_BASE_URL || 'http://localhost:4400').replace(/\/+$/, '');
const PROJECT = process.env.LIGHTBASE_PROJECT || 'ischool';
const KEY = process.env.LIGHTBASE_API_KEY || '';
const FUNCTIONS_DIR = path.resolve(__dirname, '..', 'edge-functions');

if (!KEY) {
  console.error('LIGHTBASE_API_KEY (admin/root key) is required.');
  process.exit(1);
}

// ---- CLI args ----
const argv = process.argv.slice(2);
let envFile = null;
let prune = false;
const envOverrides = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--env-file') envFile = argv[++i];
  else if (argv[i] === '--prune') prune = true;
  else if (argv[i] === '--env') {
    const kv = argv[++i] || '';
    const eq = kv.indexOf('=');
    if (eq > 0) envOverrides[kv.slice(0, eq)] = kv.slice(eq + 1);
  }
}

const envVars = {};
if (envFile && fs.existsSync(envFile)) {
  Object.assign(envVars, JSON.parse(fs.readFileSync(envFile, 'utf8')));
}
Object.assign(envVars, envOverrides);

const H = { apikey: KEY, 'x-lightbase-project': PROJECT, 'Content-Type': 'application/json' };

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: H,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function authModeOf(source) {
  const m = source.match(/Auth mode:\s*(public|user|project)/i);
  return m ? m[1].toLowerCase() : 'user';
}

async function main() {
  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.error(`functions dir not found: ${FUNCTIONS_DIR}`);
    process.exit(1);
  }
  const preludePath = path.join(FUNCTIONS_DIR, '_prelude.js');
  const prelude = fs.existsSync(preludePath) ? fs.readFileSync(preludePath, 'utf8') : '';

  const files = fs.readdirSync(FUNCTIONS_DIR)
    .filter((f) => f.endsWith('.js') && f !== '_prelude.js')
    .map((f) => path.basename(f, '.js'))
    .filter((name) => /^[a-z0-9][a-z0-9-]{0,62}$/.test(name));

  if (files.length === 0) {
    console.error('no function files found');
    process.exit(1);
  }

  // Existing functions (for update-vs-create + prune).
  const list = await req('GET', `/api/v1/projects/${PROJECT}/functions`);
  const existing = new Set(
    list.status === 200 && Array.isArray(list.data && list.data.functions)
      ? list.data.functions
      : [],
  );

  let created = 0;
  let updated = 0;
  for (const name of files) {
    const raw = fs.readFileSync(path.join(FUNCTIONS_DIR, `${name}.js`), 'utf8');
    const source = (prelude ? prelude + '\n\n' : '') + raw;
    if (source.length > 65536) {
      console.error(`  ! ${name}: source exceeds 65536 chars (${source.length}) — SKIPPED`);
      continue;
    }
    const auth = authModeOf(raw);
    const payload = {
      name,
      source,
      auth,
      ...(Object.keys(envVars).length ? { env: envVars } : {}),
      description: `iSchool ${name} (deployed ${new Date().toISOString()})`,
    };
    if (existing.has(name)) {
      const r = await req('PUT', `/api/v1/projects/${PROJECT}/functions/${name}`, payload);
      if (r.status === 200) { updated++; console.log(`  ~ ${name} (${auth}) updated`); }
      else console.error(`  ! ${name} update failed: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
    } else {
      const r = await req('POST', `/api/v1/projects/${PROJECT}/functions`, payload);
      if (r.status === 201) { created++; console.log(`  + ${name} (${auth}) created`); }
      else console.error(`  ! ${name} create failed: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
    }
  }

  if (prune) {
    for (const name of existing) {
      if (!files.includes(name)) {
        const r = await req('DELETE', `/api/v1/projects/${PROJECT}/functions/${name}`);
        if (r.status === 200 || r.status === 404) console.log(`  - ${name} pruned`);
        else console.error(`  ! ${name} prune failed: ${r.status}`);
      }
    }
  }

  console.log(`Done. created=${created} updated=${updated} total=${files.length}`);
  if (!existing.size && !created) process.exit(1);
}

main().catch((e) => {
  console.error(e && e.message ? e.message : String(e));
  process.exit(1);
});
