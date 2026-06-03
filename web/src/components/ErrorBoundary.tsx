import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p className="error-boundary-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              className="error-boundary-btn"
              onClick={this.handleReset}
            >
              Try Again
            </button>
          </div>
          <style>{`
            .error-boundary-fallback {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 60vh;
              padding: var(--spacing-lg);
            }
            .error-boundary-card {
              text-align: center;
              max-width: 400px;
              padding: var(--spacing-xl);
              background: var(--color-surface);
              border-radius: var(--radius-lg);
              box-shadow: var(--shadow-md);
            }
            .error-boundary-icon {
              font-size: 3rem;
              margin-bottom: var(--spacing-md);
            }
            .error-boundary-card h2 {
              margin-bottom: var(--spacing-sm);
              color: var(--color-text);
            }
            .error-boundary-message {
              color: var(--color-text-muted);
              margin-bottom: var(--spacing-lg);
              font-size: 0.875rem;
            }
            .error-boundary-btn {
              padding: var(--spacing-sm) var(--spacing-lg);
              background: var(--color-primary);
              color: white;
              border: none;
              border-radius: var(--radius-md);
              font-size: 0.875rem;
              font-weight: 500;
              cursor: pointer;
            }
            .error-boundary-btn:hover {
              opacity: 0.9;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
