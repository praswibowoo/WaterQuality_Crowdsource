# Water Quality Crowdsource

A **Progressive Web App (PWA)** for crowdsourcing water-quality data collection at Mangrove Wonorejo, Surabaya. Field researchers and citizen scientists can submit water sample measurements, view data on an interactive map, and track trends over time — all with offline support.

![Version](https://img.shields.io/badge/version-1.5.0-blue)

---



## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **PostgreSQL** >= 14 with **PostGIS** extension (running locally or accessible via URL)
- A modern browser (Chrome, Firefox, Safari, Edge)

---

## Quick Start

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd water-quality-crowdsource

# Install root workspace dependencies
npm install

# Install backend dependencies
cd api && npm install && cd ..

# Install frontend dependencies
cd web && npm install && cd ..
```

> The project uses npm workspaces. The root `package.json` orchestrates both `api/` and `web/`.

### 2. Set up environment variables

Copy the example files and edit them with your local configuration.

**Backend** (`api/.env`):

```bash
cp api/.env.example api/.env
```

Edit `api/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/waterquality?schema=public"
PORT=3001
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=change-me-to-a-random-secret
ADMIN_PASSWORD=change-me-to-a-strong-password
NODE_ENV=development
CSP_ENFORCE_MODE=false
CSP_TILE_DOMAINS=https://tile.openstreetmap.org,https://*.tile.openstreetmap.org
```

**Frontend** (`web/.env`):

```bash
cp web/.env.example web/.env
```

Edit `web/.env`:

```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_DEFAULT_LAT=-7.3059612
VITE_DEFAULT_LNG=112.8443053
```

See the [Environment Variables](#environment-variables) section for detailed descriptions of each variable.

> **Security note**: Real `.env` files are excluded from version control via `.gitignore`. Never commit secrets.

### 3. Set up the database

Enable PostGIS (if not already enabled):

```bash
psql -d waterquality -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

Generate the Prisma client and run migrations:

```bash
# Generate the Prisma client library
npx prisma generate

# Create and apply the initial migration
# (Run from within prisma/ so the seed script resolves correctly)
cd prisma && npx prisma migrate dev --name init && cd ..

# Seed the database with sample data
cd prisma && npx prisma db seed && cd ..
```

This will:
- Enable PostGIS spatial features
- Generate the Prisma client library
- Create the database tables (Location, Sample, Photo, UserAccount)
- Seed the database with 4 sample water-quality entries near Mangrove Wonorejo
- Set the PostGIS geography column for existing locations

> Alternatively, use the workspace scripts defined in root `package.json`:
> ```bash
> npm run db:migrate
> npm run db:seed
> ```

### 4. Start the backend

```bash
cd api
npm run dev
```

The API server starts at **http://localhost:3001** with hot-reload via `tsx watch`.

Verify it's running:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-05-25T...",
  "checks": { "database": "up", "postgis": "up", "sessions": "up" }
}
```

The `/health` endpoint confirms the server, database, PostGIS, and session store are operational.

### 5. Start the frontend

Open a **separate terminal** and run:

```bash
cd web
npm run dev
```

The Vite dev server starts at **http://localhost:5173** with HMR (Hot Module Replacement).

Vite proxies all `/api` and `/uploads` requests to the backend at `http://localhost:3001`, so you don't need to configure CORS in development.

### 6. Open the app

Navigate to **http://localhost:5173** in your browser. You should see the map centered on Mangrove Wonorejo, Surabaya.

---

## Available Commands

### Frontend (`web/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check (zero-warnings mode) |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm run test` | Run Vitest unit tests |
| `npm run test:watch` | Run tests in watch mode |

### Backend (`api/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot-reload (port 3001) |
| `npm run build` | TypeScript compilation |
| `npm run start` | Run compiled production build |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run Jest integration tests |
| `npm run test:watch` | Run tests in watch mode |

### Database (`prisma/`)

| Command | Description |
|---------|-------------|
| `npx prisma migrate dev --name <name>` | Create and apply a migration |
| `npx prisma db push` | Push schema changes without a migration |
| `npx prisma db seed` | Run the seed script |
| `npx prisma studio` | Open Prisma Studio (GUI database browser) |
| `npx prisma generate` | Regenerate Prisma client |
| `npx prisma migrate reset` | Drop, recreate, and seed the database |

### Root workspace

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend concurrently |
| `npm run build` | Build the frontend for production |
| `npm run lint` | Lint both workspaces |
| `npm run typecheck` | Type-check both workspaces |
| `npm run test` | Run tests in both workspaces |

---

## Project Structure

