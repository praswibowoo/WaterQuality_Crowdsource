import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineStore } from '../stores/offlineStore';
import { processQueue } from '../db/syncEngine';
import { offlineDb } from '../db/offlineDatabase';
import type { SyncStats } from '../types/offline';

const SYNC_INTERVAL = 30000; // 30 seconds

export function useOfflineSync() {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const refreshStats = useOfflineStore((s) => s.refreshStats);
  const queryClient = useQueryClient();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await offlineDb.offlineRecords
        .where('status')
        .anyOf('pending_sync', 'failed')
        .count();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const processQueueCb = useCallback(async () => {
    if (!isOnline || isSyncingRef.current) {
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const result = await processQueue();
      if (result.synced > 0 || result.dropped > 0) {
        await refreshPendingCount();
        await refreshStats();
        queryClient.invalidateQueries({ queryKey: ['samples'] });
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline, queryClient, refreshPendingCount, refreshStats]);

  // Initial load and refresh on interval
  useEffect(() => {
    refreshPendingCount();
    refreshStats();

    syncIntervalRef.current = setInterval(() => {
      refreshPendingCount();
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [refreshPendingCount, refreshStats]);

  // Process queue when online status changes
  useEffect(() => {
    if (isOnline) {
      processQueueCb();
    }
  }, [isOnline, processQueueCb]);

  // Subscribe to syncStats changes from the store
  useEffect(() => {
    const sub = useOfflineStore.subscribe((state) => {
      setSyncStats(state.syncStats);
    });
    return () => sub();
  }, []);

  return {
    pendingCount,
    isSyncing,
    forceSync: processQueueCb,
    syncStats,
  };
}

// Re-export for backward compatibility with any code importing from this module
export { useOfflineSubmission } from './useOfflineSubmission';
