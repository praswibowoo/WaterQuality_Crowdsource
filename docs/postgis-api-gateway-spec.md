# PostGIS Spatial Analysis & API Gateway Architecture Spec
## Water Quality Crowdsource — v1.0.0 (WQ-097 to WQ-107)

> **Status**: 📝 Planned — Ready for implementation delegation  
> **Spec Owner**: Lead Manager  
> **Target Milestone**: v1.0.0 — Spatial Queries & API Gateway  
> **Last Updated**: 2026-05-26

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Changes](#2-database-changes)
3. [API Gateway Specification](#3-api-gateway-specification)
4. [New Endpoints](#4-new-endpoints)
5. [Raw SQL Patterns](#5-raw-sql-patterns)
6. [Migration Strategy](#6-migration-strategy)
7. [Feature Breakdown & Task List](#7-feature-breakdown--task-list)
8. [Test Plan](#8-test-plan)
9. [Appendices](#9-appendices)

---

## 1. Architecture Overview

### 1.1 Problem Statement

The current system stores locations as raw `latitude`/`longitude` `Float` columns and performs deduplication using approximate degree math (`radiusInDegrees = 10 / 111320`). This approach:
- Is inaccurate near the equator vs. poles (degree-to-meter ratio varies)
- Cannot perform true radius queries (bounding box check only)
- Scales poorly as location count grows (no spatial index)
- Lacks "find samples near me" functionality for field researchers

The API layer lacks structured observability: no request IDs, no structured logging, no OpenAPI documentation, and rate limiting is coarse (one global limiter).

### 1.2 Architecture Decision Record (ADR)

#### ADR-004: PostGIS Extension for Spatial Storage & Queries

**Context**: PostgreSQL already powers the backend. PostGIS is the de-facto standard for spatial data in PostgreSQL and is supported by managed providers (Supabase, AWS RDS, DigitalOcean).

**Decision**: Add PostGIS extension, create a `geography(POINT, 4326)` column on `Location`, and use Prisma + raw SQL hybrid for spatial operations.

**Rationale**:

| Criterion | Approximate Math (Current) | PostGIS `geography` (Chosen) |
|-----------|---------------------------|------------------------------|
| Accuracy | ±10% error at high latitudes | Exact geodesic calculations (WGS84 ellipsoid) |
| Query expressiveness | Bounding box only | `ST_DWithin`, `ST_Distance`, `ST_Intersects`, etc. |
| Indexing | B-tree on lat/lng (separate) | GIST spatial index on `geography` |
| Performance at 10k rows | O(n) scan | O(log n) via GIST index |
| Migration risk | N/A | Low — nullable column, dual-write period |
| Prisma compatibility | Native | Raw SQL only for spatial; Prisma for all else |

**Rejected alternatives**:
- **Pure Prisma with no PostGIS**: Would require application-level spatial libraries (turf.js, geokdbush) and in-memory indexing. Cannot scale to 100k+ locations.
- **Move to Supabase/PostgREST**: Would replace the Express API entirely. User requirement is to *enhance* existing system.
- **Store as `geometry(POINT, 4326)`**: `geometry` uses Cartesian math; distances are inaccurate for large radii. `geography` uses true geodesic calculations, which is correct for global sampling sites.

**Consequences**:
- **Positive**: True radius queries, spatial indexing, extensible for future polygon queries (e.g., "samples within Wonorejo mangrove boundary").
- **Negative**: PostGIS must be installed on the PostgreSQL server; raw SQL queries bypass Prisma's type generation (we write explicit types); slightly more complex migration.

#### ADR-005: Prisma + Raw SQL Hybrid for Spatial Queries

**Context**: Prisma does not natively support PostGIS types. The Prisma `Unsupported` type exists but requires careful handling.

**Decision**: Use Prisma for all CRUD, relations, and standard queries. Use `prisma.$queryRaw` / `$queryRawUnsafe` *only* for spatial operations (`ST_DWithin`, `ST_MakePoint`, etc.).

**Pattern**:
```typescript
// Prisma for everything standard
const sample = await prisma.sample.findUnique({ ... });

// Raw SQL for spatial only
const nearby = await prisma.$queryRaw<NearbySampleResult[]>`
  SELECT s.id, s."authorName", s.ph, s.status,
         l.latitude, l.longitude,
         ST_Distance(l.geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) as distance_meters
  FROM "Sample" s
  JOIN "Location" l ON s."locationId" = l.id
  WHERE ST_DWithin(
    l.geog,
    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
    ${radiusMeters}
  )
  ORDER BY distance_meters;
`;
```

**Consequences**:
- **Positive**: Leverages Prisma's type safety for 95% of queries; spatial queries are explicitly typed and isolated.
- **Negative**: Two query styles in codebase; raw SQL must be manually parameterized to prevent injection (Prisma's template literal tagging handles this automatically).

#### ADR-006: True API Gateway Structure

**Context**: The current `index.ts` is a flat Express app with middleware scattered in one file. There is no unified request logging, no response envelope, and no per-resource rate limiting.

**Decision**: Refactor the Express bootstrap into a gateway pattern without adding new infrastructure (no Kong, no Nginx — pure Express middleware composition).

**Gateway responsibilities**:
1. **Request identification**: Generate/propagate `x-request-id`
2. **Structured logging**: JSON logs with timing, method, path, status, user agent
3. **Response envelope**: Wrap all JSON responses in `{ success, data, error }`
4. **Rate limiting tiers**: General (100/15min), Auth (5/15min), Upload (20/15min), Spatial (50/15min)
5. **Health aggregation**: DB + PostGIS version check
6. **API documentation**: OpenAPI/Swagger auto-generated from routes

**Consequences**:
- **Positive**: Observable, debuggable, self-documenting API.
- **Negative**: Response envelope is a breaking change for frontend; requires coordinated update (see §3.3 for backward-compatible rollout).

---

### 1.3 System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │ requestId   │  │ structured  │  │ response    │  │ rate     │ │
│  │ middleware  │─►│ logging     │─►│ envelope    │─►│ limiters │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Route Handlers (existing)                    │
│  /api/v1/samples  /api/v1/locations  /api/v1/auth  ...         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Prisma + Raw SQL Hybrid                      │
│  Standard queries ──► prisma.sample.findMany()                   │
│  Spatial queries ───► prisma.$queryRaw`ST_DWithin(...)`          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL + PostGIS                         │
│  "Location" table: id, latitude, longitude, geog(POINT,4326)   │
│  GIST index on geog column                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Changes

### 2.1 Prisma Schema Changes

```prisma
// File: prisma/schema.prisma

model Location {
  id        String   @id @default(uuid())
  latitude  Float
  longitude Float
  address   String?
  createdAt DateTime @default(now())
  samples   Sample[]

  // PostGIS geography column — managed via raw SQL, not Prisma
  // Prisma will ignore this field in migrations (see §2.2)
}
```

> **Note**: Prisma does not natively support `geography` types. The `geog` column is added via a raw SQL migration (§2.2) and is **not** listed in the Prisma schema. Prisma continues to manage `latitude`, `longitude`, and all other fields.

### 2.2 Migration Script: Add PostGIS Column & Index

```sql
-- File: prisma/migrations/20260526120000_add_postgis_location/migration.sql

-- Step 1: Enable PostGIS extension (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Step 2: Add geography column (nullable for dual-write period)
ALTER TABLE "Location"
ADD COLUMN IF NOT EXISTS geog geography(POINT, 4326);

-- Step 3: Populate geog from existing lat/lng
UPDATE "Location"
SET geog = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE geog IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Step 4: Create GIST spatial index
CREATE INDEX IF NOT EXISTS idx_location_geog
ON "Location" USING GIST (geog);

-- Step 5: Create B-tree indexes for lat/lng (used by non-spatial queries)
CREATE INDEX IF NOT EXISTS idx_location_latitude ON "Location"(latitude);
CREATE INDEX IF NOT EXISTS idx_location_longitude ON "Location"(longitude);
```

### 2.3 Rollback Plan

```sql
-- File: prisma/migrations/20260526120000_add_postgis_location/down.sql
-- (For manual rollback only — Prisma Migrate does not support down migrations in PostgreSQL)

DROP INDEX IF EXISTS idx_location_geog;
DROP INDEX IF EXISTS idx_location_latitude;
DROP INDEX IF EXISTS idx_location_longitude;

ALTER TABLE "Location" DROP COLUMN IF EXISTS geog;

-- Note: Do NOT drop the PostGIS extension if other tables use it.
-- DROP EXTENSION IF EXISTS postgis; -- Only if no other spatial data exists.
```

**Rollback steps (if critical bug found in production)**:
1. Revert application code to pre-PostGIS version (lat/lng dedup still works).
2. Run `down.sql` manually to drop `geog` column and index.
3. `latitude`/`longitude` columns are untouched; no data loss.

### 2.4 TypeScript Types for Raw SQL Results

```typescript
// File: api/src/types/spatial.ts (NEW)

export interface NearbyLocationResult {
  id: string;
  latitude: number;
  longitude: number;
  address: string | null;
  distance_meters: number;
}

export interface NearbySampleResult {
  id: string;
  authorName: string;
  ph: number | null;
  temperature: number | null;
  conductivity: number | null;
  salinity: number | null;
  nitrate: number | null;
  calcium: number | null;
  potassium: number | null;
  sodium: number | null;
  waterBodyType: string | null;
  landUse: string | null;
  gpsAccuracy: number | null;
  status: string;
  createdAt: Date;
  latitude: number;
  longitude: number;
  distance_meters: number;
}

export interface PostGISHealthResult {
  postgis_version: string;
  postgis_geos_available: boolean;
}
```

---

## 3. API Gateway Specification

### 3.1 Request Logging Middleware

**Requirements**: Structured JSON logs with request ID, timestamp, method, path, duration, status code, user agent.

```typescript
// File: api/src/middleware/requestLogger.ts (NEW)

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface RequestMeta {
  requestId: string;
  startTime: bigint;
}

declare global {
  namespace Express {
    interface Request {
      meta: RequestMeta;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.get('x-request-id') || randomUUID();
  req.meta = { requestId, startTime: process.hrtime.bigint() };
  res.setHeader('x-request-id', requestId);
  next();
}

export function structuredLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: req.meta?.requestId || 'unknown',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userAgent: req.get('user-agent') || 'unknown',
      ip: req.ip,
      // Sanitized: no query params, no body, no auth tokens
    };
    console.log(JSON.stringify(logEntry));
  });

  next();
}
```

**Log example**:
```json
{"timestamp":"2026-05-26T08:15:33.412Z","requestId":"a1b2c3d4","method":"GET","path":"/api/v1/samples/nearby","statusCode":200,"durationMs":12.45,"userAgent":"Mozilla/5.0","ip":"127.0.0.1"}
```

### 3.2 Response Standardization (Envelope)

**New envelope format**:
```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

**Migration strategy**: Implement as opt-in at the route level first, then make global in v1.1.0.

```typescript
// File: api/src/middleware/responseEnvelope.ts (NEW)

import { Request, Response, NextFunction } from 'express';

export function responseEnvelopeMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only wrap JSON responses; skip streams, files, etc.
  const originalJson = res.json.bind(res);

  res.json = function(body: unknown): Response {
    // If already wrapped or explicitly opted out, pass through
    if (body && typeof body === 'object' && ('success' in (body as object))) {
      return originalJson(body);
    }

    const envelope = {
      success: res.statusCode < 400,
      data: res.statusCode < 400 ? body : undefined,
      error: res.statusCode >= 400 ? body : undefined,
    };
    return originalJson(envelope);
  };

  next();
}
```

> **Important**: The response envelope is a breaking change for the frontend. Phase 1 of implementation (§7) keeps it **disabled globally**. It is enabled per-route for new endpoints (`/nearby`) only. Full rollout is WQ-108 (future backlog).

### 3.3 Request ID Generation & Propagation

- **Incoming requests**: Read `x-request-id` header. If present, reuse it (distributed tracing).
- **New requests**: Generate `randomUUID()` if header absent.
- **Response**: Always echo `x-request-id` in response headers.
- **Logs**: Every `console.log` in the request lifecycle should include `requestId`.
- **Error responses**: Include `requestId` in error body for support ticket correlation.

### 3.4 API Versioning Strategy

**Current**: `/api/v1/...`
**Path to v2**: When v2 is needed, mount under `/api/v2/...` as a separate Express router. v1 remains frozen (bug fixes only) for 6 months.

**Deprecation headers** (for future use):
```
Deprecation: true
Sunset: <date>
Link: </api/v2/samples>; rel="successor-version"
```

### 3.5 OpenAPI / Swagger Documentation

**Tool**: `swagger-jsdoc` + `swagger-ui-express` (lightweight, JSDoc-driven).

```typescript
// File: api/src/middleware/swagger.ts (NEW)

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Water Quality Crowdsource API',
      version: '1.0.0',
      description: 'Crowdsourced water quality data collection API',
    },
    servers: [{ url: '/api/v1' }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUiHandler = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup(swaggerSpec);
```

**Route JSDoc example**:
```typescript
/**
 * @openapi
 * /samples/nearby:
 *   get:
 *     summary: Find samples near a geographic point
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         schema: { type: number }
 *       - in: query
 *         name: radiusMeters
 *         schema: { type: number, default: 1000 }
 *     responses:
 *       200:
 *         description: List of nearby samples with distances
 */
```

### 3.6 Health Check Enhancement

```typescript
// File: api/src/routes/health.ts (NEW)

import { Router } from 'express';
import prisma from '../db/prisma';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const checks = {
      database: false,
      postgis: false,
      postgisVersion: null as string | null,
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      const postgisResult = await prisma.$queryRaw<[{ postgis_version: string }]>`
        SELECT postgis_version() as postgis_version
      `;
      checks.postgis = true;
      checks.postgisVersion = postgisResult[0]?.postgis_version || null;
    } catch {
      checks.postgis = false;
    }

    const allHealthy = checks.database && checks.postgis;

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
```

### 3.7 Rate Limiting Per Resource

**Current state**: One general limiter (100/15min) + one login limiter (5/15min).

**New tiered limiters**:

```typescript
// File: api/src/middleware/rateLimiters.ts (NEW)

import rateLimit from 'express-rate-limit';

const createLimiter = (max: number, windowMs: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    message: { error: 'Too Many Requests', message },
    standardHeaders: true,
    legacyHeaders: false,
  });

export const generalLimiter = createLimiter(
  100, 15 * 60 * 1000,
  'Rate limit exceeded. Please slow down.'
);

export const authLimiter = createLimiter(
  5, 15 * 60 * 1000,
  'Too many login attempts. Please try again after 15 minutes.'
);

export const uploadLimiter = createLimiter(
  20, 15 * 60 * 1000,
  'Too many uploads. Please try again later.'
);

export const spatialLimiter = createLimiter(
  50, 15 * 60 * 1000,
  'Too many spatial queries. Please slow down.'
);
```

**Application order** (specific → general):
```typescript
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/samples/:id/photos', uploadLimiter);
app.use('/api/v1/samples/nearby', spatialLimiter);
app.use('/api/v1/locations/nearby', spatialLimiter);
app.use('/api/v1/', generalLimiter); // Fallback for everything else
```

---

## 4. New Endpoints

### 4.1 `GET /api/v1/locations/nearby`

**Purpose**: Find all locations within a radius of a geographic point.

**Query parameters**:
| Name | Type | Required | Default | Validation |
|------|------|----------|---------|------------|
| lat | number | Yes | — | -90 to 90 |
| lng | number | Yes | — | -180 to 180 |
| radiusMeters | number | No | 1000 | 1 to 50000 |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "loc-uuid",
      "latitude": -7.3059612,
      "longitude": 112.8443053,
      "address": "Mangrove Wonorejo",
      "distance_meters": 45.2
    }
  ]
}
```

**Implementation**:
```typescript
// File: api/src/routes/locations.ts (ADD to existing router)

import { nearbyQuerySchema } from '../validators/schemas'; // NEW schema

router.get(
  '/nearby',
  asyncHandler(async (req: Request, res: Response) => {
    const queryResult = nearbyQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw queryResult.error;
    }

    const { lat, lng, radiusMeters } = queryResult.data;

    const locations = await prisma.$queryRaw<NearbyLocationResult[]>`
      SELECT id, latitude, longitude, address,
        ST_Distance(
          geog,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) as distance_meters
      FROM "Location"
      WHERE ST_DWithin(
        geog,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
      ORDER BY distance_meters
      LIMIT 200
    `;

    res.json({ success: true, data: locations });
  })
);
```

### 4.2 `GET /api/v1/samples/nearby`

**Purpose**: Find all samples (with measurement data) near a point.

**Query parameters**: Same as `/locations/nearby`.

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "sample-uuid",
      "authorName": "Researcher A",
      "ph": 7.2,
      "temperature": 28.5,
      "conductivity": 45000,
      "salinity": 32.1,
      "nitrate": 1.2,
      "calcium": 380,
      "potassium": 8.5,
      "sodium": 10500,
      "waterBodyType": "estuary",
      "landUse": "mangrove_forest",
      "gpsAccuracy": 4.5,
      "status": "approved",
      "createdAt": "2026-05-20T08:30:00.000Z",
      "latitude": -7.3059612,
      "longitude": 112.8443053,
      "distance_meters": 45.2
    }
  ]
}
```

**Implementation**:
```typescript
// File: api/src/routes/samples.ts (ADD to existing router)

router.get(
  '/nearby',
  asyncHandler(async (req: Request, res: Response) => {
    const queryResult = nearbyQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw queryResult.error;
    }

    const { lat, lng, radiusMeters } = queryResult.data;

    const samples = await prisma.$queryRaw<NearbySampleResult[]>`
      SELECT
        s.id, s."authorName", s.ph, s.temperature,
        s.conductivity, s.salinity, s.nitrate, s.calcium,
        s.potassium, s.sodium,
        s."waterBodyType", s."landUse", s."gpsAccuracy",
        s.status, s."createdAt",
        l.latitude, l.longitude,
        ST_Distance(
          l.geog,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) as distance_meters
      FROM "Sample" s
      JOIN "Location" l ON s."locationId" = l.id
      WHERE ST_DWithin(
        l.geog,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
      ORDER BY distance_meters
      LIMIT 200
    `;

    res.json({ success: true, data: samples });
  })
);
```

### 4.3 Update `POST /api/v1/samples` — PostGIS Location Deduplication

**Current**: Approximate degree math in `findOrCreateLocation`.
**New**: Use `ST_DWithin` on the `geog` column for true 10-meter radius deduplication.

```typescript
// File: api/src/routes/samples.ts (REPLACE findOrCreateLocation)

const LOCATION_DEDUP_RADIUS_METERS = 10;

async function findOrCreateLocation(
  lat: number,
  lng: number,
  address?: string
) {
  // Step 1: Query by exact geodesic distance using PostGIS
  const existing = await prisma.$queryRaw<[{ id: string }]>`
    SELECT id
    FROM "Location"
    WHERE ST_DWithin(
      geog,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${LOCATION_DEDUP_RADIUS_METERS}
    )
    LIMIT 1
  `;

  if (existing.length > 0) {
    const location = await prisma.location.findUnique({
      where: { id: existing[0].id },
    });
    if (location) return location;
  }

  // Step 2: Create new location (write to both lat/lng and geog)
  return prisma.$queryRaw<[{ id: string; latitude: number; longitude: number; address: string | null; createdAt: Date }]>`
    INSERT INTO "Location" (id, latitude, longitude, address, "createdAt", geog)
    VALUES (
      gen_random_uuid(),
      ${lat},
      ${lng},
      ${address ?? null},
      NOW(),
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    )
    RETURNING id, latitude, longitude, address, "createdAt"
  `.then((rows) => rows[0]);
}
```

> **Backward compatibility**: `latitude` and `longitude` are still written and returned. The `geog` column is populated automatically. Existing code that reads `location.latitude`/`location.longitude` requires zero changes.

### 4.4 Update `POST /api/v1/locations` — Write to `geog`

When a location is created independently (not via sample), also populate `geog`:

```typescript
// File: api/src/routes/locations.ts (UPDATE POST /)

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const bodyResult = createLocationSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw bodyResult.error;
    }

    const { latitude, longitude, address } = bodyResult.data;

    const location = await prisma.$queryRaw<[{ id: string; latitude: number; longitude: number; address: string | null; createdAt: Date }]>`
      INSERT INTO "Location" (id, latitude, longitude, address, "createdAt", geog)
      VALUES (
        gen_random_uuid(),
        ${latitude},
        ${longitude},
        ${address ?? null},
        NOW(),
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      )
      RETURNING id, latitude, longitude, address, "createdAt"
    `.then((rows) => rows[0]);

    res.status(201).json({ success: true, data: location });
  })
);
```

---

## 5. Raw SQL Patterns

### 5.1 Creating a Geography Point from Lat/Lng

```sql
ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
```

- `ST_MakePoint(x, y)` creates a `geometry` point. Order is **(lng, lat)** — x, y.
- `ST_SetSRID(..., 4326)` assigns the WGS84 coordinate system.
- `::geography` casts to the `geography` type, enabling geodesic (true Earth-surface) calculations.

### 5.2 Finding Points Within a Radius

```sql
SELECT * FROM "Location"
WHERE ST_DWithin(
  geog,
  ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
  $radiusMeters
);
```

- `ST_DWithin` returns true if the distance is **less than or equal to** the threshold.
- Uses the GIST index automatically for performance.
- Distance is in **meters** (geography type default).

### 5.3 Calculating Exact Distance

```sql
SELECT
  id,
  ST_Distance(
    geog,
    ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography
  ) as distance_meters
