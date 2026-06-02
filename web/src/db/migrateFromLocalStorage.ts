import { offlineDb } from './offlineDatabase';
import { getHourBucket } from './conflictDetection';
import type { OfflineRecord } from '../types/offline';

const MIGRATION_KEY = 'wq_offline_migrated_v1';

/**
 * Shape of a pending submission from the old localStorage Zustand queue.
 */
interface LegacyPendingSubmission {
  id?: string;
  data?: {
    location?: {
      latitude?: number;
      longitude?: number;
    };
  };
  timestamp?: number;
  retryCount?: number;
}

/**
 * Migrate old localStorage queue to Dexie IndexedDB.
 * Runs once on first load after migration code is deployed.
 * Returns number of records migrated.
 */
export async function migrateFromLocalStorage(): Promise<number> {
  if (localStorage.getItem(MIGRATION_KEY)) {
    return 0;
  }

  const raw = localStorage.getItem('water-quality-offline-queue');
  if (!raw) {
    localStorage.setItem(MIGRATION_KEY, 'true');
    return 0;
  }

  try {
    const data = JSON.parse(raw) as { state?: { pendingSubmissions?: LegacyPendingSubmission[] } };
    const pending: LegacyPendingSubmission[] = data.state?.pendingSubmissions || [];

    if (pending.length === 0) {
      localStorage.setItem(MIGRATION_KEY, 'true');
      return 0;
    }

    const records: OfflineRecord[] = pending.map((sub) => {
      const now = sub.timestamp ?? Date.now();
      return {
        id: sub.id ?? crypto.randomUUID(),
        sourceType: 'sample' as const,
        payload: sub.data as OfflineRecord['payload'],
        createdAt: now,
        syncedAt: null,
        retryCount: sub.retryCount ?? 0,
        lastError: null,
        status: (sub.retryCount ?? 0) >= 5 ? ('dropped' as const) : ('pending_sync' as const),
        hourBucket: getHourBucket(now),
        latitude: sub.data?.location?.latitude ?? 0,
        longitude: sub.data?.location?.longitude ?? 0,
        purgedAt: null,
      };
    });

    await offlineDb.offlineRecords.bulkAdd(records);
    await offlineDb.syncLog.add({
      recordId: 'migration',
      action: 'enqueue',
      timestamp: Date.now(),
      details: `Migrated ${records.length} records from localStorage`,
    });

    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log(`Migrated ${records.length} pending submissions from localStorage to Dexie`);
    return records.length;
  } catch (e) {
    console.error('Migration from localStorage failed:', e);
    // Don't set flag so it can retry on next load
    return 0;
  }
}
