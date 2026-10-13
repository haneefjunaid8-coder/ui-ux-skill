import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../ui/cx';

export interface EmptyStateProps {
  title: string;
  body?: string;
  icon?: LucideIcon;
  /** Optional call to action, e.g. a ButtonLink. Omit when there is no next step. */
  action?: ReactNode;
  className?: string;
}

/** Shown when a list or page has no content yet. */
export function EmptyState({ title, body, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <div className={cx('state', className)}>
      <span className="state__icon" aria-hidden="true">
        <Icon size={26} />
      </span>
      <h3 className="state__title">{title}</h3>
      {body && <p className="state__body">{body}</p>}
      {action && <div className="state__actions">{action}</div>}
    </div>
  );
}
