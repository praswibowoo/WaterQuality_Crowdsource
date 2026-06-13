# MILESTONES.md — Water Quality Crowdsource

> **Gates and priorities.** Lead Manager uses this to decide what to build next and when to move to the next phase.

---

## Milestone 1: MVP — Core Crowdsource (v0.1.0) ✅ Done

**Goal**: A user can open the app, submit a water sample with GPS coordinates, view it on a map, and see past submissions.

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-001 | Project scaffold (Vite + Express + Prisma) | 🔴 Blocker | ✅ Done |
| WQ-002 | Database schema (Location, Sample) | 🔴 Blocker | ✅ Done |
| WQ-003 | REST API CRUD for water samples | 🔴 Blocker | ✅ Done |
| WQ-004 | Frontend form to submit water sample | 🔴 Blocker | ✅ Done |
| WQ-005 | Leaflet map with GPS capture | 🔴 Blocker | ✅ Done |
| WQ-006 | Offline-first localStorage sync | 🟡 High | ✅ Done |
| WQ-007 | Mobile responsive layout | 🟡 High | ✅ Done |

**Exit Criteria** ✅ All complete

---

## Milestone 1.5: MVP Hardening & Real-Time GPS (v0.1.1) ✅ Done

**Goal**: Fix critical data-loss bugs, implement real-time GPS tracking for mobile field use, and polish mobile UX.

### Phase 1: Critical Bugs (Data Loss Prevention)

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-009 | Persist offline store to localStorage (Zustand persist middleware) | 🔴 Blocker | ✅ Done |
| WQ-010 | Wire up useOfflineSync in App/Layout so queued items sync on reconnect | 🔴 Blocker | ✅ Done |
| WQ-011 | Notify users when submissions are dropped after max retries | 🔴 Blocker | ✅ Done |

### Phase 2: Real-Time GPS Tracking

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-012 | watchPosition continuous GPS tracking (startTracking/stopTracking API) | 🔴 Blocker | ✅ Done |
| WQ-013 | GPS accuracy badge in form (color-coded: green/yellow/red) | 🟡 High | ✅ Done |
| WQ-014 | Blue dot CircleMarker on map showing user's real GPS position (pulsing) | 🟡 High | ✅ Done |
| WQ-015 | Default map center to Mangrove Wonorejo Surabaya + config env vars | 🟡 High | ✅ Done |

### Phase 3: Mobile UX

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-016 | Remove user-scalable=no from viewport meta (WCAG accessibility fix) | 🟡 High | ✅ Done |
| WQ-017 | safe-area-inset for iPhone notch/home indicator (bottom nav + content) | 🟡 High | ✅ Done |
| WQ-018 | Fix viewport height: replace 100vh with dvh + fallback for mobile browsers | 🟡 High | ✅ Done |

### Phase 4: Other Important Fixes

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-019 | Add /sample/:id route + SampleDetail component | 🟡 High | ✅ Done |
| WQ-020 | Fix direct state mutation in SampleForm (use useEffect + setFormData) | 🟡 High | ✅ Done |
| WQ-021 | Deduplicate Location creation (find-or-create by lat/lng proximity) | 🟡 High | ✅ Done |
| WQ-022 | Bundle marker icons locally instead of external CDN | 🟢 Medium | ✅ Done |

**Exit Criteria** ✅ All complete

---

## Milestone 2: Laquatwin Parameters & Data Quality (v0.2.0) ✅ Done

**Goal**: Align the data model and UI with HORIBA Laquatwin pocket meters used in the field.

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-023 | Add conductivity, TDS, salinity, ORP fields to Sample model | 🔴 Blocker | ✅ Done |
| WQ-024 | Update API routes + Zod validation for new fields | 🔴 Blocker | ✅ Done |
| WQ-025 | Restructure SampleForm — group by meter, add unit labels | 🔴 Blocker | ✅ Done |
| WQ-026 | Update SampleDetail + SampleList for new params | 🟡 High | ✅ Done |
| WQ-027 | Update TypeScript types (Sample, CreateSampleInput, UpdateSampleInput) | 🔴 Blocker | ✅ Done |
| WQ-028 | Laquatwin measurement range validation (frontend + backend) | 🟡 High | ✅ Done |

**Exit Criteria** ✅ All complete

---

## Hotfix: Bug Fixes (v0.2.1) ✅ Done

**Goal**: Fix critical bugs found during QC audit. Critical blockers for map rendering and photo upload/display pipeline.

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-029 | Fix CSS `100dvh` fallback order | 🔴 Blocker | ✅ Done |
| WQ-030 | Add `.gitignore` to project | 🔴 Blocker | ✅ Done |
| WQ-031 | Fix SampleList measurement display labels | 🔴 Blocker | ✅ Done |
| WQ-032 | Add Laquatwin fields to SampleMap popup | 🔴 Blocker | ✅ Done |
| WQ-033 | Update seed data with Laquatwin fields | 🔴 Blocker | ✅ Done |
| WQ-044 | Fix map page blank — `.map-container` CSS class collision | 🔴 Blocker | ✅ Done |
| WQ-045 | Fix photo API route mounting mismatch | 🔴 Blocker | ✅ Done |
| WQ-046 | Add `/uploads` proxy to Vite dev config | 🔴 Blocker | ✅ Done |
| WQ-047 | Fix photo URL construction in SampleDetail | 🔴 Blocker | ✅ Done |

