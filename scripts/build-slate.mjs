#!/usr/bin/env node
// Generic Slate static build for Astro SSR apps (Catalyst Slate pivot).
//
// Temporarily relocates SSR-only page trees (engine API routes, dashboards,
// portals, dynamic user-site routes) out of src/pages so `astro build` in
// static mode emits the PUBLIC frontend for Slate. try/finally always
// restores the tree. Stamps .catalyst/slate-config.toml + _redirects.
//
// Per-app scope: edit the RELOCATE list below.
// Bismillah: written under the Core Working Protocol (see repo root).

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

// === Per-app scope (edit here) =============================================
const RELOCATE = [
  'api', // engine/server endpoints -> AppSail + Lightbase engine
  'admin', 'dashboard', 'portal', 'auth', 'onboarding', // SSR app surfaces
  '[slug]', // per-tenant user sites (SSR per request)
  'checkout.astro', // payment flow — server-rendered on AppSail
  'blog', 'docs', 'modules', // Phase 2: SSG via build-time Lightbase fetch
];
// ===========================================================================

const root = resolve(process.cwd());
const pagesDir = join(root, 'src', 'pages');
const stashDir = join(root, '.slate-stash');

function moveToStash() {
  rmSync(stashDir, { recursive: true, force: true });
  mkdirSync(stashDir, { recursive: true });
  const moved = [];
  for (const entry of RELOCATE) {
    const from = join(pagesDir, entry);
    if (existsSync(from)) {
      renameSync(from, join(stashDir, entry.replaceAll('/', '__')));
      moved.push(entry);
    }
  }
  return moved;
}

function restore(moved) {
  for (const entry of moved) {
    const to = join(pagesDir, entry);
    if (!existsSync(to)) renameSync(join(stashDir, entry.replaceAll('/', '__')), to);
  }
  rmSync(stashDir, { recursive: true, force: true });
}

const moved = moveToStash();
let result;
try {
  result = spawnSync('npx', ['astro', 'build'], {
    stdio: 'inherit',
    env: { ...process.env, BUILD_TARGET: 'slate-static', DEPLOY_TARGET: 'slate' },
    shell: process.platform === 'win32',
  });
} finally {
  restore(moved);
  console.log(`[build-slate] restored ${moved.length} dynamic surface(s) into src/pages`);
}

if (result && result.status !== 0) {
  console.error('[build-slate] static build FAILED — dynamic surfaces restored, repo intact.');
  process.exit(result.status ?? 1);
}

const stamp = spawnSync('node', ['scripts/slate-postbuild.mjs', 'dist', 'astro'], { stdio: 'inherit' });
process.exit(stamp.status ?? 0);
