import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { offlineDb } from '../offlineDatabase';
import { detectConflict, haversineDistance, getHourBucket } from '../conflictDetection';
import type { OfflineRecord } from '../../types/offline';

// At latitude ~-7.3°, 1° lat ≈ 111,195 m and 1° lng ≈ 110,297 m
const BASE_LAT = -7.3059;
const BASE_LNG = 112.8443;

// Compute small offsets for distance testing
const offsetLat = (meters: number) => meters / 111_195;
const offsetLng = (meters: number) => meters / 110_297;

const basePayload = {
  authorName: 'Test Researcher',
  location: { latitude: BASE_LAT, longitude: BASE_LNG },
  waterBodyType: 'estuary',
  landUse: 'mangrove_forest',
};

function makeRecord(overrides: Partial<OfflineRecord> = {}): OfflineRecord {
  const timestamp = overrides.createdAt ?? Date.now();
  return {
    id: `record-${Math.random().toString(36).slice(2)}`,
    sourceType: 'sample',
    payload: basePayload,
    createdAt: timestamp,
    syncedAt: null,
    retryCount: 0,
    lastError: null,
    status: 'pending_sync',
    hourBucket: getHourBucket(timestamp),
    latitude: BASE_LAT,
    longitude: BASE_LNG,
    purgedAt: null,
    ...overrides,
  };
}

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    const d = haversineDistance(BASE_LAT, BASE_LNG, BASE_LAT, BASE_LNG);
    expect(d).toBe(0);
  });

  it('returns ~7m for a 7m offset in latitude', () => {
    const d = haversineDistance(BASE_LAT, BASE_LNG, BASE_LAT + offsetLat(7), BASE_LNG);
    expect(d).toBeCloseTo(7, 1);
  });

  it('returns ~9m for a 9m offset in longitude', () => {
    const d = haversineDistance(BASE_LAT, BASE_LNG, BASE_LAT, BASE_LNG + offsetLng(9));
    expect(d).toBeCloseTo(9, 1);
  });

  it('returns ~111m for a 0.001° offset in latitude', () => {
    const d = haversineDistance(BASE_LAT, BASE_LNG, BASE_LAT + 0.001, BASE_LNG);
    expect(d).toBeCloseTo(111, 0);
  });
});

describe('getHourBucket', () => {
  it('truncates timestamp to the hour in ISO format', () => {
    const ts = new Date('2026-05-26T08:15:30.123Z').getTime();
    expect(getHourBucket(ts)).toBe('2026-05-26T08');
  });

  it('rolls over midnight correctly', () => {
    const ts = new Date('2026-05-26T23:59:59Z').getTime();
    expect(getHourBucket(ts)).toBe('2026-05-26T23');
  });

  it('handles UTC midnight', () => {
    const ts = new Date('2026-05-26T00:05:00Z').getTime();
    expect(getHourBucket(ts)).toBe('2026-05-26T00');
  });
});

