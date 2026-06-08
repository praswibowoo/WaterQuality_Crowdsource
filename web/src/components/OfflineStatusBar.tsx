import { useOfflineStore } from '../stores/offlineStore';

export default function OfflineStatusBar() {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const syncStats = useOfflineStore((s) => s.syncStats);
  const pendingCount = syncStats.pending + syncStats.failed;

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`offline-status-bar ${isOnline ? 'syncing' : 'offline'}`} aria-live="polite">
      {!isOnline ? (
        <span>
          You are offline. Submissions will be saved and synced when you reconnect.
          {pendingCount > 0 && ` (${pendingCount} pending)`}
        </span>
      ) : (
        <span>
          Syncing... {pendingCount} remaining
          {syncStats.failed > 0 && ` (${syncStats.failed} couldn't sync — will retry later)`}
        </span>
      )}
    </div>
  );
}
