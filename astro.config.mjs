// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

const allowCrossOrigin = process.env.ALLOW_CROSS_ORIGIN === 'true';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  security: {
    checkOrigin: !allowCrossOrigin,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: true,
    },
  },
});
