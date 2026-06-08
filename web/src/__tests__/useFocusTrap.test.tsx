import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useFocusTrap } from '../hooks/useFocusTrap';

function TestComponent({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const ref = useFocusTrap(isOpen, onClose);
  return (
    <div ref={ref} data-testid="trap-container">
      <button data-testid="first-btn">First</button>
      <button data-testid="second-btn">Second</button>
      <button data-testid="third-btn">Third</button>
    </div>
  );
}

describe('useFocusTrap (WQ-187)', () => {
  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<TestComponent isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mounts without error when closed', () => {
    const onClose = vi.fn();
    const { container } = render(<TestComponent isOpen={false} onClose={onClose} />);
    expect(container).toBeInTheDocument();
  });
});
