// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { config as dotenvConfig } from 'dotenv';

// Load .env for local dev and build-time inlining
dotenvConfig();

// ZERO WORKERS POLICY (lightbase ZERO_WORKERS_AUDIT §3.2): the deployment is
// 100% static on Cloudflare Pages. Public per-school pages are PRERENDERED at
// build time from lightbase data (refresh = rebuild). The dashboard, portal,
// admin and auth surfaces are static shells whose client runtime talks to
// lightbase (Auth + REST + Edge Functions) directly. No adapter, no SSR, no
// _worker.js, no Pages Functions.
export default defineConfig({
  output: 'static',
  site: process.env.PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:4321',
  security: {
    checkOrigin: false,
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      'process.env.DB_PROVIDER': JSON.stringify(process.env.DB_PROVIDER || 'lightbase'),
      'process.env.LIGHTBASE_API_KEY': JSON.stringify(process.env.LIGHTBASE_API_KEY || ''),
      'process.env.LIGHTBASE_PROJECT': JSON.stringify(process.env.LIGHTBASE_PROJECT || 'ischool'),
      'process.env.LIGHTBASE_BASE_URL': JSON.stringify(process.env.LIGHTBASE_BASE_URL || ''),
      'process.env.LIGHTBASE_PUBLIC_API_KEY': JSON.stringify(process.env.LIGHTBASE_PUBLIC_API_KEY || ''),
      'process.env.PLATFORM_ADMINS': JSON.stringify(process.env.PLATFORM_ADMINS || ''),
      'process.env.PUBLIC_BASE_URL': JSON.stringify(process.env.PUBLIC_BASE_URL || ''),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      'process.env.SESSION_SECRET': JSON.stringify(process.env.SESSION_SECRET || 'not-used-static'),
      'process.env.ENCRYPTION_KEY': JSON.stringify(process.env.ENCRYPTION_KEY || 'not-used-static'),
      'process.env.AI_API_KEY': JSON.stringify(process.env.AI_API_KEY || ''),
      'process.env.AI_BASE_URL': JSON.stringify(process.env.AI_BASE_URL || ''),
      'process.env.AI_MODEL': JSON.stringify(process.env.AI_MODEL || ''),
    },
  },
});
