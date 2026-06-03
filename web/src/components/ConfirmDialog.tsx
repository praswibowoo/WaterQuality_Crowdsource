import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const containerRef = useFocusTrap(true, onCancel);

  const colors: Record<string, { bg: string; hover: string }> = {
    danger: { bg: 'var(--color-error)', hover: '#b91c1c' },
    warning: { bg: 'var(--color-warning)', hover: '#d97706' },
    info: { bg: 'var(--color-primary)', hover: 'var(--color-primary-dark)' },
  };

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div
        ref={containerRef}
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <h3 className="confirm-title" id="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className="confirm-btn-confirm"
            style={{ backgroundColor: colors[variant].bg }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: var(--spacing-md);
        }
        .confirm-modal {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          max-width: 400px;
          width: 100%;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
          outline: none;
        }
        .confirm-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: var(--spacing-sm);
        }
        .confirm-message {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-lg);
          line-height: 1.5;
        }
        .confirm-actions {
          display: flex;
          gap: var(--spacing-sm);
          justify-content: flex-end;
        }
        .confirm-btn-cancel {
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          cursor: pointer;
          min-height: 44px;
        }
        .confirm-btn-cancel:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }
        .confirm-btn-confirm {
          padding: var(--spacing-sm) var(--spacing-md);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          min-height: 44px;
          transition: opacity var(--transition-fast);
        }
        .confirm-btn-confirm:hover {
          opacity: 0.9;
        }
        .confirm-btn-confirm:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
