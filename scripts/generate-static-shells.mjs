#!/usr/bin/env node
//
// One-time static-shell generator (Task 4 — zero CF Workers migration).
//
// Replaces the SSR dashboard / portal / admin page trees with PRERENDERED
// static shells. Each generated shell renders the same chrome (layout) plus
// a generic client-side workspace that loads its data from lightbase via
// /js/lb-runtime.js (Auth + Edge Functions). The original SSR page sources
// were removed in the same commit this output was generated; git history
// preserves them and DEPLOYMENT.md documents the mapping.
//
// Usage: node scripts/generate-static-shells.mjs
// Bismillah — written under the Core Working Protocol.

import { readFileSync, writeFileSync, readdirSync, statSync, rmSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const root = process.cwd();
const pagesDir = join(root, 'src', 'pages');

// route -> lightbase collection (route key is the path after the section)
const COLLECTION_MAP = {
  'announcements': 'announcements',
  'blog': 'blog_posts',
  'classes': 'classes',
  'programs': 'programs',
  'faqs': 'faqs',
  'forms': 'forms',
  'gallery': 'gallery_items',
  'banners': 'banners',
  'popups': 'popups',
  'contacts': 'contact_info',
  'students': 'students',
  'staff': 'staff',
  'admissions': 'admission_periods',
  'applications': 'admission_applications',
  'events': 'events',
  'fees': 'fees',
  'invoices': 'invoices',
  'payments': 'payments',
  'attendance': 'attendance',
  'exams': 'exams',
  'courses': 'courses',
  'lessons': 'lessons',
  'assignments': 'assignments',
  'quizzes': 'quizzes',
  'timetable': 'timetable',
  'enrollments': 'enrollments',
  'venues': 'venues',
  'suppliers': 'suppliers',
  'inventory': 'inventory',
  'stock': 'stock',
  'library': 'library_books',
  'transport': 'transport_routes',
  'hostel': 'hostels',
  'payroll': 'payroll_runs',
  'messages': 'messages',
  'notifications': 'notifications',
  'tickets': 'support_tickets',
  'discussions': 'discussion_boards',
  'webhooks': 'webhook_endpoints',
  'question-bank': 'question_bank',
  'report-cards': 'report_cards',
  'grades': 'grades',
  'marks': 'marks',
  'live-classes': 'live_classes',
  'substitutes': 'substitutes',
  'leave': 'leave_requests',
  'recruitment': 'job_postings',
};

function collectionFor(relNoExt) {
  const segs = relNoExt.split('/');
  for (let i = segs.length - 1; i >= 0; i--) {
    if (COLLECTION_MAP[segs[i]]) return COLLECTION_MAP[segs[i]];
  }
  return COLLECTION_MAP[segs[0]] || segs[0];
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (entry.endsWith('.astro')) acc.push(p);
  }
  return acc;
}

// Flatten a route: drop `index`, map `[id]/edit` -> `edit`, `[id]` -> `detail`.
function flattenRoute(relNoExt) {
  const segs = relNoExt.split('/');
  const out = [];
  for (const seg of segs) {
    if (seg === 'index') continue;
    if (/^\[.+\]$/.test(seg)) {
      const last = out[out.length - 1];
      if (last === 'edit' || last === 'detail') continue; // nested dynamic -> flat
      // e.g. students/[id] -> students/detail ; X/[id]/edit handled by next seg
      out.push('__DYNAMIC__');
      continue;
    }
    out.push(seg);
  }
  // resolve __DYNAMIC__ markers using the segment that follows
  const resolved = [];
  for (let i = 0; i < out.length; i++) {
    if (out[i] === '__DYNAMIC__') {
      const next = out[i + 1];
      if (next === 'edit' || next === 'detail' || next === 'submissions') continue; // [id]/edit -> edit
      resolved.push('detail');
    } else resolved.push(out[i]);
  }
  // collapse consecutive duplicate 'detail' segments (…/[a]/[b]/index -> detail once)
  const collapsed = [];
  for (const seg of resolved) {
    if (collapsed.length && collapsed[collapsed.length - 1] === seg && seg === 'detail') continue;
    collapsed.push(seg);
  }
  return collapsed;
}

