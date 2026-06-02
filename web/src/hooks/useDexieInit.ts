import { useEffect, useState, useRef } from 'react';
import { offlineDb } from '../db/offlineDatabase';
import { autoPurge } from '../db/purge';
import { migrateFromLocalStorage } from '../db/migrateFromLocalStorage';

export interface UseDexieInitReturn {
  isReady: boolean;
  error: Error | null;
}

export function useDexieInit(): UseDexieInitReturn {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await offlineDb.open();

        // Migrate old localStorage queue (non-fatal if fails)
        try {
          const migrated = await migrateFromLocalStorage();
          if (migrated > 0) {
            // Migration complete — no console.log needed
          }
        } catch (migrateError) {
          console.warn('LocalStorage migration failed (non-fatal):', migrateError);
        }

        // Run auto-purge on startup (non-fatal if fails)
        try {
          await autoPurge();
        } catch (purgeError) {
          console.warn('Auto-purge failed (non-fatal):', purgeError);
        }

        // Schedule periodic purge every 24h — store ref for cleanup
        if (!cancelled) {
          intervalRef.current = setInterval(async () => {
            try {
              await autoPurge();
            } catch (e) {
              console.warn('Scheduled purge failed:', e);
            }
          }, 24 * 60 * 60 * 1000);

          setIsReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error('Failed to initialize offline database'));
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return { isReady, error };
}