**Exit Criteria** ✅ All complete

---

## Milestone 3: Researcher Readiness (v0.3.0) ✅ Done

**Goal**: Make the app genuinely production-usable for field researchers collecting water quality data at Wonorejo mangrove.

### Phase 1: Data Collection Enhancements

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-034 | Photo upload for water samples | 🟡 High | ✅ Done |
| WQ-035 | Data export to CSV | 🟡 High | ✅ Done |
| WQ-036 | Admin dashboard for submission moderation | 🟡 High | ✅ Done |

### Phase 2: Map & Data Visualization

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-037 | Map marker clustering | 🟡 High | ✅ Done |
| WQ-038 | Time-series charts for measurement trends | 🟡 High | ✅ Done |
| WQ-039 | Sample list filtering & sorting | 🟡 High | ✅ Done |

### Phase 3: Production Readiness

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-040 | PWA manifest + service worker | 🟢 Medium | ✅ Done |
| WQ-041 | API pagination | 🟢 Medium | ✅ Done |
| WQ-042 | Testing setup (unit + integration) | 🟢 Medium | ✅ Done |

**Exit Criteria** ✅ All complete

---

## Milestone 4: Admin & Production Readiness (v0.4.0) ✅ Done

**Goal**: Secure the admin dashboard with authentication, add delete functionality, and enhance the admin experience.

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-048 | Admin login with username/password (httpOnly cookie sessions, bcrypt) | 🔴 Blocker | ✅ Done |
| WQ-049 | Admin can delete approved and rejected samples | 🟡 High | ✅ Done |
| WQ-050 | Photo thumbnails, status revert, search by author, sample stats on Admin dashboard | 🟡 High | ✅ Done |

**Exit Criteria** ✅ All complete

| Exit Criteria | Status |
|--------------|--------|
| Admin login works with admin credentials (password set via ADMIN_PASSWORD env var) | ✅ Verified |
| httpOnly cookie session stored and sent on protected requests | ✅ Verified *(Migrated from JWT in WQ-061)* |
| Unauthenticated users redirected to `/admin/login` when accessing `/admin` | ✅ Verified |
| Admin can delete samples with `approved` or `rejected` status | ✅ Verified |
| Photo thumbnails visible on admin sample cards | ✅ Verified |
| Admin can revert `approved` or `rejected` status back to `pending` | ✅ Verified |
| Search filters sample list by author name in real-time | ✅ Verified |
| Stats section shows total, pending, approved, rejected counts | ✅ Verified |
| `npm run lint && npm run typecheck` pass | ✅ Verified |

---

## Hotfix v0.4.1: Security & Reliability Emergency Patch ✅ Done

**Goal**: Close critical vulnerabilities and fix blockers so the app can be safely deployed and installed from scratch. This is an emergency patch; all blockers must pass before v0.5.0 work begins.

**User Decisions:**
- Option A chosen for `.env` removal: remove from git tracking going forward (no history rewrite). Rotate secrets immediately.
- JWT stays in localStorage for v0.4.1/v0.5.0; migrate to httpOnly cookies in future milestone. *(Superseded by WQ-061 — completed in v0.6.0)*

### Phase A: Dependency & Configuration Fixes

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-051 | Fix dependency version typos (dotenv, multer) | 🔴 Blocker | ✅ Done |
| WQ-055 | Remove committed `.env` files from repository | 🔴 Blocker | ✅ Done |
| WQ-081 | Fix TypeScript version mismatch in root `package.json` | 🔴 Blocker | ✅ Done |
| WQ-082 | Add missing `VITE_DEFAULT_LAT`/`LNG` to `vite-env.d.ts` | 🟢 Medium | ✅ Done |

### Phase B: Authentication & Authorization Hardening

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-052 | Remove hardcoded fallback secrets from auth.ts | 🔴 Blocker | ✅ Done |
| WQ-053 | Implement bcryptjs password hashing | 🔴 Blocker | ✅ Done |
| WQ-054 | Add JWT auth middleware to photo routes | 🔴 Blocker | ✅ Done |
| WQ-062 | Add rate limiting to `/auth/login` | 🔴 Blocker | ✅ Done |

### Phase C: Infrastructure Security & Input Sanitization

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-056 | Add Helmet, rate limiting, and request size limits | 🔴 Blocker | ✅ Done |
| WQ-057 | Fix path traversal in photo serving | 🔴 Blocker | ✅ Done |
| WQ-065 | Remove CORS `localhost:5173` fallback | 🔴 Blocker | ✅ Done |

### Phase D: Health & Observability

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-076 | Database health check in `/health` | 🟢 Medium | ✅ Done |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| `npm install` succeeds in `api/` on a fresh clone | ✅ Done |
| No `.env` files tracked in git; `.env.example` present in both `api/` and `web/` | ✅ Done |
| `POST /samples/:id/photos` and `DELETE /photos/:id` return `401` without valid JWT | ✅ Done |
| Admin password is bcrypt-hashed; no plaintext comparison in login | ✅ Done |
| No hardcoded fallback secrets in source code | ✅ Done |
| `helmet`, `express-rate-limit`, and `express.json({ limit })` are active | ✅ Done |
| Photo download path is sanitized (no `../` traversal) | ✅ Done |
| `/health` returns DB connection status (200 if up, 503 if down) | ✅ Done |
| `npm run lint && npm run typecheck` pass in all workspaces | ✅ Done |

