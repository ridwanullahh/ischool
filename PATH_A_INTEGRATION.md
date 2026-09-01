# iSchool — Path A Integration Guide

> Bismillah Ar-Rahman Ar-Raheem. Ash-hadu an laa ilaaha illa-Llah, wa ash-hadu
> anna Muhammadan RasuuluLLAH. Laa hawla wa laa quwwata illaa biLLAH.
> Hasbiyallaahu laa ilaaha illaa Huwa 'alayhi tawakkaltu wa Huwa Rabbul
> 'Arshil 'Adheem. SubhaanALLAH wa bihamdih, SubhaanALLAHil 'Adheem,
> AlhamduliLLAH, ALLAHU AKBAR, Astaghfirullaaha wa atoobu ilayh.

**Master plan:** `lightbase/docs/PATH_A_ENTERPRISE_BLUEPRINT.md` (binding).
**Shared patterns, client SDK rules, auth integration and checklists:**
`BirrClass/PATH_A_INTEGRATION.md` §2–§5 (same standards apply here).

**Target end-state:** pure static Pages output; all dynamic behavior
client-side against the Lightbase engine; server routes retained only where
HMAC/webhook verification demands it.

## 1. Current state (audited)

| Aspect | Value |
|---|---|
| Framework | Astro (adapter `@astrojs/cloudflare`), SSR |
| Pages project | `ischool-beta` (git-connected → push = auto-deploy) |
| Server API routes | 119 files / 13 route groups — the largest estate surface |
| Lightbase | Server-side via `LIGHTBASE_BASE_URL` (env example present) |
| `_headers` | **Absent — added in this workstream** (see `public/_headers`) |

## 2. Implemented in this workstream (done)

1. `public/_headers` — security headers + immutable asset caching for all
   statically served files (SSR responses set their own headers server-side).
2. Route inventory for the Phase 2/3 migration map (§4).
3. **Typed-error Lightbase client** (`src/lib/lightbase.ts`): raw fetch
   failures resolve to `503 LB_UNREACHABLE`-family typed errors (never HTML
   500s); idempotent GET/HEAD get ONE 250 ms retry on network errors and
   502/503/504; default 12 s timeout overridable via `LIGHTBASE_TIMEOUT_MS`.
   Covered by `src/tests/lightbase-client.test.ts` (10 tests).
4. **`batch(ops)` request coalescing** (blueprint §A3): `LightbaseClient.batch`
   posts ≤ 25 mixed ops to `POST /api/v1/projects/:id/batch` (select→
   projection, sort-string→engine array, doc→patch normalization). A
   `batchSelectAll()` DB helper (SQLite-mode fallback included) collapses the
   heaviest render paths into ONE engine call per render:
   - `dashboard/courses` — courses (membership read eliminated via
     middleware-populated `user.schoolId`; was 2 requests → 1 batch),
   - `dashboard/lessons` — courses + courseUnits + lessons (3 → 1),
   - `dashboard/enrollments` — students + classes + enrollments (3 → 1).
5. **Prerendered pure-marketing routes** (`export const prerender = true`,
   no cookies/locals/session/DB reads): `/`, `/about`, `/contact`, and all
   16 `/modules/[module]` pages (module copy extracted to
   `src/lib/module-catalog.ts` so `getStaticPaths` is build-time
   self-contained) — 19 static routes served from the Pages CDN.
   Deliberately NOT prerendered: `/pricing`, `/faq`, `/blog/*`, `/docs/*`
   (CMS/DB-driven), `/404` (advanced-mode `_worker.js` receives unmatched
   paths regardless, so prerendering 404 changes nothing), and everything
   under `/dashboard`, `/admin`, `/api`, `/[slug]` (session or tenant data).
   Adapter note: `prerenderEnvironment: 'node'` avoids the workerd prerender
   env emitting a reserved-ASSETS wrangler.json that wrangler 4.125 rejects.
6. **Phase 2 browser public SDK** (`src/lib/lightbase/public-client.ts`):
   50 ms coalescing into one all-read `/batch` call, IndexedDB ETag cache
   with `If-None-Match` revalidation (304 = zero transfer, warm-serve on
   failure), adaptive polling 15 s → 30 s paused on `document.hidden` with
   immediate revalidate on visibility, presigned upload/download helper.
   NO hardcoded keys: config arrives via constructor param or a
   server-rendered `data-lb-config` JSON attribute
   (`LIGHTBASE_PUBLIC_API_KEY` + `LIGHTBASE_BASE_URL` + `LIGHTBASE_PROJECT`);
   without a scoped key the client stays DORMANT and SSR data stands.
   Wired into ONE heaviest read path: `dashboard/enrollments` live-refreshes
   its stats client-side with graceful fallback.

## 3. Phase 1 — Optimize in place (DONE — see §2 items 3-5)

