import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { useOfflineStore } from '../stores/offlineStore';
import { offlineDb } from '../db/offlineDatabase';
import type { CreateSampleInput } from '../types';

// Sample test data
const sampleInput: CreateSampleInput = {
  authorName: 'Test User',
  location: {
    latitude: -7.3059612,
    longitude: 112.8443053,
    address: 'Wonorejo Mangrove',
  },
  ph: 7.2,
  temperature: 28.5,
  conductivity: 10500,
  waterBodyType: 'flowing',
  landUse: 'mangrove_forest',
};

describe('OfflineStore', () => {
  beforeEach(async () => {
    // Reset the store before each test
    useOfflineStore.setState({
      isOnline: true,
      syncStats: {
        pending: 0,
        syncing: 0,
        synced: 0,
        failed: 0,
        duplicate: 0,
        dropped: 0,
        total: 0,
        lastSyncTime: null,
      },
      lastSyncTime: null,
    });
    // Clear Dexie tables between tests
    try {
      await offlineDb.offlineRecords.clear();
      await offlineDb.syncLog.clear();
    } catch {
      // OK if tables don't exist yet
    }
  });

  describe('initial state', () => {
    it('should have correct default sync stats', () => {
      const state = useOfflineStore.getState();
      expect(state.syncStats).toEqual({
        pending: 0,
        syncing: 0,
        synced: 0,
        failed: 0,
        duplicate: 0,
        dropped: 0,
        total: 0,
        lastSyncTime: null,
      });
    });

    it('should have lastSyncTime initially null', () => {
      const state = useOfflineStore.getState();
      expect(state.lastSyncTime).toBeNull();
    });
  });

  describe('setOnlineStatus', () => {
    it('should set online status to false', () => {
      const store = useOfflineStore.getState();
      store.setOnlineStatus(false);

      const state = useOfflineStore.getState();
      expect(state.isOnline).toBe(false);
    });

    it('should set online status to true', () => {
      const store = useOfflineStore.getState();
      store.setOnlineStatus(false);
      store.setOnlineStatus(true);

      const state = useOfflineStore.getState();
      expect(state.isOnline).toBe(true);
    });
  });

  describe('setLastSyncTime', () => {
    it('should set the last sync time', () => {
      const store = useOfflineStore.getState();
      const syncTime = Date.now();

      store.setLastSyncTime(syncTime);

      const state = useOfflineStore.getState();
      expect(state.lastSyncTime).toBe(syncTime);
    });
  });

  describe('refreshStats', () => {
    it('should count pending records from Dexie', async () => {
      // Add a record directly to Dexie
      await offlineDb.offlineRecords.add({
        id: 'test-1',
        sourceType: 'sample',
        payload: sampleInput,
        createdAt: Date.now(),
        syncedAt: null,
        retryCount: 0,
        lastError: null,
        status: 'pending_sync',
        hourBucket: '2026-05-26T08',
        latitude: -7.3059612,
        longitude: 112.8443053,
        purgedAt: null,
      });

      const store = useOfflineStore.getState();
      await store.refreshStats();

      const state = useOfflineStore.getState();
      expect(state.syncStats.pending).toBe(1);
      expect(state.syncStats.total).toBe(1);
    });

    it('should count synced records', async () => {
      await offlineDb.offlineRecords.add({
        id: 'test-2',
        sourceType: 'sample',
        payload: sampleInput,
        createdAt: Date.now(),
        syncedAt: Date.now(),
        retryCount: 0,
        lastError: null,
        status: 'synced',
        hourBucket: '2026-05-26T08',
        latitude: -7.3059612,
        longitude: 112.8443053,
        purgedAt: null,
      });

      const store = useOfflineStore.getState();
      await store.refreshStats();

      const state = useOfflineStore.getState();
      expect(state.syncStats.synced).toBe(1);
      expect(state.syncStats.total).toBe(1);
    });

    it('should count failed records', async () => {
      await offlineDb.offlineRecords.add({
        id: 'test-3',
        sourceType: 'sample',
        payload: sampleInput,
        createdAt: Date.now(),
        syncedAt: null,
        retryCount: 3,
        lastError: 'Network error',
        status: 'failed',
        hourBucket: '2026-05-26T08',
        latitude: -7.3059612,
        longitude: 112.8443053,
        purgedAt: null,
      });

      const store = useOfflineStore.getState();
      await store.refreshStats();

      const state = useOfflineStore.getState();
      expect(state.syncStats.failed).toBe(1);
      expect(state.syncStats.total).toBe(1);
    });

    it('should count multiple statuses correctly', async () => {
      const base = Date.now();
      for (let i = 0; i < 3; i++) {
        await offlineDb.offlineRecords.add({
          id: `pending-${i}`,
          sourceType: 'sample',
          payload: sampleInput,
          createdAt: base + i,
          syncedAt: null,
          retryCount: 0,
          lastError: null,
          status: 'pending_sync',
          hourBucket: '2026-05-26T08',
          latitude: -7.3059612 + i * 0.001,
          longitude: 112.8443053,
          purgedAt: null,
        });
      }
      for (let i = 0; i < 2; i++) {
        await offlineDb.offlineRecords.add({
          id: `synced-${i}`,
          sourceType: 'sample',
          payload: sampleInput,
          createdAt: base + 10 + i,
          syncedAt: base + 10 + i,
          retryCount: 0,
          lastError: null,
          status: 'synced',
          hourBucket: '2026-05-26T08',
          latitude: -7.3059612,
          longitude: 112.8443053 + i * 0.001,
          purgedAt: null,
        });
      }
      await offlineDb.offlineRecords.add({
        id: 'failed-1',
        sourceType: 'sample',
        payload: sampleInput,
        createdAt: base + 20,
        syncedAt: null,
        retryCount: 2,
        lastError: 'Error',
        status: 'failed',
        hourBucket: '2026-05-26T08',
        latitude: -7.3059612,
        longitude: 112.8443053,
        purgedAt: null,
      });

      const store = useOfflineStore.getState();
      await store.refreshStats();

      const state = useOfflineStore.getState();
      expect(state.syncStats.pending).toBe(3);
      expect(state.syncStats.synced).toBe(2);
      expect(state.syncStats.failed).toBe(1);
      expect(state.syncStats.total).toBe(6);
    });
  });
});
