import type { ReactNode } from 'react';
import { cx } from './cx';

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('badge', className)}>{children}</span>;
}
