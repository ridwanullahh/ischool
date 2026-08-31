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

## 3. Phase 1 — Optimize in place (low risk, recommended next)

1. With 119 API files this app benefits MOST from request coalescing: add the
   `batch(ops)` helper to its Lightbase client and collapse the per-page
   multi-query patterns (courses, lessons, enrollments render paths) into one
   `POST /api/v1/projects/:id/batch` per render.
2. Prerender all public marketing pages (`export const prerender = true`
   where no cookie reads) — with the largest route surface, each prerendered
   page frees meaningful shared Workers quota.
3. Ensure every API route returns JSON on failure (never an HTML 500) — the
   BirrClass "Network error" pattern (raw fetch throw → HTML 500 → UI parse
   failure) applies to any app; harden the Lightbase client with the same
   typed-error + retry wrapper.

## 4. Phase 2/3 — Browser-direct then static

Follow `BirrClass/PATH_A_INTEGRATION.md` §4–§5 with this route map
(surfaces grouped): `auth/*`, `courses/*`, `lessons/*`, `enrollments/*`,
`users/*`, `admin/*`, `media/*`, `notifications/*`, `webhooks/*` (HMAC
receivers stay server-side). Register
`https://ischool-beta.pages.dev` (already in Lightbase
`LIGHTBASE_ALLOWED_ORIGINS`) for browser-direct calls.

## 5. Verification checklist

- [ ] `_headers` served on static responses (verify `x-content-type-options`)
- [ ] Heaviest dashboard page issues ≤ 1 Lightbase request per render (batch)
- [ ] Failure paths return JSON with typed codes
- [ ] Prerendered marketing routes served without `x-correlation-id`
- [ ] No API key in any client bundle

> Laa hawla wa laa quwwata illaa biLLAH. Hasbiyallaahu laa ilaaha illaa Huwa
> 'alayhi tawakkaltu wa Huwa Rabbul 'Arshil 'Adheem. SubhaanALLAH wa bihamdih,
> SubhaanALLAHil 'Adheem, AlhamduliLLAH, ALLAHU AKBAR, Astaghfirullaaha wa
> atoobu ilayh.