---

## Milestone 5: Data Integrity, Performance & UX (v0.5.0) ✅ Done

**Goal**: Make the app trustworthy for researchers in the field. Ensure filtering/search results are complete, offline mode works, and the map doesn't fight the user.

**User Decisions:**
- All filtering moved to backend (remove client-side filtering on paginated views)
- Offline photos: block submission with clear warning (no IndexedDB queue for v0.5.0)
- CSS modules migration: incremental (only components modified in v0.5.0)
- Status enum migration: SQLite-safe temp table approach approved

### Phase 1: PWA & Offline Reliability

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-058 | Fix service worker to cache Vite JS/CSS chunks | 🟡 High | ✅ Done |
| WQ-072 | Photo support in offline mode (block with warning) | 🟡 High | ✅ Done |

### Phase 2: Server-Side Data Integrity

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-059 | Fix client-side filtering on paginated data | 🟡 High | ✅ Done |
| WQ-060 | Add server-side search/filtering (authorName, dates) | 🟡 High | ✅ Done |
| WQ-075 | Server-side sort by measurement parameter | 🟡 High | ✅ Done |

### Phase 3: Field Performance

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-066 | Move image compression to Web Worker | 🟡 High | ✅ Done |
| WQ-067 | Stop map auto-panning on every GPS tick | 🟡 High | ✅ Done |
| WQ-068 | Debounce reverse geocoding (Nominatim) | 🟡 High | ✅ Done |
| WQ-069 | Configure global Axios timeout | 🟡 High | ✅ Done |
| WQ-070 | Optimize map marker rendering (memoization) | 🟡 High | ✅ Done |

### Phase 4: Data Safety

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-064 | Sanitize CSV export against formula injection | 🟡 High | ✅ Done |

### Phase 5: UX & Error Handling

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-073 | 404 page and React Error Boundary | 🟡 High | ✅ Done |
| WQ-074 | Admin notification badge for pending submissions | 🟡 High | ✅ Done |

### Phase 6: Technical Debt

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-077 | Remove unused `User` TypeScript interface | 🟢 Medium | ✅ Done |
| WQ-078 | Convert `Sample.status` from String to Prisma enum | 🟡 High | ✅ Done |
| WQ-079 | Rename `userId` query param to `authorName` | 🟡 High | ✅ Done |
| WQ-080 | Migrate inline `<style>` blocks to CSS modules | 🟢 Medium | ✅ Done |
| WQ-083 | Fix module-level `watchId` in `useGeolocation` hook | 🟡 High | ✅ Done |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| Offline photo submission blocked with clear UX warning | ✅ Done |
| Service worker precaches Vite JS/CSS; app loads offline after first visit | ✅ Done |
| `GET /samples?authorName=...&dateFrom=...&dateTo=...` returns accurate results across full dataset | ✅ Done |
| Client-side author/date filtering removed from SampleList and AdminDashboard | ✅ Done |
| Map does not auto-pan after initial GPS fix; blue dot moves independently | ✅ Done |
| Image compression runs in Web Worker without blocking UI | ✅ Done |
| CSV export sanitizes formula injection payloads | ✅ Done |
| 404 page handles unknown routes; Error Boundary catches JS crashes | ✅ Done |
| Admin badge shows pending count; updates every 30s | ✅ Done |
| `status` is Prisma enum; `userId` param renamed to `authorName` | ✅ Done |
| `npm run lint && npm run typecheck` pass in all workspaces | ✅ Done |

---

## Milestone 6: Secure Auth with httpOnly Cookie Sessions (v0.6.0) ✅ Done

**Goal**: Migrate from JWT-in-localStorage to secure httpOnly cookie sessions with DB-backed user accounts. Remove all localStorage token management. Use express-session with PostgreSQL session store (connect-pg-simple).

**User Approved Decisions:**
- DB-backed users with bcrypt-hashed passwords (one admin account seeded)
- httpOnly cookies replace JWT entirely (no more localStorage tokens)
- express-session + connect-pg-simple for session persistence
- Frontend uses `withCredentials: true` + `GET /auth/me` for session check
- Simplified: no refresh token flow for v0.6.0; session expiry handles re-auth

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-061 | Migrate JWT-in-localStorage to httpOnly cookie sessions (DB-backed users) | 🔴 Blocker | ✅ Done |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| `cd api && npm install` succeeds | ✅ Verified |
| `npx prisma db push` creates UserAccount table | ✅ Verified |
| `npx prisma db seed` creates admin with bcrypt hash | ✅ Verified |
| API starts with session warning in dev | ✅ Verified |
| `POST /auth/login` → 200 + `Set-Cookie: wq.sid` | ✅ Verified |
| `GET /auth/me` with cookie → 200 + user object | ✅ Verified |
| Browser refresh preserves login session | ✅ Verified |
| Sign Out clears cookie, redirects to login | ✅ Verified |
| Protected routes return 401 without cookie | ✅ Verified |
| `npm run typecheck && npm run lint` pass in both workspaces | ✅ Verified |

---

