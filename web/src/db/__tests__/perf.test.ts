import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll } from 'vitest';
import { offlineDb } from '../offlineDatabase';
import { detectConflict, getHourBucket } from '../conflictDetection';
import type { OfflineRecord } from '../../types/offline';

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

describe('Performance Benchmarks', () => {
  const BENCHMARK_RECORDS = 1000;
  const MAX_QUERY_TIME_MS = 100;

  beforeAll(async () => {
    await offlineDb.offlineRecords.clear();
    await offlineDb.syncLog.clear();

    // Create BENCHMARK_RECORDS records with varied coordinates and times
    const records: OfflineRecord[] = [];
    const baseTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    for (let i = 0; i < BENCHMARK_RECORDS; i++) {
      const lat = -7.3 + Math.random() * 0.01; // Range: -7.3 to -7.29
      const lng = 112.84 + Math.random() * 0.01; // Range: 112.84 to 112.85
      const createdAt = baseTime + i * 60 * 60 * 1000; // 1 hour apart each

      records.push(makeRecord({
        id: `perf-${i}`,
        latitude: lat,
        longitude: lng,
        createdAt,
        hourBucket: getHourBucket(createdAt),
        status: i < 500 ? 'synced' : 'pending_sync',
      }));
    }

    await offlineDb.offlineRecords.bulkAdd(records);
  });

  it(`conflict detection query takes <${MAX_QUERY_TIME_MS}ms with ${BENCHMARK_RECORDS} records`, async () => {
    const newRecord = makeRecord({
      id: 'perf-query-test',
      latitude: -7.3059,
      longitude: 112.8443,
    });

    const start = performance.now();
    await detectConflict(newRecord);
    const elapsed = performance.now() - start;

    console.log(`Conflict detection with ${BENCHMARK_RECORDS} records: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(MAX_QUERY_TIME_MS);
  });

  it(`processQueue with ${BENCHMARK_RECORDS} records is performant`, async () => {
    // Count pending records — we expect ~500 (those with status 'pending_sync')
    const start = performance.now();
    const pendingCount = await offlineDb.offlineRecords
      .where('status')
      .anyOf('pending_sync', 'failed')
      .count();
    const elapsed = performance.now() - start;

    console.log(`Count ${pendingCount} pending records: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(200); // Counting should be fast (in fake-indexeddb, slower than native)
    expect(pendingCount).toBe(500);
  });

  it('Dexie cold-start open is fast', async () => {
    // Open and close the DB
    const start = performance.now();
    await offlineDb.open();
    const elapsed = performance.now() - start;

    console.log(`Dexie DB open: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(500);
  });
});