```
water-quality-crowdsource/
├── api/                          # Express backend
│   ├── src/
│   │   ├── index.ts              # Server entry point (CORS, helmet, rate limits, routes)
│   │   ├── db/
│   │   │   └── prisma.ts         # Prisma client singleton
│   │   ├── routes/
│   │   │   ├── samples.ts        # CRUD for water samples (PostGIS location dedup)
│   │   │   ├── photos.ts         # Photo upload/serve/delete
│   │   │   ├── locations.ts      # Location CRUD
│   │   │   ├── export.ts         # CSV data export
│   │   │   ├── auth.ts           # Admin session-based login
│   │   │   ├── health.ts         # Enhanced health (DB + PostGIS + sessions)
│   │   │   ├── docs.ts           # Swagger UI at /api/docs
│   │   │   └── spatial.ts        # PostGIS radius search endpoints
│   │   ├── middleware/
│   │   │   ├── auth.ts           # Session verification middleware
│   │   │   ├── errorHandler.ts   # Error handling & async wrapper
│   │   │   ├── requestLogger.ts  # Structured JSON request logging
│   │   │   ├── responseEnvelope.ts # { success, data } response wrapper
│   │   │   └── spatialRateLimit.ts# Tiered rate limiting (200/15min spatial)
│   │   ├── validators/
│   │   │   └── schemas.ts        # Zod validation schemas
│   │   ├── scripts/
│   │   │   └── migratePostGIS.ts # One-time migration of locations to PostGIS
│   │   └── __tests__/            # Backend integration tests
│   ├── uploads/                  # Uploaded photo files (gitignored)
│   └── package.json
│
├── web/                          # React Vite frontend
│   ├── src/
│   │   ├── main.tsx              # App entry point
│   │   ├── App.tsx               # Router + layout + Dexie init guard
│   │   ├── components/           # Reusable UI components
│   │   │   ├── SampleForm.tsx    # Water quality submission form
│   │   │   ├── SampleMap.tsx     # Leaflet map with pin search + markers
│   │   │   ├── SampleList.tsx    # Filterable sample list
│   │   │   ├── SampleDetail.tsx  # Single sample detail view
│   │   │   ├── TrendChart.tsx    # Time-series chart (Chart.js)
│   │   │   ├── MapPicker.tsx     # GPS coordinate picker on map
│   │   │   ├── GPSBadge.tsx      # GPS accuracy indicator
│   │   │   ├── BlueDot.tsx       # Real-time position marker
│   │   │   ├── AdminDashboard.tsx # Moderation dashboard
│   │   │   ├── NearbySamplesPanel.tsx # PostGIS radius search UI
│   │   │   ├── OfflineStatusBar.tsx    # Offline sync status banner
│   │   │   ├── SyncLogViewer.tsx       # Dev debug sync log table
│   │   │   ├── ErrorBoundary.tsx       # React error boundary
│   │   │   ├── NotFoundPage.tsx        # 404 page
│   │   │   ├── MetadataPicker.tsx      # Water body / land use picker
│   │   │   └── ...               # Other components
│   │   ├── hooks/
│   │   │   ├── useGeolocation.ts # Real-time GPS tracking
│   │   │   ├── useSamples.ts     # TanStack Query hooks
│   │   │   ├── useOfflineSync.ts # Dexie-backed sync monitor
│   │   │   ├── useOfflineSubmission.ts # Submit with offline fallback
│   │   │   ├── useDexieInit.ts   # IndexedDB initialization guard
│   │   │   ├── useNearbySamples.ts # PostGIS spatial search hook
│   │   │   └── usePendingCount.ts# Admin pending badge
│   │   ├── db/                   # Offline-first Dexie.js storage engine
│   │   │   ├── offlineDatabase.ts    # IndexedDB schema + singleton
│   │   │   ├── conflictDetection.ts  # 8m Haversine duplicate detection
│   │   │   ├── syncEngine.ts         # State machine + retry backoff
│   │   │   ├── purge.ts              # 30d auto-purge logic
│   │   │   ├── migrateFromLocalStorage.ts # Legacy data migration
│   │   │   └── __tests__/            # Dexie unit + integration tests
│   │   ├── stores/
│   │   │   └── offlineStore.ts   # Zustand over Dexie (sync stats)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx    # Session-based auth provider
│   │   ├── api/
│   │   │   └── client.ts         # Axios instance with interceptors
│   │   ├── types/
│   │   │   ├── index.ts          # TypeScript interfaces
│   │   │   └── offline.ts        # Offline record types
│   │   ├── utils/
│   │   │   ├── measurements.ts   # Laquatwin measurement constants
│   │   │   └── metadata.ts       # Water body / land use options
│   │   ├── pages/                # Route pages
│   │   ├── styles/               # CSS modules & global styles
│   │   └── assets/               # Marker icons, images
│   └── package.json
│
├── prisma/                       # Database schema & seed
│   ├── schema.prisma             # Prisma data model
│   └── seed.ts                   # Database seed script
│
├── services/ai/                  # Future AI microservice (currently empty)
│
├── package.json                  # Root workspace configuration
└── .gitignore
```

