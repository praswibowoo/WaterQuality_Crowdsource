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
    try {
      const all = await offlineDb.offlineRecords.toArray();
      const stats: SyncStats = {
        pending: all.filter((r) => r.status === 'pending_sync').length,
        syncing: all.filter((r) => r.status === 'syncing').length,
        synced: all.filter((r) => r.status === 'synced').length,
        failed: all.filter((r) => r.status === 'failed').length,
        duplicate: all.filter((r) => r.status === 'duplicate').length,
        dropped: all.filter((r) => r.status === 'dropped').length,
        total: all.length,
        lastSyncTime: Date.now(),
      };
      set({ syncStats: stats });
    } catch (e) {
      console.error('Failed to refresh sync stats:', e);
    }
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
