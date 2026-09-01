// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { config as dotenvConfig } from 'dotenv';

// Load .env for local dev and build-time inlining
dotenvConfig();

const USE_CLOUDFLARE = process.env.DEPLOY_TARGET === 'cloudflare' || process.env.CF_PAGES === '1';

// Read env vars and make them available at build time
const envVars = {
  'process.env.DB_PROVIDER': JSON.stringify(process.env.DB_PROVIDER || 'lightbase'),
  'process.env.LIGHTBASE_API_KEY': JSON.stringify(process.env.LIGHTBASE_API_KEY || ''),
  'process.env.LIGHTBASE_PROJECT': JSON.stringify(process.env.LIGHTBASE_PROJECT || 'ischool-beta'),
  'process.env.LIGHTBASE_BASE_URL': JSON.stringify(process.env.LIGHTBASE_BASE_URL || 'https://lightbase.pages.dev'),
  'process.env.PLATFORM_ADMINS': JSON.stringify(process.env.PLATFORM_ADMINS || 'admin@ischool.com:admin123'),
  'process.env.PUBLIC_BASE_URL': JSON.stringify(process.env.PUBLIC_BASE_URL || 'https://ischool-beta.pages.dev'),
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  'process.env.SESSION_SECRET': JSON.stringify(process.env.SESSION_SECRET || 'fallback-session-secret-change-me'),
  'process.env.ENCRYPTION_KEY': JSON.stringify(process.env.ENCRYPTION_KEY || 'fallback-encryption-key-change'),
  'process.env.AI_API_KEY': JSON.stringify(process.env.AI_API_KEY || ''),
  'process.env.AI_BASE_URL': JSON.stringify(process.env.AI_BASE_URL || ''),
  'process.env.AI_MODEL': JSON.stringify(process.env.AI_MODEL || ''),
};

let adapter;
if (USE_CLOUDFLARE) {
  const cloudflare = await import('@astrojs/cloudflare');
  adapter = cloudflare.default({
    platformProxy: { enabled: true },
    imageService: 'passthrough',
    // Path A: prerender the pure-marketing routes (index/about/contact/modules)
    // to static HTML. The adapter's default "workerd" prerender environment
    // emits a dist/server/.prerender/wrangler.json with the reserved ASSETS
    // assets binding that wrangler 4.125 rejects for Pages configs
    // ("The name 'ASSETS' is reserved in Pages projects"), failing the build
    // whenever any route is prerendered. Prerendering in the node
    // environment avoids the extra worker config entirely; the SSR worker
    // bundle below still targets workerd. These pages read no bindings,
    // cookies or locals, so node prerendering is safe.
    prerenderEnvironment: 'node',
    // Path A blueprint §2.2: advanced mode emits dist/_worker.js which the
    // Pages build auto-detects. The previous default (directory mode) produced
    // dist/server + a wrangler.json Pages rejected ("does not contain
    // pages_build_output_dir"), so NO Worker was deployed and every SSR route
    // 404'd while static assets served — observed live on ischool-beta.pages.dev.
    mode: 'advanced',
  });
} else {
  const node = await import('@astrojs/node');
  adapter = node.default({ mode: 'standalone' });
}

// Catalyst Slate pivot (docs/CATALYST_SLATE_HOSTING_PLAN.md): DEPLOY_TARGET=slate
// selects the pure static public-frontend build (no adapter). CF adapter is
// LEGACY (explicit opt-in). Node standalone remains the local/AppSail default.
const isSlateStatic =
  process.env.DEPLOY_TARGET === 'slate' || process.env.BUILD_TARGET === 'slate-static';

export default defineConfig({
  output: isSlateStatic ? 'static' : 'server',
  adapter: isSlateStatic ? undefined : adapter,
  site: process.env.PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:4321',
  security: {
    checkOrigin: false,
  },
  vite: {
    plugins: [tailwindcss()],
    define: envVars,
  },
});