## Milestone 7: LAQUAtwin ISE Fields (v0.7.0) ✅ Done

**Goal**: Add LAQUAtwin ISE (Ion-Selective Electrode) parameters and remove non-LAQUAtwin fields.

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-084 | Add LAQUAtwin ISE (NO₃⁻, Ca²⁺, K⁺, Na⁺) + remove non-LAQUAtwin (DO, turbidity, TDS, ORP) | 🔴 Blocker | ✅ Done |

**Exit Criteria** ✅ All complete

---

## Milestone 8: Metadata Tags & GPS Context (v0.8.0) ✅ Done

**Goal**: Add essential metadata context to every water sample — water body typology, surrounding land use, and GPS accuracy — so researchers understand the environmental context of each measurement.

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-085 | Metadata tags (Water Body Typology, Land Use, GPS Accuracy) | 🔴 Blocker | ✅ Done |

**Exit Criteria** ✅ All complete

| Criteria | Status |
|----------|--------|
| `waterBodyType` and `landUse` are required fields on submission | ✅ Verified |
| 2-step picker UI (category → specific option) with descriptions | ✅ Verified |
| GPS accuracy badge is clickable — shows info popup on tap | ✅ Verified |
| EXIF GPS warning on photo upload (yellow banner, photo kept) | ✅ Verified |
| Metadata displayed in SampleDetail, badges in SampleList/Admin | ✅ Verified |
| CSV export includes Water Body Type and Land Use columns | ✅ Verified |
| `npm run lint && npm run typecheck` pass in both workspaces | ✅ Verified |

---

## Milestone 9: Offline-First Storage Engine (v0.9.0) ✅ Done

**Goal**: Replace localStorage-based offline queue with a production-grade Dexie.js IndexedDB engine. Support zero-loss guarantees, conflict detection (8m radius + same hour), auto-sync, and 30-day purge. Extensible for future data source types.

**User Approved Decisions:**
- Dexie.js v4 as storage engine (extends current system, does not replace)
- 8m duplicate radius (changed from 10m in spec)
- Photos remain blocked offline (WQ-072 preserved)
- Auto-sync when connection restored
- Purge synced records after 30 days; failed/dropped/duplicate retained for 90 days
- Phase 1 (Foundation) only for initial review

### Phase 1: Foundation

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-086 | Dexie.js database schema + dependency install | 🔴 Blocker | ✅ Done |
| WQ-087 | Conflict detection algorithm (Haversine + hour bucket, 8m radius) | 🔴 Blocker | ✅ Done |

### Phase 2: Sync Engine Core

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-088 | Sync engine core (processQueue, retry backoff, auto-purge) | 🔴 Blocker | ✅ Done |
| WQ-089 | useDexieInit hook + App entry point wiring | 🟡 High | ✅ Done |

### Phase 3: Hook & Store Migration

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-090 | Zustand store rewrite + useOfflineSubmission hook | 🟡 High | ✅ Done |
| WQ-091 | useOfflineSync rewrite + OfflineStatusBar component | 🟡 High | ✅ Done |

### Phase 4: Integration & Migration

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-092 | localStorage to Dexie migration (gradual cutover) | 🟢 Medium | ✅ Done |
| WQ-093 | Sync log viewer (dev-only debug route) | 🟢 Medium | ✅ Done |

### Phase 5: Testing & QA

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-094 | Integration & purge tests | 🟡 High | ✅ Done |
| WQ-095 | Full regression testing (lint + typecheck + manual QA) | 🟡 High | ✅ Done |
| WQ-096 | Performance benchmark & mobile compatibility verification | 🟢 Medium | ✅ Done |

**Exit Criteria (Per Phase)**
| Phase | Criteria | Status |
|-------|----------|--------|
| Phase 1 | Dexie schema compiles; types pass `npm run typecheck`; conflict detection unit tests pass | ✅ Done |
| Phase 2 | Sync engine processes queue; retry backoff works; purge removes 30-day records | ✅ Done |
| Phase 3 | `useOfflineSync()` returns correct stats; `Layout.tsx` needs no changes; SampleForm submits to Dexie | ✅ Done |
| Phase 4 | Migration copies old queue without loss; dual-system period stable | ✅ Done |
| Phase 5 | All WQ-001 to WQ-085 features unchanged; bundle size <25KB; 1000-record query <100ms | ✅ Done |

---

## Milestone 10: PostGIS Spatial Analysis & API Gateway (v1.0.0) ✅ Done

**Goal**: Add PostGIS spatial capabilities for accurate radius searches, formalize API Gateway structure with observability middleware, and expose spatial endpoints for frontend integration.

**User Approved Decisions:**
- PostGIS geography column (geodesic calculations, not Cartesian)
- Prisma for standard fields + raw SQL for spatial queries
- Dual-write migration: latitude/longitude kept for backward compatibility
- Request logging with request ID, structured JSON, and timing
- Response envelope for new endpoints only
- Swagger UI at /api/docs for API documentation
- Spatial routes mounted BEFORE general routes to avoid /:id catch-all

### Phase 1: PostGIS Foundation & API Gateway

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-097 | PostGIS extension, migration, schema types | 🔴 Blocker | ✅ Done |
| WQ-098 | Request logging + response envelope middleware | 🟡 High | ✅ Done |
| WQ-099 | Enhanced health checks + middleware wiring | 🟡 High | ✅ Done |
| WQ-100 | OpenAPI/Swagger documentation setup | 🟢 Medium | ✅ Done |

