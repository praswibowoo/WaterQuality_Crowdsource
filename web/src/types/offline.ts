import type { CreateSampleInput } from './index';

export type SyncStatus = 'pending_sync' | 'syncing' | 'synced' | 'failed' | 'duplicate' | 'dropped';

export type DataSourceType = 'sample' | 'observation' | 'note';

export interface OfflineRecord {
  id: string;
  sourceType: DataSourceType;
  payload: CreateSampleInput;
  createdAt: number;
  syncedAt: number | null;
  retryCount: number;
  lastError: string | null;
  status: SyncStatus;
  hourBucket: string;  // ISO date truncated to hour: "2026-05-26T08"
  latitude: number;
  longitude: number;
  purgedAt: number | null;
}

export interface SyncLogEntry {
  id?: number; // auto-increment
  recordId: string;
  action: SyncLogAction;
  timestamp: number;
  details?: string;
}

export type SyncLogAction =
  | 'enqueue'
  | 'attempt'
  | 'success'
  | 'fail'
  | 'duplicate_detected'
  | 'drop'
  | 'purge';

export interface SyncStats {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  duplicate: number;
  dropped: number;
  total: number;
  lastSyncTime: number | null;
}

export interface ConflictResult {
  isDuplicate: boolean;
  existingRecordId?: string;
  reason?: string;
}
