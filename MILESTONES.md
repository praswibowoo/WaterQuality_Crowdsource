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
| Admin login works with username "admin" and password "admin123" | ✅ Verified |
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

## Milestone 7.5: LAQUAtwin ISE Fields (v0.7.0) ✅ Done

**Goal**: Add LAQUAtwin ISE (Ion-Selective Electrode) parameters and remove non-LAQUAtwin fields.

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-084 | Add LAQUAtwin ISE (NO₃⁻, Ca²⁺, K⁺, Na⁺) + remove non-LAQUAtwin (DO, turbidity, TDS, ORP) | 🔴 Blocker | ✅ Done |

**Exit Criteria** ✅ All complete

---

## Milestone 7: Metadata Tags & GPS Context (v0.8.0) ✅ Done

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

## Milestone 8: Offline-First Storage Engine (v0.9.0) ✅ Done

**Goal**: Replace localStorage-based offline queue with a production-grade Dexie.js IndexedDB engine. Support zero-loss guarantees, conflict detection (8m radius + same hour), auto-sync, and 30-day purge. Extensible for future data source types.

**User Approved Decisions:**
- Dexie.js v4 as storage engine (extends current system, does not replace)
- 8m duplicate radius (changed from 10m in spec)
- Photos remain blocked offline (WQ-072 preserved)
- Auto-sync when connection restored
- Purge synced records after 30 days; failed/dropped/duplicate retained for 90 days
- Phase 1 (Foundation) only for initial review

### Phase 1: Foundation (Current)

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-086 | Dexie.js database schema + dependency install | 🔴 Blocker | ✅ Done |
| WQ-087 | Conflict detection algorithm (Haversine + hour bucket, 8m radius) | 🔴 Blocker | ✅ Done |

### Phase 2: Sync Engine Core (Complete)

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-088 | Sync engine core (processQueue, retry backoff, auto-purge) | 🔴 Blocker | ✅ Done |
| WQ-089 | useDexieInit hook + App entry point wiring | 🟡 High | ✅ Done |

### Phase 3: Hook & Store Migration (Complete)

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-090 | Zustand store rewrite + useOfflineSubmission hook | 🟡 High | ✅ Done |
| WQ-091 | useOfflineSync rewrite + OfflineStatusBar component | 🟡 High | ✅ Done |

### Phase 4: Integration & Migration (Complete)

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-092 | localStorage to Dexie migration (gradual cutover) | 🟢 Medium | ✅ Done |
| WQ-093 | Sync log viewer (dev-only debug route) | 🟢 Medium | ✅ Done |

### Phase 5: Testing & QA (Complete)

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

## Milestone 9: PostGIS Spatial Analysis & API Gateway (v1.0.0) ✅ Done

**Goal**: Add PostGIS spatial capabilities for accurate radius searches, formalize API Gateway structure with observability middleware, and expose spatial endpoints for frontend integration.

**User Approved Decisions:**
- PostGIS geography column (geodesic calculations, not Cartesian)
- Prisma for standard fields + raw SQL for spatial queries
- Dual-write migration: latitude/longitude kept for backward compatibility
- Request logging with request ID, structured JSON, and timing
- Response envelope for new endpoints only
- Swagger UI at /api/docs for API documentation
- Spatial routes mounted BEFORE general routes to avoid /:id catch-all

### Phase 1: PostGIS Foundation & API Gateway (Complete)

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-097 | PostGIS extension, migration, schema types | 🔴 Blocker | ✅ Done |
| WQ-098 | Request logging + response envelope middleware | 🟡 High | ✅ Done |
| WQ-099 | Enhanced health checks + middleware wiring | 🟡 High | ✅ Done |
| WQ-100 | OpenAPI/Swagger documentation setup | 🟢 Medium | ✅ Done |

### Phase 2: Spatial Endpoints (Complete)

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-101 | /locations/nearby + /samples/nearby endpoints | 🔴 Blocker | ✅ Done |
| WQ-102 | PostGIS location deduplication rewrite | 🔴 Blocker | ✅ Done |

