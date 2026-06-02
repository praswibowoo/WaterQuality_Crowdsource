# Data Quality Scoring & Spatial Interpolation Architecture Spec
## Water Quality Crowdsource — v1.1.0 (WQ-108 to WQ-110)

> **Status**: 📝 Planned — Ready for implementation delegation  
> **Spec Owner**: Lead Manager  
> **Target Milestone**: v1.1.0 — Data Quality Scoring & Spatial Interpolation  
> **Last Updated**: 2026-06-01

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [User Decisions & Constraints](#2-user-decisions--constraints)
3. [WQ-108: Data Quality Scoring Engine](#3-wq-108-data-quality-scoring-engine)
4. [WQ-109: Spatial Interpolation Heatmap (IDW)](#4-wq-109-spatial-interpolation-heatmap-idw)
5. [WQ-110: ML Prediction Engine (Deferred)](#5-wq-110-ml-prediction-engine-deferred)
6. [Implementation Order & Task List](#6-implementation-order--task-list)
7. [Test Plan](#7-test-plan)
8. [Appendices](#8-appendices)

---

## 1. Architecture Overview

### 1.1 Problem Statement

Crowdsourced water quality data lacks a systematic reliability metric. Researchers cannot filter high-confidence measurements from noisy submissions without manually reviewing each one. Additionally, while individual sample points are visible on the map, spatial gradients (e.g., "salinity increases toward the estuary mouth") cannot be visually interpreted without geostatistical interpolation.

### 1.2 Architecture Decision Record (ADR)

#### ADR-006: Heuristic Scoring with ML Hooks

**Context**: We need a quality metric that works with current data volume (~24 locations, growing) while remaining extensible for future ML enhancement.

**Decision**: Implement scoring as a pure deterministic function in the Node.js backend. No Python dependency for WQ-108.

**Rationale**:

| Criterion | Heuristic (Chosen) | ML Model (Deferred to WQ-110) |
|-----------|-------------------|------------------------------|
| Data volume required | Works with <50 samples | Needs 200+ samples |
| Explainability | Fully explainable (6 factors) | Black-box (feature importance only) |
| Infrastructure | Zero new dependencies | Requires Python microservice |
| Computation time | <200ms per sample | 500ms–2s per sample |
| Scientific credibility | High (transparent rules) | High (if validated) |
| Journal contribution | QA framework methodology | Predictive modeling results |

**Rejected alternatives**:
- **End-to-end ML scoring for WQ-108**: Would require data volume we don't have yet; overfitting risk.
- **Client-side scoring**: Would leak scoring logic; requires all neighbor data in browser.
- **Manual admin scoring**: Not scalable; defeats crowdsourcing automation purpose.

**Consequences**:
- **Positive**: Fast, explainable, works today, zero new infrastructure.
- **Negative**: Less nuanced than ML; weights are manually tuned (can be calibrated later).

#### ADR-007: Client-Side IDW over Server-Side Rendering

**Context**: We need a heatmap overlay on the existing Leaflet map.

**Decision**: Compute IDW on the **frontend** using sample data already loaded by `useMapMarkers`.

**Rationale**:

| Criterion | Client-Side IDW (Chosen) | Server-Side Tiles |
|-----------|-------------------------|-------------------|
| Infrastructure | None | Requires tile server or Python raster generation |
| Parameter switching | Instant (no API call) | Requires new tile request |
| Offline support | Works if markers cached | Requires connectivity |
| Data volume limit | ~1000 samples (<10ms) | Unlimited |
| Bundle size | +~5KB (custom interpolator) | +0KB (but server cost) |

**Rejected alternatives**:
- **Server-side tile generation (GeoServer/PostGIS raster)**: Too heavy for current data volume; significant infra cost.
- **Third-party heatmap plugin (leaflet.heat)**: Uses simple density-based rendering, not IDW with parameter values.

**Consequences**:
- **Positive**: Instant, offline-capable, no backend changes.
- **Negative**: If data grows to 10k+ samples, must migrate to server-side tiles.

---

## 2. User Decisions & Constraints

These decisions were explicitly approved by the user on 2026-06-01 and must be followed:

| Decision | Implication |
|----------|-------------|
| **Urban area assumption** | Spatial outlier detection uses 500m neighbor radius (appropriate for dense urban mangrove sampling). Temporal consistency comparisons assume same water body type is a valid proxy for environmental conditions. |
| **Viridis color scale** | Heatmap uses matplotlib Viridis (colorblind-safe, perceptually uniform). No red-green diverging scales. |
| **Water body type fallback** | Temporal consistency: if location has <3 historical samples, compare against all samples with same `waterBodyType` instead. |
| **WQ-108 first, then WQ-109** | Backend scoring engine must be implemented, tested, and verified bug-free before any heatmap work begins. |
| **WQ-110 deferred** | ML Prediction Engine remains Future Backlog until `Sample` count ≥ 200 and temporal spread covers ≥ 3 seasons. |

---

## 3. WQ-108: Data Quality Scoring Engine

### 3.1 Research Contribution

**Paper title suggestion**: *"Automated quality assurance framework for crowdsourced environmental monitoring data in tropical urban mangrove ecosystems"*

### 3.2 Database Changes

**Prisma schema addition:**
```prisma
model Sample {
  // ... existing fields ...
  qualityScore Float?   // 0.0 to 1.0, computed by scoring engine
}
```

**Index:**
```prisma
@@index([qualityScore])
```

**Migration:** `npx prisma migrate dev --name add_quality_score`

**Backfill strategy:**
- New field is nullable (`Float?`) — existing samples have `null` scores.
- On first deploy, run a one-time backfill script that computes scores for all historical samples where `status = 'approved'`.
- Samples with `status = 'pending'` or `'rejected'` may also be scored (useful for moderation), but the primary use case is filtering approved data for research.

### 3.3 Scoring Algorithm v1.0 (Heuristic)

The score is a **weighted average of 6 factors**. Each factor returns 0–1.

| Factor | Weight | Logic | Data Source |
|--------|--------|-------|-------------|
| **GPS Accuracy** | 20% | `score = clamp(1 - (gpsAccuracy / 100), 0, 1)` | `sample.gpsAccuracy` |
| **Range Validity** | 20% | Average of `isInRange(field)` for all present measurement fields | `MEASUREMENT_FIELDS` min/max |
| **Spatial Outlier** | 20% | `score = 1` if within 2σ of neighbors' mean; `0.5` if within 3σ; `0` otherwise | PostGIS `ST_DWithin` 500m |
| **Metadata Completeness** | 15% | `0.25` per present field (`waterBodyType`, `landUse`, `gpsAccuracy`, `notes`) | Direct fields |
| **Temporal Consistency** | 15% | `score = 1 - min(\|value - referenceMean\| / referenceStdDev, 1)` | Same location OR same `waterBodyType` |
| **Photo Presence** | 10% | `1` if `photos.length > 0`, else `0` | `sample.photos` |

**Final Score Formula:**
```
qualityScore = 
  0.20 * gpsScore +
  0.20 * rangeScore +
  0.20 * outlierScore +
  0.15 * metaScore +
  0.15 * tempScore +
  0.10 * photoScore
```

**Example Calculation:**
| Factor | Raw Input | Score | Weighted |
|--------|-----------|-------|----------|
| GPS Accuracy | 8m | `1 - 8/100 = 0.92` | `0.20 * 0.92 = 0.184` |
| Range Validity | All 8 fields in range | `1.0` | `0.20 * 1.0 = 0.200` |
| Spatial Outlier | Within 2σ of 500m neighbors | `1.0` | `0.20 * 1.0 = 0.200` |
| Metadata Completeness | All 4 fields present | `1.0` | `0.15 * 1.0 = 0.150` |
| Temporal Consistency | pH deviates 0.5 from mean (σ=0.3) | `1 - 0.5/0.3 = 0.0` (clamped) | `0.15 * 0.0 = 0.000` |
| Photo Presence | Has 2 photos | `1.0` | `0.10 * 1.0 = 0.100` |
| **Final** | | | **0.834** |

#### 3.3.1 Factor Details

**GPS Accuracy Score:**
```typescript
function gpsAccuracyScore(gpsAccuracy: number | null | undefined): number {
  if (gpsAccuracy == null) return 0.5; // Neutral if missing
  return Math.max(0, Math.min(1, 1 - gpsAccuracy / 100));
}
```
- ≤10m (green badge in UI) → score ≥ 0.9
- 50m → score = 0.5
- ≥100m → score = 0

**Range Validity Score:**
```typescript
function rangeValidityScore(sample: Sample): number {
  const fields = ['ph', 'temperature', 'conductivity', 'salinity', 'nitrate', 'calcium', 'potassium', 'sodium'];
  const presentFields = fields.filter(f => sample[f as keyof Sample] != null);
  if (presentFields.length === 0) return 0;
  
  const validCount = presentFields.filter(f => {
    const val = sample[f as keyof Sample] as number;
    const meta = MEASUREMENT_FIELDS[f as keyof typeof MEASUREMENT_FIELDS];
    return val >= meta.min && val <= meta.max;
  }).length;
  
  return validCount / presentFields.length;
}
```

**Spatial Outlier Score (PostGIS):**
```sql
-- For a given sample S with location L and parameter P (e.g., 'ph'):
WITH neighbors AS (
  SELECT s.ph as value
  FROM "Sample" s
  JOIN "Location" l ON s."locationId" = l.id
  WHERE ST_DWithin(
    l.geog,
    (SELECT geog FROM "Location" WHERE id = $targetLocationId),
    500
  )
  AND s.id != $targetSampleId
  AND s.status = 'approved'
  AND s.ph IS NOT NULL
)
SELECT 
  AVG(value) as mean_val,
  STDDEV(value) as stddev_val
FROM neighbors;
```
- If no neighbors (count < 3): score = 0.5 (neutral)
- If `stddev = 0`: score = 1.0 (all identical)
- If `|sampleValue - mean| ≤ 2*stddev`: score = 1.0
- If `2*stddev < |sampleValue - mean| ≤ 3*stddev`: score = 0.5
- If `|sampleValue - mean| > 3*stddev`: score = 0.0

**Temporal Consistency Score (with waterBodyType fallback):**
```sql
-- Step 1: Try same location
WITH historical AS (
  SELECT s.ph as value
  FROM "Sample" s
  WHERE s."locationId" = $targetLocationId
    AND s.id != $targetSampleId
    AND s.status = 'approved'
    AND s.ph IS NOT NULL
)
SELECT AVG(value) as mean_val, STDDEV(value) as stddev_val, COUNT(*) as cnt
FROM historical;

-- Step 2: If cnt < 3, fallback to same waterBodyType
WITH historical AS (
  SELECT s.ph as value
  FROM "Sample" s
  WHERE s."waterBodyType" = $targetWaterBodyType
    AND s.id != $targetSampleId
    AND s.status = 'approved'
    AND s.ph IS NOT NULL
)
SELECT AVG(value) as mean_val, STDDEV(value) as stddev_val, COUNT(*) as cnt
FROM historical;
```
- Compute for **each present measurement field individually**, then average the scores.
- If no historical data at all: score = 0.5 (neutral)
- If `stddev = 0`: score = 1.0
- Otherwise: `score = 1 - min(|value - mean| / stddev, 1)`

### 3.4 API Changes

**New endpoint:**
```
GET /api/v1/samples/:id/quality-score
```

**Response (response envelope):**
```json
{
  "success": true,
  "data": {
    "sampleId": "uuid-here",
    "qualityScore": 0.834,
    "computedAt": "2026-06-01T12:00:00Z",
    "breakdown": {
      "gpsAccuracy": { "score": 0.92, "weight": 0.20, "description": "GPS accuracy 8m (≤10m ideal)" },
      "rangeValidity": { "score": 1.00, "weight": 0.20, "description": "All 8 measurements within valid ranges" },
      "spatialOutlier": { "score": 1.00, "weight": 0.20, "description": "Within 2σ of 12 neighbors in 500m radius" },
      "metadataCompleteness": { "score": 1.00, "weight": 0.15, "description": "All 4 metadata fields present" },
      "temporalConsistency": { "score": 0.00, "weight": 0.15, "description": "pH deviates 1.7σ from estuary historical mean" },
      "photoPresence": { "score": 1.00, "weight": 0.10, "description": "2 photos attached" }
    }
  }
}
```

**Modified endpoints:**
- `POST /api/v1/samples` — triggers `recalculateScore(sampleId)` after creation
- `PUT /api/v1/samples/:id` — triggers `recalculateScore(sampleId)` after update
- `DELETE /api/v1/photos/:id` — if photo deletion affects sample, trigger `recalculateScore`
- `GET /api/v1/samples` — includes `qualityScore` in response (already included via Prisma include)
- `GET /api/v1/samples/markers` — includes `qualityScore` in selection

### 3.5 Backend Implementation Plan

**New files:**
| File | Purpose |
|------|---------|
| `api/src/services/qualityScoring.ts` | Pure scoring function + factor calculators |
| `api/src/services/__tests__/qualityScoring.test.ts` | Unit tests for all 6 factors |
| `api/src/routes/quality.ts` | `GET /samples/:id/quality-score` route |
| `api/src/scripts/backfillQualityScores.ts` | One-time backfill for historical data |

**Modified files:**
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `qualityScore Float?` + `@@index([qualityScore])` |
| `api/src/routes/samples.ts` | Call `recalculateScore(sampleId)` after create/update |
| `api/src/routes/photos.ts` | Call `recalculateScore(sampleId)` after photo delete |
| `web/src/types/index.ts` | Add `qualityScore?: number \| null` to `Sample` interface |
| `web/src/api/samples.ts` | Add `getQualityScore(sampleId)` method |

**Key TypeScript interfaces in `qualityScoring.ts`:**
```typescript
export interface FactorScore {
  score: number;      // 0-1
  weight: number;       // 0-1, sums to 1.0 across all factors
  rawValue?: unknown;   // Human-readable raw input (e.g., "8m")
  description: string;  // Human-readable explanation
}

export interface ScoreBreakdown {
  gpsAccuracy: FactorScore;
  rangeValidity: FactorScore;
  spatialOutlier: FactorScore;
  metadataCompleteness: FactorScore;
  temporalConsistency: FactorScore;
  photoPresence: FactorScore;
}

export interface QualityScoreResult {
  qualityScore: number;       // 0-1, weighted average
  breakdown: ScoreBreakdown;
  computedAt: Date;
}

export function calculateQualityScore(
  sample: SampleWithLocation & { photos: Photo[] },
  prisma: PrismaClient
): Promise<QualityScoreResult>;

export async function recalculateScore(
  sampleId: string,
  prisma: PrismaClient
): Promise<void>;
// Reads sample + neighbors from DB, computes score, updates sample.qualityScore
```

### 3.6 Frontend Integration Plan

**New UI components:**
| Component | Purpose |
|-----------|---------|
| `web/src/components/QualityScoreBadge.tsx` | Color-coded badge (Green ≥0.8, Yellow 0.5-0.8, Red <0.5, Gray = null) |
| `web/src/components/QualityScoreBreakdown.tsx` | Expandable panel showing factor breakdown with descriptions |

**Modified components:**
| Component | Change |
|-----------|--------|
| `SampleDetail.tsx` | Show `QualityScoreBadge` next to status badge; expandable `QualityScoreBreakdown` below metadata |
| `SampleList.tsx` | Add `qualityScore` to card preview (small badge); sort by score descending option |
| `AdminDashboard.tsx` | Filter by score range (≥0.8, 0.5-0.8, <0.5); flag low-score samples for review |
| `SampleMap.tsx` | Marker popup shows mini score badge |

**New hook:**
```typescript
// web/src/hooks/useQualityScore.ts
export function useQualityScore(sampleId: string) {
  return useQuery({
    queryKey: ['samples', sampleId, 'quality-score'],
    queryFn: () => samplesApi.getQualityScore(sampleId),
    staleTime: 60000,
  });
}
```

**Badge design:**
- **Green (≥0.8)**: "High Reliability" — checkmark icon
- **Yellow (0.5–0.8)**: "Moderate Reliability" — warning icon
- **Red (<0.5)**: "Low Reliability" — alert icon
- **Gray (null)**: "Not Scored" — dash icon

---

## 4. WQ-109: Spatial Interpolation Heatmap (IDW)

### 4.1 Research Contribution

**Paper title suggestion**: *"Geostatistical visualization of crowdsourced water quality data for tropical mangrove ecosystem monitoring"*

### 4.2 Algorithm: Inverse Distance Weighting (IDW)

For any point `P` on the map, the interpolated value is:

```
V(P) = Σ (vi / di^p) / Σ (1 / di^p)
```

Where:
- `vi` = measured value at sample point `i`
- `di` = distance from `P` to sample point `i` (in meters)
- `p` = power parameter (default 2.0, user-adjustable 1.0–4.0)
- Only samples within `searchRadius` (default 2000m) are included
- Samples with `status = 'approved'` and non-null values for selected parameter

**Grid resolution:** 50m × 50m cells within the current map viewport.

**Color scale:** Viridis (perceptually uniform, colorblind-safe).
- Mapped to parameter's min/max range from `MEASUREMENT_FIELDS`.
- Values below min or above max are clamped to scale endpoints.

### 4.3 Frontend Implementation Plan

**New dependencies:** None required. Custom lightweight interpolator + canvas rendering.

**New files:**
| File | Purpose |
|------|---------|
| `web/src/utils/idwInterpolation.ts` | Pure IDW computation |
| `web/src/utils/__tests__/idwInterpolation.test.ts` | Unit tests for IDW math |
| `web/src/utils/viridisScale.ts` | Viridis color scale interpolation (0-1 → RGBA) |
| `web/src/components/HeatmapLayer.tsx` | Leaflet `ImageOverlay` with dynamically generated canvas |
| `web/src/components/HeatmapControls.tsx` | Floating control panel |

**Modified files:**
| File | Change |
|------|--------|
| `SampleMap.tsx` | Add `<HeatmapLayer />` and `<HeatmapControls />` inside `MapContainer` |

**`idwInterpolation.ts` signature:**
```typescript
export interface IDWGrid {
  bounds: { north: number; south: number; east: number; west: number };
  cellSizeMeters: number;
  rows: number;
  cols: number;
  values: (number | null)[][]; // null = insufficient neighbors
}

export function computeIDWGrid(
  samples: Array<{
    latitude: number;
    longitude: number;
    [param: string]: number | null | string;
  }>,
  bounds: { north: number; south: number; east: number; west: number },
  parameter: string,
  options?: {
    cellSizeMeters?: number;      // default 50
    power?: number;               // default 2.0
    searchRadiusMeters?: number;  // default 2000
    minNeighbors?: number;        // default 3
  }
): IDWGrid;
```

**`HeatmapLayer.tsx` approach (ImageOverlay v1):**
1. Listen to Leaflet map `moveend` and `zoomend` events
2. On event, get current viewport bounds
3. Call `computeIDWGrid()` with visible samples + viewport bounds
4. Render grid to offscreen `<canvas>` (one colored rectangle per cell)
5. Convert canvas to Data URL
6. Render `L.ImageOverlay` with the Data URL
7. Debounce recomputation by 300ms

**Future upgrade path:** If data grows to 10k+ samples, replace `ImageOverlay` approach with a custom `L.GridLayer` subclass that computes IDW per-tile on demand.

### 4.4 UI/UX Specification

**Heatmap Controls (floating panel, top-right of map):**
```
┌─────────────────────────────┐
│  🌡️ Heatmap                │
│  [Toggle: OFF / ON]        │
│                             │
│  Parameter: [pH ▼]         │
│  Power: [2.0 ----●----]     │
│  Radius: [2000m ▼]         │
│                             │
│  [Viridis] [Plasma] [Cool] │
└─────────────────────────────┘
```

**States:**
- **OFF:** No heatmap rendered. Controls collapsed to a single "🌡️" button.
- **ON:** Heatmap overlay active. Sample markers remain visible (slightly dimmed via CSS opacity: 0.6).
- **No data for parameter:** Show gray overlay with "No data for {parameter}" tooltip.
- **Insufficient neighbors:** Cells with `< minNeighbors` render as transparent (showing base map).

**Accessibility:**
- Aria-label on toggle: "Toggle heatmap overlay"
- Color scale must be perceptible for deuteranopia (Viridis is safe).
- Keyboard: ESC key closes expanded controls.

### 4.5 Performance Considerations

| Scenario | Computation | Render | Target |
|----------|-------------|--------|--------|
| 100 samples, 1km viewport, 50m cells | ~5ms | ~10ms | <20ms total |
| 1000 samples, 5km viewport, 50m cells | ~50ms | ~30ms | <100ms total |

**Optimizations:**
- Debounce recomputation on zoom/pan (300ms)
- Memoize `computeIDWGrid` with `useMemo` (depends on `samples`, `bounds`, `parameter`, `power`)
- Skip computation if parameter has <3 non-null values in viewport
- Use `requestIdleCallback` for background precomputation of other parameters

### 4.6 Parameter Ranges for Color Scale

Use `MEASUREMENT_FIELDS` min/max for color clamping:

| Parameter | Min | Max | Color Scale |
|-----------|-----|-----|-------------|
| pH | 0 | 14 | Viridis (dark purple → bright yellow) |
| Temperature | -100 | 100 | Viridis |
| Conductivity | 0 | 199900 | Viridis (log scale may be needed for EC) |
| Salinity | 0 | 100 | Viridis |
| Nitrate | 0 | 6200 | Viridis |
| Calcium | 0 | 4000 | Viridis |
| Potassium | 0 | 2000 | Viridis |
| Sodium | 0 | 2000 | Viridis |

**Note:** For conductivity (range 0–199,900), a linear Viridis scale may compress all values into the dark purple region. Consider log-transform: `log10(value + 1)` before color mapping.

---

## 5. WQ-110: ML Prediction Engine (Deferred)

### 5.1 Status

📝 **Future Backlog** — Deferred until trigger conditions are met.

### 5.2 Trigger Condition

`Sample` count ≥ 200 and temporal spread covers ≥ 3 seasons (dry, wet, transitional).

### 5.3 Scope Sketch (for future reference)

**When triggered, scope will include:**
- Python FastAPI microservice in `services/ai/`
- Model: scikit-learn `RandomForestRegressor` (initial), upgrade to XGBoost
- Features: lat, lng, waterBodyType, landUse, month-of-year, hour-of-day, tide-phase (if available)
- Target: All 8 measurement parameters (one model per parameter, or multi-output)
- Output: `{ predictions: { ph: 7.2, salinity: 15.3, ... }, confidenceIntervals: { ph: [6.9, 7.5], ... } }`
- Frontend: Upgrade heatmap from IDW to ML predictions (toggle between "Interpolation" and "Prediction" modes)
- Training pipeline: Weekly retrain on approved samples with `qualityScore >= 0.7`

---

## 6. Implementation Order & Task List

### Phase 1: WQ-108 Foundation (Sequential — WQ-108 must complete before WQ-109)

| # | Task | File(s) | Est. Time |
|---|------|---------|-----------|
| 1 | Add `qualityScore` to Prisma schema + migrate | `prisma/schema.prisma` | 15 min |
| 2 | Create `qualityScoring.ts` service with 6 factor calculators | `api/src/services/qualityScoring.ts` | 3 hrs |
| 3 | Create `qualityScoring.test.ts` unit tests | `api/src/services/__tests__/qualityScoring.test.ts` | 2 hrs |
| 4 | Wire scoring into sample create/update routes | `api/src/routes/samples.ts` | 30 min |
| 5 | Wire scoring into photo delete route | `api/src/routes/photos.ts` | 15 min |
| 6 | Create `GET /samples/:id/quality-score` route | `api/src/routes/quality.ts` | 30 min |
| 7 | Create backfill script | `api/src/scripts/backfillQualityScores.ts` | 30 min |
| 8 | Add `qualityScore` to TypeScript types | `web/src/types/index.ts` | 15 min |
| 9 | Add `getQualityScore()` to API client | `web/src/api/samples.ts` | 15 min |
| 10 | Create `QualityScoreBadge` component | `web/src/components/QualityScoreBadge.tsx` | 1 hr |
| 11 | Create `QualityScoreBreakdown` component | `web/src/components/QualityScoreBreakdown.tsx` | 1 hr |
| 12 | Create `useQualityScore` hook | `web/src/hooks/useQualityScore.ts` | 30 min |
| 13 | Integrate badge into SampleDetail | `web/src/components/SampleDetail.tsx` | 30 min |
| 14 | Integrate badge into SampleList | `web/src/components/SampleList.tsx` | 30 min |
| 15 | Add score filter to AdminDashboard | `web/src/components/AdminDashboard.tsx` | 30 min |
| 16 | Run full regression (lint/typecheck/test) | All | 1 hr |

**Total Phase 1:** ~12–14 hours

### Phase 2: WQ-109 Heatmap (Starts only after WQ-108 exit criteria met)

| # | Task | File(s) | Est. Time |
|---|------|---------|-----------|
| 17 | Create `viridisScale.ts` | `web/src/utils/viridisScale.ts` | 30 min |
| 18 | Create `idwInterpolation.ts` | `web/src/utils/idwInterpolation.ts` | 2 hrs |
| 19 | Create `idwInterpolation.test.ts` | `web/src/utils/__tests__/idwInterpolation.test.ts` | 1 hr |
| 20 | Create `HeatmapLayer.tsx` (ImageOverlay approach) | `web/src/components/HeatmapLayer.tsx` | 3 hrs |
| 21 | Create `HeatmapControls.tsx` | `web/src/components/HeatmapControls.tsx` | 2 hrs |
| 22 | Integrate into SampleMap | `web/src/components/SampleMap.tsx` | 1 hr |
| 23 | Performance benchmark | Manual | 30 min |
| 24 | Run full regression | All | 1 hr |

**Total Phase 2:** ~10–12 hours

---

## 7. Test Plan

### 7.1 WQ-108 Tests

| Suite | Cases | Location |
|-------|-------|----------|
| **Unit: GPS Accuracy** | 0m→1.0, 10m→0.9, 50m→0.5, 100m→0.0, null→0.5 | `api/src/services/__tests__/qualityScoring.test.ts` |
| **Unit: Range Validity** | All in range→1.0, all out→0.0, mixed→0.5, no fields→0.0 | Same |
| **Unit: Spatial Outlier** | No neighbors→0.5, within 2σ→1.0, between 2-3σ→0.5, >3σ→0.0, stddev=0→1.0 | Same |
| **Unit: Metadata Completeness** | 0/4→0.0, 2/4→0.5, 4/4→1.0 | Same |
| **Unit: Temporal Consistency** | No history→0.5, exact mean→1.0, 1σ→0.0 (clamped), 0.5σ→0.5 | Same |
| **Unit: Photo Presence** | Has photo→1.0, no photo→0.0 | Same |
| **Unit: Weighted Average** | Verify all-1.0 → 1.0, all-0.0 → 0.0, mixed → expected | Same |
| **Integration: Score persistence** | Create→score computed; Update→score recalculated; Delete photo→score drops | `api/src/__tests__/samples.test.ts` |
| **Frontend: Badge** | 0.9→green, 0.6→yellow, 0.3→red, null→gray | `web/src/components/__tests__/QualityScoreBadge.test.tsx` |

### 7.2 WQ-109 Tests

| Suite | Cases | Location |
|-------|-------|----------|
| **Unit: IDW Math** | Single sample = exact value; Two samples = weighted average; Far point excluded by radius; Power=1 vs Power=4 | `web/src/utils/__tests__/idwInterpolation.test.ts` |
| **Unit: Grid Bounds** | Exact cell count for given bounds; Negative values handled | Same |
| **Unit: Color Mapping** | Min value = start color; Max value = end color; Out-of-range clamped | Same |
| **Unit: Viridis Scale** | 0.0 → dark purple; 0.5 → teal; 1.0 → bright yellow | Same |
| **Component: HeatmapControls** | Toggle on/off; Parameter change triggers recompute; Power slider updates | `web/src/components/__tests__/HeatmapControls.test.tsx` |
| **Integration: SampleMap** | Heatmap renders with real marker data; markers still clickable | Manual QA |

---

## 8. Appendices

### Appendix A: Viridis Color Scale Reference

```typescript
// Simplified 256-entry Viridis lookup table
// Generated from matplotlib's viridis colormap
const VIRIDIS = [
  [68, 1, 84],    // 0.0 - dark purple
  [72, 35, 116],  // 0.1
  [65, 68, 135],  // 0.2
  [42, 120, 142], // 0.3
  [33, 145, 140], // 0.4
  [34, 168, 132], // 0.5 - teal
  [68, 191, 112], // 0.6
  [121, 209, 81], // 0.7
  [189, 223, 38], // 0.8
  [253, 231, 36], // 1.0 - bright yellow
];

export function viridis(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = Math.floor(clamped * (VIRIDIS.length - 1));
  return VIRIDIS[idx];
}
```

### Appendix B: PostGIS Spatial Outlier Query (Complete)

```sql
-- Complete query for spatial outlier detection on parameter 'ph'
WITH target AS (
  SELECT "locationId", ph
  FROM "Sample"
  WHERE id = $sampleId
),
neighbors AS (
  SELECT s.ph as value
  FROM "Sample" s
  JOIN "Location" l ON s."locationId" = l.id
  CROSS JOIN target t
  WHERE ST_DWithin(
    l.geog,
    (SELECT geog FROM "Location" WHERE id = t."locationId"),
    500
  )
  AND s.id != $sampleId
  AND s.status = 'approved'
  AND s.ph IS NOT NULL
),
stats AS (
  SELECT 
    COUNT(*) as cnt,
    AVG(value) as mean_val,
    COALESCE(STDDEV(value), 0) as stddev_val
  FROM neighbors
)
SELECT 
  t.ph as sample_value,
  stats.cnt,
  stats.mean_val,
  stats.stddev_val,
  CASE
    WHEN stats.cnt < 3 THEN 0.5
    WHEN stats.stddev_val = 0 THEN 1.0
    WHEN ABS(t.ph - stats.mean_val) <= 2 * stats.stddev_val THEN 1.0
    WHEN ABS(t.ph - stats.mean_val) <= 3 * stats.stddev_val THEN 0.5
    ELSE 0.0
  END as outlier_score
FROM target t, stats;
```

### Appendix C: IDW Reference Implementation (Pseudo-code)

```
function idw(point, samples, power, radius, minNeighbors):
  neighbors = filter(samples, s => distance(point, s) <= radius)
  if neighbors.length < minNeighbors:
    return null
  
  numerator = 0
  denominator = 0
  for s in neighbors:
    d = distance(point, s)
    if d == 0:
      return s.value  // Exact match
    w = 1 / (d ^ power)
    numerator += w * s.value
    denominator += w
  
  return numerator / denominator
```

---

*End of Spec*
