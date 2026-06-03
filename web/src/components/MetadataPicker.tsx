import { useState, useCallback } from 'react';
import type { MetadataCategory } from '../utils/metadata';

interface MetadataPickerProps {
  title: string;
  categories: MetadataCategory[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}

export default function MetadataPicker({
  title,
  categories,
  value,
  onChange,
  required,
  error,
}: MetadataPickerProps) {
  const [step, setStep] = useState<'category' | 'option'>(
    value ? 'option' : 'category'
  );
  const [selectedCategory, setSelectedCategory] = useState<MetadataCategory | null>(
    () => {
      if (!value) return null;
      for (const cat of categories) {
        if (cat.options.some((o) => o.value === value)) {
          return cat;
        }
      }
      return null;
    }
  );

  const handleSelectCategory = useCallback(
    (category: MetadataCategory) => {
      setSelectedCategory(category);
      setStep('option');
    },
    []
  );

  const handleSelectOption = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setStep('option');
    },
    [onChange]
  );

  const handleBack = useCallback(() => {
    setStep('category');
    setSelectedCategory(null);
  }, []);

  // Find the currently selected option for display
  const selectedOption = selectedCategory?.options.find(
    (o) => o.value === value
  );

  return (
    <div className="metadata-picker">
      <label className="metadata-picker-label">
        {title}
        {required && <span className="required-star"> *</span>}
      </label>

      {error && <span className="error-message">{error}</span>}

      {/* Step 1: Category Selection */}
      {step === 'category' && (
        <div className="metadata-category-grid">
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              className={`metadata-category-btn ${
                selectedCategory?.value === category.value
                  ? 'metadata-category-selected'
                  : ''
              }`}
              onClick={() => handleSelectCategory(category)}
            >
              <span className="metadata-category-emoji">{category.emoji}</span>
              <span className="metadata-category-label">{category.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Option Selection */}
      {step === 'option' && selectedCategory && (
        <div className="metadata-option-list">
          <button
            type="button"
            className="metadata-back-btn"
            onClick={handleBack}
          >
            ← Back to {title}
          </button>

          <div className="metadata-option-grid">
            {selectedCategory.options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`metadata-option-card ${
                  value === option.value ? 'metadata-option-selected' : ''
                }`}
                onClick={() => handleSelectOption(option.value)}
              >
                {value === option.value && (
                  <span className="metadata-checkmark">✓</span>
                )}
                <span className="metadata-option-emoji">{option.emoji}</span>
                <span className="metadata-option-label">{option.label}</span>
                <span className="metadata-option-desc">
                  {option.description}
                </span>
              </button>
            ))}
          </div>

          {selectedOption && (
            <div className="metadata-current-selection">
              Selected: {selectedOption.emoji} {selectedOption.label}
            </div>
          )}
        </div>
      )}

      <style>{`
        .metadata-picker {
          margin-bottom: var(--spacing-md);
        }

        .metadata-picker-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: var(--spacing-sm);
          color: var(--color-text);
        }

        .required-star {
          color: #dc2626;
        }

        /* Category Grid — Step 1 */
        .metadata-category-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-sm);
        }

        .metadata-category-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
          min-height: 80px;
          padding: var(--spacing-md);
          border: 2px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-surface);
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          font-size: 0.875rem;
          color: var(--color-text);
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
        }

        .metadata-category-btn:hover {
          border-color: var(--color-primary);
          background: #f0fdf4;
        }

        .metadata-category-btn:active {
          transform: scale(0.97);
        }

        .metadata-category-selected {
          border-color: var(--color-primary);
          background: #f0fdf4;
        }

        .metadata-category-emoji {
          font-size: 1.75rem;
          line-height: 1;
        }

        .metadata-category-label {
          font-weight: 600;
          text-align: center;
        }

        @media (max-width: 360px) {
          .metadata-category-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Option List — Step 2 */
        .metadata-option-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .metadata-back-btn {
          align-self: flex-start;
          padding: var(--spacing-xs) var(--spacing-sm);
          background: none;
          border: none;
          color: var(--color-primary);
          cursor: pointer;
          font-size: 0.875rem;
          font-family: inherit;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .metadata-back-btn:hover {
          text-decoration: underline;
        }

        .metadata-option-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-sm);
        }

        .metadata-option-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          border: 2px solid #e5e7eb;
          border-radius: var(--radius-lg);
          background: var(--color-surface);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
          font-family: inherit;
          min-height: 60px;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
        }

        .metadata-option-card:hover {
          border-color: var(--color-primary);
        }

        .metadata-option-card:active {
          transform: scale(0.98);
        }

        .metadata-option-selected {
          border-color: var(--color-primary);
          background: #f0fdfa;
        }

        .metadata-checkmark {
          position: absolute;
          top: var(--spacing-xs);
          right: var(--spacing-xs);
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background-color: var(--color-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          line-height: 1;
        }

        .metadata-option-emoji {
          font-size: 1.5rem;
          line-height: 1;
          flex-shrink: 0;
        }

        .metadata-option-label {
          font-weight: 600;
          font-size: 0.9375rem;
          color: var(--color-text);
          flex-shrink: 0;
        }

        .metadata-option-desc {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          line-height: 1.3;
          flex: 1;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .metadata-current-selection {
          font-size: 0.8125rem;
          color: var(--color-primary);
          font-weight: 500;
          text-align: center;
          padding: var(--spacing-xs);
        }

        @media (min-width: 480px) {
          .metadata-option-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
