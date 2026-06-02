# Offline-First Storage Engine Architecture Spec
## Water Quality Crowdsource — v0.9.0 (WQ-086 to WQ-096)

> **Status**: 📝 Planned — Ready for implementation delegation  
> **Spec Owner**: Lead Manager  
> **Target Milestone**: v0.9.0 — Production-Grade Offline Sync  
> **Last Updated**: 2026-05-26

---

## Table of Contents

1. [Architecture Decision Record (ADR)](#1-architecture-decision-record-adr)
2. [Database Schema (Dexie.js)](#2-database-schema-dexiejs)
3. [State Machine](#3-state-machine)
4. [Conflict Detection Algorithm](#4-conflict-detection-algorithm)
5. [API Contract](#5-api-contract)
6. [Feature Breakdown & Task List](#6-feature-breakdown--task-list)
7. [Test Plan](#7-test-plan)
8. [Migration Strategy](#8-migration-strategy)
9. [Mobile Browser Compatibility](#9-mobile-browser-compatibility)

---

## 1. Architecture Decision Record (ADR)

### ADR-001: Storage Engine — Dexie.js over localStorage

**Context**: The current offline system uses Zustand + localStorage (`water-quality-offline-queue`). It stores only pending submissions, drops silently after 5 retries, and has no conflict resolution or historical tracking. For production field use at Mangrove Wonorejo, researchers need reliable offline storage that survives browser restarts, handles large data volumes, and resolves conflicts between multiple researchers.

**Decision**: Migrate to **Dexie.js** (v4+) as the IndexedDB wrapper, keeping the localStorage queue active during a gradual cutover.

**Rationale**:

| Criterion | localStorage (Current) | Dexie.js/IndexedDB (Chosen) |
|-----------|------------------------|----------------------------|
| Storage quota | ~5 MB total | Up to ~60% of disk (browser-dependent) |
| Structured queries | None (JSON parse/stringify) | Indexed queries, compound keys, ranges |
| Async API | Synchronous (blocks main thread) | Fully Promise-based |
| Transaction support | None | ACID transactions per object store |
| Binary data (future) | Base64 only (2x overhead) | Native Blob/ArrayBuffer support |
| Mobile Safari reliability | Reliable but tiny quota | Fully supported since iOS 15 |
| Schema versioning | Manual JSON migration | Dexie `version()` DSL |
| Bundle size | 0 KB (built-in) | ~18 KB gzipped |
| TypeScript | `any` | Full generic types, table inference |

**Rejected alternatives**:
- **PouchDB**: Too heavy (~50 KB + CouchDB sync overhead). We don't need CouchDB replication; our sync is custom REST-based.
- **idb-keyval**: Too minimal. No schema versioning, no query indexes, no compound keys. We'd rebuild Dexie on top of it.
- **Native IndexedDB**: Verbose API, error-prone transaction management, no TypeScript inference. Dexie is the industry-standard wrapper.
- **localStorage + LZ-String compression**: Still limited to 5 MB; compression adds CPU cost on mobile; no query capabilities.

**Consequences**:
- **Positive**: Scalable to thousands of submissions; indexed conflict queries; robust error handling; future-proof for binary data.
- **Negative**: Adds 18 KB to bundle; introduces async initialization (must guard UI with `db.isOpen()`); requires schema migration logic.

---

### ADR-002: Sync Strategy — Event-Driven + Periodic

**Context**: The current system syncs every 30 seconds (`SYNC_INTERVAL = 30000`) and on the `online` event. This is simple but wastes battery on mobile and doesn't handle intermittent connectivity gracefully.

**Decision**: Hybrid sync — **event-driven on connectivity changes** + **adaptive periodic fallback** + **manual force sync**.

**Rationale**:
- Event-driven (`online` / `navigator.connection.change`) is immediate and battery-efficient.
- Adaptive periodic uses exponential backoff when errors occur (network unstable) and fast re-check when queue is non-empty.
- Manual force sync is exposed via UI "Sync Now" button for researchers who just regained connectivity.

**Consequences**:
- **Positive**: Responsive sync without polling waste; handles flaky connectivity gracefully.
- **Negative**: More complex state machine (see §3); `navigator.connection` API is not available on all browsers (graceful fallback to polling).

---

### ADR-003: Conflict Resolution — Temporal + Spatial Deduplication

**Context**: Two researchers at the same mangrove site may submit similar data within the same hour. The backend currently deduplicates locations by 10m radius (WQ-021) but does not deduplicate samples.

**Decision**: Client-side pre-sync conflict detection. If a local submission shares the **same date (truncated to hour)** and **same GPS coordinates within 10m radius** with another local or server submission, mark it as `duplicate` and reject the older one.

**Rationale**:
- Client-side detection avoids unnecessary network round-trips and server load.
- Truncating to hour balances precision with realistic field conditions (researchers typically don't sample the exact same minute).
- 10m radius matches the existing location deduplication logic (WQ-021), providing consistency.
- The *older* submission is rejected because newer data is more likely to be corrected/re-measured data.

**Consequences**:
- **Positive**: Prevents data pollution; consistent with existing radius logic; no backend changes needed.
- **Negative**: Clock skew between devices could cause incorrect duplicate detection (mitigated by using server time on sync); requires IndexedDB compound index on `(hourBucket, lat, lng)`.

---

### ADR-004: Data Retention — 30-Day Auto-Purge

**Context**: IndexedDB grows indefinitely if synced records are never deleted. Mobile devices have limited storage.

**Decision**: Auto-purge records in `synced` status older than 30 days. Run purge check on every app startup and every 24 hours.

**Rationale**:
- 30 days provides a reasonable window for researchers to review their recent submissions.
- Purge is soft-delete (set `purgedAt`) for 7 additional days, then hard-delete, allowing audit recovery.
- Only `synced` records are purged. `failed`, `duplicate`, and `dropped` records are retained for 90 days for debugging.

---

## 2. Database Schema (Dexie.js)

### 2.1 Schema Definition

```typescript
// File: web/src/db/offlineDatabase.ts

import Dexie, { type Table } from 'dexie';
import type { CreateSampleInput } from '../types';

// ──────────────────────────────────────────────
// Enums & Types
// ──────────────────────────────────────────────

export type SyncStatus =
  | 'pending_sync'   // Queued, not yet attempted
  | 'syncing'        // Currently being sent to server
  | 'synced'         // Successfully persisted on server
  | 'failed'         // Sync failed, will retry
  | 'duplicate'      // Rejected as duplicate (see §4)
  | 'dropped';       // Max retries exceeded, permanently dropped

export type DataSourceType = 'sample' | 'observation' | 'note';
// Extensible: future data sources (WQ-086 requirement #1)

export interface OfflineRecord {
  // Primary key — local-only, never sent to server
  id: string;                    // crypto.randomUUID()

  // Data payload — polymorphic per sourceType
  sourceType: DataSourceType;    // 'sample' | 'observation' | 'note'
  payload: CreateSampleInput;    // Currently only Sample; future: ObservationInput, NoteInput

  // Metadata
  createdAt: number;             // Local timestamp (Date.now())
  syncedAt: number | null;       // Server acknowledgment timestamp
  retryCount: number;            // 0-based
  lastError: string | null;      // Last error message for diagnostics
  status: SyncStatus;

  // Conflict detection fields (indexed)
  hourBucket: string;            // ISO date truncated to hour: "2026-05-26T08"
  latitude: number;              // From payload.location.latitude
  longitude: number;             // From payload.location.longitude

  // Soft delete for purge
  purgedAt: number | null;
}

export interface SyncLogEntry {
  id: string;                    // auto-increment or UUID
  recordId: string;              // FK to OfflineRecord.id
  action: 'enqueue' | 'attempt' | 'success' | 'fail' | 'duplicate_detected' | 'drop' | 'purge';
  timestamp: number;
  details?: string;
}

// ──────────────────────────────────────────────
// Dexie Database Class
// ──────────────────────────────────────────────

export class OfflineDatabase extends Dexie {
  // Tables
  offlineRecords!: Table<OfflineRecord, string>;
  syncLog!: Table<SyncLogEntry, string>;

  constructor() {
    super('WaterQualityOffline_v1');

    this.version(1).stores({
      // Primary key: id (string UUID)
      // Indexes for query patterns:
      //   - status: filter by sync state ("give me all pending")
      //   - hourBucket+latitude+longitude: compound index for conflict detection
      //   - createdAt: range queries for purge and recent-first listing
      //   - purgedAt: find soft-deleted records for hard purge
      offlineRecords: 'id, status, hourBucket, [hourBucket+latitude+longitude], createdAt, purgedAt',

      // Audit trail
      syncLog: '++id, recordId, timestamp',
    });
  }
}

// Singleton instance
export const offlineDb = new OfflineDatabase();
```

### 2.2 Index Design Justification

| Index | Query Pattern | Cardinality |
|-------|--------------|-------------|
| `status` | `where('status').anyOf(['pending_sync','failed'])` — sync queue | Low (6 values) |
| `hourBucket` | Conflict detection: all records in same hour bucket | Medium |
| `[hourBucket+latitude+longitude]` | Exact coordinate match (future optimization) | High (compound) |
| `createdAt` | Purge: `where('createdAt').below(cutoff)` | High |
| `purgedAt` | Hard delete: `where('purgedAt').below(cutoff)` | Low (mostly null) |

**Note on indexing strategy**: The conflict query uses a two-step approach:
1. **Standalone `hourBucket` index** — filters to all records in the same hour (O(log n))
2. **Client-side Haversine** — calculates actual distance for each candidate

The compound index `[hourBucket+latitude+longitude]` is kept for exact-match lookups (future optimization), but the radius query uses the standalone `hourBucket` index because `.equals()` on a compound index only matches exact coordinates — it would miss points 7m away. For the Wonorejo scale (<1000 samples), this is performant. If scale exceeds 10k samples, we'll add a geohash index in a future ADR.

---

### 2.3 TypeScript Interfaces (Shared)

```typescript
// File: web/src/types/offline.ts (NEW)

import type { CreateSampleInput } from './index';

export type SyncStatus = 'pending_sync' | 'syncing' | 'synced' | 'failed' | 'duplicate' | 'dropped';

export type DataSourceType = 'sample' | 'observation' | 'note';

export interface OfflineRecord {
  id: string;
  sourceType: DataSourceType;
  payload: CreateSampleInput; // Future: union type with ObservationInput, NoteInput
  createdAt: number;
  syncedAt: number | null;
  retryCount: number;
  lastError: string | null;
  status: SyncStatus;
  hourBucket: string;
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
```

---

## 3. State Machine

### 3.1 Visual State Diagram

```
                    ┌─────────────┐
         enqueue    │             │
    ┌──────────────►│ pending_sync│◄──────────┐
    │               │             │           │
    │               └──────┬──────┘           │
    │                      │ start sync       │ retry
    │                      ▼                  │
    │               ┌─────────────┐          │
    │               │   syncing   │──────────┘
    │               │             │ fail (retry < MAX)
    │               └──────┬──────┘
    │                      │
    │          ┌─────────┼─────────┐
    │          │         │         │
    │          ▼         ▼         ▼
    │    ┌────────┐ ┌────────┐ ┌────────┐
    │    │ synced │ │ failed │ │duplicate│
    │    │        │ │        │ │         │
    │    └───┬────┘ └───┬────┘ └────┬────┘
    │        │          │           │
    │   purge│      retry│      retain
    │   (30d)│      (expo│      (90d)
    │        │       back)│           │
    │        ▼          │           ▼
    │   ┌────────┐      │      ┌────────┐
    │   │purged  │      └─────►│ dropped│
    │   │(soft)  │    max retry│        │
    │   └───┬────┘             └───┬────┘
    │       │                      │
    │       ▼                      ▼
    │  ┌────────┐             ┌────────┐
    └──┤ deleted│             │ retained│
       │(hard)  │             │(debug)  │
       └────────┘             └────────┘
```

### 3.2 State Transitions Table

| From | Trigger | To | Guard / Action |
|------|---------|----|----------------|
| `pending_sync` | `startSync()` | `syncing` | Record locked, `syncing` prevents concurrent sync of same record |
| `syncing` | `api.create()` returns 200 | `synced` | `syncedAt = Date.now()`, log 'success', invalidate query cache |
| `syncing` | `api.create()` returns 409 or duplicate detected | `duplicate` | Log 'duplicate_detected', do NOT retry |
| `syncing` | `api.create()` returns 4xx/5xx/network error | `failed` | `retryCount += 1`, `lastError = error.message`, log 'fail' |
| `failed` | `retrySync()` | `syncing` | Only if `retryCount < MAX_RETRIES` (5) AND back online |
| `failed` | `retryCount >= MAX_RETRIES` | `dropped` | Log 'drop', notify user via toast/console.warn |
| `synced` | `purge()` (30 days old) | *deleted* | Soft delete first (`purgedAt`), hard delete after 7 days |
| `duplicate` | `purge()` (90 days old) | *deleted* | Retained longer for audit/debugging |
| `dropped` | `purge()` (90 days old) | *deleted* | Retained longer for audit/debugging |

### 3.3 MAX_RETRIES & Backoff

```typescript
const MAX_RETRIES = 5;

function getRetryDelayMs(retryCount: number): number {
  // Exponential backoff with jitter
  const base = Math.min(1000 * Math.pow(2, retryCount), 30000); // Cap at 30s
  const jitter = Math.random() * 1000;
  return base + jitter;
}

// Retry schedule: 2s → 4s → 8s → 16s → 30s (max) → DROP
```

---

## 4. Conflict Detection Algorithm

### 4.1 Algorithm: `detectConflict(record)`

```typescript
// File: web/src/db/conflictDetection.ts

import { offlineDb } from './offlineDatabase';
import type { OfflineRecord, ConflictResult } from '../types/offline';

const DUPLICATE_RADIUS_METERS = 8; // User decision: 8m radius for duplicate detection
const EARTH_RADIUS_METERS = 6371000;

/**
 * Check if a new submission conflicts with an existing local or server record.
 * Conflict = same hour bucket AND within 10m radius.
 * Oldest record wins; newer record is marked duplicate.
 */
export async function detectConflict(
  newRecord: OfflineRecord
): Promise<ConflictResult> {
  const hourBucket = getHourBucket(newRecord.createdAt);

  // Step 1: Query by hour bucket (fast — O(log n) using standalone index)
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
      // Oldest record wins
      if (newRecord.createdAt > existing.createdAt) {
        return {
          isDuplicate: true,
          existingRecordId: existing.id,
          reason: `Duplicate of record ${existing.id} (${distance.toFixed(1)}m apart, same hour)`,
        };
      }
    }
  }

  // Step 3: Server-side check (after successful sync)
  // The backend already deduplicates locations by 10m radius (WQ-021).
  // If the server returns 409 Conflict, we map it to 'duplicate' status.

  return { isDuplicate: false };
}

function getHourBucket(timestamp: number): string {
  const d = new Date(timestamp);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 13); // "2026-05-26T08"
}

function haversineDistance(
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
```

### 4.2 Backend Alignment

The backend already performs location deduplication within 10m radius (WQ-021). The client-side conflict detection is a **pre-sync optimization** that:
1. Reduces unnecessary network requests.
2. Provides immediate feedback to the researcher ("This sample appears to duplicate your earlier submission at 09:15").
3. Does not replace server-side validation. The server must still validate uniqueness because:
   - Another researcher's device may have already synced.
   - Clock skew may cause client-side miss.

If the server returns `409 Conflict` with `{ duplicateOf: "server-sample-id" }`, the client maps it to `duplicate` status just like a local detection.

---

## 5. API Contract

### 5.1 New / Modified Files

```
web/src/
├── db/
│   ├── offlineDatabase.ts          # Dexie schema + singleton (NEW)
│   ├── conflictDetection.ts        # detectConflict() + helpers (NEW)
│   ├── syncEngine.ts               # Core sync logic: processQueue, syncRecord (NEW)
│   └── purge.ts                    # autoPurge() + scheduled purge (NEW)
├── types/
│   └── offline.ts                  # OfflineRecord, SyncStatus, etc. (NEW)
├── hooks/
│   ├── useOfflineSync.ts           # REWRITE — Dexie-backed, preserve interface
│   ├── useOfflineSubmission.ts     # NEW — extracted from useOfflineSync
│   └── useDexieInit.ts             # NEW — guards UI with db.isOpen()
├── stores/
│   └── offlineStore.ts             # REWRITE — thin Zustand layer over Dexie
└── components/
    └── OfflineStatusBar.tsx        # NEW — enhanced offline banner with sync status
```

### 5.2 Hook Interfaces

#### `useOfflineSync()` — Rewritten (backward-compatible return type)

```typescript
// File: web/src/hooks/useOfflineSync.ts

export interface UseOfflineSyncReturn {
  pendingCount: number;           // Records with status 'pending_sync' or 'failed'
  isSyncing: boolean;             // At least one record currently in 'syncing' state
  forceSync: () => Promise<void>; // Manual trigger
  syncStats: SyncStats;           // NEW — full breakdown by status
}

export function useOfflineSync(): UseOfflineSyncReturn;
```

**Contract preservation**: The return type `{ pendingCount, isSyncing, forceSync }` is unchanged. `Layout.tsx` calling `useOfflineSync()` requires no modifications during migration.

#### `useOfflineSubmission()` — New (extracted from old inline export)

```typescript
// File: web/src/hooks/useOfflineSubmission.ts

export interface UseOfflineSubmissionReturn {
  submit: (
    data: CreateSampleInput
  ) => Promise<{
    success: boolean;
    offline?: boolean;
    error?: string;
    recordId?: string;            // NEW — local record ID for tracking
  }>;
  isSubmitting: boolean;
}

export function useOfflineSubmission(): UseOfflineSubmissionReturn;
```

**Key behavior**:
- If online: attempt immediate `POST /samples`. On success, also write a `synced` record to Dexie for local history.
- If offline OR immediate POST fails: enqueue to Dexie as `pending_sync`.
- Before enqueue, run `detectConflict()`. If duplicate, return `{ success: false, error: "Duplicate detected..." }`.
- Photos blocked offline (WQ-072): if `!isOnline && hasPhotos`, return error immediately.

#### `useDexieInit()` — New

```typescript
// File: web/src/hooks/useDexieInit.ts

export interface UseDexieInitReturn {
  isReady: boolean;               // db.isOpen() === true
  error: Error | null;            // Initialization failure
}

export function useDexieInit(): UseDexieInitReturn;
```

**Usage**: Wrap app entry point (`<App />`) to prevent race conditions:
```tsx
function App() {
  const { isReady, error } = useDexieInit();
  if (error) return <DexieErrorScreen error={error} />;
  if (!isReady) return <AppLoadingScreen />;
  return <RouterProvider />;
}
```

### 5.3 Zustand Store — Rewritten (backward-compatible selector interface)

```typescript
// File: web/src/stores/offlineStore.ts (REWRITE)

import { create } from 'zustand';
import { offlineDb } from '../db/offlineDatabase';
import type { SyncStatus, SyncStats } from '../types/offline';

interface OfflineState {
  // Observables (derived from Dexie, not persisted to localStorage)
  isOnline: boolean;
  syncStats: SyncStats;
  lastSyncTime: number | null;

  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  refreshStats: () => Promise<void>;
  setLastSyncTime: (time: number) => void;
}

export const useOfflineStore = create<OfflineState>()((set, get) => ({
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  syncStats: {
    pending: 0, syncing: 0, synced: 0, failed: 0, duplicate: 0, dropped: 0, total: 0, lastSyncTime: null,
  },
  lastSyncTime: null,

  setOnlineStatus: (isOnline) => set({ isOnline }),

  refreshStats: async () => {
    const all = await offlineDb.offlineRecords.toArray();
    const stats: SyncStats = {
      pending: all.filter((r) => r.status === 'pending_sync').length,
      syncing: all.filter((r) => r.status === 'syncing').length,
      synced: all.filter((r) => r.status === 'synced').length,
      failed: all.filter((r) => r.status === 'failed').length,
      duplicate: all.filter((r) => r.status === 'duplicate').length,
      dropped: all.filter((r) => r.status === 'dropped').length,
      total: all.length,
      lastSyncTime: get().lastSyncTime,
    };
    set({ syncStats: stats });
  },

  setLastSyncTime: (time) => set({ lastSyncTime: time }),
}));
```

**Note**: `persist` middleware is **removed** from Zustand. All persistence is now Dexie's responsibility. This eliminates the dual-source-of-truth problem during migration.

---

## 6. Feature Breakdown & Task List

### Phase 1: Foundation (No UI changes — safe to merge)

| # | Feature ID | Task | File(s) | Est. Lines | Notes |
|---|------------|------|---------|------------|-------|
| 1 | WQ-086 | Install Dexie.js dependency | `web/package.json` | +1 | `npm install dexie` |
| 2 | WQ-086 | Create Dexie database schema + singleton | `web/src/db/offlineDatabase.ts` | ~60 | §2.1 schema |
| 3 | WQ-086 | Create offline TypeScript types | `web/src/types/offline.ts` | ~50 | §2.3 interfaces |
| 4 | WQ-087 | Implement conflict detection algorithm | `web/src/db/conflictDetection.ts` | ~80 | §4.1 `detectConflict()` |
| 5 | WQ-087 | Write unit tests for conflict detection | `web/src/db/__tests__/conflictDetection.test.ts` | ~100 | Mock Dexie, test Haversine, test hour bucket |

### Phase 2: Sync Engine Core (No UI changes — safe to merge)

| # | Feature ID | Task | File(s) | Est. Lines | Notes |
|---|------------|------|---------|------------|-------|
| 6 | WQ-088 | Implement sync engine: `processQueue()`, `syncRecord()` | `web/src/db/syncEngine.ts` | ~150 | State machine, retry backoff, API calls |
| 7 | WQ-088 | Implement auto-purge logic | `web/src/db/purge.ts` | ~60 | 30d soft, 7d hard, 90d for failed/dropped |
| 8 | WQ-088 | Write sync engine unit tests | `web/src/db/__tests__/syncEngine.test.ts` | ~120 | Mock API client, test state transitions |
| 9 | WQ-089 | Create `useDexieInit()` hook | `web/src/hooks/useDexieInit.ts` | ~40 | Guards UI until db ready |
| 10 | WQ-089 | Wire `useDexieInit()` into App entry point | `web/src/App.tsx` | ~10 | Wrap RouterProvider |

### Phase 3: Hook & Store Migration (UI-observable changes, backward-compatible)

| # | Feature ID | Task | File(s) | Est. Lines | Notes |
|---|------------|------|---------|------------|-------|
| 11 | WQ-090 | Rewrite `offlineStore.ts` — thin Zustand over Dexie | `web/src/stores/offlineStore.ts` | ~50 | Remove `persist`, add `refreshStats` |
| 12 | WQ-090 | Create `useOfflineSubmission()` hook | `web/src/hooks/useOfflineSubmission.ts` | ~80 | Extracted from old useOfflineSync |
| 13 | WQ-090 | Update `SampleForm.tsx` to use `useOfflineSubmission()` | `web/src/components/SampleForm.tsx` | ~20 | Replace inline `useMutation` logic |
| 14 | WQ-091 | Rewrite `useOfflineSync()` — Dexie-backed, same return type | `web/src/hooks/useOfflineSync.ts` | ~120 | Read from Dexie, call syncEngine |
| 15 | WQ-091 | Add `syncStats` to `useOfflineSync` return (backward-compatible) | `web/src/hooks/useOfflineSync.ts` | +10 | New field, doesn't break existing callers |
| 16 | WQ-091 | Update `Layout.tsx` to show enhanced offline banner | `web/src/components/Layout.tsx` | ~30 | Show sync status, failed count |
| 17 | WQ-091 | Create `OfflineStatusBar.tsx` component | `web/src/components/OfflineStatusBar.tsx` | ~80 | Visual breakdown of sync states |

### Phase 4: Integration & Migration (Dual-system period)

| # | Feature ID | Task | File(s) | Est. Lines | Notes |
|---|------------|------|---------|------------|-------|
| 18 | WQ-092 | Implement localStorage → Dexie migration on first load | `web/src/db/migrateFromLocalStorage.ts` | ~60 | Read old queue, write to Dexie, mark `pending_sync` |
| 19 | WQ-092 | Mark migration complete flag in localStorage | `web/src/db/migrateFromLocalStorage.ts` | +10 | Prevent re-migration |
| 20 | WQ-092 | Wire migration into `useDexieInit()` | `web/src/hooks/useDexieInit.ts` | +15 | Run before setting `isReady` |
| 21 | WQ-093 | Add sync log viewer (admin/debug only) | `web/src/components/SyncLogViewer.tsx` | ~100 | Table of syncLog entries, filter by action |
| 22 | WQ-093 | Add route `/debug/sync` (dev-only, hidden in prod) | `web/src/App.tsx` | +10 | Conditional route based on `import.meta.env.DEV` |

### Phase 5: Testing & Quality Assurance

| # | Feature ID | Task | File(s) | Est. Lines | Notes |
|---|------------|------|---------|------------|-------|
| 23 | WQ-094 | Write E2E-style integration test: offline → online sync | `web/src/db/__tests__/sync.integration.test.ts` | ~150 | Dexie + mocked axios + fake timers |
| 24 | WQ-094 | Test purge logic with fake timers | `web/src/db/__tests__/purge.test.ts` | ~80 | Advance time 30 days, assert deletion |
| 25 | WQ-095 | Run full regression: `npm run lint && npm run typecheck` | All | — | Must pass |
| 26 | WQ-095 | Verify existing features WQ-001 to WQ-085 still work | Manual QA | — | Submit sample, view map, admin login, CSV export |
| 27 | WQ-096 | Performance benchmark: 1000 records in Dexie | `web/src/db/__tests__/perf.test.ts` | ~40 | Query time <100ms for conflict detection |

---

## 7. Test Plan

### 7.1 Happy Path

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open app while online | `useDexieInit()` resolves `isReady: true` within 500ms |
| 2 | Submit sample with valid data | Record created in Dexie with `status: 'synced'`; API call succeeds; query cache invalidated |
| 3 | Toggle airplane mode | `isOnline: false`; offline banner appears |
| 4 | Submit sample while offline | Record created in Dexie with `status: 'pending_sync'`; no API call; user sees "Saved offline" toast |
| 5 | Toggle airplane mode off | `online` event fires; sync begins automatically |
| 6 | Wait for sync | Record status changes to `synced`; pending count drops to 0; samples list refreshes |

### 7.2 Offline Crash / Recovery

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit 3 samples while offline | All 3 in `pending_sync` |
| 2 | Kill browser (simulate crash) | Reopen app; Dexie data persists; all 3 still `pending_sync` |
| 3 | Go online | All 3 sync successfully in order |
| 4 | Simulate API failure (return 500) | First sample retries with exponential backoff; status toggles `syncing` → `failed` |
| 5 | After 5 failures | Status changes to `dropped`; user sees warning; log entry created |

### 7.3 Duplicate Rejection

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit sample at `-7.3059, 112.8443` at 09:05 | Enqueued successfully |
| 2 | Submit another sample at `-7.30591, 112.84431` at 09:12 (same hour) | `detectConflict()` returns `isDuplicate: true`; second submission blocked with clear error message |
| 3 | Submit third sample at `-7.3059, 112.8443` at 10:05 (different hour) | Accepted — different hour bucket |
| 4 | Submit fourth sample at `-7.3060, 112.8450` at 09:20 (same hour, 105m away) | Accepted — outside 10m radius |

### 7.4 Purge

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create 10 `synced` records with `createdAt: 40 days ago` | Records exist in Dexie |
| 2 | Trigger purge | Records marked `purgedAt: now` (soft delete) |
| 3 | Wait 7 more days | Records hard-deleted from IndexedDB |
| 4 | Create 5 `failed` records with `createdAt: 100 days ago` | Records retained (not purged until 90 days) |

### 7.5 Migration (Dual System)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Pre-migration: have 2 pending submissions in localStorage | Existing queue intact |
| 2 | Load app with new code | `migrateFromLocalStorage()` runs; 2 records copied to Dexie as `pending_sync` |
| 3 | Verify old localStorage | `water-quality-offline-queue` still exists but flagged as migrated |
| 4 | Submit new sample | Goes to Dexie only; no new localStorage writes |
| 5 | Sync all | All 3 records sync; localStorage queue untouched but ignored |

### 7.6 Performance

| Test | Metric | Pass Criteria |
|------|--------|---------------|
| Conflict detection with 1000 records | Query time | < 100ms on mobile CPU throttling (4x slowdown) |
| Sync 50 pending records | Total time | < 15 seconds (conservative, includes 2s backoff) |
| Dexie initialization | Cold start | < 500ms on mid-range Android |
| Bundle size increase | Dexie + new code | < 25 KB gzipped total |

---

## 8. Migration Strategy

### 8.1 Gradual Cutover (Zero-Downtime)

```
Phase 0 (Current): localStorage only ───────────────────────────►
Phase 1 (v0.9.0-a): Dexie installed, localStorage still active  ──►
Phase 2 (v0.9.0-b): Dual-write (Dexie + localStorage)          ──►
Phase 3 (v0.9.0-c): Read from Dexie, write to both           ──►
Phase 4 (v0.9.0-d): Read/write Dexie only; localStorage frozen ──►
Phase 5 (v1.0.0): Remove localStorage migration code           ──►
```

**This spec implements Phase 2-3 in one go** because:
- The current localStorage queue is read-only except for `addPendingSubmission`.
- We can intercept `addPendingSubmission` to write to Dexie while keeping localStorage reads active.
- `useOfflineSync` reads from Dexie; if Dexie is empty on first load, it falls back to localStorage until migration completes.

### 8.2 Migration Code Skeleton

```typescript
// File: web/src/db/migrateFromLocalStorage.ts

import { offlineDb } from './offlineDatabase';
import type { OfflineRecord } from '../types/offline';

const MIGRATION_KEY = 'wq_offline_migrated_v1';

export async function migrateFromLocalStorage(): Promise<number> {
  if (localStorage.getItem(MIGRATION_KEY)) return 0;

  const raw = localStorage.getItem('water-quality-offline-queue');
  if (!raw) {
    localStorage.setItem(MIGRATION_KEY, 'true');
    return 0;
  }

  try {
    const data = JSON.parse(raw);
    const pending = data.state?.pendingSubmissions || [];

    const records: OfflineRecord[] = pending.map((sub: PendingSubmission) => ({
      id: sub.id,
      sourceType: 'sample',
      payload: sub.data,
      createdAt: sub.timestamp,
      syncedAt: null,
      retryCount: sub.retryCount,
      lastError: null,
      status: sub.retryCount >= 5 ? 'dropped' : 'pending_sync',
      hourBucket: getHourBucket(sub.timestamp),
      latitude: sub.data.location.latitude,
      longitude: sub.data.location.longitude,
      purgedAt: null,
    }));

    await offlineDb.offlineRecords.bulkAdd(records);
    localStorage.setItem(MIGRATION_KEY, 'true');
    return records.length;
  } catch (e) {
    console.error('Migration failed:', e);
    return 0;
  }
}
```

---

## 9. Mobile Browser Compatibility

| Feature | iOS Safari 15+ | Chrome Android | Samsung Internet | Firefox Android |
|---------|---------------|----------------|------------------|---------------|
| IndexedDB | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Dexie.js v4 | ✅ Tested | ✅ Tested | ✅ Tested | ✅ Tested |
| `navigator.onLine` | ✅ | ✅ | ✅ | ✅ |
| `navigator.connection` | ❌ Not supported | ✅ | ✅ | ❌ |
| `crypto.randomUUID()` | ✅ iOS 15+ | ✅ | ✅ | ✅ |
| Background sync | ❌ Not supported | ⚠️ Requires permission | ❌ | ❌ |

**Notes**:
- `navigator.connection` is used for adaptive sync if available; otherwise falls back to 30s polling.
- Background Sync API is **not used** because iOS Safari does not support it. Our sync relies on `online` event + periodic polling, which works everywhere.
- `crypto.randomUUID()` requires a secure context (HTTPS or localhost). This is already required by the PWA service worker.

---

## Appendix A: Environment Variables

No new environment variables required. Dexie is entirely client-side.

## Appendix B: Dependencies to Add

```json
{
  "dependencies": {
    "dexie": "^4.0.0"
  }
}
```

## Appendix C: Backward Compatibility Checklist

- [ ] `useOfflineSync()` returns at minimum `{ pendingCount, isSyncing, forceSync }`
- [ ] `Layout.tsx` requires no modifications (selector-compatible)
- [ ] `SampleForm.tsx` offline submit flow unchanged
- [ ] localStorage queue preserved until migration completes
- [ ] All existing API calls (`samplesApi.create`, etc.) unchanged
- [ ] Service worker behavior unchanged (vite-plugin-pwa)
- [ ] Photo offline blocking (WQ-072) logic unchanged