### Phase 3: Frontend Integration (Complete)

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-103 | Frontend useNearbySamples hook + map integration | 🟡 High | ✅ Done |
| WQ-104 | NearbySamplesPanel + radius slider UI | 🟡 High | ✅ Done |

### Phase 4: Testing (Complete)

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

## Milestone 10: Data Quality Scoring & Spatial Interpolation (v1.1.0) ✅ Phase 1 Complete

**Goal**: Make crowdsourced water quality data scientifically defensible through automated quality assurance, and enable spatial pattern visualization via geostatistical interpolation.

**User Approved Decisions:**
- Research context: urban-area water quality monitoring (mangrove/coastal/estuarine environments)
- Color scale: Viridis (colorblind-safe, perceptually uniform)
- Temporal consistency fallback: compare against same `waterBodyType` when location has <3 historical samples
- Implementation order: WQ-108 first (backend scoring), then WQ-109 (frontend heatmap) after WQ-108 is verified bug-free
- WQ-110 deferred until sample count ≥ 200 with temporal spread across ≥ 3 seasons

### Phase 1: Data Quality Scoring (Complete)

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

### Phase 2: Spatial Interpolation Heatmap (Planned)

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-109 | Spatial Interpolation Heatmap (IDW) | 🟡 High | 📝 Planned |

**Exit Criteria**
| Criteria | Status |
|----------|--------|
| IDW computation produces mathematically correct results | 📝 Pending |
| Heatmap overlay renders on SampleMap without blocking UI | 📝 Pending |
| Parameter selector includes all 8 measurement fields | 📝 Pending |
| Power slider (1.0–4.0) changes interpolation smoothness | 📝 Pending |
| Viridis color scale is colorblind-safe | 📝 Pending |
| All tests pass; lint/typecheck clean; bundle increase <15KB | 📝 Pending |

### Phase 3: ML Prediction Engine (Future Backlog)

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-110 | ML Prediction Engine (Random Forest/XGBoost) | 🟢 Medium | 📝 Future Backlog |

**Trigger Condition:** `Sample` count ≥ 200 and temporal spread covers ≥ 3 seasons.

---

## Hotfix v1.1.1: Pre-Deployment Security & Production Readiness ✅ Done

**Goal**: Close security vulnerabilities and production blockers so the app can be safely deployed behind a reverse proxy. All blockers must pass before any public deployment.

**User Approved Decisions:**
- Seed script reads `ADMIN_PASSWORD` from env (no hardcoded passwords)
- Admin can change password via AdminDashboard form
- Single session only — new login or password change kills all other sessions
- Login history visible in AdminDashboard (LoginLog table)
- Session invalidation uses PostgreSQL session table JSON query

### Phase A: Critical Security Blockers (Complete)

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-111 | Add `trust proxy` config for reverse proxy (rate limiting fix) | 🔴 Blocker | ✅ Done |
| WQ-112 | Fix API build to include `prisma generate` before `tsc` | 🔴 Blocker | ✅ Done |
| WQ-113 | Add CSP allowed domains for external stylesheets (Leaflet, Google Fonts) | 🔴 Blocker | ✅ Done |
| WQ-114 | Seed script reads `ADMIN_PASSWORD` from env + change password endpoint + single session enforcement + login history | 🔴 Blocker | ✅ Done |
| WQ-115 | Remove session secret fallback (fail unconditionally if missing) | 🔴 Blocker | ✅ Done |

### Phase B: Authentication & Security Hardening (Complete)

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

## Milestone 11: User Accounts & Data Isolation (v1.2.0) ✅ Done

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

## Future: AI Analysis (v0.7.0+) 📝 Planned

**Goal**: Scope and implement the AI microservice for water quality analysis.

| Feature ID | Feature | Priority | Status |
|------------|---------|----------|--------|
| WQ-071 | AI Analysis microservice skeleton | 🟢 Medium | 📝 Planned |

**Notes:**
- WQ-063 CSP completed in v1.0.0 (PostGIS milestone)
- WQ-071 deferred until concrete AI model/requirements defined by research team

---

## How to Update This File

- **Lead Manager**: Add new milestones and features. Move features between milestones if scope changes.
- **All agents**: Do NOT change a milestone's exit criteria without user approval.
