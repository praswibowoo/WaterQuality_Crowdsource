import { offlineDb } from './offlineDatabase';
import type { SyncLogAction } from '../types/offline';

export const SOFT_DELETE_DAYS = 30;
export const HARD_DELETE_DAYS = 7;
export const RETAIN_FAILED_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface PurgeResult {
  softDeleted: number;
  hardDeleted: number;
  retainedDeleted: number;
}

export async function autoPurge(): Promise<PurgeResult> {
  const now = Date.now();
  let softDeleted = 0;
  let hardDeleted = 0;
  let retainedDeleted = 0;

  // Soft-delete synced records older than 30 days
  const syncedCutoff = now - SOFT_DELETE_DAYS * MS_PER_DAY;
  const oldSynced = await offlineDb.offlineRecords
    .where('createdAt')
    .below(syncedCutoff)
    .and((r) => r.status === 'synced' && r.purgedAt === null)
    .toArray();

  for (const record of oldSynced) {
    await offlineDb.offlineRecords.update(record.id, { purgedAt: now });
    await logPurgeAction(record.id, 'purge', `Soft-deleted after ${SOFT_DELETE_DAYS} days`);
    softDeleted++;
  }

  // Hard-delete purged records where purgedAt > 7 days ago
  const hardCutoff = now - HARD_DELETE_DAYS * MS_PER_DAY;
  const oldPurged = await offlineDb.offlineRecords
    .where('purgedAt')
    .below(hardCutoff)
    .and((r) => r.purgedAt !== null)
    .toArray();

  for (const record of oldPurged) {
    await offlineDb.offlineRecords.delete(record.id);
    await logPurgeAction(record.id, 'purge', `Hard-deleted after ${HARD_DELETE_DAYS + SOFT_DELETE_DAYS} days total`);
    hardDeleted++;
  }

  // Hard-delete failed/dropped/duplicate records older than 90 days
  const retainCutoff = now - RETAIN_FAILED_DAYS * MS_PER_DAY;
  const oldRetained = await offlineDb.offlineRecords
    .where('createdAt')
    .below(retainCutoff)
    .and((r) => r.status === 'failed' || r.status === 'dropped' || r.status === 'duplicate')
    .toArray();

  for (const record of oldRetained) {
    await offlineDb.offlineRecords.delete(record.id);
    await logPurgeAction(record.id, 'purge', `Hard-deleted retained record after ${RETAIN_FAILED_DAYS} days`);
    retainedDeleted++;
  }

  return { softDeleted, hardDeleted, retainedDeleted };
}

async function logPurgeAction(recordId: string, action: SyncLogAction, details?: string): Promise<void> {
  try {
    await offlineDb.syncLog.add({
      recordId,
      action,
      timestamp: Date.now(),
      details,
    });
  } catch (e) {
    console.error('Failed to log purge action:', e);
  }
}
