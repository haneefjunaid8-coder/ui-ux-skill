import type { ReactNode } from 'react';
import { cx } from '../ui/cx';

export interface SectionProps {
  id?: string;
  title?: string;
  eyebrow?: string;
  lead?: string;
  muted?: boolean;
  children: ReactNode;
}

/** Full-width page section with an optional eyebrow, heading and lead paragraph. */
export function Section({ id, title, eyebrow, lead, muted, children }: SectionProps) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      className={cx('section', muted && 'section--muted')}
      aria-labelledby={title ? headingId : undefined}
    >
      <div className="container">
        {(title || eyebrow || lead) && (
          <div className="section__header">
            {eyebrow && <p className="section__eyebrow">{eyebrow}</p>}
            {title && <h2 id={headingId}>{title}</h2>}
            {lead && <p className="section__lead">{lead}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
