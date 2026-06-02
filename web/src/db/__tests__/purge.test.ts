import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { offlineDb } from '../offlineDatabase';
import { autoPurge, SOFT_DELETE_DAYS, HARD_DELETE_DAYS, RETAIN_FAILED_DAYS } from '../purge';
import type { OfflineRecord } from '../../types/offline';

function makeRecord(overrides: Partial<OfflineRecord> = {}): OfflineRecord {
  return {
    id: `record-${Math.random().toString(36).slice(2)}`,
    sourceType: 'sample',
    payload: {
      authorName: 'Test',
      location: { latitude: -7.3059, longitude: 112.8443 },
      waterBodyType: 'estuary',
      landUse: 'mangrove_forest',
    },
    createdAt: Date.now(),
    syncedAt: null,
    retryCount: 0,
    lastError: null,
    status: 'pending_sync',
    hourBucket: new Date().toISOString().slice(0, 13),
    latitude: -7.3059,
    longitude: 112.8443,
    purgedAt: null,
    ...overrides,
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

describe('autoPurge', () => {
  beforeEach(async () => {
    await offlineDb.offlineRecords.clear();
    await offlineDb.syncLog.clear();
  });

  it('soft-deletes synced records older than 30 days', async () => {
    const oldRecord = makeRecord({
      status: 'synced',
      createdAt: now - (SOFT_DELETE_DAYS + 1) * MS_PER_DAY,
    });
    await offlineDb.offlineRecords.add(oldRecord);

    await autoPurge();

    const dbRecord = await offlineDb.offlineRecords.get(oldRecord.id);
    expect(dbRecord?.purgedAt).not.toBeNull();
  });

  it('hard-deletes purged records older than 37 days (30+7)', async () => {
    const purgedRecord = makeRecord({
      status: 'synced',
      createdAt: now - (SOFT_DELETE_DAYS + HARD_DELETE_DAYS + 1) * MS_PER_DAY,
      purgedAt: now - (HARD_DELETE_DAYS + 1) * MS_PER_DAY,
    });
    await offlineDb.offlineRecords.add(purgedRecord);

    await autoPurge();

    const dbRecord = await offlineDb.offlineRecords.get(purgedRecord.id);
    expect(dbRecord).toBeUndefined();
  });

  it('retains synced records under 30 days', async () => {
    const recentRecord = makeRecord({
      status: 'synced',
      createdAt: now - 20 * MS_PER_DAY,
    });
    await offlineDb.offlineRecords.add(recentRecord);

    await autoPurge();

    const dbRecord = await offlineDb.offlineRecords.get(recentRecord.id);
    expect(dbRecord).not.toBeUndefined();
    expect(dbRecord?.purgedAt).toBeNull();
  });

  it('deletes failed records older than 90 days', async () => {
    const oldFailed = makeRecord({
      status: 'failed',
      createdAt: now - (RETAIN_FAILED_DAYS + 1) * MS_PER_DAY,
    });
    await offlineDb.offlineRecords.add(oldFailed);

    await autoPurge();

    const dbRecord = await offlineDb.offlineRecords.get(oldFailed.id);
    expect(dbRecord).toBeUndefined();
  });

  it('retains failed records under 90 days', async () => {
    const recentFailed = makeRecord({
      status: 'failed',
      createdAt: now - 60 * MS_PER_DAY,
    });
    await offlineDb.offlineRecords.add(recentFailed);

    await autoPurge();

    const dbRecord = await offlineDb.offlineRecords.get(recentFailed.id);
    expect(dbRecord).not.toBeUndefined();
  });

  it('returns correct counts', async () => {
    await offlineDb.offlineRecords.bulkAdd([
      makeRecord({ status: 'synced', createdAt: now - 40 * MS_PER_DAY, id: 'soft' }),
      makeRecord({ status: 'duplicate', createdAt: now - 100 * MS_PER_DAY, id: 'retain' }),
    ]);

    const result = await autoPurge();

    expect(result.softDeleted).toBe(1);
    expect(result.retainedDeleted).toBe(1);
    expect(result.hardDeleted).toBe(0);
  });
});
