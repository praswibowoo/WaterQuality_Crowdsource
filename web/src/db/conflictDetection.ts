import { offlineDb } from './offlineDatabase';
import type { OfflineRecord, ConflictResult } from '../types/offline';

const DUPLICATE_RADIUS_METERS = 8;
const EARTH_RADIUS_METERS = 6371000;

export async function detectConflict(
  newRecord: OfflineRecord
): Promise<ConflictResult> {
  const hourBucket = getHourBucket(newRecord.createdAt);

  // Step 1: Query all records in the same hour bucket
  const candidates = await offlineDb.offlineRecords
    .where('hourBucket')
    .equals(hourBucket)
    .and((r) => r.id !== newRecord.id && r.status !== 'dropped')
    .toArray();

  // Step 2: Spatial radius check (Haversine)
  for (const existing of candidates) {
    const distance = haversineDistance(
      newRecord.latitude,
      newRecord.longitude,
      existing.latitude,
      existing.longitude
    );

    if (distance <= DUPLICATE_RADIUS_METERS) {
      // Oldest record wins; newer record is marked duplicate
      if (newRecord.createdAt > existing.createdAt) {
        return {
          isDuplicate: true,
          existingRecordId: existing.id,
          reason: `A submission already exists within ${DUPLICATE_RADIUS_METERS}m of this location within the last hour. Please move to a different location or wait before submitting again.`,
        };
      }
    }
  }

  return { isDuplicate: false };
}

export function getHourBucket(timestamp: number): string {
  const d = new Date(timestamp);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 13); // "2026-05-26T08"
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
