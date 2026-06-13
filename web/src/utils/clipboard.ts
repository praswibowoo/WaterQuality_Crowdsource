/**
 * Copy text to clipboard with fallback for non-secure contexts (WQ-208).
 *
 * Tries the modern Clipboard API first. Falls back to execCommand('copy')
 * for HTTP / file:// contexts where navigator.clipboard is undefined.
 *
 * @returns true if copy succeeded, false if both paths failed
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern API — available in secure contexts (HTTPS, localhost)
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy path (e.g., permission denied)
    }
  }

  // Legacy fallback for non-secure contexts
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
