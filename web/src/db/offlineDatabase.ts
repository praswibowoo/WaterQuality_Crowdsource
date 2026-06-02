import Dexie, { type Table } from 'dexie';
import type { OfflineRecord, SyncLogEntry } from '../types/offline';

export class OfflineDatabase extends Dexie {
  offlineRecords!: Table<OfflineRecord, string>;
  syncLog!: Table<SyncLogEntry, string>;

  constructor() {
    super('WaterQualityOffline_v1');

    this.version(1).stores({
      // hourBucket as standalone index for conflict detection queries
      // compound index kept for exact-match fast path and future spatial optimizations
      offlineRecords: 'id, status, hourBucket, [hourBucket+latitude+longitude], createdAt, purgedAt',
      syncLog: '++id, recordId, timestamp',
    });
  }
}

export const offlineDb = new OfflineDatabase();
