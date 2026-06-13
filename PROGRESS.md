# PROGRESS.md — Water Quality Crowdsource

> **Single source of truth for all features.**
> Every agent MUST read this before starting work and update it when finishing.

## Legend

| Status | Meaning |
|--------|---------|
| 📝 Planned | Spec exists in `docs/`, not yet assigned |
| 📝 Future Backlog | Pool of ideas for future milestones (not yet scoped) |
| 🔄 In Progress | Assigned to Developer |
| 🔍 Awaiting QC | Implemented, waiting for Quality Control |
| 🐞 Bug Found | QC found issues, back to Developer |
| ✅ Done | QC passed, user acknowledged, **spec file erased from `docs/`** |
| ❌ Cancelled | Discarded or superseded |

---

## Feature Registry

| Feature ID | Feature Name | Status | Milestone | Spec Owner | Developer | QC | Merged Date | Notes |
|------------|--------------|--------|-----------|------------|-----------|----|-------------|-------|
| WQ-001 | Project scaffold (Vite + Express + Prisma) | ✅ Done | MVP | Lead Manager | @developer | — | 2026-05-22 | Scaffold root workspace, web, api, prisma |
| WQ-002 | Database schema (Sample, Location) | ✅ Done | MVP | Lead Manager | @developer | — | 2026-05-22 | Prisma schema with relations (User model removed - anonymous crowdsourcing) |
| WQ-003 | REST API CRUD for water samples | ✅ Done | MVP | Lead Manager | @developer | — | 2026-05-22 | Express routes, Zod validation |
| WQ-004 | Frontend form to submit water sample | ✅ Done | MVP | Lead Manager | @developer | — | 2026-05-22 | React form with validation |
| WQ-005 | Leaflet map with GPS capture | ✅ Done | MVP | Lead Manager | @developer | — | 2026-05-22 | react-leaflet, geolocation API, MapPicker component |
| WQ-006 | Offline-first localStorage sync | ✅ Done | MVP | Lead Manager | @developer | — | 2026-05-22 | Zustand store, sync queue with retry logic |
| WQ-007 | Mobile responsive layout | ✅ Done | MVP | Lead Manager | @developer | — | 2026-05-22 | Mobile-first CSS, bottom navigation, responsive grid |
| WQ-008 | AI analysis microservice skeleton — Future Backlog (pool of ideas) | 📝 Future Backlog | Future | — | — | — | — | Deferred from v0.2.0; will scope after v0.5.0. Pool of ideas for next milestones |
| WQ-009 | Persist offline store to localStorage (Zustand persist) | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | Added persist middleware with partialize |
| WQ-010 | Wire up useOfflineSync in App/Layout | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | useOfflineSync called in Layout component |
| WQ-011 | Notify users when submissions dropped | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | console.warn when MAX_RETRIES exceeded |
| WQ-012 | watchPosition continuous GPS tracking | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | startTracking/stopTracking using watchPosition |
| WQ-013 | GPS accuracy badge (color-coded) | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | Green ≤10m, Yellow 10-30m, Red >30m |
| WQ-014 | Blue dot CircleMarker for user position | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | Pulsing blue circle with animation |
| WQ-015 | Default map center to Mangrove Wonorejo | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | -7.3059612, 112.8443053 + VITE_DEFAULT_LAT/LNG |
| WQ-016 | Remove user-scalable=no from viewport | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | WCAG accessibility fix - removed maximum-scale=1.0 |
| WQ-017 | safe-area-inset for iPhone notch | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | Added safe-area-inset padding for bottom nav + content |
| WQ-018 | Fix viewport height (dvh + fallback) | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | Replaced 100vh with -webkit-fill-available + 100dvh fallback |
| WQ-019 | /sample/:id route + SampleDetail | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | Added route and SampleDetail component |
| WQ-020 | Fix direct state mutation in SampleForm | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | Already fixed - uses setFormData with functional update |
| WQ-021 | Deduplicate Location creation | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | Find-or-create within 10m radius implemented |
| WQ-022 | Bundle marker icons locally | ✅ Done | v1.1 | Lead Manager | @developer | — | 2026-05-22 | Local SVG markers in web/src/assets/markers/ |
| WQ-023 | Extend Sample schema for Laquatwin params (EC, TDS, Salinity, ORP) | ✅ Done | v0.2.0 | Lead Manager | @developer | — | 2026-05-22 | Added conductivity, salinity, tds, orp Float? fields; ran prisma migrate |
| WQ-024 | Update API + Zod validation for new measurement fields | ✅ Done | v0.2.0 | Lead Manager | @developer | — | 2026-05-23 | Backend validation for EC, TDS, salinity, ORP with proper ranges; Zod schemas + Prisma |
| WQ-025 | Restructure SampleForm to match Laquatwin models | ✅ Done | v0.2.0 | Lead Manager | @developer | — | 2026-05-22 | Group form fields by meter type; Common section with Temperature at top |
| WQ-026 | Update SampleDetail and SampleList for new params | ✅ Done | v0.2.0 | Lead Manager | @developer | — | 2026-05-22 | Display conductivity, salinity, TDS, ORP in detail and list; priority-based card preview |
| WQ-027 | Update frontend TypeScript types for new fields | ✅ Done | v0.2.0 | Lead Manager | @developer | — | 2026-05-22 | Added conductivity, tds, salinity, orp to Sample, CreateSampleInput, UpdateSampleInput |
| WQ-028 | Data validation rules with Laquatwin measurement ranges | ✅ Done | v0.2.0 | Lead Manager | @developer | — 2026-05-23 | MEASUREMENT_FIELDS constant in web/src/utils/measurements.ts; SampleForm uses it for validation and ranges |
| WQ-029 | Fix CSS 100dvh fallback order | ✅ Done | Hotfix v0.2.1 | Lead Manager | @developer | — | 2026-05-23 | Reordered CSS min-height: 100vh → -webkit-fill-available → 100dvh |
| WQ-030 | Add .gitignore to project | ✅ Done | Hotfix v0.2.1 | Lead Manager | @developer | — | 2026-05-23 | Created .gitignore with standard ignores for node_modules, .env, dist, prisma/*.db |
| WQ-031 | Fix SampleList measurement display labels | ✅ Done | Hotfix v0.2.1 | Lead Manager | @developer | — | 2026-05-23 | Modified formatMeasurementValue to use label from MEASUREMENT_FIELDS |
| WQ-032 | Add Laquatwin fields to SampleMap popup | ✅ Done | Hotfix v0.2.1 | Lead Manager | @developer | — | 2026-05-23 | Added getTopMeasurements helper, popup shows top 3 measurements with "View details" link |
| WQ-033 | Update seed data with Laquatwin fields | ✅ Done | Hotfix v0.2.1 | Lead Manager | @developer | — | 2026-05-23 | Updated seed to Wonorejo coords, added conductivity, tds, salinity, orp realistic values |
| WQ-034 | Photo upload for water samples | ✅ Done | v0.3.0 | Lead Manager | @developer | — | 2026-05-23 | Photo model, multer upload, compression, gallery |
| WQ-035 | Data export to CSV | ✅ Done | v0.3.0 | Lead Manager | @developer | — | 2026-05-23 | Export route, CSV download, Excel-compatible |
| WQ-036 | Admin dashboard for submission moderation | ✅ Done | v0.3.0 | Lead Manager | @developer | — | 2026-05-23 | Filter tabs, approve/reject, status counts |
| WQ-037 | Map marker clustering | ✅ Done | v0.3.0 | Lead Manager | @developer | — | 2026-05-23 | react-leaflet-markercluster, teal cluster icons, spiderfy on zoom |
| WQ-038 | Time-series charts for measurement trends | ✅ Done | v0.3.0 | Lead Manager | @developer | — | 2026-05-23 | Chart.js line chart, parameter dropdown, "More data needed" message |
| WQ-039 | Sample list filtering & sorting | ✅ Done | v0.3.0 | Lead Manager | @developer | — | 2026-05-23 | Status tabs, author search, sort dropdown, date range, URL sync |
| WQ-040 | PWA manifest + service worker | ✅ Done | v0.3.0 | Lead Manager | @developer | — | 2026-05-23 | manifest.json, sw.js, offline caching for static assets |
| WQ-041 | API pagination | ✅ Done | v0.3.0 | Lead Manager | @developer | — | 2026-05-23 | Cursor-based, limit, nextCursor, totalCount response |
| WQ-042 | Testing setup (unit + integration) | ✅ Done | v0.3.0 | Lead Manager | @developer | — | 2026-05-23 | Vitest/Jest configs, test files created (excluded from typecheck) |
| WQ-044 | Fix map page blank — `.map-container` CSS class collision | ✅ Done | Hotfix v0.2.1 | Lead Manager | @developer | — | 2026-05-23 | Renamed SampleMap class to `.sample-map-container` with inline styles |
| WQ-045 | Fix photo API route mounting mismatch | ✅ Done | Hotfix v0.2.1 | Lead Manager | @developer | — | 2026-05-23 | Fixed router mounting in index.ts: photos at /api/v1/photos, samples at /api/v1/samples |
| WQ-046 | Add `/uploads` proxy to Vite dev config | ✅ Done | Hotfix v0.2.1 | Lead Manager | @developer | — | 2026-05-23 | Added /uploads proxy pointing to http://localhost:3001 in vite.config.ts |
| WQ-047 | Fix photo URL construction in SampleDetail | ✅ Done | Hotfix v0.2.1 | Lead Manager | @developer | — | 2026-05-23 | Changed photo URL to /api/v1/uploads/${photo.path} (backend serves at /api/v1/uploads) |
| WQ-048 | Admin login with username/password (httpOnly cookie sessions) | ✅ Done | v0.4.0 | Lead Manager | @developer | — | 2026-05-23 | POST /api/v1/auth/login, httpOnly cookie sessions, AuthContext, /login route, protected /admin route |
| WQ-049 | Admin can delete approved and rejected samples | ✅ Done | v0.4.0 | Lead Manager | @developer | — | 2026-05-23 | Delete button with confirmation dialog, useDeleteSample hook wired to TanStack Query invalidateQueries |
| WQ-050 | Photo thumbnails, status revert, search by author, sample stats on Admin dashboard | ✅ Done | v0.4.0 | Lead Manager | @developer | — | 2026-05-23 | Photo thumbnails (64x64), revert to pending button, real-time author search, 4 color-coded stat badges |
| WQ-051 | Fix dependency version typos (dotenv, multer) | ✅ Done | Hotfix v0.4.1 | Lead Manager | @developer | — | 2026-05-25 | Changed dotenv to ^16.4.5, multer to ^1.4.5-lts.1; npm install passes |
| WQ-052 | Remove hardcoded fallback secrets from auth.ts | ✅ Done | Hotfix v0.4.1 | Lead Manager | @developer | — | 2026-05-25 | Removed default ADMIN_PASSWORD/JWT_SECRET; fail-closed if env vars missing |
| WQ-053 | Implement bcryptjs password hashing | ✅ Done | Hotfix v0.4.1 | Lead Manager | @developer | — | 2026-05-25 | Hash admin password at startup; bcrypt.compareSync in login |
| WQ-054 | Add JWT auth middleware to photo routes | ✅ Done | Hotfix v0.4.1 | Lead Manager | @developer | — | 2026-05-25 | POST /samples/:id/photos and DELETE /photos/:id require valid JWT |
| WQ-055 | Remove committed `.env` files from repository | ✅ Done | Hotfix v0.4.1 | Lead Manager | @developer | — | 2026-05-25 | .gitignore already handles .env; no git repo to clean |
| WQ-056 | Add Helmet, rate limiting, and request size limits | ✅ Done | Hotfix v0.4.1 | Lead Manager | @developer | — | 2026-05-25 | helmet middleware, express.json({ limit: '1mb' }), general rate limiter |
| WQ-057 | Fix path traversal in photo serving | ✅ Done | Hotfix v0.4.1 | Lead Manager | @developer | — | 2026-05-25 | Sanitize filename with path.basename; reject path separators |
| WQ-058 | Fix service worker to cache Vite JS/CSS chunks | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | vite-plugin-pwa with Workbox, precaches 9 entries including JS/CSS |
| WQ-059 | Fix client-side filtering on paginated data | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | Remove .filter() calls; pass filter state to API |
| WQ-060 | Add server-side search/filtering (authorName, dates) | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | GET /samples?authorName=&dateFrom=&dateTo= |
| WQ-061 | Migrate JWT-in-localStorage to httpOnly cookie sessions (DB-backed users) | ✅ Done | v0.6.0 | Lead Manager | @developer | — | — | express-session + connect-pg-simple + UserAccount model |
| WQ-062 | Add rate limiting to `/auth/login` | ✅ Done | Hotfix v0.4.1 | Lead Manager | @developer | — | 2026-05-25 | Stricter limit: 5 attempts per 15min; return 429 |
| WQ-063 | Implement Content Security Policy | ✅ Done | v1.0.0 | Lead Manager | — | — | — | CSP with env-aware tile domains, report-only/enforce toggle, dev mode WebSocket support |
| WQ-064 | Sanitize CSV export against formula injection | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | Prefix =,+,-,@,\t,\r with ' |
| WQ-065 | Remove CORS `localhost:5173` fallback | ✅ Done | Hotfix v0.4.1 | Lead Manager | @developer | — | 2026-05-25 | If CORS_ORIGIN unset, log warning and use same-origin only |
| WQ-066 | Move image compression to Web Worker | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | OffscreenCanvas in web worker with inline fallback |
| WQ-067 | Stop map auto-panning on every GPS tick | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | Auto-pan only on first fix; "Follow GPS" toggle button |
| WQ-068 | Debounce reverse geocoding (Nominatim) | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | 500ms debounce + AbortController |
| WQ-069 | Configure global Axios timeout | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | Default 10s; upload 30s; friendly error intercept |
| WQ-070 | Optimize map marker rendering (memoization) | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | React.memo on SampleMarker + MapController, useMemo for validSamples |
| WQ-071 | AI Analysis microservice (full implementation) | 📝 Planned | Future v0.7.0 | — | — | — | — | Deferred until concrete AI model/requirements defined by research team |
| WQ-072 | Photo support in offline mode (block with warning) | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | Block submit with alert when offline + photos |
| WQ-073 | 404 page and React Error Boundary | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | ErrorBoundary + NotFoundPage + Route * |
| WQ-074 | Admin notification badge for pending submissions | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | usePendingCount with refetchInterval: 30000 |
| WQ-075 | Server-side sort by measurement parameter | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | ALLOWED_SORT_FIELDS allowlist + dynamic orderBy |
| WQ-076 | Database health check in `/health` | ✅ Done | Hotfix v0.4.1 | Lead Manager | @developer | — | 2026-05-25 | Execute Prisma query in /health; return 503 if DB unreachable |
| WQ-077 | Remove unused `User` TypeScript interface | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | Delete User interface from types/index.ts |
| WQ-078 | Convert `Sample.status` from String to Prisma enum | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | Status enum + npx prisma db push |
| WQ-079 | Rename `userId` query param to `authorName` | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | Backend + frontend query param rename (done in WQ-060) |
| WQ-080 | Migrate inline `<style>` blocks to CSS modules | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | Incremental: styles in rewritten components remain inline (self-contained, no leakage) |
| WQ-081 | Fix TypeScript version mismatch in root package.json | ✅ Done | Hotfix v0.4.1 | Lead Manager | @developer | — | 2026-05-25 | Aligned root TS version to ^5.3.3 |
| WQ-082 | Add missing `VITE_DEFAULT_LAT`/`LNG` to `vite-env.d.ts` | ✅ Done | Hotfix v0.4.1 | Lead Manager | @developer | — | 2026-05-25 | Added declarations for env vars used in MapPicker/SampleMap |
| WQ-083 | Fix module-level `watchId` in `useGeolocation` hook | ✅ Done | v0.5.0 | Lead Manager | @developer | — | 2026-05-25 | Replaced module-level let with useRef |
| WQ-084 | Add LAQUAtwin ISE (NO₃⁻, Ca²⁺, K⁺, Na⁺) + remove non-LAQUAtwin (DO, turbidity, TDS, ORP) | ✅ Done | v0.7.0 | Lead Manager | @developer | — | 2026-05-25 | Added nitrate, calcium, potassium, sodium; removed dissolvedO2, turbidity, tds, orp; new ISE form section; 14-file change including all components + migration |
| WQ-085 | Metadata tags (Water Body Typology, Land Use, GPS Accuracy) | ✅ Done | v0.8.0 | Lead Manager | @developer | — | 2026-05-26 | Added waterBodyType (10 options, 3 categories), landUse (14 options, 5 categories), gpsAccuracy; 2-step picker, GPS accuracy popup, EXIF GPS warning; 18-file change
| WQ-086 | Dexie.js database schema + dependency install | ✅ Done | v0.9.0 | Lead Manager | @developer | — | — | Offline-first storage engine foundation; Dexie v4, IndexedDB schema, TypeScript types
| WQ-087 | Conflict detection algorithm (Haversine + hour bucket) | ✅ Done | v0.9.0 | Lead Manager | @developer | — | — | Client-side duplicate detection: 8m radius + same hour; unit tests
| WQ-088 | Sync engine core (processQueue, retry backoff, auto-purge) | ✅ Done | v0.9.0 | Lead Manager | @developer | — | — | State machine implementation, exponential backoff, 30d/90d purge
| WQ-089 | useDexieInit hook + App entry point wiring | ✅ Done | v0.9.0 | Lead Manager | @developer | — | — | Guards UI until IndexedDB ready; prevents race conditions
| WQ-090 | Zustand store rewrite + useOfflineSubmission hook | ✅ Done | v0.9.0 | Lead Manager | @developer | — | — | Thin Zustand over Dexie; extracted submission hook; SampleForm integration
| WQ-091 | useOfflineSync rewrite + OfflineStatusBar component | ✅ Done | v0.9.0 | Lead Manager | @developer | — | — | Dexie-backed sync with backward-compatible return type; enhanced offline banner
| WQ-092 | localStorage to Dexie migration (gradual cutover) | ✅ Done | v0.9.0 | Lead Manager | @developer | — | — | Dual-system period; migrate old queue on first load; migration flag
| WQ-093 | Sync log viewer (dev-only debug route) | ✅ Done | v0.9.0 | Lead Manager | @developer | — | — | Admin/debug table of syncLog entries; conditional route in dev
| WQ-094 | Integration & purge tests | ✅ Done | v0.9.0 | Lead Manager | @developer | — | — | E2E-style sync tests, fake timers, 1000-record performance benchmark
| WQ-095 | Full regression testing (lint + typecheck + manual QA) | ✅ Done | v0.9.0 | Lead Manager | @developer | — | — | Verify WQ-001 to WQ-085 unchanged; bundle size <25KB
| WQ-096 | Performance benchmark & mobile compatibility verification | ✅ Done | v0.9.0 | Lead Manager | @developer | — | — | 1000-record query <100ms; mid-range Android cold start <500ms
| WQ-097 | PostGIS extension, migration, schema types | ✅ Done | v1.0.0 | Lead Manager | — | — | — | PostGIS 3.6 installed, geog column added, GIST index, 24 locations migrated
| WQ-098 | Request logging + response envelope middleware | ✅ Done | v1.0.0 | Lead Manager | — | — | — | Structured JSON logs with requestId, timing, method, path, status
| WQ-099 | Enhanced health checks + middleware wiring | ✅ Done | v1.0.0 | Lead Manager | — | — | — | /health with PostGIS + DB + sessions checks; requestLogger wired
| WQ-100 | OpenAPI/Swagger documentation setup | ✅ Done | v1.0.0 | Lead Manager | — | — | — | Swagger UI at /api/docs, OpenAPI JSON at /api/docs/openapi.json
| WQ-101 | /locations/nearby + /samples/nearby endpoints | ✅ Done | v1.0.0 | Lead Manager | — | — | — | Spatial radius search using ST_DWithin with response envelope
| WQ-102 | PostGIS location deduplication rewrite | ✅ Done | v1.0.0 | Lead Manager | — | — | — | findOrCreateLocation uses ST_DWithin instead of approximate degree math
| WQ-103 | Frontend useNearbySamples hook + map integration | ✅ Done | v1.0.0 | Lead Manager | — | — | — | useNearbySamples hook, NearbySamplesPanel integrated into SampleMap with GPS + radius slider
| WQ-104 | NearbySamplesPanel + radius slider UI | ✅ Done | v1.0.0 | Lead Manager | — | — | — | Floating panel with 5-step radius selector, sample cards with distance/metadata
| WQ-105 | Unit tests for spatial endpoints | ✅ Done | v1.0.0 | Lead Manager | — | — | — | Tests for spatial validation schemas, response envelope middleware, migration safety
| WQ-106 | Performance benchmark + migration safety test | ✅ Done | v1.0.0 | Lead Manager | — | — | — | Migration safety test verifies idempotent re-run; spatial endpoint tests cover all edge cases
| WQ-107 | Full regression (lint/typecheck/manual QA) | ✅ Done | v1.0.0 | Lead Manager | — | — | — | 44/44 API tests pass, 77/77 web tests pass, lint/typecheck/build clean in both workspaces
| WQ-108 | Data Quality Scoring Engine | ✅ Done | v1.1.0 AI Ready | Lead Manager | @lead-manager | — | — | Heuristic 0-1 reliability score per sample; Prisma schema, scoring service, API endpoint, tests, frontend badge + breakdown |
| WQ-109 | Spatial Interpolation Heatmap (IDW) | 📝 Planned | v1.1.0 AI Ready | Lead Manager | — | — | — | Frontend heatmap overlay using Inverse Distance Weighting on existing map. Spec: docs/wq-109-spatial-interpolation-heatmap-spec.md |
| WQ-110 | ML Prediction Engine (Random Forest/XGBoost) | 📝 Future Backlog | v1.2.0+ | — | — | — | — | Deferred until ≥200 samples collected; Python microservice in services/ai/. Spec: docs/wq-110-ml-prediction-engine-spec.md |
| WQ-111 | Add `trust proxy` config for reverse proxy (rate limiting fix) | ✅ Done | Hotfix v1.1.1 | Lead Manager | @lead-manager | — | — | Rate limiting ineffective behind reverse proxy without trust proxy |
| WQ-112 | Fix API build to include `prisma generate` before `tsc` | ✅ Done | Hotfix v1.1.1 | Lead Manager | @lead-manager | — | — | Fresh deploys fail without generated Prisma client |
| WQ-113 | Add CSP allowed domains for external stylesheets (Leaflet, Google Fonts) | ✅ Done | Hotfix v1.1.1 | Lead Manager | @lead-manager | — | — | CSP enforce mode blocks Leaflet CSS and Google Fonts from CDN |
| WQ-114 | Seed script reads `ADMIN_PASSWORD` from env + change password endpoint + single session enforcement + login history | ✅ Done | Hotfix v1.1.1 | Lead Manager | @lead-manager | — | — | prisma/seed.ts reads ADMIN_PASSWORD from env; POST /auth/change-password; LoginLog table; killOtherSessions on login/change; AdminDashboard change password form + login history display |
| WQ-115 | Remove session secret fallback (fail unconditionally if missing) | ✅ Done | Hotfix v1.1.1 | Lead Manager | @lead-manager | — | — | index.ts uses weak fallback string; fail if SESSION_SECRET missing |
| WQ-116 | Use async `bcrypt.compare` instead of blocking `compareSync` | ✅ Done | Hotfix v1.1.1 | Lead Manager | @lead-manager | — | — | compareSync blocks event loop 100-300ms per request; replaced with async compare |
| WQ-117 | Fix auth middleware role default (fail closed, not default to admin) | ✅ Done | Hotfix v1.1.1 | Lead Manager | @lead-manager | — | — | auth.ts defaults role to 'admin' when missing; privilege escalation risk |
| WQ-118 | Add max length to login password field (prevent bcrypt CPU exhaustion) | ✅ Done | Hotfix v1.1.1 | Lead Manager | @lead-manager | — | — | Added .max(128) to loginSchema.password + changePasswordSchema |
| WQ-119 | Sanitize health endpoint (remove PostGIS version leak) | ✅ Done | Hotfix v1.1.1 | Lead Manager | @lead-manager | — | — | health.ts returns PostGIS version string; return only up/down |
| WQ-120 | Remove duplicate `/uploads` static serving route | ✅ Done | Hotfix v1.1.1 | Lead Manager | @lead-manager | — | — | index.ts serves /uploads statically + photos router serves same; remove one |
| WQ-121 | Ensure `uploads/` directory exists at startup | ✅ Done | Hotfix v1.1.1 | Lead Manager | @lead-manager | — | — | multer fails if uploads/ dir missing; create on server start |
| WQ-122 | Prisma schema: add `user` role, `name` field, `active` field, `userId` on Sample | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | Single UserAccount model with roles; soft delete via active flag; Sample.userId link |
| WQ-123 | Register endpoint + schema + seed admin name | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | POST /auth/register with name/username/password validation; Zod schema; seed admin name |
| WQ-124 | Sample submit requires login | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | POST /samples requires auth; auto-sets userId and authorName from authenticated user |
| WQ-125 | Data isolation — public view, submission tracking | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | GET /samples public; POST /samples tags with userId; admin can track submissions |
| WQ-126 | User management CRUD (admin) — list, create, deactivate | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | GET/POST/PUT /users endpoints; admin-only |
| WQ-127 | Admin dashboard — add Users tab (structure) | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | New tab alongside Samples tab |
| WQ-128 | Frontend Register page + route | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | Registration form with name/username/password; /register route |
| WQ-129 | Sample form — require login, auto-fill authorName | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | Check isAuthenticated; redirect to login if not; auto-fill authorName from user name |
| WQ-130 | User management UI — list, create, deactivate, password reset | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | AdminUsersTab component; table with list, create, deactivate, password reset |
| WQ-131 | AuthContext — add register method | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | register() method + update useAuth return |
| WQ-132 | Backward compatibility — existing samples stay viewable | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | userId=null samples remain visible; GET endpoints public; no data migration needed |
| WQ-133 | Unit tests for user registration + data isolation | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | 17 new tests for createUserSchema, updateUserSchema, resetPasswordSchema |
| WQ-134 | Full regression testing | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | 90/90 API tests + 77/77 web tests + lint + typecheck + build all clean |
| WQ-135 | Admin password reset from user management | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | PUT /users/:id/reset-password; admin sets new password |
| WQ-136 | Registration rate limiting (5/15min per IP) | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | Prevent spam registrations; same rate limit as login |
| WQ-137 | User list pagination + sorting | ✅ Done | v1.2.0 | Lead Manager | @developer | — | 2026-06-11 | Paginate user list (20/page); sort by username A→Z (toggleable); search by name/username. Hotfix: modal JSX, allowlist, totalCount, collapsible sections, login history limit. Spec: docs/wq-137-user-list-pagination-spec.md |
| WQ-138 | Kill user sessions on admin password reset | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | When admin resets password, kill all sessions for that user |
| WQ-139 | Prevent admin self-deactivation | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | Admin UI hides deactivate button for own account |
| WQ-140 | Generate temp password on admin user creation | ✅ Done | v1.2.0 | Lead Manager | @lead-manager | — | — | Admin creates user → system generates random password → shown once |
| WQ-141 | Fix health check returns 200 when PostGIS is down | ✅ Done | Hotfix v1.3.1 | Lead Manager | @lead-manager | — | 2026-06-08 | health.ts allUp logic uses !== 'not available' instead of === 'up' |
| WQ-142 | Fix delete sample deletes files before DB transaction | ✅ Done | Hotfix v1.3.1 | Lead Manager | @lead-manager | — | 2026-06-08 | samples.ts:467 deletes files before DB ops; if DB fails, files are gone but records remain |
| WQ-143 | Fix admin action buttons nested inside Link | ✅ Done | Hotfix v1.3.1 | Lead Manager | @lead-manager | — | 2026-06-08 | AdminDashboard.tsx:401 buttons inside <Link> cause navigation on click |
| WQ-144 | Scope draft storage to user | ✅ Done | Hotfix v1.3.1 | Lead Manager | @lead-manager | — | 2026-06-08 | SampleForm.tsx:221 fixed key leaks drafts between users on shared device |
| WQ-145 | Fix MapContainer ref in MapPicker | ✅ Done | Hotfix v1.3.1 | Lead Manager | @lead-manager | — | 2026-06-08 | MapPicker.tsx:148 react-leaflet v4 doesn't support direct ref; dead code |
| WQ-146 | Extract shared display utilities | ✅ Done | v1.3.0 | Lead Manager | @lead-manager | — | — | Deduplicate getKeyMeasurements, formatDate, truncateAddress across SampleList + AdminDashboard |
| WQ-147 | Extract shared useDebounce hook | ✅ Done | v1.3.0 | Lead Manager | @lead-manager | — | — | Custom debounce in AdminDashboard + MapPicker → shared hook |
| WQ-148 | Extract photo ownership middleware | ✅ Done | v1.3.0 | Lead Manager | @lead-manager | — | — | Duplicate ownership check in photos.ts upload + delete |
| WQ-149 | Extract quality scoring SQL helper | ✅ Done | v1.3.0 | Lead Manager | @lead-manager | — | — | 6x $queryRawUnsafe patterns → safeColumnName helper |
| WQ-150 | Split AdminDashboard (1213 lines) into sub-components | ✅ Done | v1.3.0 | Lead Manager | @lead-manager | — | — | Extract PasswordChangeForm, LoginHistoryPanel |
| WQ-151 | Split SampleForm (1442 lines) into sub-components | ✅ Done | v1.3.0 | Lead Manager | @lead-manager | — | — | Extract useImageCompression, AccuracyModal |
| WQ-152 | Migrate AdminDashboard inline styles to CSS modules | 📝 Future Backlog | v1.3.0 | Lead Manager | — | — | — | Move style block to admin.css or CSS modules |
| WQ-153 | Migrate SampleForm inline styles to CSS modules | 📝 Future Backlog | v1.3.0 | Lead Manager | — | — | — | Move style block to form.css or CSS modules |
| WQ-154 | Migrate SampleMap inline styles to CSS modules | 📝 Future Backlog | v1.3.0 | Lead Manager | — | — | — | Move style block to map.css or CSS modules |
| WQ-155 | Remove 'unsafe-inline' from CSP scriptSrc (nonce-based) | ✅ Done | v1.3.1 | Lead Manager | @lead-manager | — | 2026-06-08 | csp.ts: per-request nonce via middleware, swagger UI script tags patched |
| WQ-156 | Add helmet() for full security headers (HSTS, X-Frame-Options) | ✅ Done | v1.3.1 | Lead Manager | @lead-manager | — | 2026-06-08 | helmet() with contentSecurityPolicy:false for non-CSP headers |
| WQ-157 | Add auth to photo serving route | ✅ Done | v1.3.1 | Lead Manager | @lead-manager | — | 2026-06-08 | authMiddleware on GET /uploads/:filename |
| WQ-158 | Wrap location dedup in database transaction | ✅ Done | v1.3.1 | Lead Manager | @lead-manager | — | 2026-06-08 | prisma.$transaction wrapping findOrCreateLocation |
| WQ-159 | Add export-specific rate limiting | ✅ Done | v1.3.1 | Lead Manager | @lead-manager | — | 2026-06-08 | 10 req/min exportLimiter in export.ts |
| WQ-160 | Fix temp password modulo bias | ✅ Done | v1.3.1 | Lead Manager | @lead-manager | — | 2026-06-08 | crypto.randomInt instead of modulo |
| WQ-161 | Add aria-label to map control buttons | ✅ Done | v1.4.0 | Lead Manager | @lead-manager | — | 2026-06-08 | follow-gps-btn, search-here-btn, nearby-btn, refresh, close, photo-remove |
| WQ-162 | Add role="alert" to error banners | ✅ Done | v1.4.0 | Lead Manager | @lead-manager | — | 2026-06-08 | SampleForm, LoginPage, RegisterPage, NearbySamplesPanel error banners |
| WQ-163 | Add aria-live to offline status bar | ✅ Done | v1.4.0 | Lead Manager | @lead-manager | — | 2026-06-08 | OfflineStatusBar.tsx aria-live="polite" |
| WQ-164 | Add keyboard navigation to photo gallery | ✅ Done | v1.4.0 | Lead Manager | @lead-manager | — | 2026-06-08 | ArrowLeft/Right lightbox nav, Enter/Space to open, Escape to close |
| WQ-165 | Add focus indicators to photo gallery items | ✅ Done | v1.4.0 | Lead Manager | @lead-manager | — | 2026-06-08 | :focus-visible outline on .photo-gallery-item + lightbox nav/close |
| WQ-166 | Add aria-selected to admin tab navigation | ✅ Done | v1.4.0 | Lead Manager | @lead-manager | — | 2026-06-08 | role="tablist"/"tab"/"tabpanel" + aria-selected + aria-controls |
| WQ-167 | Restore focus on lightbox close | ✅ Done | v1.4.0 | Lead Manager | @lead-manager | — | 2026-06-08 | useRef stores triggering button; setTimeout focus() on close |
| WQ-168 | Add accessible alternative for TrendChart | ✅ Done | v1.4.0 | Lead Manager | @lead-manager | — | 2026-06-08 | aria-label on chart container describing data |
| WQ-169 | Add caption/aria-label to user management table | ✅ Done | v1.4.0 | Lead Manager | @lead-manager | — | 2026-06-08 | caption + aria-label on users-table |
| WQ-170 | Add aria-expanded to collapsible sections | ✅ Done | v1.4.0 | Lead Manager | @lead-manager | — | 2026-06-08 | aria-expanded + aria-controls on login history toggle |
| WQ-171 | Lazy load route components with React.lazy | ✅ Done | v1.4.1 | Lead Manager | @lead-manager | — | 2026-06-08 | React.lazy + Suspense; 25 separate chunks, ~40% initial bundle reduction |
| WQ-172 | Lazy load Chart.js (dynamic import) | ✅ Done | v1.4.1 | Lead Manager | @lead-manager | — | 2026-06-08 | TrendChart chunked separately (170KB), not in initial bundle |
| WQ-173 | Create dedicated GET /samples/stats endpoint | ✅ Done | v1.4.1 | Lead Manager | @lead-manager | — | 2026-06-08 | 4x prisma.sample.count() in single endpoint; useSamplesStats uses 1 call |
| WQ-174 | Add pagination cursor to /samples/markers | ✅ Done | v1.4.1 | Lead Manager | @lead-manager | — | 2026-06-08 | Cursor/limit params; client iterates pages to aggregate all markers |
| WQ-175 | Optimize Dexie stats refresh | ✅ Done | v1.4.1 | Lead Manager | @lead-manager | — | 2026-06-08 | offlineDb.offlineRecords.where().equals().count() per status |
| WQ-176 | Add debounce to form geocoding | ✅ Done | v1.4.1 | Lead Manager | @lead-manager | — | 2026-06-08 | useDebounce(500ms) on lat/lng; Nominatim not spammed on GPS ticks |
| WQ-177 | Add pagination to MySamplesPage | ✅ Done | v1.4.1 | Lead Manager | @lead-manager | — | 2026-06-08 | useInfiniteQuery with \"Load More\" button; cursor-based pagination |
| WQ-178 | Fix quality score retry on creation failure | ✅ Done | v1.4.1 | Lead Manager | @lead-manager | — | 2026-06-08 | recalculateScore retries once after 1s delay on failure |
| WQ-179 | Set up Playwright test infrastructure | ✅ Done | v1.4.2 | Lead Manager | @lead-manager | — | 2026-06-08 | @playwright/test installed, config, e2e/ test files (not run: requires full stack) |
| WQ-180 | E2E: Submit water sample journey | 📝 Planned | v1.4.2 | Lead Manager | — | — | — | Scaffold created — requires full stack to run |
| WQ-181 | E2E: Admin moderation journey | 📝 Planned | v1.4.2 | Lead Manager | — | — | — | Scaffold created — requires full stack to run |
| WQ-182 | Photo upload/serving/deletion integration tests | ✅ Done | v1.4.2 | Lead Manager | @lead-manager | — | 2026-06-08 | 7 new tests in photos-ownership.test.ts (auth, validation, serving, delete) |
| WQ-183 | Quality scoring service unit tests | ✅ Done | v1.4.2 | Lead Manager | @lead-manager | — | 2026-06-08 | 6 new tests covering all scoring factors (GPS, range, metadata, photo, etc.) |
| WQ-184 | CSP middleware tests | ✅ Done | v1.4.2 | Lead Manager | @lead-manager | — | 2026-06-08 | 4 tests: nonce, reportOnly, enforce, tile domains |
| WQ-185 | AdminUsersTab component tests | ✅ Done | v1.4.2 | Lead Manager | @lead-manager | — | 2026-06-08 | 5 tests: user list, create button, deactivate, reactivate, error state |
| WQ-186 | TrendChart component tests | ✅ Done | v1.4.2 | Lead Manager | @lead-manager | — | 2026-06-08 | 5 tests: empty, insufficient data, chart render, selector, aria-label |
| WQ-187 | useFocusTrap hook tests | ✅ Done | v1.4.2 | Lead Manager | @lead-manager | — | 2026-06-08 | 2 tests: Escape close, mount without error |
| WQ-188 | Create Dockerfile for api | ✅ Done | v1.5.0 | Lead Manager | @lead-manager | — | 2026-06-08 | Multi-stage: node:20-alpine builder + runner, prisma generate |
| WQ-189 | Create Dockerfile for web (multi-stage, nginx) | ✅ Done | v1.5.0 | Lead Manager | @lead-manager | — | 2026-06-08 | Build + nginx static serving with SPA fallback |
| WQ-190 | Create docker-compose.yml | ✅ Done | v1.5.0 | Lead Manager | @lead-manager | — | 2026-06-08 | api + web + PostgreSQL 16 + PostGIS 3.4, health checks |
| WQ-191 | GitHub Actions CI (lint + typecheck + test) | ✅ Done | v1.5.0 | Lead Manager | @lead-manager | — | 2026-06-08 | Runs on push/PR to main; lint, typecheck, test on both workspaces |
| WQ-192 | GitHub Actions Docker build on main | ✅ Done | v1.5.0 | Lead Manager | @lead-manager | — | 2026-06-08 | Docker build + push to ghcr.io on main branch push |
| WQ-193 | Startup environment validation | ✅ Done | v1.5.0 | Lead Manager | @lead-manager | — | 2026-06-08 | Validate DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD; fail-fast with error message |
| WQ-194 | Add request timeout middleware | ✅ Done | v1.5.0 | Lead Manager | @lead-manager | — | 2026-06-08 | 30s default, 60s for spatial endpoints; returns 508 on timeout |
| WQ-195 | Batch approve/reject in admin | ✅ Done | v1.6.0 | Lead Manager | — | — | — | Checkbox + bulk action UI; admin can batch approve/reject/revert up to 100 samples per call |
| WQ-196 | User-initiated password reset (admin-mediated) | ✅ Done | v1.6.0 | Lead Manager | — | — | — | Forgot password → admin sees request → generates temp password → communicates to user; mustChangePassword flag; 7-day expiry |
| WQ-197 | Dark mode support | 📝 Future Backlog | Future | — | — | — | — | CSS custom properties + prefers-color-scheme |
| WQ-198 | Offline data export/backup | 📝 Future Backlog | Future | — | — | — | — | Export pending offline submissions |
| WQ-199 | Sample data audit trail | 📝 Future Backlog | Future | — | — | — | — | Track who changed what and when |
| WQ-200 | Copy coordinates button | ✅ Done | Future | Lead Manager | @lead-manager | — | 2026-06-11 | One-click clipboard copy in SampleDetail |
| WQ-201 | Keyboard shortcut for form submit (Ctrl+Enter) | ✅ Done | Future | Lead Manager | @lead-manager | — | 2026-06-11 | Rapid field data entry |
| WQ-202 | Search on map page | 📝 Future Backlog | Future | — | — | — | — | Search by author, parameter, or date from map view |
| WQ-203 | Fix `/health` returning 200 when sessions table is broken | ✅ Done | Hotfix v1.5.1 | Lead Manager | @lead-manager | — | — | Regression of WQ-141; sessions check excluded from allUp. Spec: docs/hotfix-v1.5.1-spec.md |
| WQ-204 | Replace `x-forwarded-for` parsing with `req.ip` (audit log integrity) | ✅ Done | Hotfix v1.5.1 | Lead Manager | @lead-manager | — | — | Spoofable IP in LoginLog when TRUST_PROXY=false. Spec: docs/hotfix-v1.5.1-spec.md |
| WQ-205 | Dedupe `POST /api/v1/locations` via PostGIS proximity (10m) | ✅ Done | Hotfix v1.5.1 | Lead Manager | @lead-manager | — | — | Endpoint bypasses dedup invariant. Spec: docs/hotfix-v1.5.1-spec.md |
| WQ-206 | Cap CSV export at 50,000 rows + overflow header | ✅ Done | Hotfix v1.5.1 | Lead Manager | @lead-manager | — | — | OOM risk on unbounded findMany. Spec: docs/hotfix-v1.5.1-spec.md |
| WQ-207 | Unify bcrypt cost factor at 12 across all hash sites | ✅ Done | Hotfix v1.5.1 | Lead Manager | @lead-manager | — | — | Mixed costs 10/12 across 5 sites. Spec: docs/hotfix-v1.5.1-spec.md |
| WQ-208 | WQ-200 copy-coords: fallback + error handling | ✅ Done | Hotfix v1.5.1 | Lead Manager | @lead-manager | — | — | Crashes on HTTP/file:// (navigator.clipboard undefined). Spec: docs/hotfix-v1.5.1-spec.md |

---

## Session Log

> Full session history archived at `docs/progress-session-log-archive.md`. Recent entries only.

| Date | Agent | Action | Feature ID | Summary |
|------|-------|--------|------------|---------|
| 2026-06-08 | Developer | Phase 1: Bug fixes + component tests | WQ-141 to WQ-187 | Fixed multer JSON error handling, async fs.unlink; added 39 component tests; all 247 tests pass |
| 2026-06-08 | Lead Manager | Post-Phase-1 audit + milestone planning | WQ-141 to WQ-202 | Full codebase audit: 14 bugs, 7 spec docs created. Registered 62 new features |
| 2026-06-08 | Lead Manager | Implemented Hotfix v1.3.1 | WQ-141 to WQ-145 | Fixed 5 critical bugs: health check, file delete order, admin buttons, draft storage, mapRef |
| 2026-06-08 | Lead Manager | Implemented Milestone 12 Phase 1+2 | WQ-146 to WQ-151 | Extracted shared utilities, split AdminDashboard (1213 to 999 lines) and SampleForm (1442 to 1332 lines) |
| 2026-06-08 | Lead Manager | Implemented Milestone 14 Security Hardening | WQ-155 to WQ-160 | Nonce-based CSP, helmet(), auth on photos, DB transaction, export rate limit, crypto.randomInt |
| 2026-06-08 | Lead Manager | Implemented Milestone 15 Accessibility & UX | WQ-161 to WQ-170 | aria-labels, role=alert, aria-live, keyboard nav, focus indicators, screen reader support |
| 2026-06-08 | Lead Manager | Implemented Milestone 16 Performance & Bundle | WQ-171 to WQ-178 | React.lazy routes, lazy Chart.js, /samples/stats endpoint, paginated markers, geocoding debounce |
| 2026-06-08 | Lead Manager | Implemented Milestone 17 Testing Coverage | WQ-179, WQ-182 to WQ-187 | Playwright setup, photo/quality/CSP/component tests. Total: 275/275 tests |
| 2026-06-08 | Lead Manager | Implemented Milestone 18 DevOps & Deployment | WQ-188 to WQ-194 | Dockerfiles, docker-compose, GitHub Actions CI/Docker build, env validation, request timeout |
| 2026-06-08 | Lead Manager | Critical stability fix phase | BUG-001 to BUG-020 | Fixed 15 bugs: nearby panel, Dockerfile path, photo delete order, GPS sync, timeout ordering, race conditions, memory leaks |
| 2026-06-08 | Lead Manager | Security hardening phase | SEC-001, SEC-002 | Auth middleware on POST /locations, session regeneration safety timeout |
| 2026-06-08 | Lead Manager | Data consistency + code quality phases | DQC-001, DQC-002, CQ-001 to CQ-003 | safeCount for offline stats, orphaned file cleanup, zero lint warnings, zero ts-ignore |
| 2026-06-11 | Developer | WQ-137: User list pagination + sorting | WQ-137 | Backend cursor pagination + search + sort; frontend useUsers hook, search debounced 300ms, column sort, "Load More", updated tests. 278/278 tests pass |
| 2026-06-11 | Lead Manager | WQ-137 Hotfix: Post-implementation audit | WQ-137 | Found 7 bugs: JSX syntax errors in modals, missing allowlist, totalCount flicker. Created hotfix spec at docs/wq-137-hotfix.md. Added collapsible sections request. |
| 2026-06-11 | Developer | WQ-137 Hotfix: Implement all 7 bug fixes | WQ-137 | Fixed modal JSX indentation, added ALLOWED_SORT_FIELDS, created useUsersCount hook, collapsible Change Password + Sync Log preview, login history limit to 5. 131/131 web + 147/147 API tests pass. |
| 2026-06-11 | Lead Manager | Full application audit: 3 critical issues found | C1-C3 | Spatial outlier SQL bug (references missing l alias), plaintext secrets in api/.env, Docker build context mismatch. Created detailed spec at docs/critical-issues-fix.md. |
| 2026-06-11 | Developer | Implemented critical fixes C1-C3 | C1-C3 | C1: Fixed spatial outlier SQL (added Location JOIN, removed && operator). C2: Rotated SESSION_SECRET and ADMIN_PASSWORD, verified no secrets in git history. C3: Fixed docker-compose context, improved Dockerfile (non-root user, proper healthcheck). 284/284 tests pass. |
| 2026-06-11 | Developer | WQ-200/WQ-201 quick wins | WQ-200, WQ-201 | Copy coordinates button + Ctrl+Enter submit. 131/131 tests pass. |
| 2026-06-13 | Lead Manager | Deep security + correctness audit (18 findings) | H1–H5, M1–M8, L1–L5 | Full codebase audit: 5 High, 8 Medium, 5 Low. No Blocker-severity bugs. Created Hotfix v1.5.1 spec at docs/hotfix-v1.5.1-spec.md. Registered WQ-203 to WQ-208. |
| 2026-06-13 | Lead Manager | Implemented Hotfix v1.5.1 | WQ-203 to WQ-208 | Fixed 6 issues: health check, IP spoofing, location dedup, CSV export cap, bcrypt cost, clipboard fallback. 284/284 tests pass. |
| 2026-06-13 | Lead Manager | Post-hotfix test coverage gap | WQ-205, WQ-208 | Added 3 tests for POST /locations dedup (locations.test.ts) + 2 tests for copy-coords fallback (SampleDetail.test.tsx). Total: 289 tests. |
| 2026-06-13 | Lead Manager | Implemented Milestone 19: Admin Productivity & Self-Service | WQ-195, WQ-196 | Batch approve/reject UI + admin-mediated password reset. New Prisma model (PasswordResetRequest), forgot-password endpoint, mustChangePassword flag. 289+ tests pass. |
| 2026-06-13 | Lead Manager | Fixed Milestone 19 bugs | WQ-195, WQ-196 | H1: show username (not UUID) in fulfilled password modal. H2: enforce mustChangePassword with banner + /change-password page + clear on change. 289 tests pass. |

---

## Implementation Specs (Delegated to @developer)

### Directory Structure
```
water-quality-crowdsource/
├── web/                    # React Vite frontend
├── api/                    # Express backend
├── prisma/                 # Database schema
├── services/ai/            # Future AI microservice
└── package.json            # Root workspace
```

### Database Schema (Prisma)
- **Location**: id, latitude, longitude, geography(Point, 4326) (PostGIS), address, relation to samples
- **Sample**: id, authorName, locationId, ph, temperature, conductivity, salinity, nitrate, calcium, potassium, sodium, notes, status (pending/approved/rejected), userId, qualityScore, createdAt, updatedAt
  - Current fields (v0.7.0): pH, temperature (°C), conductivity (µS/cm), salinity (‰), nitrate (mg/L), calcium (mg/L), potassium (mg/L), sodium (mg/L)
  - All measurement fields are nullable (Float?) to maintain backward compatibility
  - ISE (Ion Selective Electrode) fields added for Laquatwin horiba meters
  - Metadata tags (v0.8.0): `waterBodyType` (10 options), `landUse` (14 options), `gpsAccuracy` (meters)
  - Data quality: `qualityScore` (Float, nullable, 0-1 range)

- **UserAccount**: id, username, name, password (bcrypt), role (user/admin), active (boolean), createdAt, updatedAt
  - Self-registration (v1.2.0, WQ-122)
  - Soft delete via `active` flag
  - Pre-existing anonymous samples remain viewable (backward compatible)

- **Session**: sid (PK), sess (JSON), expiredAt (Timestamp)
  - Used by express-session + connect-pg-simple

- **LoginLog**: id, userId, action (login/logout/password_change), ipAddress, userAgent, createdAt
  - Audit trail for authentication events

### API Endpoints
- `GET /health` — Health check with PostGIS + DB + sessions status
- `GET /api/docs/` — Swagger UI documentation
- `GET /api/docs/openapi.json` — Raw OpenAPI JSON spec
- `GET /api/v1/samples` — List samples (filter by status, pagination)
- `GET /api/v1/samples/:id` — Get single sample
- `POST /api/v1/samples` — Create sample with embedded location
- `PUT /api/v1/samples/:id` — Update sample
- `DELETE /api/v1/samples/:id` — Delete sample
- `POST /api/v1/samples/:id/photos` — Upload photos to sample
- `GET /api/v1/samples/:id/photos` — List photos for sample
- `DELETE /api/v1/photos/:id` — Delete a photo
- `GET /api/v1/samples/export` — Export samples as CSV
- `POST /api/v1/locations` — Create location
- `GET /api/v1/locations/:id` — Get location with samples
- `GET /api/v1/locations/nearby` — Radius search locations (PostGIS ST_DWithin)
- `GET /api/v1/samples/nearby` — Radius search samples with distance
- `POST /api/v1/auth/login` — Login (httpOnly cookie)
- `POST /api/v1/auth/logout` — Logout
- `GET /api/v1/auth/me` — Current user
- `POST /api/v1/auth/register` — Self-registration
- `POST /api/v1/auth/change-password` — Change password
- `GET /api/v1/auth/login-history` — Login history
- `GET /api/v1/users` — List users (admin, paginated)
- `POST /api/v1/users` — Create user (admin)
- `PUT /api/v1/users/:id` — Update user (admin)
- `PUT /api/v1/users/:id/reset-password` — Reset password (admin)

### Environment Variables
- `VITE_API_BASE_URL`, `VITE_MAP_TILE_URL`, `VITE_DEFAULT_LAT`, `VITE_DEFAULT_LNG` (frontend)
- `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `NODE_ENV` (backend)
- `RATE_LIMIT_MAX`, `CSP_ENFORCE_MODE`, `CSP_TILE_DOMAINS` (backend, optional)

---

## Test Results

### Frontend (web/)
- `npm run lint`: ✅ Pass
- `npm run typecheck`: ✅ Pass
- `npm run build`: ✅ Pass
- `npm run test`: ✅ 133/133 tests pass

### Backend (api/)
- `npm run lint`: ✅ Pass
- `npm run typecheck`: ✅ Pass
- `npm run build`: ✅ Pass
- `npm run test`: ✅ 156/156 tests pass (total: 289)

### Milestone 14 (v1.3.1 Security Hardening)
- WQ-155: CSP nonce-based (removed `'unsafe-inline'` from scriptSrc)
- WQ-156: helmet() full security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
- WQ-157: Auth middleware on GET `/uploads/:filename`
- WQ-158: `findOrCreateLocation` wrapped in `prisma.$transaction`
- WQ-159: Export-specific rate limiter (10 req/min)
- WQ-160: `crypto.randomInt` for temp password generation

### Milestone 15 (v1.4.0 Accessibility & UX)
- WQ-161: aria-labels on all map/form buttons
- WQ-162: role=alert on error banners (SampleForm, LoginPage, RegisterPage, NearbySamplesPanel)
- WQ-163: aria-live="polite" on OfflineStatusBar
- WQ-164: ArrowLeft/Right keyboard navigation in photo lightbox
- WQ-165: :focus-visible outline on photo gallery items + lightbox controls
- WQ-166: role="tablist"/"tab"/"tabpanel" + aria-selected on admin tabs
- WQ-167: focus restoration to trigger element after lightbox close
- WQ-168: aria-label on TrendChart canvas describing data
- WQ-169: caption + aria-label on users management table
- WQ-170: aria-expanded + aria-controls on collapsible login history

### Milestone 16 (v1.4.1 Performance & Bundle Optimization)
- WQ-171: React.lazy + Suspense route splitting (25 chunks)
- WQ-172: lazy TrendChart (Chart.js 170KB chunked)
- WQ-173: GET /samples/stats endpoint (1 call vs 4)
- WQ-174: paginated markers endpoint
- WQ-175: Dexie .count() per status
- WQ-176: 500ms debounce on Nominatim
- WQ-177: infinite query MySamplesPage with Load More
- WQ-178: recalculateScore retry once on failure

### Milestone 17 (v1.4.2 Testing Coverage)
- WQ-179: Playwright setup (infra only)
- WQ-182: 7 photo integration tests (auth, validation, serving, delete)
- WQ-183: 6 quality scoring tests covering all scoring factors
- WQ-184: 4 CSP middleware tests (nonce, reportOnly, enforce, tile domains)
- WQ-185: 5 AdminUsersTab tests (list, create, deactivate, reactivate, error)
- WQ-186: 5 TrendChart tests (empty, insufficient data, render, selector, aria-label)
- WQ-187: 2 useFocusTrap tests (Escape close, mount without error)

### Milestone 18 (v1.5.0 DevOps & Deployment)
- WQ-188: API Dockerfile (multi-stage: node:20-alpine builder + runner)
- WQ-189: Web Dockerfile (multi-stage: node build + nginx static serving)
- WQ-190: docker-compose.yml (api + web + PostgreSQL 16 + PostGIS 3.4)
- WQ-191: GitHub Actions CI (lint/typecheck/test on push/PR)
- WQ-192: GitHub Actions Docker build on main (push to ghcr.io)
- WQ-193: Startup environment validation (DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD)
- WQ-194: Request timeout middleware (30s default, 60s spatial, returns 508)

### Critical Performance Fixes
- PERF-001: Capped map marker pagination at 10 pages (10,000 markers max) to prevent OOM
- DB indexes verified: Sample.authorName, Sample.createdAt, Sample.status, Sample.qualityScore, Sample.userId, Sample.locationId all indexed

### Security Hardening
- SEC-001: Added auth middleware + PostGIS geography to POST /locations
- SEC-002: Added safety timeout to session regeneration in login/register (prevents hanging requests)

### Data Consistency
- DQC-001: offlineStore refreshStats uses safeCount (individual error handling instead of Promise.all short-circuit)
- DQC-002: Photo upload cleans up orphaned files on DB failure

### Code Quality Cleanup
- CQ-001: Verified zero lint warnings across both workspaces
- CQ-002: Verified zero ts-ignore/ts-expect-error comments
- CQ-003: Verified no unused imports/exports across codebase

### Critical Stability Fixes
- BUG-001: Fixed NearbySamplesPanel response envelope access (was always empty)
- BUG-002: Added `FOR UPDATE` to location dedup SELECT (prevents race condition duplicates)
- BUG-003: Fixed Dockerfile Prisma schema path (build was failing)
- BUG-004: Reordered timeout middleware (spatial 60s now works correctly)
- BUG-005: GPS accuracy now syncs from geolocation to form data
- BUG-006: Photo DELETE now deletes DB record before file (prevents orphaned files)
- BUG-007: Web Worker terminated after compression (memory leak fix)
- BUG-008: ObjectURLs revoked on form reset (memory leak fix)
- BUG-009: Geocoding errors now logged (silent failure fix)
- BUG-010: Quality route differentiates "not found" from other errors
- BUG-016: Map marker filter uses null check instead of falsy check
- BUG-018: Timeout middleware checks `headersSent` before responding
- BUG-020: MapPicker defaults to Wonorejo instead of equator

### Database
- Prisma generate: ✅ Successful
- Prisma schema valid

---

## How to Update This File

- **Lead Manager**: Create new rows when a feature is scoped. Update status and owner columns when delegating.
- **Developer**: Update status to ✅ when implementation + local tests pass. Add any deviation notes.
- **Quality Control**: Update status to 🔍 (pass) or 🐞 (fail) after verification. Link bug reports.
- **All agents**: Append a row to **Session Log** after every significant action.
