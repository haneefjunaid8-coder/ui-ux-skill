import { siteName, siteTagline } from '../../content/site';
import { cx } from '../ui/cx';

/**
 * ROOT-X wordmark with a PLACEHOLDER mark. Replace the SVG and name here
 * once final branding is approved.
 */
export function Logo({ light = false, showTagline = false }: { light?: boolean; showTagline?: boolean }) {
  return (
    <span className={cx('logo', light && 'logo--light')}>
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="8" fill={light ? '#ffffff' : '#0f4c3a'} />
        <path
          d="M9 9l14 14M23 9L9 23"
          stroke={light ? '#0f4c3a' : '#ffffff'}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="23.5" cy="8.5" r="3.5" fill="#f2a900" />
      </svg>
      <span>{siteName}</span>
      {showTagline && <span className="logo__tag">{siteTagline}</span>}
    </span>
  );
}
