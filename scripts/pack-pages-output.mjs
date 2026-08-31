#!/usr/bin/env node
//
// Pack ischool's adapter v14 output into the Cloudflare Pages advanced-mode
// layout.
//
// BismiLLAH Ar-Rahman Ar-Raheem.
//
// @astrojs/cloudflare v14 emits a Workers static-assets layout:
//   dist/client/   static assets
//   dist/server/   bundled worker (entry.mjs + chunks) + wrangler.json
// The Pages git build requires the v9-era advanced-mode layout instead:
//   dist/<assets at root>
//   dist/_worker.js/index.js   module worker entry
// Without it, the Pages build skips the Worker entirely ("No functions dir
// found") and every SSR route 404s while static assets still serve — the
// exact breakage observed live on ischool-beta.pages.dev.
//
// This script rearranges dist into the Pages layout. Idempotent.

import { cpSync, mkdirSync, rmSync, renameSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const client = join(dist, 'client');
const server = join(dist, 'server');
const workerDir = join(dist, '_worker.js');

for (const d of [client, server]) {
  if (!existsSync(d)) {
    console.error(`[pack-pages] FAIL: ${d} missing — run the astro build first.`);
    process.exit(1);
  }
}

// 1. Hoist static assets to dist root.
cpSync(client, dist, { recursive: true });

// 2. Build the module worker directory.
rmSync(workerDir, { recursive: true, force: true });
mkdirSync(workerDir, { recursive: true });
cpSync(server, workerDir, { recursive: true });
// Pages expects the module worker entry at _worker.js/index.js.
renameSync(join(workerDir, 'entry.mjs'), join(workerDir, 'index.js'));

// 3. Remove the now-duplicated adapter dirs so they are not uploaded as
//    public asset paths (/client/..., /server/...).
rmSync(client, { recursive: true, force: true });
rmSync(server, { recursive: true, force: true });

const count = (dir) => {
  let n = 0;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    n += statSync(p).isDirectory() ? count(p) : 1;
  }
  return n;
};

console.log(`[pack-pages] OK — assets at dist root (${count(dist) - count(workerDir)} files) + _worker.js (${count(workerDir)} files).`);
