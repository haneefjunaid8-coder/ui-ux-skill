import { cx } from '../ui/cx';

export interface LoadingStateProps {
  title?: string;
  /** Renders skeleton placeholders instead of a spinner, for content-shaped loading. */
  variant?: 'spinner' | 'skeleton';
  className?: string;
}

/**
 * Loading placeholder. Announced to assistive tech via role="status".
 * Use variant="skeleton" where the final layout is known.
 */
export function LoadingState({ title = 'Loading…', variant = 'spinner', className }: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div className={cx('stack', className)} role="status" aria-live="polite">
        <span className="visually-hidden">{title}</span>
        <div className="skeleton" style={{ height: 28, width: '40%' }} aria-hidden="true" />
        <div className="skeleton" style={{ height: 16, width: '90%' }} aria-hidden="true" />
        <div className="skeleton" style={{ height: 16, width: '75%' }} aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className={cx('state', className)} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p className="state__title" style={{ fontSize: 'var(--text-base)' }}>
        {title}
      </p>
    </div>
  );
}