---

## Environment Variables

### Backend (`api/.env`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | — | Yes |
| `PORT` | API server port | `3001` | No |
| `CORS_ORIGIN` | Allowed CORS origin (e.g., `http://localhost:5173`) | `false` (same-origin only) | Yes* |
| `SESSION_SECRET` | Secret key for signing session cookies (use `openssl rand -hex 32`) | — | Yes |
| `ADMIN_PASSWORD` | Admin dashboard login password (plaintext; bcrypt-hashed at startup) | — | Yes |
| `NODE_ENV` | `development` or `production` | `development` | No |
| `RATE_LIMIT_MAX` | General API rate limit per 15 minutes per IP | `300` | No |
| `CSP_ENFORCE_MODE` | Set to `true` to enforce CSP; omit/report-only by default | `false` | No |
| `CSP_TILE_DOMAINS` | Comma-separated map tile domains allowed by CSP | OpenStreetMap defaults | No |

> \* If `CORS_ORIGIN` is not set, the server logs a warning and restricts to same-origin only.

> **Note**: The admin username is seeded via `prisma/seed.ts` as `admin`. To change it, modify the seed script.

### Frontend (`web/.env`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3001/api/v1` | Yes |
| `VITE_MAP_TILE_URL` | Leaflet tile provider URL template | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Yes |
| `VITE_DEFAULT_LAT` | Default map center latitude | `-7.3059612` | No |
| `VITE_DEFAULT_LNG` | Default map center longitude | `112.8443053` | No |

> Frontend env vars **must** be prefixed with `VITE_` for Vite to expose them to the browser.

---

## Features Overview

- **Water sample submission** — Submit measurements with GPS coordinates, pH, temperature, conductivity, salinity, nitrate (NO₃⁻), calcium (Ca²⁺), potassium (K⁺), and sodium (Na⁺). Fields are grouped by HORIBA Laquatwin meter models. Metadata tags (water body type, land use, GPS accuracy) provide environmental context.
- **Interactive Leaflet map** — View all samples on an interactive map with marker clustering, real-time GPS position (blue dot), and color-coded accuracy badges. Drop a teal search pin anywhere on the map to find nearby samples within a configurable radius (100m–5km).
- **PostGIS spatial search** — Tap **"📍 Search Here"** to enter pin mode, then tap any map location. A teal pin drops, and the Nearby Samples panel auto-opens showing results sorted by distance. Results auto-refresh when GPS moves >50m (debounced 2s).
- **API Gateway** — Structured JSON request logging with unique `x-request-id` headers, OpenAPI/Swagger documentation at `/api/docs`, enhanced health checks (DB + PostGIS + sessions), and tiered rate limiting.
- **PWA (Progressive Web App)** — Installable on mobile home screen. Service worker precaches JS/CSS assets via `vite-plugin-pwa` (Workbox). Offline-capable after first visit.
- **Offline-first storage engine** — Zero-loss guarantee via Dexie.js IndexedDB. Submissions are saved locally with 6-state sync machine (`pending_sync` → `syncing` → `synced` | `failed` | `duplicate` | `dropped`). Auto-syncs when connectivity returns with exponential backoff (2s–30s). 30-day auto-purge keeps storage lean.
- **Duplicate conflict detection** — Client-side Haversine algorithm prevents duplicate submissions within 8m radius and same hour. Oldest record wins. Server-side 409 Conflict handling for cross-device dedup.
- **Admin dashboard** — Moderate submissions: approve, reject, revert to pending, or delete samples. Session-based authentication (httpOnly cookies). Real-time pending count badge with 30-second polling.
- **CSV data export** — Download all sample data as a UTF-8 CSV, with formula injection sanitization (prefixes `=`, `+`, `-`, `@`, `\t`, `\r` with `'`).
- **Time-series trend charts** — Visualize measurement trends over time with Chart.js. Selectable parameter dropdown. Shows "More data needed" when insufficient data points are available.
- **Photo upload** — Upload up to 5 photos per sample (JPEG/PNG/WebP, max 5MB each). Images are compressed client-side via Web Worker to 1280px JPEG before upload. EXIF GPS warning banner. Gallery view in sample detail.
- **Server-side filtering & sorting** — Filter samples by status, author name, and date range. Sort by measurement parameters. All filtering happens server-side to ensure correct results with paginated data.
- **PostGIS location deduplication** — Submissions within 10 meters of an existing location reuse that location record using `ST_DWithin` geodesic calculations.
- **Responsive mobile design** — Mobile-first layout with bottom navigation, safe-area-inset support for iPhone notch/home indicator, and dynamic viewport height (`100dvh`).
- **Security** — Helmet security headers, httpOnly session cookies, rate limiting (300/15min general, 5/15min login, 200/15min spatial), 1MB request body limit, path traversal protection on photo serving.

