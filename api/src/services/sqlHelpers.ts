import prisma from '../db/prisma';

// Measurement validation ranges (mirrors web/src/utils/measurements.ts)
export const MEASUREMENT_RANGES: Record<string, { min: number; max: number }> = {
  ph: { min: 0, max: 14 },
  temperature: { min: -100, max: 100 },
  conductivity: { min: 0, max: 199900 },
  salinity: { min: 0, max: 100 },
  nitrate: { min: 0, max: 6200 },
  calcium: { min: 0, max: 4000 },
  potassium: { min: 0, max: 2000 },
  sodium: { min: 0, max: 2000 },
};

export const MEASUREMENT_KEYS = Object.keys(MEASUREMENT_RANGES);

/**
 * Validate that a parameter name is from the allowed measurement keys.
 * This prevents SQL injection if MEASUREMENT_KEYS ever includes user-controlled input.
 */
export function isValidMeasurementKey(key: string): boolean {
  return MEASUREMENT_KEYS.includes(key);
}

/**
 * Safely quote a measurement column name for use in Prisma raw SQL.
 * Validates against the allowed measurement keys whitelist.
 * Throws if the key is invalid.
 */
export function safeColumnName(key: string): string {
  if (!isValidMeasurementKey(key)) {
    throw new Error(`Invalid measurement key for SQL: ${key}`);
  }
  return `"${key}"`;
}

export interface NeighborStats {
  cnt: bigint;
  mean_val: number | null;
  stddev_val: number | null;
}

/** SQL fragments that should never appear in user-influenced whereClause inputs */
const DANGEROUS_SQL_PATTERNS = /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|EXEC|UNION|SELECT)/i;

/**
 * Query neighbor statistics (count, mean, stddev) for a measurement column.
 * Used by both spatial outlier and temporal consistency scoring.
 *
 * IMPORTANT: `whereClause` must be a hardcoded SQL fragment. Never pass
 * user-controlled input directly. Use parameterized placeholders ($N) for
 * all dynamic values and pass them via the `params` array.
 *
 * @param paramName - The measurement column name (validated against whitelist)
 * @param whereClause - SQL WHERE clause fragment (e.g., 's."locationId" = $2')
 * @param params - Parameters for the WHERE clause ($1 is always sample ID)
 */
export async function queryNeighborStats(
  paramName: string,
  whereClause: string,
  params: unknown[]
): Promise<NeighborStats[]> {
  if (DANGEROUS_SQL_PATTERNS.test(whereClause)) {
    throw new Error('Potentially dangerous SQL in whereClause rejected');
  }

  const col = safeColumnName(paramName);
  const sql = `
    SELECT
      COUNT(*) as cnt,
      AVG(s.${col}::float) as mean_val,
      COALESCE(STDDEV(s.${col}::float), 0) as stddev_val
    FROM "Sample" s
    INNER JOIN "Location" l ON s."locationId" = l.id
    WHERE ${whereClause}
      AND s.id != $1
      AND s.status = 'approved'
      AND s.${col} IS NOT NULL
  `;

  return prisma.$queryRawUnsafe<NeighborStats[]>(sql, ...params);
}
