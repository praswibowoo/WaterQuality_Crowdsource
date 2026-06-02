import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { createLocationSchema } from '../validators/schemas';

const router = Router();

// POST /api/v1/locations - Create new location
router.post(
  '/',
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
    const { id } = req.params;

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
    const { id } = req.params;

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