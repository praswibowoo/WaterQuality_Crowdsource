import { useClipboard } from '../hooks/useClipboard';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

/**
 * Shared copy-to-clipboard button with success/error states, rapid-click protection,
 * and unmount cleanup. Used across SampleDetail, AdminDashboard, and AdminUsersTab.
 */
export default function CopyButton({ text, label = 'Copy to clipboard', className = '' }: CopyButtonProps) {
  const { copy, copied, error } = useClipboard();

  const displayLabel = copied ? '✓ Copied' : error ? '❌ Copy failed' : '📋 Copy';

  return (
    <button
      className={`btn-copy ${className}`}
      onClick={() => copy(text)}
      aria-label={label}
    >
      {displayLabel}
    </button>
  );
}
