import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineDb } from '../offlineDatabase';
import { processQueue, syncRecord, getRetryDelayMs, MAX_RETRIES } from '../syncEngine';
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

describe('getRetryDelayMs', () => {
  it('returns ~2000-3000ms for retryCount 0', () => {
    const delay = getRetryDelayMs(0);
    expect(delay).toBeGreaterThanOrEqual(2000);
    expect(delay).toBeLessThanOrEqual(3000);
  });

  it('caps at ~30000-31000ms for retryCount 4', () => {
    const delay = getRetryDelayMs(4);
    expect(delay).toBeGreaterThanOrEqual(30000);
    expect(delay).toBeLessThanOrEqual(31000);
  });
});

describe('syncRecord', () => {
  beforeEach(async () => {
    await offlineDb.offlineRecords.clear();
    await offlineDb.syncLog.clear();
    vi.clearAllMocks();
  });

  it('transitions pending_sync → synced on success', async () => {
    vi.mocked(samplesApi.create).mockResolvedValue({ id: 'server-1' } as unknown as Sample);
    const record = makeRecord();
    await offlineDb.offlineRecords.add(record);

    const result = await syncRecord(record);

    expect(result.status).toBe('synced');
    expect(result.syncedAt).not.toBeNull();
    const dbRecord = await offlineDb.offlineRecords.get(record.id);
    expect(dbRecord?.status).toBe('synced');
  });

  it('transitions to duplicate on 409 conflict', async () => {
    vi.mocked(samplesApi.create).mockRejectedValue({ response: { status: 409 }, message: 'Conflict' });
    const record = makeRecord();
    await offlineDb.offlineRecords.add(record);

    const result = await syncRecord(record);

    expect(result.status).toBe('duplicate');
  });

  it('transitions to failed on server error with retries left', async () => {
    vi.mocked(samplesApi.create).mockRejectedValue({ response: { status: 500 }, message: 'Server error' });
    const record = makeRecord({ retryCount: 2 });
    await offlineDb.offlineRecords.add(record);

    const result = await syncRecord(record);

    expect(result.status).toBe('failed');
    expect(result.retryCount).toBe(3);
  });

  it('transitions to dropped after max retries', async () => {
    vi.mocked(samplesApi.create).mockRejectedValue({ response: { status: 500 }, message: 'Server error' });
    const record = makeRecord({ retryCount: MAX_RETRIES - 1 });
    await offlineDb.offlineRecords.add(record);

    const result = await syncRecord(record);

    expect(result.status).toBe('dropped');
    expect(result.retryCount).toBe(MAX_RETRIES);
  });

  it('skips synced records without processing', async () => {
    const record = makeRecord({ status: 'synced' });
    await offlineDb.offlineRecords.add(record);

    const result = await syncRecord(record);
    expect(result.status).toBe('synced');
    expect(samplesApi.create).not.toHaveBeenCalled();
  });

  it('skips duplicate records without processing', async () => {
    const record = makeRecord({ status: 'duplicate' });
    await offlineDb.offlineRecords.add(record);

    const result = await syncRecord(record);
    expect(result.status).toBe('duplicate');
    expect(samplesApi.create).not.toHaveBeenCalled();
  });

  it('skips dropped records without processing', async () => {
    const record = makeRecord({ status: 'dropped' });
    await offlineDb.offlineRecords.add(record);

    const result = await syncRecord(record);
    expect(result.status).toBe('dropped');
    expect(samplesApi.create).not.toHaveBeenCalled();
  });
});

describe('processQueue', () => {
  beforeEach(async () => {
    await offlineDb.offlineRecords.clear();
    await offlineDb.syncLog.clear();
    vi.clearAllMocks();
  });

  it('processes multiple pending records', async () => {
    vi.mocked(samplesApi.create).mockResolvedValue({ id: 'server-1' } as unknown as Sample);
    await offlineDb.offlineRecords.bulkAdd([makeRecord(), makeRecord(), makeRecord()]);

    const result = await processQueue();

    expect(result.synced).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.dropped).toBe(0);
  });

  it('returns zero counts when no records to sync', async () => {
    const result = await processQueue();
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.dropped).toBe(0);
  });

  it('handles mixed success/failure gracefully', async () => {
    // First call fails, second succeeds
    vi.mocked(samplesApi.create)
      .mockRejectedValueOnce({ response: { status: 500 }, message: 'Error' })
      .mockResolvedValueOnce({ id: 'server-2' } as unknown as Sample);

    await offlineDb.offlineRecords.bulkAdd([
      makeRecord({ id: 'fail-1' }),
      makeRecord({ id: 'ok-2' }),
    ]);

    const result = await processQueue();
    expect(result.synced).toBe(1);
  });
});
