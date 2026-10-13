import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NavigationProgress } from '../feedback/NavigationProgress';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/**
 * Shared shell for every page: skip link, header, main landmark and footer.
 * Also scrolls to #hash targets after client-side navigation.
 */
export function RootLayout() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }
  }, [location.pathname, location.hash]);

  return (
    <div className="page-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <NavigationProgress />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} style={{ outline: 'none' }}>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