function roleGateFor(relNoExt, section) {
  if (section === 'admin') return "roles: ['super_admin'], ";
  if (section === 'portal') {
    const sub = relNoExt.split('/')[0];
    if (sub === 'student') return "roles: ['student', 'school_admin', 'super_admin'], ";
    if (sub === 'teacher') return "roles: ['teacher', 'school_admin', 'super_admin'], ";
    if (sub === 'parent') return "roles: ['parent', 'school_admin', 'super_admin'], ";
    return "roles: ['student', 'teacher', 'parent', 'school_admin', 'super_admin'], ";
  }
  return "roles: ['school_admin', 'super_admin'], ";
}

function shellContent({ layoutImport, layoutTag, title, mode, collection, roles, banner = true }) {
  const bannerLine = banner ? '\n  <div id="lb-shell-banner" class="hidden"></div>' : '';
  return `---
${layoutImport}
// Static shell (zero-workers deployment): rendered at build time; the
// workspace below loads live data client-side from lightbase via
// /js/lb-runtime.js. Former SSR data-fetching page removed — see DEPLOYMENT.md.
---
${layoutTag}${bannerLine}
  <div id="lb-workspace"></div>
${layoutTag.endsWith('</DashboardLayout>') ? '' : ''}
<script is:inline define:vars={{ shellMode: ${JSON.stringify(mode)}, shellCollection: ${JSON.stringify(collection)}, shellTitle: ${JSON.stringify(title)}, shellRoles: ${JSON.stringify(roles)} }}>
  window.LB_SHELL = { mode: shellMode, collection: shellCollection, title: shellTitle, roles: shellRoles };
</script>
<script>
  // hoist roles from LB_SHELL into workspace gating (runtime reads LB_SHELL)
</script>
`;
}

const sections = ['dashboard', 'portal', 'admin'];
let generated = 0;
let removed = 0;

