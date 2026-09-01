#!/usr/bin/env node
// Slate post-build stamper — recreates .catalyst/slate-config.toml inside the
// build output after every (clean) build, per the official Catalyst Slate
// guidance: clean builds delete the file because it lives inside the output.
//
// Usage: node scripts/slate-postbuild.mjs <outDir> <framework> [deploymentName]
//   outDir           build output directory (e.g. dist, .output/public)
//   framework        slate framework value: astro|react-vite|static|nextjs|vue|svelte|...
//   deploymentName   optional, default "default"
//
// Bismillah: written under the Core Working Protocol (see repo root).

import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [, , outDirArg, frameworkArg, nameArg] = process.argv;
if (!outDirArg || !frameworkArg) {
  console.error('usage: node scripts/slate-postbuild.mjs <outDir> <framework> [deploymentName]');
  process.exit(1);
}

const outDir = resolve(outDirArg);
const indexCandidates = ['index.html', 'index.htm'];
if (!existsSync(outDir) || !indexCandidates.some((f) => existsSync(join(outDir, f)))) {
  console.error(`[slate-postbuild] ERROR: ${outDir} has no index.html — static build output missing. Aborting stamp.`);
  process.exit(2);
}

const catalystDir = join(outDir, '.catalyst');
mkdirSync(catalystDir, { recursive: true });

const toml = [
  `framework = "${frameworkArg}"`,
  `deployment_name = "${nameArg || 'default'}"`,
  '',
  '[[redirects]]',
  'from = "/*"',
  'to = "/index.html"',
  'status = 200',
  '',
].join('\n');
writeFileSync(join(catalystDir, 'slate-config.toml'), toml);

// Ensure the SPA fallback file exists even if public/_redirects was absent.
const redirectsPath = join(outDir, '_redirects');
if (!existsSync(redirectsPath)) {
  writeFileSync(redirectsPath, '/* /index.html 200\n');
}

console.log(`[slate-postbuild] stamped ${join(catalystDir, 'slate-config.toml')} (framework=${frameworkArg}) and _redirects in ${outDir}`);
