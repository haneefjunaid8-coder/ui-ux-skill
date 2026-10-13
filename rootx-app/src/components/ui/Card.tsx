import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  title: string;
  icon?: LucideIcon;
  /** Heading level used for the card title, so pages keep a logical outline. */
  headingLevel?: 2 | 3 | 4;
  children?: ReactNode;
}

export function Card({ title, icon: Icon, headingLevel = 3, children, className, ...rest }: CardProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <article className={cx('card', className)} {...rest}>
      {Icon && (
        <span className="card__icon" aria-hidden="true">
          <Icon size={22} strokeWidth={2} />
        </span>
      )}
      <Heading className="card__title">{title}</Heading>
      {children && <div className="card__body">{children}</div>}
    </article>
  );
}
