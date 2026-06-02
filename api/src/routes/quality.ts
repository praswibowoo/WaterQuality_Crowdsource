import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { sendSuccess } from '../middleware/responseEnvelope';
import { calculateQualityScore } from '../services/qualityScoring';

const router = Router();

// GET /api/v1/samples/:id/quality-score - Get quality score breakdown
router.get(
  '/samples/:id/quality-score',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const result = await calculateQualityScore(id);
      sendSuccess(res, {
        sampleId: id,
        qualityScore: result.qualityScore,
        computedAt: result.computedAt.toISOString(),
        breakdown: result.breakdown,
      });
    } catch (err) {
      throw new AppError('Sample not found', 404);
    }
  })
);

export default router;
