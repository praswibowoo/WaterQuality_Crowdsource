import { Router, Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import prisma from '../db/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { recalculateScore } from '../services/qualityScoring';

const router = Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// Serve uploaded files statically (with path traversal protection)
router.get('/uploads/:filename', (req, res) => {
  const { filename } = req.params;

  // Reject path separators or traversal attempts
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid filename',
    });
  }

  // Use path.basename as additional safety
  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), 'uploads', safeFilename);

  // Verify the resolved path is still within uploads directory
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(uploadsDir)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid filename',
    });
  }

  if (!existsSync(filePath)) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'File not found',
    });
  }

  res.sendFile(filePath);
});

// Multer error wrapper — ensures errors (file too large, wrong type) return JSON
function multerHandler(req: Request, res: Response, next: NextFunction) {
  upload.array('photos', 5)(req, res, (err) => {
    if (err) {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File Too Large', message: 'Each photo must be under 5MB' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Too Many Files', message: 'Maximum 5 photos per submission' });
        }
        return res.status(400).json({ error: 'Upload Error', message: err.message });
      }
      if (err instanceof Error) {
        return res.status(400).json({ error: 'Invalid File', message: err.message });
      }
      return res.status(500).json({ error: 'Upload Error', message: 'An unexpected upload error occurred' });
    }
    next();
  });
}

// POST /api/v1/samples/:id/photos - Upload photo(s)
router.post(
  '/samples/:id/photos',
  authMiddleware,
  multerHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if sample exists
    const sample = await prisma.sample.findUnique({
      where: { id },
    });

    if (!sample) {
      throw new AppError('Sample not found', 404);
    }

    // Ownership check (C2): only the sample owner or admin can upload photos
    const currentUser = (req as AuthenticatedRequest).auth!;
    if (sample.userId !== currentUser.userId && currentUser.role !== 'admin') {
      throw new AppError('Forbidden: you can only add photos to your own samples', 403);
    }

    const files = req.files as Express.Multer.File[] || [];

    if (files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    // Check total photo count for this sample
    const existingCount = await prisma.photo.count({
      where: { sampleId: id },
    });

    if (existingCount + files.length > 5) {
      // Delete uploaded files since we're rejecting the request
      await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
      throw new AppError('Maximum 5 photos per sample. Cannot upload more.', 400);
    }

    // Create photo records
    const photos = await Promise.all(
      files.map((file) =>
        prisma.photo.create({
          data: {
            filename: file.originalname,
            path: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            sampleId: id,
          },
        })
      )
    );

    // Intentionally not awaited — non-blocking quality score update for UX responsiveness.
    // Errors are caught internally by recalculateScore (logged as console.warn).
    recalculateScore(id);

    res.status(201).json(photos);
  })
);

// GET /api/v1/samples/:id/photos - Get photos for a sample
router.get(
  '/samples/:id/photos',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const photos = await prisma.photo.findMany({
      where: { sampleId: id },
      orderBy: { createdAt: 'asc' },
    });

    res.json(photos);
  })
);

// DELETE /api/v1/photos/:id - Delete a photo
router.delete(
  '/photos/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: { sample: { select: { userId: true } } },
    });

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    // Ownership check (C2): only the sample owner or admin can delete photos
    const currentUser = (req as AuthenticatedRequest).auth!;
    if (photo.sample.userId !== currentUser.userId && currentUser.role !== 'admin') {
      throw new AppError('Forbidden: you can only delete photos from your own samples', 403);
    }

    // Delete the file from disk
    const filePath = path.join(process.cwd(), 'uploads', photo.path);
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }

    const sampleId = photo.sampleId;

    // Delete the database record
    await prisma.photo.delete({
      where: { id },
    });

    // Recompute quality score since photo count changed
    recalculateScore(sampleId);

    res.status(204).send();
  })
);

export default router;