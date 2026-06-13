import { useState } from 'react';
import { useBatchUpdateSamples } from '../hooks/useSamples';

interface Props {
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  sampleCount: number;
  onSelectAll: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function BatchActionBar({ selectedIds, setSelectedIds, sampleCount, onSelectAll, onSuccess, onError }: Props) {
  const [batchConfirmAction, setBatchConfirmAction] = useState<'approve' | 'reject' | 'revert' | null>(null);
  const batchUpdate = useBatchUpdateSamples();

  const handleBatchConfirm = async () => {
    if (!batchConfirmAction || selectedIds.size === 0) return;
    try {
      const result = await batchUpdate.mutateAsync({ ids: Array.from(selectedIds), action: batchConfirmAction });
      if (result.updated > 0) {
        onSuccess(`Updated ${result.updated} sample(s)`);
      }
      if (result.failed.length > 0) {
        onError(`${result.failed.length} sample(s) failed: ${result.failed.map((f) => f.error).join(', ')}`);
      }
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Batch update failed:', err);
      onError('Batch update failed');
    } finally {
      setBatchConfirmAction(null);
    }
  };

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="batch-action-bar" role="region" aria-label="Batch actions">
          <label className="select-all-label" aria-label="Select all visible samples">
            <input
              type="checkbox"
              checked={sampleCount > 0 && selectedIds.size === sampleCount}
              onChange={onSelectAll}
            />
            All
          </label>
          <span className="batch-count" aria-live="polite">{selectedIds.size} sample(s) selected</span>
          <button className="btn-approve" onClick={() => setBatchConfirmAction('approve')} disabled={batchUpdate.isPending}>✓ Approve All</button>
          <button className="btn-reject" onClick={() => setBatchConfirmAction('reject')} disabled={batchUpdate.isPending}>✗ Reject All</button>
          <button className="btn-revert" onClick={() => setBatchConfirmAction('revert')} disabled={batchUpdate.isPending}>↩ Revert All</button>
          <button className="btn-clear" onClick={() => setSelectedIds(new Set())} disabled={batchUpdate.isPending}>Clear</button>
        </div>
      )}

      {batchConfirmAction && (
        <div className="modal-overlay" onClick={() => setBatchConfirmAction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Batch ${batchConfirmAction}`}>
            <h3>Confirm Batch {batchConfirmAction.charAt(0).toUpperCase() + batchConfirmAction.slice(1)}</h3>
            <p>Are you sure you want to <strong>{batchConfirmAction}</strong> <strong>{selectedIds.size}</strong> sample(s)?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setBatchConfirmAction(null)}>Cancel</button>
              <button className={`btn-${batchConfirmAction === 'approve' ? 'approve' : batchConfirmAction === 'reject' ? 'reject' : 'revert'}`} onClick={handleBatchConfirm} disabled={batchUpdate.isPending}>
                {batchUpdate.isPending ? 'Processing...' : `Confirm ${batchConfirmAction.charAt(0).toUpperCase() + batchConfirmAction.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .batch-action-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 2px solid var(--color-primary);
          padding: var(--spacing-sm) var(--spacing-md);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          z-index: 100;
          box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
        }
        .batch-count {
          font-weight: 600;
          color: var(--color-text);
          margin-right: auto;
        }
        .btn-clear {
          background: var(--color-background);
          border: 1px solid var(--color-border);
          padding: 6px 12px;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 0.8rem;
        }
        .btn-clear:hover { background: var(--color-border); }
        .select-all-label {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          color: var(--color-text-muted);
          padding: 4px 8px;
          border-radius: var(--radius-md);
        }
        .select-all-label:hover { background: var(--color-background); }
      `}</style>
    </>
  );
}
