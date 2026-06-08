import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../db/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Export-specific rate limiter: 10 requests per minute per user (WQ-159)
const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: 'Too Many Requests',
    message: 'Export rate limit exceeded. Max 10 exports per minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/v1/samples/export - Export samples as CSV (requires auth)
router.get(
  '/export',
  authMiddleware,
  exportLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const currentUser = authReq.auth!;

    const { status } = req.query;

    // Non-admin users can only export approved samples; admins can export all
    const where: Record<string, unknown> = {};
    if (currentUser.role !== 'admin') {
      where.status = 'approved';
    } else if (status && typeof status === 'string') {
      where.status = status;
    }

    const samples = await prisma.sample.findMany({
      where,
      include: {
        location: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // CSV header row
    const headers = [
      'ID',
      'Author',
      'Latitude',
      'Longitude',
      'Address',
      'Status',
      'pH',
      'Temperature (°C)',
      'Conductivity (µS/cm)',
      'Salinity (‰)',
      'Nitrate (mg/L)',
      'Calcium (mg/L)',
      'Potassium (mg/L)',
      'Sodium (mg/L)',
      'Water Body Type',
      'Land Use',
      'Notes',
      'Quality Score',
      'Created At',
      'Updated At',
    ];

    // Build CSV rows
    const rows = samples.map((sample) => [
      sample.id,
      escapeCSV(sample.authorName),
      sample.location?.latitude?.toString() || '',
      sample.location?.longitude?.toString() || '',
      sample.location?.address ? escapeCSV(sample.location.address) : '',
      sample.status,
      sample.ph?.toString() || '',
      sample.temperature?.toString() || '',
       sample.conductivity?.toString() || '',
       sample.salinity?.toString() || '',
      sample.nitrate?.toString() || '',
      sample.calcium?.toString() || '',
      sample.potassium?.toString() || '',
      sample.sodium?.toString() || '',
      escapeCSV(sample.waterBodyType || ''),
      escapeCSV(sample.landUse || ''),
      escapeCSV(sample.notes || ''),
      sample.qualityScore?.toString() || '',
      sample.createdAt.toISOString(),
      sample.updatedAt.toISOString(),
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.join(',')),
    ].join('\n');

    // UTF-8 BOM for Excel compatibility
    const bom = '\uFEFF';
    const csvBuffer = Buffer.from(bom + csvContent, 'utf-8');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `water-samples-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvBuffer);
  })
);

// Helper function to escape CSV values and prevent formula injection
function escapeCSV(value: string): string {
  // Sanitize against formula injection: prefix dangerous starting chars with '
  if (/^[=+\-@\t\r]/.test(value)) {
    value = "'" + value;
  }
  // Always wrap in double quotes for maximum safety
  return `"${value.replace(/"/g, '""')}"`;
}

export default router;