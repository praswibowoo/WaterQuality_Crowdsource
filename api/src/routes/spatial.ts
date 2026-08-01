import { Router, Request, Response } from 'express';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendSuccess, sendError } from '../middleware/responseEnvelope.js';
import { z } from 'zod';

const router = Router();

// Rate limiter disabled for testing
// router.use(spatialLimiter);

const nearbyQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(1).max(10000).default(1000),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

interface NearbyLocationResult {
  id: string;
  latitude: number;
  longitude: number;
  address: string | null;
  distance_meters: number;
  sample_count: bigint;
}

router.get('/locations/nearby', asyncHandler(async (req: Request, res: Response) => {
  const parsed = nearbyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 'VALIDATION_ERROR', parsed.error.errors[0]?.message || 'Invalid query parameters');
    return;
  }

  const { latitude, longitude, radiusMeters, limit } = parsed.data;

  const locations = await prisma.$queryRaw<NearbyLocationResult[]>`
    SELECT
      l.id,
      l.latitude,
      l.longitude,
      l.address,
      ROUND(ST_Distance(
        l.geog,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      )::numeric, 1)::float as distance_meters,
      (SELECT COUNT(*) FROM "Sample" s WHERE s."locationId" = l.id) as sample_count
    FROM "Location" l
    WHERE ST_DWithin(
      l.geog,
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
      ${radiusMeters}
    )
    ORDER BY distance_meters
    LIMIT ${limit}
  `;

  const formatted = locations.map((l: NearbyLocationResult) => ({
    ...l,
    sample_count: Number(l.sample_count),
  }));

  sendSuccess(res, { locations: formatted, query: { latitude, longitude, radiusMeters } });
}));

interface NearbySampleResult {
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
  status: string;
  createdAt: Date;
  latitude: number;
  longitude: number;
  address: string | null;
  distance_meters: number;
}

router.get('/samples/nearby', asyncHandler(async (req: Request, res: Response) => {
  const parsed = nearbyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 'VALIDATION_ERROR', parsed.error.errors[0]?.message || 'Invalid query parameters');
    return;
  }

  const { latitude, longitude, radiusMeters, limit } = parsed.data;

  const samples = await prisma.$queryRaw<NearbySampleResult[]>`
    SELECT
      s.id,
      s."authorName",
      s.ph,
      s.temperature,
      s.conductivity,
      s.salinity,
      s.nitrate,
      s.calcium,
      s.potassium,
      s.sodium,
      s."waterBodyType",
      s."landUse",
      s.notes,
      s.status,
      s."createdAt",
      l.latitude,
      l.longitude,
      l.address,
      ROUND(ST_Distance(
        l.geog,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      )::numeric, 1)::float as distance_meters
    FROM "Sample" s
    JOIN "Location" l ON s."locationId" = l.id
    WHERE ST_DWithin(
      l.geog,
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
      ${radiusMeters}
    )
    ORDER BY distance_meters
    LIMIT ${limit}
  `;

  sendSuccess(res, { samples, query: { latitude, longitude, radiusMeters } });
}));

export default router;
