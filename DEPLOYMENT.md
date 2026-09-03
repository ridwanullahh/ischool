# Deployment Guide — iSchool (school SaaS)

> BismiLLAH Ar-Rahman Ar-Raheem. This document is the developer contract for deploying
> iSchool. It MUST stay accurate for both supported targets.

## 1. Dual-environment policy (binding)

This application must remain deployable to **two environments** at all times:

| Target | Role | Notes |
|---|---|---|
| **Cloudflare Pages (static)** | Production web tier — preferred, $0 | Pure static assets; **CF Workers are forbidden**. Any server needs beyond Pages' static serving is delegated to lightbase (Node on Catalyst AppSail). |
| **Normal Node host** (Zoho Catalyst AppSail, VPS, Docker) | Fallback / SSR tier | Same codebase, `npm run build` + `npm start` (see §3). Keeps the app portable if Pages limits change. |

Rules that keep both alive:
- No environment-specific forks. Platform branches live behind adapters/config, never `#ifdef` copies of the tree.
- ISR is disabled or minimized; static content is refreshed by rebuilds (or lightbase snapshot pages), not per-request caching.
- Secrets are never committed; all secrets flow through deploy-time env vars.

## 2. Cloudflare Pages (static) — primary web tier

- Build: `npm run build`
- Output dir: `dist/`
- Deploy (Direct Upload, preferred — does not consume the 500 builds/month CI budget):
  `npx wrangler pages deploy dist/ --project-name=ischool-beta`
- Pages **Functions** policy: Auth/API routes compile to Pages Functions where used; content routes static.
- Custom headers/redirects live in `public/_headers` / `public/_redirects` when present.
- Security headers, cache policy: static assets immutable-hash caching; `latest.json`-style
  pointers short `max-age` (see lightbase snapshot read path below).

## 3. Normal Node environment (AppSail / VPS / Docker) — fallback & SSR tier

- Build: `npm run build`
- Start: `node dist/server/entry.mjs`
- Port: `4321 / $PORT` (bind `0.0.0.0`; honor `$PORT` where the host injects one)
- Node: `20+`
- Keep the Node build green in CI-equivalent checks; a Node-only regression is a release blocker.

## 4. lightbase data plane (shared by every Birr* app)

- Host: `https://lightbase-10133292663.development.catalystappsail.com` (Catalyst AppSail, Node 22; scales to zero ~15 min after idle traffic)
- Data is owned by lightbase projects; durable state lands in Cloudflare **R2**
  (`LIGHTBASE_STORAGE_BACKEND=r2`) via lightbase's async replicator — never from app code.
- Key classes (do not mix):
  - **Root key** (`lb_live_...`, full read/write) — server-side only (SSR/API env), never in client bundles.
  - **Browser key** (read-only, minted per project) — safe for static-site client fetches.
- Env names follow `.env.example` in this repo. Common contract:
  - `LIGHTBASE_BASE_URL` — the host above
  - `LIGHTBASE_PROJECT_ID` / `LIGHTBASE_PROJECT` — this app's project id
  - `LIGHTBASE_API_KEY` — server key
  - Public read key var — repo-specific (see `.env.example`)

### Repo-specific notes

- Seeds: `npx tsx scripts/setup-lightbase.ts` (non-destructive) then `npx tsx scripts/seed-lightbase.ts`.
  NOTE: `scripts/setup-lightbase-collections.ts` DROP+RECREATEs — migration-time only, never on live data.
- Project schema needs >100 collections → raise host quota before full seed.

## 5. Hard rules for any deployment change

1. Commit messages start AND end with the full Bismillah dhikr (see `Core_Working_Protocol.md`).
2. No Cloudflare Workers anywhere in any deploy path.
3. Battle-test after every deploy (health route, one auth flow, one data read).
4. Update this file in the same commit that changes build/deploy behavior.
5. Always push to remote after committing — never leave work unpushed.

BismiLLAH Ar-Rahman Ar-Raheem. AlhamduLiLLAH.
