import { offlineDb } from './offlineDatabase';
import { samplesApi } from '../api/samples';
import type { OfflineRecord, SyncLogAction } from '../types/offline';

export const MAX_RETRIES = 5;
const STALE_SYNCING_MS = 5 * 60 * 1000; // 5 minutes — reclaim stuck records
let isProcessing = false;               // Module-level concurrency guard

export function getRetryDelayMs(retryCount: number): number {
  const base = Math.min(1000 * Math.pow(2, retryCount + 1), 30000);
  const jitter = Math.random() * 1000;
  return base + jitter;
}

export async function syncRecord(record: OfflineRecord): Promise<OfflineRecord> {
  if (record.status === 'synced' || record.status === 'duplicate' || record.status === 'dropped') {
    return record;
  }

  const now = Date.now();
  await offlineDb.offlineRecords.update(record.id, { status: 'syncing' });
  await logAction(record.id, 'attempt', `Starting sync (attempt ${record.retryCount + 1})`);

  try {
    const response = await samplesApi.create(record.payload);

    await offlineDb.offlineRecords.update(record.id, {
      status: 'synced',
      syncedAt: now,
      lastError: null,
    });
    await logAction(record.id, 'success', `Synced successfully (server ID: ${response.id})`);

    return {
      ...record,
      status: 'synced',
      syncedAt: now,
      lastError: null,
    };
  } catch (error: unknown) {
    const err = error as { response?: { status?: number }; message?: string };
    const statusCode = err?.response?.status;
    const errorMsg = err?.message || 'Unknown error';

    if (statusCode === 409) {
      await offlineDb.offlineRecords.update(record.id, { status: 'duplicate', lastError: errorMsg });
      await logAction(record.id, 'duplicate_detected', `Server returned conflict: ${errorMsg}`);
      return {
        ...record,
        status: 'duplicate',
        lastError: errorMsg,
      };
    }

    const newRetryCount = record.retryCount + 1;

    if (newRetryCount >= MAX_RETRIES) {
      await offlineDb.offlineRecords.update(record.id, {
        status: 'dropped',
        retryCount: newRetryCount,
        lastError: errorMsg,
      });
      await logAction(record.id, 'drop', `Dropped after ${MAX_RETRIES} retries: ${errorMsg}`);
      console.warn(
        `Submission dropped after ${MAX_RETRIES} retries:`,
        record.payload.authorName,
        'at',
        new Date(record.createdAt).toLocaleString(),
        '-',
        errorMsg
      );
      return {
        ...record,
        status: 'dropped',
        retryCount: newRetryCount,
        lastError: errorMsg,
      };
    }

    await offlineDb.offlineRecords.update(record.id, {
      status: 'failed',
      retryCount: newRetryCount,
      lastError: errorMsg,
    });
    await logAction(record.id, 'fail', `Attempt ${newRetryCount}/${MAX_RETRIES} failed: ${errorMsg}`);
    return {
      ...record,
      status: 'failed',
      retryCount: newRetryCount,
      lastError: errorMsg,
    };
  }
}

export async function processQueue(): Promise<{ synced: number; failed: number; dropped: number }> {
  // Concurrency guard — prevent parallel sync loops
  if (isProcessing) return { synced: 0, failed: 0, dropped: 0 };
  isProcessing = true;

  try {
    // Normal pending + failed records
    const pendingRecords = await offlineDb.offlineRecords
      .where('status')
      .anyOf('pending_sync', 'failed')
      .toArray();

    // Stuck 'syncing' records — in sync state for >5 minutes (crash recovery)
    const staleCutoff = Date.now() - STALE_SYNCING_MS;
    const stuckRecords = await offlineDb.offlineRecords
      .where('status')
      .equals('syncing')
      .and((r) => r.createdAt < staleCutoff)
      .toArray();

    // Reset stuck records back to failed so they get retried
    for (const stuck of stuckRecords) {
      await offlineDb.offlineRecords.update(stuck.id, { status: 'failed' });
      await logAction(stuck.id, 'fail', 'Stuck syncing — reclaimed after crash');
    }

    const allRecords = [...pendingRecords, ...stuckRecords];

    if (allRecords.length === 0) {
      return { synced: 0, failed: 0, dropped: 0 };
    }

    let synced = 0;
    let failed = 0;
    let dropped = 0;

    for (const record of allRecords) {
      try {
        const result = await syncRecord(record);
        if (result.status === 'synced') synced++;
        else if (result.status === 'dropped') dropped++;
        else failed++;
      } catch (e) {
        console.error('Unexpected error syncing record:', record.id, e);
        failed++;
      }
    }

    return { synced, failed, dropped };
  } finally {
    isProcessing = false;
  }
}

async function logAction(recordId: string, action: SyncLogAction, details?: string): Promise<void> {
  try {
    await offlineDb.syncLog.add({
      recordId,
      action,
      timestamp: Date.now(),
      details,
    });
  } catch (e) {
    console.error('Failed to log sync action:', e);
  }
}