---

## Default Login

| Field | Value |
|-------|-------|
| URL | `http://localhost:5173/admin/login` |
| Username | `admin` (seeded via `prisma/seed.ts`) |
| Password | As configured in `ADMIN_PASSWORD` env var (bcrypt-hashed at server startup) |

> Default credentials (for development only): username `admin`, password as set in `.env`. The password is hashed with bcrypt at server startup and never stored in plaintext. Authentication uses httpOnly session cookies stored server-side via `connect-pg-simple`.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | Frontend UI framework |
| **Vite** | Build tool and dev server |
| **TypeScript** | Type safety (strict mode) |
| **Leaflet / react-leaflet** | Interactive maps with OpenStreetMap tiles |
| **react-leaflet-markercluster** | Map marker clustering |
| **Chart.js / react-chartjs-2** | Time-series measurement trend charts |
| **TanStack Query** | Server state management, caching, pagination |
| **Zustand** | Client state management (thin wrapper over Dexie) |
| **Dexie.js** | IndexedDB wrapper for offline-first storage engine |
| **Express** | REST API backend |
| **Prisma** | ORM with PostgreSQL |
| **PostGIS** | Spatial extension for PostgreSQL (geography column, ST_DWithin) |
| **Zod** | Input validation (frontend + backend) |
| **Helmet** | HTTP security headers |
| **express-rate-limit** | Rate limiting (general + login + spatial) |
| **bcryptjs** | Admin password hashing |
| **express-session + connect-pg-simple** | httpOnly cookie session management |
| **swagger-jsdoc + swagger-ui-express** | OpenAPI documentation |
| **multer** | Photo file upload handling |
| **vite-plugin-pwa (Workbox)** | Service worker generation and PWA support |
| **Axios** | HTTP client with timeout + interceptors |
| **react-router-dom** | Client-side routing |

