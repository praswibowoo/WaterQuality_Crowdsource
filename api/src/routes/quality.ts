import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { sendSuccess } from '../middleware/responseEnvelope';
import { calculateQualityScore } from '../services/qualityScoring';
import { uuidParam } from '../validators/schemas';

const router = Router();

// GET /api/v1/samples/:id/quality-score - Get quality score breakdown
router.get(
  '/samples/:id/quality-score',
  asyncHandler(async (req: Request, res: Response) => {
    const idResult = uuidParam.safeParse(req.params.id);
    if (!idResult.success) {
      throw new AppError('Invalid sample ID format', 400);
    }
    const id = idResult.data;

    try {
      const result = await calculateQualityScore(id);
      sendSuccess(res, {
        sampleId: id,
        qualityScore: result.qualityScore,
        computedAt: result.computedAt.toISOString(),
        breakdown: result.breakdown,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'Sample not found') {
        throw new AppError('Sample not found', 404);
      }
      console.error('Quality score calculation error:', err);
      throw new AppError('Failed to compute quality score', 500);
    }
  })
);

export default router;