### Phase 2: Spatial Endpoints

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-101 | /locations/nearby + /samples/nearby endpoints | 🔴 Blocker | ✅ Done |
| WQ-102 | PostGIS location deduplication rewrite | 🔴 Blocker | ✅ Done |

### Phase 3: Frontend Integration

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-103 | Frontend useNearbySamples hook + map integration | 🟡 High | ✅ Done |
| WQ-104 | NearbySamplesPanel + radius slider UI | 🟡 High | ✅ Done |

### Phase 4: Testing

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-105 | Unit tests for spatial endpoints | 🟢 Medium | ✅ Done |
| WQ-106 | Performance benchmark + migration safety test | 🟢 Medium | ✅ Done |
| WQ-107 | Full regression (lint/typecheck/manual QA) | 🟡 High | ✅ Done |

**Exit Criteria (Per Phase)**
| Phase | Criteria | Status |
|-------|----------|--------|
| Phase 1 | PostGIS installed, geog column migrated, health check shows PostGIS, Swagger UI renders, request logging works | ✅ Done |
| Phase 2 | /locations/nearby and /samples/nearby return correct distances via ST_DWithin; location dedup uses PostGIS | ✅ Done |
| Phase 3 | Pin placement with auto-search, radius slider, and GPS fallback all work | ✅ Done |
| Phase 4 | Spatial endpoint tests pass; performance benchmark: nearby query <500ms with 10k locations | ✅ Done |

---

## Milestone 11: Data Quality Scoring (v1.1.0) ✅ Done

**Goal**: Make crowdsourced water quality data scientifically defensible through automated quality assurance.

**User Approved Decisions:**
- Research context: urban-area water quality monitoring (mangrove/coastal/estuarine environments)
- Temporal consistency fallback: compare against same `waterBodyType` when location has <3 historical samples

### Phase 1: Data Quality Scoring

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-108 | Data Quality Scoring Engine | 🔴 Blocker | ✅ Done |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| `qualityScore` field exists in Prisma schema with index | ✅ Done |
| Creating a sample triggers score calculation within 200ms | ✅ Done |
| `GET /samples/:id/quality-score` returns 6-factor breakdown | ✅ Done |
| Frontend badge renders correctly (green/yellow/red/gray) | ✅ Done |
| Admin can filter samples by `qualityScore ≥ 0.8` | ✅ Done |
| `npm run lint && npm run typecheck` pass in all workspaces | ✅ Done |

---

## Hotfix v1.1.1: Pre-Deployment Security & Production Readiness ✅ Done

**Goal**: Close security vulnerabilities and production blockers so the app can be safely deployed behind a reverse proxy. All blockers must pass before any public deployment.

**User Approved Decisions:**
- Seed script reads `ADMIN_PASSWORD` from env (no hardcoded passwords)
- Admin can change password via AdminDashboard form
- Single session only — new login or password change kills all other sessions
- Login history visible in AdminDashboard (LoginLog table)
- Session invalidation uses PostgreSQL session table JSON query

### Phase A: Critical Security Blockers

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-111 | Add `trust proxy` config for reverse proxy (rate limiting fix) | 🔴 Blocker | ✅ Done |
| WQ-112 | Fix API build to include `prisma generate` before `tsc` | 🔴 Blocker | ✅ Done |
| WQ-113 | Add CSP allowed domains for external stylesheets (Leaflet, Google Fonts) | 🔴 Blocker | ✅ Done |
| WQ-114 | Seed script reads `ADMIN_PASSWORD` from env + change password endpoint + single session enforcement + login history | 🔴 Blocker | ✅ Done |
| WQ-115 | Remove session secret fallback (fail unconditionally if missing) | 🔴 Blocker | ✅ Done |

### Phase B: Authentication & Security Hardening

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-116 | Use async `bcrypt.compare` instead of blocking `compareSync` | 🟡 High | ✅ Done |
| WQ-117 | Fix auth middleware role default (fail closed, not default to admin) | 🟡 High | ✅ Done |
| WQ-118 | Add max length to login password field (prevent bcrypt CPU exhaustion) | 🟡 High | ✅ Done |
| WQ-119 | Sanitize health endpoint (remove PostGIS version leak) | 🟡 High | ✅ Done |
| WQ-120 | Remove duplicate `/uploads` static serving route | 🟡 High | ✅ Done |
| WQ-121 | Ensure `uploads/` directory exists at startup | 🟡 High | ✅ Done |

**Exit Criteria** ✅ All complete

---

## Milestone 12: User Accounts & Data Isolation (v1.2.0) ✅ Done

**Goal**: Implement user accounts with self-registration, data isolation (each user sees only their own samples), admin user management, and password reset capability.

**User Approved Decisions:**
- Self-registration with name, username, password (bcrypt)
- Login required for sample submission (view remains public)
- `authorName` auto-filled from user account (not manual)
- Admin can manage users (list, create, deactivate, reset password)
- User deletion = deactivate only (preserve data)
- Admin dashboard has two tabs: Samples + Users
- Existing anonymous samples remain viewable (backward compatible)

