import prisma from '../db/prisma';
import { MEASUREMENT_RANGES, MEASUREMENT_KEYS, isValidMeasurementKey, queryNeighborStats } from './sqlHelpers';

const SPATIAL_RADIUS_METERS = 500;
const GPS_PENALTY_THRESHOLD = 100;
const MIN_NEIGHBORS = 3;
const MIN_HISTORICAL_SAMPLES = 3;

export interface FactorScore {
  score: number;
  weight: number;
  rawValue?: unknown;
  description: string;
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
  qualityScore: number;
  breakdown: ScoreBreakdown;
  computedAt: Date;
}

/**
 * Calculate GPS accuracy score (0-1)
 * score = clamp(1 - (gpsAccuracy / 100), 0, 1)
 */
function scoreGpsAccuracy(gpsAccuracy: number | null | undefined): FactorScore {
  if (gpsAccuracy == null) {
    return { score: 0.5, weight: 0.20, rawValue: null, description: 'GPS accuracy not provided' };
  }
  const score = Math.max(0, Math.min(1, 1 - gpsAccuracy / GPS_PENALTY_THRESHOLD));
  return {
    score,
    weight: 0.20,
    rawValue: `${gpsAccuracy}m`,
    description: score >= 0.9
      ? `GPS accuracy ${gpsAccuracy}m (≤10m ideal)`
      : score >= 0.5
        ? `GPS accuracy ${gpsAccuracy}m (moderate)`
        : `GPS accuracy ${gpsAccuracy}m (poor)`,
  };
}

/**
 * Calculate range validity score (0-1)
 * Average of isInRange(field) for all present measurement fields
 */
function scoreRangeValidity(sample: {
  ph?: number | null;
  temperature?: number | null;
  conductivity?: number | null;
  salinity?: number | null;
  nitrate?: number | null;
  calcium?: number | null;
  potassium?: number | null;
  sodium?: number | null;
}): FactorScore {
  const presentFields = MEASUREMENT_KEYS.filter(
    (key) => sample[key as keyof typeof sample] != null
  );

  if (presentFields.length === 0) {
    return { score: 0, weight: 0.20, description: 'No measurements provided' };
  }

  let validCount = 0;
  for (const key of presentFields) {
    const val = sample[key as keyof typeof sample] as number;
    const range = MEASUREMENT_RANGES[key];
    if (range && val >= range.min && val <= range.max) {
      validCount++;
    }
  }

  const score = validCount / presentFields.length;
  return {
    score,
    weight: 0.20,
    rawValue: `${validCount}/${presentFields.length} in range`,
    description: score === 1
      ? `All ${presentFields.length} measurements within valid ranges`
      : `${validCount} of ${presentFields.length} measurements within valid ranges`,
  };
}

/**
 * Calculate metadata completeness score (0-1)
 * 0.25 per present field: waterBodyType, landUse, gpsAccuracy, notes
 */
function scoreMetadataCompleteness(sample: {
  waterBodyType?: string | null;
  landUse?: string | null;
  gpsAccuracy?: number | null;
  notes?: string | null;
}): FactorScore {
  let count = 0;
  const fields = ['waterBodyType', 'landUse', 'gpsAccuracy', 'notes'] as const;
  for (const field of fields) {
    if (sample[field] != null && sample[field] !== '') {
      count++;
    }
  }
  const score = count / fields.length;
  return {
    score,
    weight: 0.15,
    rawValue: `${count}/${fields.length}`,
    description: count === 4
      ? 'All 4 metadata fields present'
      : `${count} of 4 metadata fields present`,
  };
}

/**
 * Calculate photo presence score (0-1)
 */
function scorePhotoPresence(photoCount: number): FactorScore {
  const score = photoCount > 0 ? 1 : 0;
  return {
    score,
    weight: 0.10,
    rawValue: photoCount,
    description: photoCount > 0
      ? `${photoCount} photo${photoCount !== 1 ? 's' : ''} attached`
      : 'No photos attached',
  };
}

