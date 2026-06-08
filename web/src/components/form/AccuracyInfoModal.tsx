import { useFocusTrap } from '../../hooks/useFocusTrap';

interface AccuracyInfoModalProps {
  accuracy: number | null;
  onClose: () => void;
}

export default function AccuracyInfoModal({ accuracy, onClose }: AccuracyInfoModalProps) {
  const containerRef = useFocusTrap(true, onClose);

  const getAccuracyLabel = (acc: number | null): string => {
    if (acc === null) return 'Unknown';
    if (acc <= 10) return 'High';
    if (acc <= 30) return 'Medium';
    return 'Low';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={containerRef}
        className="accuracy-modal"
        role="dialog"
        aria-modal="true"
        aria-label="GPS accuracy information"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <h3>📍 GPS Accuracy</h3>
        <p className="accuracy-value">
          {getAccuracyLabel(accuracy)} ({accuracy !== null ? `${Math.round(accuracy)}m` : 'N/A'})
        </p>
        <p>GPS accuracy indicates how precise your location is. A smaller number means higher accuracy.</p>
        <ul>
          <li>🟢 ≤10m: Excellent — suitable for precise mapping</li>
          <li>🟡 10-30m: Moderate — generally acceptable</li>
          <li>🔴 &gt;30m: Poor — consider moving to a more open area</li>
        </ul>
        <button className="btn-primary" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