### Phase 1: Database & Schema

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-122 | Prisma schema: add `user` role, `name` field, `active` field, `userId` on Sample | 🔴 Blocker | ✅ Done |

### Phase 2: Backend Auth

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-123 | Register endpoint + schema + seed admin name | 🔴 Blocker | ✅ Done |
| WQ-124 | Sample submit requires login | 🔴 Blocker | ✅ Done |
| WQ-125 | Data isolation — GET /samples filters by userId for non-admins | 🔴 Blocker | ✅ Done |
| WQ-136 | Registration rate limiting (5/15min per IP) | 🟡 High | ✅ Done |

### Phase 3: Backend User Management

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-126 | User management CRUD (admin) — list, create, deactivate | 🟡 High | ✅ Done |
| WQ-135 | Admin password reset from user management | 🟡 High | ✅ Done |
| WQ-138 | Kill user sessions on admin password reset | 🟡 High | ✅ Done |
| WQ-140 | Generate temp password on admin user creation | 🟡 High | ✅ Done |

### Phase 4: Frontend Auth

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-128 | Frontend Register page + route | 🟡 High | ✅ Done |
| WQ-129 | Sample form — require login, auto-fill authorName | 🟡 High | ✅ Done |
| WQ-131 | AuthContext — add register method | 🟡 High | ✅ Done |

### Phase 5: Admin UI

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-127 | Admin dashboard — add Users tab (structure) | 🟡 High | ✅ Done |
| WQ-130 | User management UI — list, create, deactivate, password reset | 🟡 High | ✅ Done |

### Phase 6: Backward Compatibility & Polish

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-132 | Backward compatibility — existing samples stay viewable | 🟢 Medium | ✅ Done |

### Phase 7: Testing

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-133 | Unit tests for user registration + data isolation | 🟡 High | ✅ Done |
| WQ-134 | Full regression testing | 🟡 High | ✅ Done |

---

## Hotfix v1.3.1: Critical Bug Fixes ✅ Done

**Goal**: Fix 5 critical functional bugs found during post-Phase-1 audit. These bugs affect data integrity, security, and core UX.

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-141 | Fix health check returns 200 when PostGIS is down | 🔴 Blocker | ✅ Done |
| WQ-142 | Fix delete sample deletes files before DB transaction | 🔴 Blocker | ✅ Done |
| WQ-143 | Fix admin action buttons nested inside Link | 🔴 Blocker | ✅ Done |
| WQ-144 | Scope draft storage to user | 🔴 Blocker | ✅ Done |
| WQ-145 | Fix MapContainer ref in MapPicker | 🟡 High | ✅ Done |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| Health check returns 503 when PostGIS is down | ✅ Done |
| File deletion happens after successful DB transaction | ✅ Done |
| Clicking admin buttons does not trigger navigation | ✅ Done |
| Draft storage is scoped to authenticated user | ✅ Done |
| No dead ref code in MapPicker | ✅ Done |

---



## Milestone 13: Code Quality & Architecture (v1.3.0) ✅ Done

**Goal**: Refactor oversized components, extract shared utilities, and establish patterns for long-term maintainability.

### Phase 1: Extract Shared Utilities

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-146 | Extract shared display utilities (getKeyMeasurements, formatDate, truncateAddress) | 🟡 High | ✅ Done |
| WQ-147 | Extract shared useDebounce hook | 🟡 High | ✅ Done |
| WQ-148 | Extract photo ownership middleware | 🟢 Medium | ✅ Done |
| WQ-149 | Extract quality scoring SQL helper | 🟢 Medium | ✅ Done |

### Phase 2: Split Oversized Components

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-150 | Split AdminDashboard (1213→999 lines) — extract PasswordChangeForm, LoginHistoryPanel | 🟡 High | ✅ Done |
| WQ-151 | Split SampleForm (1442→1332 lines) — extract useImageCompression, AccuracyModal | 🟡 High | ✅ Done |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| Shared display utilities exist in one file | ✅ Done |
| useDebounce hook used by AdminDashboard | ✅ Done |
| AdminDashboard reduced from 1213→999 lines (270 line reduction) | ✅ Done |
| SampleForm reduced from 1442→1332 lines (110 line reduction) | ✅ Done |
| AdminPasswordChange, AdminLoginHistory, imageCompression, AccuracyInfoModal extracted | ✅ Done |
| All existing tests pass | ✅ Done |

---

## Milestone 14: Security Hardening (v1.3.1) ✅ Done

**Goal**: Close remaining security gaps. Strengthen CSP, add auth to photo serving, fix race conditions.

### Phase A: CSP & Security Headers

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-155 | Remove 'unsafe-inline' from CSP scriptSrc (nonce-based) | 🔴 Blocker | ✅ Done |
| WQ-156 | Add helmet() for full security headers (HSTS, X-Frame-Options) | 🟡 High | ✅ Done |

### Phase B: Auth & Data Protection

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-157 | Add auth to photo serving route | 🟡 High | ✅ Done |
| WQ-158 | Wrap location dedup in database transaction | 🟡 High | ✅ Done |
| WQ-159 | Add export-specific rate limiting | 🟡 High | ✅ Done |
| WQ-160 | Fix temp password modulo bias | 🟢 Medium | ✅ Done |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| CSP header has no 'unsafe-inline' in scriptSrc | ✅ Done |
| Response headers include HSTS, X-Frame-Options, X-Content-Type-Options | ✅ Done |
| Photo serving requires authentication | ✅ Done |
| Concurrent location creation produces no duplicates (transactional) | ✅ Done |
| Export rate limited to 10 req/min | ✅ Done |
| Temp passwords use crypto.randomInt | ✅ Done |
| All 278 existing tests pass | ✅ Done |