/**
 * Calculate spatial outlier score using PostGIS ST_DWithin
 * Returns 1 if within 2σ, 0.5 if within 3σ, 0 otherwise
 */
async function scoreSpatialOutlier(
  sampleId: string,
  locationId: string,
  sample: {
    ph?: number | null;
    temperature?: number | null;
    conductivity?: number | null;
    salinity?: number | null;
    nitrate?: number | null;
    calcium?: number | null;
    potassium?: number | null;
    sodium?: number | null;
  }
): Promise<FactorScore> {
  // Find the first present measurement to compare
  let paramName: string | null = null;
  let sampleValue: number | null = null;
  const sampleRecord = sample as Record<string, number | null | undefined>;
  for (const key of MEASUREMENT_KEYS) {
    const val = sampleRecord[key];
    if (val != null) {
      paramName = key;
      sampleValue = val;
      break;
    }
  }

  if (!paramName || sampleValue == null) {
    return { score: 0.5, weight: 0.20, description: 'No measurements to compare spatially' };
  }

  // Guard: ensure paramName is from allowed measurement keys before SQL interpolation
  if (!isValidMeasurementKey(paramName)) {
    console.error(`Invalid measurement key: ${paramName}`);
    return { score: 0.5, weight: 0.20, description: 'Invalid measurement parameter' };
  }

  try {
    const neighborStats = await queryNeighborStats(
      paramName,
      `l.geog && ST_DWithin(l.geog, (SELECT geog FROM "Location" WHERE id = $2), $3)`,
      [sampleId, locationId, SPATIAL_RADIUS_METERS]
    );

    const result = neighborStats;

    const cnt = Number(result[0]?.cnt || 0);
    const meanVal = result[0]?.mean_val;
    const stddevVal = result[0]?.stddev_val;

    if (cnt < MIN_NEIGHBORS || meanVal == null) {
      return { score: 0.5, weight: 0.20, rawValue: `${cnt} neighbors`, description: `Insufficient neighbors (${cnt}) within ${SPATIAL_RADIUS_METERS}m radius` };
    }

    if (stddevVal === 0 || stddevVal == null) {
      return { score: 1.0, weight: 0.20, rawValue: `0 σ`, description: 'All neighbors have identical values' };
    }

    const deviation = Math.abs(sampleValue - meanVal) / stddevVal;

    let score: number;
    if (deviation <= 2) {
      score = 1.0;
    } else if (deviation <= 3) {
      score = 0.5;
    } else {
      score = 0.0;
    }

    return {
      score,
      weight: 0.20,
      rawValue: `${deviation.toFixed(2)} σ`,
      description: `${cnt} neighbors within ${SPATIAL_RADIUS_METERS}m, deviation ${deviation.toFixed(2)}σ from mean ${meanVal.toFixed(2)}`,
    };
  } catch {
    return { score: 0.5, weight: 0.20, description: 'Could not compute spatial outlier (database error)' };
  }
}

/**
 * Calculate temporal consistency score (0-1)
 * First tries same location. If <3 historical samples, falls back to same waterBodyType.
 */
