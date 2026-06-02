import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import prisma from '../db/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
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

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'File not found',
    });
  }

  res.sendFile(filePath);
});

// POST /api/v1/samples/:id/photos - Upload photo(s)
router.post(
  '/samples/:id/photos',
  authMiddleware,
  upload.array('photos', 5),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if sample exists
    const sample = await prisma.sample.findUnique({
      where: { id },
    });

    if (!sample) {
      throw new AppError('Sample not found', 404);
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
      for (const file of files) {
        fs.unlinkSync(file.path);
      }
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

    // Recompute quality score since photo count changed
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
    });

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    // Delete the file from disk
    const filePath = path.join(process.cwd(), 'uploads', photo.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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