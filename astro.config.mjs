// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site: process.env.PUBLIC_BASE_URL || 'http://localhost:4321',
  security: {
    // SameSite=Lax cookies (set in auth.ts) provide CSRF protection against
    // cross-site form submissions. checkOrigin is disabled because the app
    // may be deployed behind reverse proxies where the Origin header
    // doesn't match the configured site URL, causing false positives that
    // block legitimate auth and form submissions.
    checkOrigin: false,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