describe('detectConflict', () => {
  beforeEach(async () => {
    await offlineDb.offlineRecords.clear();
  });

  it('detects duplicate at same location and hour', async () => {
    const hour = new Date('2026-05-26T08:15:00').getTime();
    const existing = makeRecord({
      id: 'existing-1',
      createdAt: hour - 600_000, // 10 minutes earlier
      hourBucket: getHourBucket(hour),
    });
    await offlineDb.offlineRecords.add(existing);

    const newer = makeRecord({
      id: 'newer-1',
      createdAt: hour,
      hourBucket: getHourBucket(hour),
    });

    const result = await detectConflict(newer);
    expect(result.isDuplicate).toBe(true);
    expect(result.existingRecordId).toBe('existing-1');
  });

  it('detects duplicate within 7m radius and same hour', async () => {
    const hour = new Date('2026-05-26T08:15:00').getTime();
    const existing = makeRecord({
      id: 'existing-2',
      createdAt: hour - 300_000, // 5 minutes earlier
      hourBucket: getHourBucket(hour),
    });
    await offlineDb.offlineRecords.add(existing);

    // 7m north
    const newer = makeRecord({
      id: 'newer-2',
      createdAt: hour,
      hourBucket: getHourBucket(hour),
      latitude: BASE_LAT + offsetLat(7),
    });

    const result = await detectConflict(newer);
    expect(result.isDuplicate).toBe(true);
    expect(result.existingRecordId).toBe('existing-2');
  });

  it('does NOT detect duplicate at 9m apart in same hour', async () => {
    const hour = new Date('2026-05-26T08:15:00').getTime();
    const existing = makeRecord({
      id: 'existing-3',
      createdAt: hour - 300_000,
      hourBucket: getHourBucket(hour),
    });
    await offlineDb.offlineRecords.add(existing);

    // 9m east
    const newer = makeRecord({
      id: 'newer-3',
      createdAt: hour,
      hourBucket: getHourBucket(hour),
      longitude: BASE_LNG + offsetLng(9),
    });

    const result = await detectConflict(newer);
    expect(result.isDuplicate).toBe(false);
  });

  it('does NOT detect duplicate at same location but different hour', async () => {
    const hour1 = new Date('2026-05-26T08:15:00').getTime();
    const hour2 = new Date('2026-05-26T09:15:00').getTime();

    const existing = makeRecord({
      id: 'existing-4',
      createdAt: hour1,
      hourBucket: getHourBucket(hour1),
    });
    await offlineDb.offlineRecords.add(existing);

    const newer = makeRecord({
      id: 'newer-4',
      createdAt: hour2,
      hourBucket: getHourBucket(hour2),
    });

    const result = await detectConflict(newer);
    expect(result.isDuplicate).toBe(false);
  });

  it('does NOT detect duplicate at different location in same hour', async () => {
    const hour = new Date('2026-05-26T08:15:00').getTime();
    const existing = makeRecord({
      id: 'existing-5',
      createdAt: hour - 300_000,
      hourBucket: getHourBucket(hour),
      latitude: BASE_LAT - 0.01, // ~1.1 km away
      longitude: BASE_LNG - 0.01,
    });
    await offlineDb.offlineRecords.add(existing);

    const newer = makeRecord({
      id: 'newer-5',
      createdAt: hour,
      hourBucket: getHourBucket(hour),
    });

    const result = await detectConflict(newer);
    expect(result.isDuplicate).toBe(false);
  });

  it('oldest record wins when both in same hour+location', async () => {
    const hour = new Date('2026-05-26T08:15:00').getTime();
    const oldest = makeRecord({
      id: 'oldest-6',
      createdAt: hour - 900_000, // 15 minutes earlier
      hourBucket: getHourBucket(hour),
    });
    await offlineDb.offlineRecords.add(oldest);

    const newer = makeRecord({
      id: 'newer-6',
      createdAt: hour,
      hourBucket: getHourBucket(hour),
    });

    // Newer should be marked duplicate
    const result = await detectConflict(newer);
    expect(result.isDuplicate).toBe(true);
    expect(result.existingRecordId).toBe('oldest-6');

    // Oldest should NOT be marked duplicate (it already exists)
    const oldestResult = await detectConflict(oldest);
    expect(oldestResult.isDuplicate).toBe(false);
  });

  it('ignores records with dropped status', async () => {
    const hour = new Date('2026-05-26T08:15:00').getTime();
    const dropped = makeRecord({
      id: 'dropped-7',
      createdAt: hour - 300_000,
      hourBucket: getHourBucket(hour),
      status: 'dropped',
    });
    await offlineDb.offlineRecords.add(dropped);

    const newer = makeRecord({
      id: 'newer-7',
      createdAt: hour,
      hourBucket: getHourBucket(hour),
    });

    const result = await detectConflict(newer);
    expect(result.isDuplicate).toBe(false);
  });
});
