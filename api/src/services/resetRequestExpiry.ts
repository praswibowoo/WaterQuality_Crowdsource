import prisma from '../db/prisma.js';
import { PASSWORD_RESET_TTL_MS } from '../constants.js';

/**
 * Expire stale password reset requests (WQ-196v2).
 * Marks requests as 'expired' if they are older than PASSWORD_RESET_TTL_MS
 * and still in 'pending' status. Runs on server startup.
 */
export async function expireStaleResetRequests(): Promise<number> {
  const cutoff = new Date(Date.now() - PASSWORD_RESET_TTL_MS);

  const result = await prisma.passwordResetRequest.updateMany({
    where: {
      status: 'pending',
      createdAt: { lt: cutoff },
    },
    data: { status: 'expired' },
  });

  if (result.count > 0) {
    console.log(`Expired ${result.count} stale password reset request(s)`);
  }

  return result.count;
}
