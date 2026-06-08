import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import prisma from '../db/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { recalculateScore } from '../services/qualityScoring';
import {
  createSampleSchema,
  updateSampleSchema,
  getSamplesQuerySchema,
} from '../validators/schemas';

const router = Router();

// Location deduplication radius in meters
const LOCATION_DEDUP_RADIUS_METERS = 10;

/**
 * Find or create a location within a proximity radius using PostGIS ST_DWithin.
 */
async function findOrCreateLocation(
  lat: number,
  lng: number,
  address?: string
) {
  // Try to find an existing location within the radius using PostGIS
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Location"
    WHERE ST_DWithin(
      geog,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${LOCATION_DEDUP_RADIUS_METERS}
    )
    LIMIT 1
  `;

  if (existing.length > 0) {
    const found = await prisma.location.findUnique({ where: { id: existing[0].id } });
    if (found) return found;
  }

  // Create a new location with both float columns and geography column.
  // Handle race condition: if concurrent request created the same location,
  // the unique constraint will fail — retry by searching again.
  let location;
  try {
    location = await prisma.location.create({
      data: { latitude: lat, longitude: lng, address },
    });
  } catch (e: unknown) {
    // If unique constraint violated, another request created this location — retry find
    if ((e as { code?: string }).code === 'P2002') {
      const retry = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Location"
        WHERE ST_DWithin(
          geog,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${LOCATION_DEDUP_RADIUS_METERS}
        )
        LIMIT 1
      `;
      if (retry.length > 0) {
        const found = await prisma.location.findUnique({ where: { id: retry[0].id } });
        if (found) return found;
      }
    }
    throw e;
  }

  // Set geography column for PostGIS
  try {
    await prisma.$executeRaw`
      UPDATE "Location"
      SET geog = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      WHERE id = ${location.id} AND geog IS NULL
    `;
  } catch (e) {
    console.warn('Failed to set geography for new location:', e);
  }

  return location;
}

// Allowed sort fields to prevent injection
const ALLOWED_SORT_FIELDS = [
  'createdAt', 'updatedAt', 'ph', 'temperature',
  'conductivity', 'salinity',
  'nitrate', 'calcium', 'potassium', 'sodium',
  'authorName', 'qualityScore',
];

// GET /api/v1/samples - List all samples with pagination
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const queryResult = getSamplesQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw queryResult.error;
    }

    const { status, authorName, dateFrom, dateTo, sortBy, sortOrder, limit: zodLimit, qualityScoreFilter } = queryResult.data;

    // Pagination params
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(
      zodLimit || 20,
      200 // max limit
    );

    // Build dynamic where clause from filter params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic Prisma where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (authorName) {
      where.authorName = { contains: authorName };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (qualityScoreFilter) {
      switch (qualityScoreFilter) {
        case 'high':
          where.qualityScore = { gte: 0.8 };
          break;
        case 'moderate':
          where.qualityScore = { gte: 0.5, lt: 0.8 };
          break;
        case 'low':
          where.qualityScore = { lt: 0.5 };
          break;
        case 'none':
          where.qualityScore = null;
          break;
      }
    }

    // Build dynamic orderBy with allowlist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic Prisma orderBy
    const orderBy: any = sortBy && ALLOWED_SORT_FIELDS.includes(sortBy)
      ? { [sortBy]: sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const samples = await prisma.sample.findMany({
      where,
      include: {
        location: true,
        photos: true,
      },
      orderBy,
      take: limit + 1, // Fetch one extra to determine if there's a next page
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
    });

    // Determine if there are more results
    const hasNextPage = samples.length > limit;
    const data = hasNextPage ? samples.slice(0, limit) : samples;
    const nextCursor = hasNextPage && data.length > 0 ? data[data.length - 1].id : null;

    // Get total count for the given filters (without pagination)
    const totalCount = await prisma.sample.count({ where });

    res.json({
      data,
      nextCursor,
      totalCount,
    });
  })
);

// GET /api/v1/samples/my - Get current user's own samples (auth required)
router.get(
  '/my',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const queryResult = getSamplesQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw queryResult.error;
    }

    const { status, sortBy, sortOrder, limit: zodLimit, qualityScoreFilter } = queryResult.data;

    // Pagination params
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(
      zodLimit || 20,
      200 // max limit
    );

    // Build dynamic where clause — always filter by current user's ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic Prisma where clause
    const where: any = {
      userId: (req as AuthenticatedRequest).auth?.userId,
    };

    if (status) {
      where.status = status;
    }

    if (qualityScoreFilter) {
      switch (qualityScoreFilter) {
        case 'high':
          where.qualityScore = { gte: 0.8 };
          break;
        case 'moderate':
          where.qualityScore = { gte: 0.5, lt: 0.8 };
          break;
        case 'low':
          where.qualityScore = { lt: 0.5 };
          break;
        case 'none':
          where.qualityScore = null;
          break;
      }
    }

    // Build dynamic orderBy with allowlist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic Prisma orderBy
    const orderBy: any = sortBy && ALLOWED_SORT_FIELDS.includes(sortBy)
      ? { [sortBy]: sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const samples = await prisma.sample.findMany({
      where,
      include: {
        location: true,
        photos: true,
      },
      orderBy,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasNextPage = samples.length > limit;
    const data = hasNextPage ? samples.slice(0, limit) : samples;
    const nextCursor = hasNextPage && data.length > 0 ? data[data.length - 1].id : null;

    const totalCount = await prisma.sample.count({ where });

    res.json({
      data,
      nextCursor,
      totalCount,
    });
  })
);

