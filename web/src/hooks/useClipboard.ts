import { useState, useRef, useCallback, useEffect } from 'react';
import { copyToClipboard as rawCopy } from '../utils/clipboard';

/**
 * Hook for copy-to-clipboard with auto-reset, rapid-click protection, and unmount cleanup.
 *
 * @param resetDelay - How long (ms) to show success/error before resetting. Default 2000.
 */
export function useClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const copy = useCallback(async (text: string) => {
    const ok = await rawCopy(text);
    if (ok) {
      setError(false);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), resetDelay);
    } else {
      setCopied(false);
      setError(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setError(false), resetDelay);
    }
  }, [resetDelay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { copy, copied, error };
}
