import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { ErrorState } from '../components/feedback/ErrorState';
import { Logo } from '../components/layout/Logo';
import { Container } from '../components/layout/Container';
import { ButtonLink, Button } from '../components/ui/Button';

/**
 * Route-level error boundary. Shown when a page throws or a route is unavailable.
 * It does not depend on the shared layout, so it still renders if the layout failed.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  if (import.meta.env.DEV) {
    console.error(error);
  }
  return (
    <div className="page-shell">
      <header className="site-header">
        <Container>
          <div className="site-header__inner">
            <Link to="/" className="site-header__brand" aria-label="ROOT-X home">
              <Logo />
            </Link>
          </div>
        </Container>
      </header>
      <main id="main-content">
        <Container>
          <div style={{ padding: 'var(--space-12) 0' }}>
            <ErrorState
              title={isNotFound ? 'Page not found' : 'This page could not be displayed'}
              body={
                isNotFound
                  ? 'The link may be out of date. Return home to continue.'
                  : 'Something unexpected happened. Try reloading the page, or return home.'
              }
              actions={
                <>
                  <Button variant="primary" onClick={() => window.location.reload()}>
                    Reload page
                  </Button>
                  <ButtonLink to="/" variant="secondary">
                    Go to home
                  </ButtonLink>
                </>
              }
            />
          </div>
        </Container>
      </main>
    </div>
  );
}