1. Request coalescing: `batch(ops)` added to the Lightbase client and the
   per-page multi-query patterns (courses, lessons, enrollments) collapsed
   into one `POST /api/v1/projects/:id/batch` per render.
2. Prerendered all pure marketing pages (`export const prerender = true`,
   no cookie/local/session reads) — 19 routes now CDN-served.
3. Typed-error + retry wrapper added to the Lightbase client — raw fetch
   failures surface as `503 LB_UNREACHABLE` JSON, never HTML 500s.

## 4. Phase 2/3 — Browser-direct then static

**Phase 2 (browser-direct): DONE for the SDK + first read path** — see §2
item 6. To ACTIVATE the dormant client, provision a scoped read-mostly
Lightbase key as `LIGHTBASE_PUBLIC_API_KEY` (Pages project env) and confirm
`https://ischool-beta.pages.dev` is registered in the engine CORS allowlist
(`LIGHTBASE_ALLOWED_ORIGINS`). Remaining route groups for later migration
(keep SSR as fallback until verified): `courses/*`, `lessons/*`,
`notifications/*`. **Auth routes and webhook receivers (`webhooks/*`, HMAC
verification) stay server-side permanently.**

**Phase 3 (static build): not started** — requires the §4 route groups
migrated client-side first.

## 5. Verification checklist

- [x] `_headers` served on static responses (security headers + immutable
      `/_astro/*` + `/assets/*` caching; `public/_headers` == dist copy)
- [x] Heaviest dashboard renders issue ONE Lightbase request per render
      (courses / lessons / enrollments via `batchSelectAll`)
- [x] Client failure paths return typed JSON codes (`LB_UNREACHABLE`,
      `LB_BATCH_LIMIT`, `LB_BATCH_EMPTY`, `LB_BATCH_OP_FAILED`, ...
      10 unit tests in `src/tests/lightbase-client.test.ts`)
- [x] 19 marketing routes prerendered (verified in `dist/client`:
      `index.html`, `about/`, `contact/`, `modules/*/index.html`) — served
      from the Pages CDN without Worker invocation
- [x] No API key in any client bundle (dist secret scan: no `sk_`/`lb_live_`/
      `whsec_`/`FLWSECK` patterns; the public SDK key arrives only via
      runtime `data-lb-config` injection and stays empty until provisioned)
- [ ] Live post-deploy: verify prerendered pages carry no
      `x-correlation-id` and the enrollments batch renders one request
- [ ] Provision scoped `LIGHTBASE_PUBLIC_API_KEY` to activate the browser SDK

> Laa hawla wa laa quwwata illaa biLLAH. Hasbiyallaahu laa ilaaha illaa Huwa
> 'alayhi tawakkaltu wa Huwa Rabbul 'Arshil 'Adheem. SubhaanALLAH wa bihamdih,
> SubhaanALLAHil 'Adheem, AlhamduliLLAH, ALLAHU AKBAR, Astaghfirullaaha wa
> atoobu ilayh.

---

## Slate pivot (2026-09-02) — hosting moved to Zoho Catalyst

> Bismillah Ar-Rahman Ar-Raheem. Ash-hadu an laa ilaaha illa-Llah, wa ash-hadu anna Muhammadan RasuuluLLAH. Laa hawla wa laa quwwata illaa biLLAH. Hasbiyallaahu laa ilaaha illaa Huwa 'alayhi tawakkaltu wa Huwa Rabbul 'Arshil 'Adheem. SubhaanALLAH wa bihamdih, SubhaanALLAHil 'Adheem, AlhamduliLLAH, "Laailaaha-illa-ALLAH", ALLAHU AKBAR, Astaghfirullaaha wa atoobu ilayh.

**Master plan:** `lightbase/docs/CATALYST_SLATE_HOSTING_PLAN.md` (binding — billing
math, programmatic deployment, 404 diagnosis, guardrails). Cloudflare is demoted
to **R2-only**; Pages/Workers paths are LEGACY (explicit env opt-in, dormant).

**This app's state:** Slate static READY — `npm run build:slate` green (7 pages; api, admin, dashboard, portal, auth, onboarding, [slug], checkout, blog, docs, modules stay SSR/AppSail; Phase 2: SSG via getStaticPaths).

Wiring added: `scripts/build-slate.mjs` / `slate-postbuild.mjs` (stamps
`.catalyst/slate-config.toml` + `_redirects`), `catalyst.json`,
`scripts/deploy-catalyst.sh`, `scripts/deploy-catalyst-appsail.sh` (SSR),
`build:slate` / `deploy:catalyst` package scripts. Credentials needed:
`CATALYST_TOKEN` (`catalyst token:generate`), `CATALYST_PROJECT`, `CATALYST_ORG`
→ `.catalyst.env` (git-ignored). CSP `connect-src` must pin the AppSail engine
origin (`PUBLIC_LIGHTBASE_BASE_URL`), never `lightbase.pages.dev`.