for (const section of sections) {
  const sectionDir = join(pagesDir, section);
  if (!existsSync(sectionDir)) continue;
  const files = walk(sectionDir);

  for (const file of files) {
    const rel = relative(pagesDir, file).replace(/\\/g, '/'); // dashboard/announcements.astro
    const relNoExt = rel.slice(section.length + 1, -'.astro'.length); // announcements
    const flat = flattenRoute(relNoExt); // announcements | X/edit | X/detail
    const flatRelNoExt = flat.join('/');
    const outRel = `${section}/${flatRelNoExt}.astro`;
    const depth = outRel.split('/').length - 1; // layouts relative depth
    const dots = '../'.repeat(depth);

    let layoutImport;
    let layoutTag;
    let mode;
    let collection;
    let title;

    const baseName = flat[flat.length - 1];
    if (section === 'dashboard') {
      layoutImport = `import DashboardLayout from '${dots}layouts/DashboardLayout.astro';`;
      if (relNoExt === 'index') {
        mode = 'stats';
        title = 'Dashboard';
        collection = '';
      } else if (baseName === 'new') {
        mode = 'create';
      } else if (baseName === 'edit') {
        mode = 'edit';
      } else if (baseName === 'detail') {
        mode = 'detail';
      } else {
        mode = 'list';
      }
      collection = mode === 'stats' ? '' : collectionFor(relNoExt);
      title = relNoExt === 'index' ? 'Dashboard' : (flatRelNoExt.replace(/\//g, ' - ').replace(/\b\w/g, (c) => c.toUpperCase()));
      const open = `<DashboardLayout title="${title} - iSchool">`;
      const close = '</DashboardLayout>';
      layoutTag = open;
      const roles = roleGateFor(relNoExt, section);
      const content = `---
${layoutImport}
// Static shell (zero-workers deployment): rendered at build time; the
// workspace below loads live data client-side from lightbase via
// /js/lb-runtime.js. Former SSR page removed — see DEPLOYMENT.md.
---
${open}
  <div id="lb-shell-banner" class="hidden"></div>
  <div id="lb-workspace"></div>
${close}
<script is:inline define:vars={{ shellMode: ${JSON.stringify(mode)}, shellCollection: ${JSON.stringify(collection)}, shellTitle: ${JSON.stringify(title)}, shellRoles: ${JSON.stringify(roles.replace(/,$/, '').trim())} }}>
  window.LB_SHELL = { mode: shellMode, collection: shellCollection, title: shellTitle, roles: shellRoles.split(',').map(function (s) { return s.trim(); }) };
</script>
`;
      const outPath = join(pagesDir, outRel);
      if (outPath !== file && existsSync(outPath)) {
        // collision (e.g. an original page already sits at the flat path and
        // it is an SSR page that will itself be replaced) — it will be
        // overwritten when its own turn comes; safe because every original
        // file in this section is removed in this pass.
      }
      rmSync(file);
      writeFileSync(outPath, content);
      generated++;
      continue;
    }

    if (section === 'portal') {
      if (relNoExt === 'index') { mode = 'portal'; title = 'Portal'; }
      else if (baseName === 'new') mode = 'create';
      else if (baseName === 'edit') mode = 'edit';
      else if (baseName === 'detail') mode = 'detail';
      else mode = 'portal';
      collection = mode === 'portal' ? '' : collectionFor(relNoExt);
      title = 'Portal - ' + relNoExt.replace(/\//g, ' - ').replace(/\b\w/g, (c) => c.toUpperCase());
      const open = `<PortalShell title="${title}">`;
      const close = '</PortalShell>';
      const roles = roleGateFor(relNoExt, section).replace(/,$/, '').trim();
      const content = `---
import PortalShell from '${dots}layouts/PortalShell.astro';
// Static shell (zero-workers deployment) — data via lightbase client runtime.
---
${open}
  <div id="lb-shell-banner" class="hidden"></div>
  <div id="lb-workspace"></div>
${close}
<script is:inline define:vars={{ shellMode: ${JSON.stringify(mode)}, shellCollection: ${JSON.stringify(collection)}, shellTitle: ${JSON.stringify(title)}, shellRoles: ${JSON.stringify(roles)} }}>
  window.LB_SHELL = { mode: shellMode, collection: shellCollection, title: shellTitle, roles: shellRoles.split(',').map(function (s) { return s.trim(); }) };
</script>
`;
      const outPath = join(pagesDir, outRel);
      rmSync(file);
      writeFileSync(outPath, content);
      generated++;
      continue;
    }

    // admin
    if (relNoExt === 'index') { mode = 'admin-overview'; title = 'Platform Admin'; }
    else if (baseName === 'new') mode = 'admin-create';
    else if (baseName === 'edit') mode = 'admin-edit';
    else if (baseName === 'detail') mode = 'admin-detail';
    else mode = 'admin-list';
    collection = collectionFor(relNoExt);
    title = 'Platform Admin - ' + relNoExt.replace(/\//g, ' - ').replace(/\b\w/g, (c) => c.toUpperCase());
    const open = `<AdminLayout title="${title}">`;
    const close = '</AdminLayout>';
    const roles = roleGateFor(relNoExt, section).replace(/,$/, '').trim();
    const content = `---
import AdminLayout from '${dots}layouts/AdminLayout.astro';
// Static shell (zero-workers deployment) — data via the platform-admin
// lightbase Edge Function through /js/lb-runtime.js.
---
${open}
  <div id="lb-shell-banner" class="hidden"></div>
  <div id="lb-workspace"></div>
${close}
<script is:inline define:vars={{ shellMode: ${JSON.stringify(mode)}, shellCollection: ${JSON.stringify(collection)}, shellTitle: ${JSON.stringify(title)}, shellRoles: ${JSON.stringify(roles)} }}>
  window.LB_SHELL = { mode: shellMode, collection: shellCollection, title: shellTitle, roles: shellRoles.split(',').map(function (s) { return s.trim(); }) };
</script>
`;
    const outPath = join(pagesDir, outRel);
    rmSync(file);
    writeFileSync(outPath, content);
    generated++;
  }
}

console.log(`[static-shells] generated ${generated} shell(s); original SSR pages removed.`);