async function scoreTemporalConsistency(
  sampleId: string,
  locationId: string,
  waterBodyType: string | null | undefined,
  sample: {
    ph?: number | null;
    temperature?: number | null;
    conductivity?: number | null;
    salinity?: number | null;
    nitrate?: number | null;
    calcium?: number | null;
    potassium?: number | null;
    sodium?: number | null;
  }
): Promise<FactorScore> {
  // Score each measurement that has data, then average
  const scores: number[] = [];
  const sampleRecord = sample as Record<string, number | null | undefined>;

  for (const key of MEASUREMENT_KEYS) {
    const val = sampleRecord[key];
    if (val == null) continue;

    const paramName = key;
    const sampleValue = val;

    try {
      // Step 1: Try same location
      let neighborStats = await queryNeighborStats(
        paramName,
        `s."locationId" = $2`,
        [sampleId, locationId]
      );

      let result = neighborStats;

      let cnt = Number(result[0]?.cnt || 0);
      let meanVal = result[0]?.mean_val;
      let stddevVal = result[0]?.stddev_val;

      // Step 2: Fallback to same waterBodyType if <3 samples
      if (cnt < MIN_HISTORICAL_SAMPLES && waterBodyType) {
        neighborStats = await queryNeighborStats(
          paramName,
          `s."waterBodyType" = $2`,
          [sampleId, waterBodyType]
        );
        result = neighborStats;
        cnt = Number(result[0]?.cnt || 0);
        meanVal = result[0]?.mean_val;
        stddevVal = result[0]?.stddev_val;
      }

      if (cnt === 0 || meanVal == null) {
        scores.push(0.5);
        continue;
      }

      if (stddevVal === 0 || stddevVal == null) {
        scores.push(1.0);
        continue;
      }

      const deviation = Math.abs(sampleValue - meanVal) / stddevVal;
      scores.push(Math.max(0, Math.min(1, 1 - deviation)));
    } catch {
      scores.push(0.5);
    }
  }

  if (scores.length === 0) {
    return { score: 0.5, weight: 0.15, description: 'No measurements to compare temporally' };
  }

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    score: avgScore,
    weight: 0.15,
    description: `Compared ${scores.length} measurement${scores.length > 1 ? 's' : ''} against historical data`,
  };
}

/**
 * Calculate full quality score for a sample.
 */
export async function calculateQualityScore(sampleId: string): Promise<QualityScoreResult> {
  // Fetch sample with related data
  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: {
      location: true,
      photos: { select: { id: true } },
    },
  });

  if (!sample) {
    throw new Error('Sample not found');
  }

  const photoCount = sample.photos.length;

  // Calculate individual factor scores
  const gpsScore = scoreGpsAccuracy(sample.gpsAccuracy);
  const rangeScore = scoreRangeValidity(sample);
  const metaScore = scoreMetadataCompleteness(sample);
  const photoScore = scorePhotoPresence(photoCount);

  const outlierScore = await scoreSpatialOutlier(
    sampleId,
    sample.locationId,
    sample
  );
  const tempScore = await scoreTemporalConsistency(
    sampleId,
    sample.locationId,
    sample.waterBodyType,
    sample
  );

  const breakdown: ScoreBreakdown = {
    gpsAccuracy: gpsScore,
    rangeValidity: rangeScore,
    spatialOutlier: outlierScore,
    metadataCompleteness: metaScore,
    temporalConsistency: tempScore,
    photoPresence: photoScore,
  };

  // Weighted average
  const qualityScore = (
    gpsScore.weight * gpsScore.score +
    rangeScore.weight * rangeScore.score +
    outlierScore.weight * outlierScore.score +
    metaScore.weight * metaScore.score +
    tempScore.weight * tempScore.score +
    photoScore.weight * photoScore.score
  );

  return {
    qualityScore: Math.round(qualityScore * 1000) / 1000,
    breakdown,
    computedAt: new Date(),
  };
}

/**
 * Recalculate and persist the quality score for a sample.
 * Retries once on failure with a 1-second delay (WQ-178).
 */
export async function recalculateScore(sampleId: string, isRetry = false): Promise<void> {
  try {
    const result = await calculateQualityScore(sampleId);
    await prisma.sample.update({
      where: { id: sampleId },
      data: { qualityScore: result.qualityScore },
    });
  } catch (err) {
    if (!isRetry) {
      console.warn(`Quality score calculation failed for ${sampleId}, retrying in 1s:`, err);
      await new Promise((r) => setTimeout(r, 1000));
      return recalculateScore(sampleId, true);
    }
    console.error(`Quality score calculation failed for ${sampleId} after retry:`, err);
  }
}
