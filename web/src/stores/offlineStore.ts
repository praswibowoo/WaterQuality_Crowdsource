import { create } from 'zustand';
import { offlineDb } from '../db/offlineDatabase';
import type { SyncStats } from '../types/offline';

interface OfflineState {
  isOnline: boolean;
  syncStats: SyncStats;
  lastSyncTime: number | null;

  setOnlineStatus: (isOnline: boolean) => void;
  refreshStats: () => Promise<void>;
  setLastSyncTime: (time: number) => void;
}

const defaultStats: SyncStats = {
  pending: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
  duplicate: 0,
  dropped: 0,
  total: 0,
  lastSyncTime: null,
};

export const useOfflineStore = create<OfflineState>()((set) => ({
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  syncStats: defaultStats,
  lastSyncTime: null,

  setOnlineStatus: (isOnline) => set({ isOnline }),

  refreshStats: async () => {
    const safeCount = async (status: string): Promise<number> => {
      try {
        return await offlineDb.offlineRecords.where('status').equals(status).count();
      } catch {
        return 0;
      }
    };
    const [pending, syncing, synced, failed, duplicate, dropped] = await Promise.all([
      safeCount('pending_sync'),
      safeCount('syncing'),
      safeCount('synced'),
      safeCount('failed'),
      safeCount('duplicate'),
      safeCount('dropped'),
    ]);
    const total = pending + syncing + synced + failed + duplicate + dropped;
    const stats: SyncStats = {
      pending, syncing, synced, failed, duplicate, dropped, total,
      lastSyncTime: Date.now(),
    };
    set({ syncStats: stats });
  },

  setLastSyncTime: (time) => set({ lastSyncTime: time }),
}));

// Initialize online status listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnlineStatus(false);
  });
}
