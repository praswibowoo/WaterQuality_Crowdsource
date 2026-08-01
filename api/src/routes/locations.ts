import { Router, Request, Response } from 'express';
import prisma from '../db/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { findOrCreateLocation } from '../services/locationService.js';
import { createLocationSchema, uuidParam } from '../validators/schemas.js';

const router = Router();

// POST /api/v1/locations - Create new location (auth required — SEC-001)
// Uses PostGIS proximity dedup (10m radius) to prevent duplicates (WQ-205)
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const bodyResult = createLocationSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw bodyResult.error;
    }

    const { latitude, longitude, address } = bodyResult.data;

    const { location, created } = await findOrCreateLocation(latitude, longitude, address);

    res.status(created ? 201 : 200).json({ location, created });
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