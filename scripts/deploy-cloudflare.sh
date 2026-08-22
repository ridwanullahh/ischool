#!/bin/bash
# iSchool Cloudflare Pages deployment script
# Usage: bash scripts/deploy-cloudflare.sh
#
# This script:
# 1. Builds the app with the Cloudflare adapter
# 2. Copies client assets to dist root (for CSS/JS paths)
# 3. Creates the _worker.js (passes env vars to process.env)
# 4. Deploys to Cloudflare Pages

set -e

echo "Building for Cloudflare Pages..."
DEPLOY_TARGET=cloudflare npx astro build

echo "Copying client assets to dist root..."
cp -r dist/client/* dist/

echo "Creating _worker.js..."
cat > dist/_worker.js << 'WORKEREOF'
let _handler = null;

export default {
  async fetch(request, env, ctx) {
    try {
      if (!_handler) {
        // Set process.env from Cloudflare env binding BEFORE importing the app
        if (env) {
          if (!globalThis.process) globalThis.process = {};
          if (!globalThis.process.env) globalThis.process.env = {};
          for (const [k, v] of Object.entries(env)) {
            if (typeof v === 'string') globalThis.process.env[k] = v;
          }
        }
        const mod = await import('./server/entry.mjs');
        _handler = mod.default;
      }
      // Re-set env vars on each request
      if (env && globalThis.process?.env) {
        for (const [k, v] of Object.entries(env)) {
          if (typeof v === 'string') globalThis.process.env[k] = v;
        }
      }
      return await _handler.fetch(request, env, ctx);
    } catch (e) {
      return new Response(JSON.stringify({error: e?.message, stack: e?.stack?.substring(0,2000)}), {status: 500, headers: {'Content-Type': 'application/json'}});
    }
  }
};
WORKEREOF

echo "Removing conflicting wrangler.json..."
rm -f dist/server/wrangler.json
rm -rf .wrangler/deploy/

echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name ischool-beta --branch main --commit-dirty

echo "Done! Live at https://ischool-beta.pages.dev"
