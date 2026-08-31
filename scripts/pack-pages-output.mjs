#!/usr/bin/env node
//
// Pack ischool's adapter v14 output for Cloudflare Pages.
//
// BismiLLAH Ar-Rahman Ar-Raheem.
//
// @astrojs/cloudflare v14 emits a Workers static-assets layout:
//   dist/client/                 static assets
//   dist/server/                 bundled worker (entry.mjs + chunks) + wrangler.json
//   .wrangler/deploy/config.json redirect -> dist/server/wrangler.json
//
// The Pages build deploys a Worker only from functions/ or _worker.js inside
// the output dir; the redirect target must exist AND contain
// pages_build_output_dir. Strategy:
//   1. Copy the worker into dist/client/_worker.js/ (module dir, entry renamed
//      to index.js) — Pages advanced-mode contract; env.ASSETS serves assets.
//   2. Patch dist/server/wrangler.json with pages_build_output_dir pointing at
//      dist/client so the redirect target is valid for Pages.
// Idempotent.

import { cpSync, mkdirSync, rmSync, renameSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const client = join(dist, 'client');
const server = join(dist, 'server');
const workerDir = join(client, '_worker.js');

for (const d of [client, server]) {
  if (!existsSync(d)) {
    console.error(`[pack-pages] FAIL: ${d} missing — run the astro build first.`);
    process.exit(1);
  }
}

// 1. Worker module directory inside the output dir.
rmSync(workerDir, { recursive: true, force: true });
mkdirSync(workerDir, { recursive: true });
cpSync(server, workerDir, { recursive: true });
// Pages expects the module worker entry at _worker.js/index.js.
renameSync(join(workerDir, 'entry.mjs'), join(workerDir, 'index.js'));

// 2. Replace the redirected wrangler.json with a minimal Pages-valid config.
//    The adapter-generated config carries Workers-deploy fields (kv binding
//    placeholders, ASSETS binding, ai_search/exports/etc.) that Pages rejects.
const wranglerJsonPath = join(server, 'wrangler.json');
if (existsSync(wranglerJsonPath)) {
  const pagesConfig = {
    name: process.env.CF_PAGES_PROJECT_NAME ?? 'ischool-beta',
    compatibility_date: '2024-09-23',
    compatibility_flags: ['nodejs_compat'],
    pages_build_output_dir: 'dist/client',
  };
  writeFileSync(wranglerJsonPath, JSON.stringify(pagesConfig, null, 2));
}

const count = (dir) => {
  let n = 0;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    n += statSync(p).isDirectory() ? count(p) : 1;
  }
  return n;
};

console.log(`[pack-pages] OK — output dir dist/client: ${count(client) - count(workerDir)} asset files + _worker.js (${count(workerDir)} files); redirect target patched.`);