FROM "Location"
ORDER BY distance_meters;
```

- `ST_Distance` returns the exact geodesic distance in meters.
- Computationally more expensive than `ST_DWithin`; use only when distance value is needed in output.

### 5.4 GIST Index Creation

```sql
CREATE INDEX idx_location_geog
ON "Location" USING GIST (geog);
```

- GIST (Generalized Search Tree) is the required index type for spatial columns.
- Supports `ST_DWithin`, `ST_Intersects`, `ST_Contains`, etc.
- Cannot use B-tree on `geography` columns.

### 5.5 Prisma `$queryRaw` Parameterization

Prisma's tagged template literals automatically sanitize inputs:

```typescript
// ✅ Safe — Prisma escapes and types the parameters
await prisma.$queryRaw`SELECT * FROM "Location" WHERE id = ${userInput}`;

// ❌ Unsafe — never use string interpolation
await prisma.$queryRawUnsafe(`SELECT * FROM "Location" WHERE id = '${userInput}'`);
```

**Type conversion notes**:
- Prisma converts JavaScript `number` → PostgreSQL `double precision`.
- Prisma converts JavaScript `string` → PostgreSQL `text`.
- For `geography` parameters, no special type is needed — the SQL expression handles casting.

---

## 6. Migration Strategy

### 6.1 Step-by-Step Migration

```
Step 1: Install PostGIS extension ──────────────────────────────►
Step 2: Add geog column (nullable) ─────────────────────────────►
Step 3: Populate geog from lat/lng ───────────────────────────────►
Step 4: Create GIST index ────────────────────────────────────────►
Step 5: Update app code to write to both columns ───────────────►
Step 6: Make geog NOT NULL (after verification) ──────────────────►
Step 7: Update queries to use PostGIS for spatial ops ──────────►
```

**Detailed steps**:

| Step | Action | Command / Script | Downtime? |
|------|--------|------------------|-----------|
| 1 | Enable PostGIS on PostgreSQL | `CREATE EXTENSION IF NOT EXISTS postgis;` | None |
| 2 | Generate Prisma migration | `npx prisma migrate dev --name add_postgis_location` | None |
| 3 | Populate `geog` from existing data | Migration script includes `UPDATE ... SET geog = ...` | None |
| 4 | Verify all rows have `geog` | `SELECT COUNT(*) FROM "Location" WHERE geog IS NULL;` → 0 | None |
| 5 | Deploy application code with dual-write | New code writes `geog` on INSERT/UPDATE | Rolling |
| 6 | Backfill any rows created during deploy | Re-run UPDATE for NULL geog rows | None |
| 7 | Make `geog` NOT NULL | `ALTER TABLE "Location" ALTER COLUMN geog SET NOT NULL;` | Brief lock |
| 8 | Replace dedup query with PostGIS | Update `findOrCreateLocation` in `samples.ts` | None |

### 6.2 Environment-Specific Notes

**Local development**:
```bash
# PostgreSQL with PostGIS (Docker)
docker run -d \
  -e POSTGRES_USER=water \
  -e POSTGRES_PASSWORD=water123 \
  -e POSTGRES_DB=waterquality \
  -p 5432:5432 \
  postgis/postgis:15-3.4
