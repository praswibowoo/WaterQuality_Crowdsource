import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineDb } from '../offlineDatabase';
import { processQueue } from '../syncEngine';
import { autoPurge } from '../purge';
import type { OfflineRecord } from '../../types/offline';
import type { Sample } from '../../types';

vi.mock('../../api/samples', () => ({
  samplesApi: {
    create: vi.fn(),
  },
}));

import { samplesApi } from '../../api/samples';

function makeRecord(overrides: Partial<OfflineRecord> = {}): OfflineRecord {
  return {
    id: crypto.randomUUID(),
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

describe('Sync Integration', () => {
  beforeEach(async () => {
    await offlineDb.offlineRecords.clear();
    await offlineDb.syncLog.clear();
    vi.clearAllMocks();
  });

  it('full lifecycle: offline submit → online sync → synced', async () => {
    // Simulate: researcher submits 3 records offline
    await offlineDb.offlineRecords.bulkAdd([
      makeRecord({ id: 'rec-1' }),
      makeRecord({ id: 'rec-2' }),
      makeRecord({ id: 'rec-3' }),
    ]);

    // Verify all are pending_sync
    const pending = await offlineDb.offlineRecords
      .where('status')
      .equals('pending_sync')
      .count();
    expect(pending).toBe(3);

    // Simulate: connection restored, sync runs
    vi.mocked(samplesApi.create).mockResolvedValue({ id: 'server-1' } as unknown as Sample);

    const result = await processQueue();

    expect(result.synced).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.dropped).toBe(0);

    // Verify all are synced
    const synced = await offlineDb.offlineRecords
      .where('status')
      .equals('synced')
      .count();
    expect(synced).toBe(3);
  });

  it('handles partial failures gracefully', async () => {
    await offlineDb.offlineRecords.bulkAdd([
      makeRecord({ id: 'rec-ok' }),
      makeRecord({ id: 'rec-fail' }),
    ]);

    // First call fails, second succeeds
    vi.mocked(samplesApi.create)
      .mockRejectedValueOnce({ response: { status: 500 }, message: 'Server error' })
      .mockResolvedValueOnce({ id: 'server-2' } as unknown as Sample);

    const result = await processQueue();

    expect(result.synced).toBe(1);
    const failedRecord = await offlineDb.offlineRecords.get('rec-fail');
    expect(failedRecord?.status).toBe('failed');
    expect(failedRecord?.retryCount).toBe(1);

    const syncedRecord = await offlineDb.offlineRecords.get('rec-ok');
    // Depending on processing order, rec-ok might be first or second
    // Let's check both
    if (syncedRecord) {
      expect(syncedRecord.status).toBe('synced');
    } else {
      const okRecord = await offlineDb.offlineRecords.get('rec-ok');
      expect(okRecord?.status).toBe('synced');
    }
  });

  it('sync → purge lifecycle: full end-to-end', async () => {
    // Create a synced record that's old enough to be purged
    await offlineDb.offlineRecords.add(makeRecord({
      id: 'old-synced',
      status: 'synced',
      syncedAt: now - 40 * MS_PER_DAY,
      createdAt: now - 40 * MS_PER_DAY,
    }));

    // Create a synced record that's recent (should NOT be purged)
    await offlineDb.offlineRecords.add(makeRecord({
      id: 'recent-synced',
      status: 'synced',
      createdAt: now - 5 * MS_PER_DAY,
    }));

    // Run purge
    const purgeResult = await autoPurge();
    expect(purgeResult.softDeleted).toBe(1); // old-synced soft-deleted
    expect(purgeResult.hardDeleted).toBe(0);

    // Verify old record has purgedAt set
    const oldRecord = await offlineDb.offlineRecords.get('old-synced');
    expect(oldRecord?.purgedAt).not.toBeNull();

    // Verify recent record is untouched
    const recentRecord = await offlineDb.offlineRecords.get('recent-synced');
    expect(recentRecord?.purgedAt).toBeNull();
    expect(recentRecord?.status).toBe('synced');
  });

  it('sync log is written for each state transition', async () => {
    vi.mocked(samplesApi.create).mockResolvedValue({ id: 'server-1' } as unknown as Sample);

    await offlineDb.offlineRecords.add(makeRecord({ id: 'log-test-1' }));
    await processQueue();

    const logs = await offlineDb.syncLog.toArray();
    expect(logs.length).toBeGreaterThanOrEqual(2); // attempt + success

    const attemptLogs = logs.filter((l) => l.action === 'attempt');
    const successLogs = logs.filter((l) => l.action === 'success');
    expect(attemptLogs.length).toBe(1);
    expect(successLogs.length).toBe(1);
  });
});
