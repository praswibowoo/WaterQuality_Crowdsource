import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'up';
  } catch {
    checks.database = 'down';
  }

  try {
    await prisma.$queryRaw`SELECT PostGIS_Version()`;
    checks.postgis = 'up';
  } catch {
    checks.postgis = 'down';
  }

  try {
    await prisma.$queryRaw`SELECT COUNT(*) FROM "session"`;
    checks.sessions = 'up';
  } catch {
    checks.sessions = 'not initialized';
  }

  const allUp = checks.database === 'up' && checks.postgis === 'up';

  res.status(allUp ? 200 : 503).json({
    status: allUp ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
