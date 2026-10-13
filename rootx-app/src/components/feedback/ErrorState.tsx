import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../ui/cx';

export interface ErrorStateProps {
  title?: string;
  body?: string;
  /** Actions such as "Try again" or "Go home". Pass real handlers only. */
  actions?: ReactNode;
  className?: string;
}

/** Shown when content fails to load. Uses role="alert" so the failure is announced. */
export function ErrorState({
  title = 'Something went wrong',
  body = 'We could not load this content. Please check your connection and try again.',
  actions,
  className,
}: ErrorStateProps) {
  return (
    <div className={cx('state state--error', className)} role="alert">
      <span className="state__icon" aria-hidden="true">
        <AlertTriangle size={26} />
      </span>
      <h3 className="state__title">{title}</h3>
      <p className="state__body">{body}</p>
      {actions && <div className="state__actions">{actions}</div>}
    </div>
  );
}