---

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/health` | Server + database + PostGIS + sessions health check | No |
| `GET` | `/api/docs/` | Swagger UI interactive API documentation | No |
| `GET` | `/api/docs/openapi.json` | Raw OpenAPI JSON spec | No |
| `GET` | `/api/v1/samples` | List samples (paginated, filterable, sortable) | No |
| `POST` | `/api/v1/samples` | Create a new sample with embedded location | Yes (session) |
| `GET` | `/api/v1/samples/:id` | Get a single sample with location and photos | No |
| `PUT` | `/api/v1/samples/:id` | Update a sample | Yes (session) |
| `DELETE` | `/api/v1/samples/:id` | Delete a sample | Yes (session) |
| `POST` | `/api/v1/samples/:id/photos` | Upload photos (max 5 files, 5MB each) | Yes (session) |
| `GET` | `/api/v1/samples/:id/photos` | List photos for a sample | No |
| `GET` | `/api/v1/samples/export` | Download all samples as CSV | Yes (session) |
| `DELETE` | `/api/v1/photos/:id` | Delete a photo | Yes (session) |
| `POST` | `/api/v1/auth/login` | Admin login (returns session cookie) | No |
| `GET` | `/api/v1/auth/me` | Get current session user | Yes (session) |
| `POST` | `/api/v1/auth/logout` | Destroy session | Yes (session) |
| `POST` | `/api/v1/auth/register` | Register a new user account | No |
| `GET` | `/api/v1/locations` | List all locations | No |
| `POST` | `/api/v1/locations` | Create a location | Yes (session) |
| `GET` | `/api/v1/locations/:id` | Get a location with its samples | No |
| `GET` | `/api/v1/locations/nearby` | Radius search locations (PostGIS ST_DWithin) | No |
| `GET` | `/api/v1/samples/nearby` | Radius search samples with distance | No |

### Query Parameters for `GET /api/v1/samples`

| Parameter | Type | Description |
|-----------|------|-------------|
| `cursor` | string | Pagination cursor (ID of last item from previous page) |
| `limit` | number | Items per page (default: 20) |
| `status` | string | Filter by status: `pending`, `approved`, `rejected` |
| `authorName` | string | Filter by author name (partial match, case-insensitive) |
| `dateFrom` | string (ISO) | Filter samples created on or after this date |
| `dateTo` | string (ISO) | Filter samples created on or before this date |
| `sortBy` | string | Sort field (e.g., `temperature`, `ph`, `conductivity`, `createdAt`) |
| `sortOrder` | string | Sort direction: `asc` or `desc` (default: `desc`) |

---

## Development Notes

- **Request body size limit**: 1 MB (configured via `express.json({ limit: '1mb' })`)
- **Photo upload limits**: Max 5 photos per sample, max 5 MB per file, accepted formats: JPEG, PNG, WebP. Client-side compression resizes to 1280px JPEG via Web Worker.
- **Rate limits**: 300/15min (general API, configurable via `RATE_LIMIT_MAX`), 5/15min (`/auth/login`), 200/15min (spatial queries)
- **Pagination**: Cursor-based with `cursor` and `limit` parameters. Response includes `nextCursor` and `totalCount`.
- **Default pagination**: 20 items per page
- **Offline storage**: Dexie.js IndexedDB with 6-state sync machine. Exponential backoff retry (2s–30s). 30-day auto-purge for synced records. 90-day retention for failed/duplicate.
- **Conflict detection**: Client-side Haversine algorithm checks 8m radius + same hour bucket before enqueueing. Server returns 409 Conflict for cross-device duplicates.
- **Map tiles**: Configurable via `VITE_MAP_TILE_URL` env var. Defaults to OpenStreetMap tiles.
- **Location deduplication**: Uses `ST_DWithin` with PostGIS geography column for accurate 10m geodesic radius check.
- **GPS tracking**: Uses `watchPosition` for continuous GPS updates. Auto-pans the map only on first GPS fix. Toggle "Follow GPS" button controls further auto-panning.
- **Reverse geocoding**: Debounced 500ms with `AbortController` to respect Nominatim usage policy.
- **Admin auth**: httpOnly session cookies with `connect-pg-simple` PostgreSQL session store. Passwords are bcrypt-hashed at startup. Sessions expire after 24 hours.
- **CSV export**: Formula injection sanitization prefixes `=`, `+`, `-`, `@`, `\t`, `\r` with single quote. UTF-8 BOM included for Excel compatibility.
- **Service worker**: Generated by `vite-plugin-pwa` with Workbox. Precaches JS, CSS, HTML, and static assets.
- **Photo storage**: Stored in `api/uploads/` directory. Server serves them at `/uploads/:filename`. Path traversal is prevented via `path.basename` sanitization and resolved-path security check.
- **API documentation**: OpenAPI v3 spec auto-generated from route files. Interactive Swagger UI at `/api/docs`, raw JSON at `/api/docs/openapi.json`.
- **Request logging**: Every request logged as structured JSON with `requestId`, `method`, `path`, `status`, `durationMs`, and `userAgent`. Error responses (4xx/5xx) are logged with appropriate severity levels.

---

## Adding the AI Analysis Microservice (Future)

The `services/ai/` directory is reserved for a future AI analysis microservice. When ready:

1. The microservice (Python FastAPI or Node.js) will expose a `/analyze` endpoint
2. It will be completely decoupled from the CRUD API — the app works without it
3. It can be enabled by setting an env var or via a feature flag

No AI-specific code is included in the current version.

---

## License

This project is provided for research and educational purposes. See `LICENSE` file for details.

---

## Contributing

Contributions are welcome. Please follow the workflow:

1. Check `PROGRESS.md` and `MILESTONES.md` for current status and priorities
2. Feature requests should follow the `WQ-###` ID convention
3. Write tests for new functionality
4. Ensure `npm run lint && npm run typecheck` passes in all workspaces
5. Submit a pull request with a clear description of changes

---

## Troubleshooting

**"Cannot find module '@prisma/client'"**
Run `npx prisma generate` from the project root.

**"ECONNREFUSED" when starting the backend**
Ensure PostgreSQL is running and the `DATABASE_URL` in `api/.env` is correct.

**Map tiles not loading**
Check `VITE_MAP_TILE_URL` in `web/.env`. Your network may block OpenStreetMap tiles — try a different tile provider.

**"Missing required environment variables" error**
Ensure `SESSION_SECRET` and `ADMIN_PASSWORD` are both set in `api/.env`.

**Photo uploads return 401**
You need to be logged in as admin. Navigate to `/admin/login` and authenticate first.