```

**Production (existing PostgreSQL)**:
1. Check if PostGIS is installed: `SELECT postgis_version();`
2. If not, install via package manager (`apt install postgresql-15-postgis-3`) or enable extension on managed provider.
3. Run migration.

### 6.3 Verification Checklist

- [ ] `SELECT postgis_version();` returns a version string.
- [ ] `SELECT COUNT(*) FROM "Location" WHERE geog IS NULL;` returns 0.
- [ ] `EXPLAIN ANALYZE SELECT * FROM "Location" WHERE ST_DWithin(geog, ..., 1000);` shows `Index Scan using idx_location_geog`.
- [ ] Creating a sample at a new location populates both `lat/lng` and `geog`.
- [ ] Creating a sample within 10m of an existing location reuses the existing location (PostGIS dedup).
- [ ] `GET /api/v1/samples/nearby?lat=-7.3059&lng=112.8443&radiusMeters=500` returns ordered results with `distance_meters`.

---

## 7. Feature Breakdown & Task List

### Phase 1: Database & PostGIS Foundation

| # | Feature ID | Task | File(s) | Est. Lines | Notes |
|---|------------|------|---------|------------|-------|
| 1 | WQ-097 | Add PostGIS raw SQL migration (extension, column, index) | `prisma/migrations/20260526_add_postgis_location/migration.sql` | ~30 | §2.2 |
| 2 | WQ-097 | Create spatial TypeScript types | `api/src/types/spatial.ts` | ~40 | §2.4 |
| 3 | WQ-097 | Add `nearbyQuerySchema` Zod validator | `api/src/validators/schemas.ts` | ~15 | lat/lng/radius validation |
| 4 | WQ-097 | Verify migration applies cleanly on fresh DB | `prisma/` | — | `npx prisma migrate dev` |
| 5 | WQ-097 | Verify migration applies cleanly on existing data | Local DB with seed data | — | Check geog populated |

### Phase 2: API Gateway Middleware

| # | Feature ID | Task | File(s) | Est. Lines | Notes |
|---|------------|------|---------|------------|-------|
| 6 | WQ-098 | Create `requestIdMiddleware` + `structuredLoggingMiddleware` | `api/src/middleware/requestLogger.ts` | ~60 | §3.1 |
| 7 | WQ-098 | Create `responseEnvelopeMiddleware` (disabled globally in Phase 1) | `api/src/middleware/responseEnvelope.ts` | ~40 | §3.2 |
| 8 | WQ-098 | Refactor rate limiters into tiered exports | `api/src/middleware/rateLimiters.ts` | ~40 | §3.7 |
| 9 | WQ-099 | Create enhanced health check with PostGIS version | `api/src/routes/health.ts` | ~40 | §3.6 |
| 10 | WQ-099 | Wire all new middleware into `index.ts` in correct order | `api/src/index.ts` | ~30 | Order matters! |
| 11 | WQ-100 | Add Swagger/OpenAPI setup + JSDoc to existing routes | `api/src/middleware/swagger.ts` | ~30 | §3.5 |
| 12 | WQ-100 | Mount Swagger UI at `/api/docs` | `api/src/index.ts` | +5 | Dev-only or behind auth |

### Phase 3: Spatial Endpoints & Deduplication

| # | Feature ID | Task | File(s) | Est. Lines | Notes |
|---|------------|------|---------|------------|-------|
| 13 | WQ-101 | Implement `GET /api/v1/locations/nearby` | `api/src/routes/locations.ts` | ~30 | §4.1 — raw SQL with ST_DWithin |
| 14 | WQ-101 | Implement `GET /api/v1/samples/nearby` | `api/src/routes/samples.ts` | ~35 | §4.2 — JOIN with Location |
| 15 | WQ-102 | Rewrite `findOrCreateLocation` with PostGIS dedup | `api/src/routes/samples.ts` | ~30 | §4.3 — replace degree math |
| 16 | WQ-102 | Update `POST /api/v1/locations` to write geog | `api/src/routes/locations.ts` | ~20 | §4.4 — raw SQL INSERT |
| 17 | WQ-102 | Update `POST /api/v1/samples` to write geog on new location | `api/src/routes/samples.ts` | ~15 | Ensure dual-write in findOrCreateLocation |

### Phase 4: Frontend Integration (Nearby Search UI)

| # | Feature ID | Task | File(s) | Est. Lines | Notes |
|---|------------|------|---------|------------|-------|
| 18 | WQ-103 | Create `useNearbySamples` hook (TanStack Query) | `web/src/hooks/useNearbySamples.ts` | ~50 | Wraps `/samples/nearby` with loading/error states |
| 19 | WQ-103 | Add "Nearby Samples" button to SampleMap | `web/src/components/SampleMap.tsx` | ~40 | Uses current map center + configurable radius |
| 20 | WQ-103 | Display nearby samples as temporary map markers | `web/src/components/SampleMap.tsx` | ~30 | Different color from permanent markers |
| 21 | WQ-104 | Create `NearbySamplesPanel` sidebar component | `web/src/components/NearbySamplesPanel.tsx` | ~80 | List view with distance, parameter preview |
| 22 | WQ-104 | Add radius slider (50m – 5km) to map controls | `web/src/components/SampleMap.tsx` | ~30 | Debounced, updates query on release |

### Phase 5: Testing & QA

| # | Feature ID | Task | File(s) | Est. Lines | Notes |
|---|------------|------|---------|------------|-------|
| 23 | WQ-105 | Unit test for PostGIS dedup logic | `api/src/__tests__/locations.test.ts` | ~80 | Mock prisma.$queryRaw, test 10m boundary |
| 24 | WQ-105 | Unit test for `/samples/nearby` endpoint | `api/src/__tests__/samples.test.ts` | ~100 | Test lat/lng validation, radius bounds, ordering |
| 25 | WQ-105 | Unit test for `/locations/nearby` endpoint | `api/src/__tests__/locations.test.ts` | ~80 | Test empty result, max limit |
| 26 | WQ-106 | Performance benchmark: radius query with 10k locations | `api/src/__tests__/spatial.perf.test.ts` | ~40 | Seed 10k locations, assert <50ms query time |
| 27 | WQ-106 | Migration test on copy of production data | Manual / script | — | pg_dump → restore → migrate → verify |
| 28 | WQ-107 | Full regression: `npm run lint && npm run typecheck` | All | — | Must pass in both workspaces |
| 29 | WQ-107 | Verify existing features WQ-001 to WQ-096 still work | Manual QA | — | Submit sample, view map, admin login, offline sync |

---

## 8. Test Plan

### 8.1 PostGIS Deduplication Accuracy

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create location A at `-7.3059612, 112.8443053` | Location created with geog populated |
| 2 | Create location B at `-7.3059613, 112.8443054` (~12m away) | New location created (outside 10m) |
| 3 | Create location C at `-7.3059612, 112.84430535` (~5m away) | Reuses location A (inside 10m) |
| 4 | Verify `SELECT COUNT(*) FROM "Location"` | Count = 2 (A/C deduplicated) |

### 8.2 Radius Search Accuracy

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Seed 3 locations at 50m, 150m, 250m from Wonorejo center | Locations created with geog |
| 2 | `GET /samples/nearby?lat=-7.3059612&lng=112.8443053&radiusMeters=100` | Returns only the 50m location |
| 3 | `GET /samples/nearby?lat=-7.3059612&lng=112.8443053&radiusMeters=200` | Returns 50m + 150m locations, ordered by distance |
| 4 | `GET /samples/nearby?lat=-7.3059612&lng=112.8443053&radiusMeters=300` | Returns all 3, distance_meters accurate to ±1m |

### 8.3 API Gateway Middleware

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | `GET /api/v1/samples` with no `x-request-id` | Response includes `x-request-id` header (generated) |
| 2 | `GET /api/v1/samples` with `x-request-id: abc-123` | Response echoes `x-request-id: abc-123` |
| 3 | Check server logs | JSON log entry includes requestId, durationMs, statusCode |
| 4 | `GET /health` | Returns `{ status: 'ok', checks: { database: true, postgis: true } }` |
| 5 | `GET /api/docs` | Swagger UI loads with all documented routes |

### 8.4 Rate Limiting Tiers

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Hit `/auth/login` 6 times in 1 minute | 6th request returns 429 |
| 2 | Hit `/samples/nearby` 51 times in 1 minute | 51st request returns 429 (spatial limiter) |
| 3 | Hit generic `/samples` 101 times in 1 minute | 101st request returns 429 (general limiter) |

### 8.5 Performance Benchmark

| Test | Metric | Pass Criteria |
|------|--------|---------------|
| Radius query with 10k locations | Query time | < 50ms (local SSD) |
| Radius query with 100k locations | Query time | < 200ms (local SSD) |
| Concurrent 10 nearby queries | Total time | < 500ms |
| Index usage | EXPLAIN ANALYZE | Shows `Index Scan using idx_location_geog` |

### 8.6 Migration Safety

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Dump production DB, restore locally | Local copy has all data |
| 2 | Run `npx prisma migrate dev` | Migration applies cleanly; no data loss |
| 3 | `SELECT COUNT(*) FROM "Location" WHERE geog IS NULL` | Returns 0 |
| 4 | Roll back: drop `geog` column | lat/lng data intact; app reverts to degree math |

---

## 9. Appendices

### Appendix A: Environment Variables

No new environment variables required. PostGIS connection uses the existing `DATABASE_URL`.

Optional for future:
- `SPATIAL_MAX_RADIUS_METERS` — Override default 50km max radius (defense in depth).
- `SWAGGER_ENABLED` — Enable/disable Swagger UI in production (`false` by default).

### Appendix B: Dependencies to Add

```json
// api/package.json
{
  "dependencies": {
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.6"
  }
}
```

> Note: `postgis` is a PostgreSQL extension, not an npm package. No Node.js dependency needed.

### Appendix C: Backward Compatibility Checklist

- [ ] `latitude` and `longitude` columns remain in schema and are populated on every write.
- [ ] Existing frontend code reading `sample.location.latitude` requires no changes.
- [ ] `GET /api/v1/samples` (list) returns identical shape to pre-PostGIS version.
- [ ] `POST /api/v1/samples` (create) returns identical shape to pre-PostGIS version.
- [ ] Client-side conflict detection (Dexie.js, 8m radius) is untouched.
- [ ] Offline-first behavior (v0.9.0) is untouched — no frontend changes required for core flows.
- [ ] Response envelope is **opt-in** for new endpoints only; existing endpoints return raw JSON until v1.1.0.
- [ ] If PostGIS extension is missing, app degrades gracefully (health check reports `postgis: false`, 503 status).

### Appendix D: Security Considerations

- **SQL Injection**: All raw SQL uses Prisma's tagged template literals (`$queryRaw\`...\``). Never use string concatenation.
- **Resource exhaustion**: `LIMIT 200` on all spatial queries. Configurable max radius (50km) via validation.
- **Geo-privacy**: Nearby queries do not expose user identity beyond `authorName` (already public). No exact home address inference possible at 100m+ radius.
- **Index safety**: GIST index is on `geog` only. Does not interfere with existing B-tree indexes on `id`, `createdAt`.

---

> **End of Spec**