---

## Milestone 15: Accessibility & UX (v1.4.0) ✅ Done

**Goal**: Make the app accessible to all users. Meet WCAG 2.1 AA standards.

### Phase A: Critical Accessibility Fixes

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-161 | Add aria-label to map control buttons | 🟡 High | ✅ Done |
| WQ-162 | Add role="alert" to error banners | 🟡 High | ✅ Done |
| WQ-163 | Add aria-live to offline status bar | 🟡 High | ✅ Done |

### Phase B: Keyboard Navigation

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-164 | Add keyboard navigation to photo gallery | 🟡 High | ✅ Done |
| WQ-165 | Add focus indicators to photo gallery items | 🟡 High | ✅ Done |
| WQ-166 | Add aria-selected to admin tab navigation | 🟡 High | ✅ Done |
| WQ-167 | Restore focus on lightbox close | 🟡 High | ✅ Done |

### Phase C: Screen Reader Support

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-168 | Add accessible alternative for TrendChart | 🟢 Medium | ✅ Done |
| WQ-169 | Add caption/aria-label to user management table | 🟢 Medium | ✅ Done |
| WQ-170 | Add aria-expanded to collapsible sections | 🟢 Medium | ✅ Done |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| All interactive buttons have accessible names | ✅ Done |
| Error banners announced by screen readers | ✅ Done |
| Offline status changes announced | ✅ Done |
| Photo gallery navigable by keyboard | ✅ Done |
| All interactive elements have visible focus indicators | ✅ Done |
| Admin tabs properly labeled for screen readers | ✅ Done |
| Focus returns to trigger element after modal close | ✅ Done |
| All 278 existing tests pass | ✅ Done |

---

## Milestone 16: Performance & Bundle Optimization (v1.4.1) ✅ Done

**Goal**: Reduce bundle size, optimize API queries, improve field performance.

### Phase A: Bundle Optimization

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-171 | Lazy load route components with React.lazy | 🟡 High | ✅ Done |
| WQ-172 | Lazy load Chart.js (dynamic import) | 🟡 High | ✅ Done |

### Phase B: API Optimization

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-173 | Create dedicated GET /samples/stats endpoint | 🟡 High | ✅ Done |
| WQ-174 | Add pagination cursor to /samples/markers | 🟡 High | ✅ Done |
| WQ-175 | Optimize Dexie stats refresh | 🟢 Medium | ✅ Done |

### Phase C: Frontend Performance

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-176 | Add debounce to form geocoding | 🟡 High | ✅ Done |
| WQ-177 | Add pagination to MySamplesPage | 🟡 High | ✅ Done |
| WQ-178 | Fix quality score retry on creation failure | 🟢 Medium | ✅ Done |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| Initial bundle size reduced by ≥25% | ✅ Done |
| Chart.js not in initial bundle | ✅ Done |
| /samples/stats returns counts in single query | ✅ Done |
| /samples/markers supports pagination | ✅ Done |
| Dexie stats refresh uses `.count()` not `.toArray()` | ✅ Done |
| Form geocoding debounced at 500ms | ✅ Done |
| MySamplesPage supports >100 samples | ✅ Done |
| All existing tests pass | ✅ Done |

---

## Milestone 17: Testing Coverage (v1.4.2) ✅ Done

**Goal**: Close critical testing gaps. Add E2E tests, integration tests, and component tests.

### Phase A: E2E Tests (Playwright)

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-179 | Set up Playwright test infrastructure | 🔴 Blocker | ✅ Done |
| WQ-180 | E2E: Submit water sample journey | 🔴 Blocker | 📝 Planned |
| WQ-181 | E2E: Admin moderation journey | 🟡 High | 📝 Planned |

### Phase B: API Integration Tests

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-182 | Photo upload/serving/deletion integration tests | 🟡 High | ✅ Done |
| WQ-183 | Quality scoring service unit tests | 🟡 High | ✅ Done |
| WQ-184 | CSP middleware tests | 🟢 Medium | ✅ Done |

### Phase C: Frontend Component Tests

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-185 | AdminUsersTab component tests | 🟢 Medium | ✅ Done |
| WQ-186 | TrendChart component tests | 🟢 Medium | ✅ Done |
| WQ-187 | useFocusTrap hook tests | 🟢 Medium | ✅ Done |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| Playwright installed and configured | ✅ Done |
| E2E test: full submit journey passes | 📝 Pending (requires full stack) |
| E2E test: admin moderation journey passes | 📝 Pending (requires full stack) |
| Photo route integration tests cover upload/serve/delete | ✅ Done |
| Quality scoring has unit tests for all 6 factors | ✅ Done |
| CSP middleware tested | ✅ Done |
| AdminUsersTab, TrendChart, useFocusTrap have component tests | ✅ Done |
| Total test count: 278 (147 API + 131 web) | ✅ Done |

---