// GET /api/v1/samples/markers - Lightweight endpoint for map markers (no pagination)
router.get(
  '/markers',
  asyncHandler(async (_req: Request, res: Response) => {
    const samples = await prisma.sample.findMany({
      select: {
        id: true,
        authorName: true,
        ph: true,
        temperature: true,
        conductivity: true,
        salinity: true,
        nitrate: true,
        calcium: true,
        potassium: true,
        sodium: true,
        waterBodyType: true,
        landUse: true,
        gpsAccuracy: true,
        qualityScore: true,
        notes: true,
        status: true,
        createdAt: true,
        location: {
          select: {
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(samples);
  })
);

// GET /api/v1/samples/:id - Get single sample
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const sample = await prisma.sample.findUnique({
      where: { id },
      include: {
        location: true,
        photos: true,
      },
    });

    if (!sample) {
      throw new AppError('Sample not found', 404);
    }

    res.json(sample);
  })
);

// POST /api/v1/samples - Create new sample (requires auth)
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const currentUser = authReq.auth;

    if (!currentUser) {
      throw new AppError('Authentication required', 401);
    }

    const bodyResult = createSampleSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw bodyResult.error;
    }

    const { location: locationData, conductivity, salinity, nitrate, calcium, potassium, sodium, waterBodyType, landUse, gpsAccuracy, ...sampleData } = bodyResult.data;

    // Find or create the location (deduplication within 10m radius)
    const location = await findOrCreateLocation(
      locationData.latitude,
      locationData.longitude,
      locationData.address
    );

    // Use the authenticated user's name as authorName, fallback to provided
    const authorName = sampleData.authorName || currentUser.username;
    const userId = currentUser.userId;

    // Then create the sample
    const sample = await prisma.sample.create({
      data: {
        authorName,
        userId,
        ph: sampleData.ph ?? null,
        temperature: sampleData.temperature ?? null,
        conductivity: conductivity ?? null,
        salinity: salinity ?? null,
        nitrate: nitrate ?? null,
        calcium: calcium ?? null,
        potassium: potassium ?? null,
        sodium: sodium ?? null,
        waterBodyType: waterBodyType ?? null,
        landUse: landUse ?? null,
        gpsAccuracy: gpsAccuracy ?? null,
        notes: sampleData.notes ?? null,
        status: 'pending',
        locationId: location.id,
      },
      include: {
        location: true,
        photos: true,
      },
    });

    // Compute quality score asynchronously
    recalculateScore(sample.id);

    res.status(201).json(sample);
  })
);

// PUT /api/v1/samples/:id - Update sample
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const bodyResult = updateSampleSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw bodyResult.error;
    }

    const { status, conductivity, salinity, nitrate, calcium, potassium, sodium, waterBodyType, landUse, gpsAccuracy, ...updateData } = bodyResult.data;

    // Check if sample exists
    const existingSample = await prisma.sample.findUnique({
      where: { id },
    });

    if (!existingSample) {
      throw new AppError('Sample not found', 404);
    }

    // Ownership check (C1): only the sample owner or admin can edit
    const currentUser = (req as AuthenticatedRequest).auth!;
    if (existingSample.userId !== currentUser.userId && currentUser.role !== 'admin') {
      throw new AppError('Forbidden: you can only edit your own samples', 403);
    }

    // Status guard (C3): only admins can change sample status
    if (status && currentUser.role !== 'admin') {
      throw new AppError('Only admins can change sample status', 403);
    }

    const sample = await prisma.sample.update({
      where: { id },
      data: {
        ...updateData,
        ...(status && { status }),
        // Only include new fields if explicitly provided (including null)
        ...(conductivity !== undefined && { conductivity }),
        ...(salinity !== undefined && { salinity }),
        ...(nitrate !== undefined && { nitrate }),
        ...(calcium !== undefined && { calcium }),
        ...(potassium !== undefined && { potassium }),
        ...(sodium !== undefined && { sodium }),
        ...(waterBodyType !== undefined && { waterBodyType }),
        ...(landUse !== undefined && { landUse }),
        ...(gpsAccuracy !== undefined && { gpsAccuracy }),
      },
      include: {
        location: true,
        photos: true,
      },
    });

    // Recompute quality score asynchronously
    recalculateScore(id);

    res.json(sample);
  })
);

// DELETE /api/v1/samples/:id - Delete sample
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const existingSample = await prisma.sample.findUnique({
      where: { id },
      include: { photos: true },
    });

    if (!existingSample) {
      throw new AppError('Sample not found', 404);
    }

    // Ownership check (C1): only the sample owner or admin can delete
    const currentUser = (req as AuthenticatedRequest).auth!;
    if (existingSample.userId !== currentUser.userId && currentUser.role !== 'admin') {
      throw new AppError('Forbidden: you can only delete your own samples', 403);
    }

    // Delete DB records first — files only deleted after successful DB transaction
    await prisma.sample.delete({
      where: { id },
    });

    // Also delete the associated location if no other samples use it
    await prisma.location.deleteMany({
      where: {
        id: existingSample.locationId,
        samples: {
          none: {
            id: { not: id },
          },
        },
      },
    });

    // Now delete photo files from disk (after DB is consistent)
    for (const photo of existingSample.photos) {
      const filePath = path.join(process.cwd(), 'uploads', photo.path);
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
      } catch {
        // File may have been deleted already; ignore
      }
    }

    res.status(204).send();
  })
);

export default router;