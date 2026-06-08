import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import { createLocationSchema, uuidParam } from '../validators/schemas';

const router = Router();

// POST /api/v1/locations - Create new location (auth required — SEC-001)
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const bodyResult = createLocationSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw bodyResult.error;
    }

    const { latitude, longitude, address } = bodyResult.data;

    const location = await prisma.location.create({
      data: {
        latitude,
        longitude,
        address,
      },
    });

    // Set geography column for PostGIS spatial queries
    try {
      await prisma.$executeRaw`
        UPDATE "Location"
        SET geog = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        WHERE id = ${location.id} AND geog IS NULL
      `;
    } catch (e) {
      console.warn('Failed to set geography for new location:', e);
    }

    res.status(201).json(location);
  })
);

// GET /api/v1/locations - List all locations
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const locations = await prisma.location.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(locations);
  })
);

// GET /api/v1/locations/:id - Get single location
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const idResult = uuidParam.safeParse(req.params.id);
    if (!idResult.success) {
      throw new AppError('Invalid location ID format', 400);
    }
    const id = idResult.data;

    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        samples: true,
      },
    });

    if (!location) {
      throw new AppError('Location not found', 404);
    }

    res.json(location);
  })
);

// GET /api/v1/locations/:id/samples - Get all samples for a location
router.get(
  '/:id/samples',
  asyncHandler(async (req: Request, res: Response) => {
    const idResult = uuidParam.safeParse(req.params.id);
    if (!idResult.success) {
      throw new AppError('Invalid location ID format', 400);
    }
    const id = idResult.data;

    const location = await prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      throw new AppError('Location not found', 404);
    }

    const samples = await prisma.sample.findMany({
      where: { locationId: id },
      include: { location: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json(samples);
  })
);

export default router;