## Milestone 18: DevOps & Deployment (v1.5.0) ✅ Done

**Goal**: Enable reproducible deployments with Docker, automated CI/CD, and production-ready configuration.

### Phase A: Docker

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-188 | Create Dockerfile for api | 🟡 High | ✅ Done |
| WQ-189 | Create Dockerfile for web (multi-stage, nginx) | 🟡 High | ✅ Done |
| WQ-190 | Create docker-compose.yml | 🟡 High | ✅ Done |

### Phase B: CI/CD

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-191 | GitHub Actions CI (lint + typecheck + test) | 🟡 High | ✅ Done |
| WQ-192 | GitHub Actions Docker build on main | 🟢 Medium | ✅ Done |

### Phase C: Production Configuration

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-193 | Startup environment validation | 🟡 High | ✅ Done |
| WQ-194 | Add request timeout middleware | 🟢 Medium | ✅ Done |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| docker-compose up starts full stack | ✅ Done |
| GitHub Actions CI runs on every push | ✅ Done |
| Startup validates all required env vars | ✅ Done |

---

## Hotfix v1.5.1: Post-Audit Security & Reliability ✅ Done

**Goal**: Close 6 issues surfaced by the 2026-06-13 deep audit. Five are server-side correctness/security holes; one is a frontend regression in the WQ-200 copy-coords button. All small, isolated, and targeted at the next public deployment. No schema migrations.

**User Approved Decisions:**
- Option A chosen for WQ-205: extract `findOrCreateLocation` to shared module, reuse in both `samples.ts` and `locations.ts`
- `MAX_EXPORT_ROWS = 50000` for WQ-206
- Bcrypt cost 12 for WQ-207
- Error label "Copy failed" for WQ-208

### Phase A: Critical Security & Correctness

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-203 | Fix `/health` returning 200 when `session` table is broken | 🔴 Blocker | ✅ Done |
| WQ-204 | Replace `x-forwarded-for` parsing with `req.ip` (audit log integrity) | 🔴 Blocker | ✅ Done |
| WQ-205 | Dedupe `POST /api/v1/locations` via PostGIS proximity (10m) | 🔴 Blocker | ✅ Done |
| WQ-206 | Cap CSV export at 50,000 rows + overflow header | 🔴 Blocker | ✅ Done |

### Phase B: Hardening & Polish

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-207 | Unify bcrypt cost factor at 12 across all hash sites | 🟡 High | ✅ Done |
| WQ-208 | WQ-200 copy-coords: fallback + error handling | 🟡 High | ✅ Done |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| `/health` returns 503 when sessions table query throws | ✅ Done |
| `LoginLog.ipAddress` is `req.ip` (not spoofable header) | ✅ Done |
| Production startup warns when `TRUST_PROXY!=='true'` | ✅ Done |
| `POST /api/v1/locations` respects 10m dedup invariant | ✅ Done |
| CSV export caps at 50,000 rows + sets `X-Export-Truncated` header on overflow | ✅ Done |
| All 5 bcrypt sites use shared `BCRYPT_COST = 12` constant | ✅ Done |
| Copy coords button has `execCommand` fallback + visible error state on failure | ✅ Done |
| No unhandled promise rejection on copy in any environment | ✅ Done |
| All 284 tests pass (153 API + 131 web) | ✅ Done |
| `npm run lint && npm run typecheck && npm run build` clean in both workspaces | ✅ Done |

---

## Future Backlog 📝 Planned

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-071 | AI Analysis microservice skeleton | 🟢 Medium | 📝 Planned |
| WQ-109 | Spatial Interpolation Heatmap (IDW) | 🟡 High | 📝 Planned |
| WQ-110 | ML Prediction Engine (Random Forest/XGBoost) | 🟢 Medium | 📝 Future Backlog |
| WQ-152 | Migrate AdminDashboard inline styles to CSS modules | 🟢 Medium | 📝 Future Backlog |
| WQ-153 | Migrate SampleForm inline styles to CSS modules | 🟢 Medium | 📝 Future Backlog |
| WQ-154 | Migrate SampleMap inline styles to CSS modules | 🟢 Medium | 📝 Future Backlog |
| WQ-195 | Batch approve/reject in admin | 🟡 High | 📝 Future Backlog |
| WQ-196 | User-initiated password reset | 🟡 High | 📝 Future Backlog |
| WQ-197 | Dark mode support | 🟢 Medium | 📝 Future Backlog |
| WQ-198 | Offline data export/backup | 🟢 Medium | 📝 Future Backlog |
| WQ-199 | Sample data audit trail | 🟢 Medium | 📝 Future Backlog |
| WQ-200 | Copy coordinates button | 🟢 Low | ✅ Done |
| WQ-201 | Keyboard shortcut for form submit (Ctrl+Enter) | 🟢 Low | ✅ Done |
| WQ-202 | Search on map page | 🟢 Low | 📝 Future Backlog |

**Notes:**
- WQ-071 deferred until concrete AI model/requirements defined by research team
- WQ-109 has spec at `docs/wq-109-spatial-interpolation-heatmap-spec.md`
- WQ-110 deferred until ≥200 samples collected

---

## How to Update This File

- **Lead Manager**: Add new milestones and features. Move features between milestones if scope changes.
- **All agents**: Do NOT change a milestone's exit criteria without user approval.
