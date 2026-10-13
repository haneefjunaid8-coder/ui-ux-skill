import { ArrowLeft, Home } from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { Container } from '../components/layout/Container';

export function NotFoundPage() {
  return (
    <Container>
      <div className="not-found stack" style={{ justifyItems: 'start' }}>
        <p className="not-found__code" aria-hidden="true">
          404
        </p>
        <h1>Page not found</h1>
        <p className="section__lead">The page you are looking for does not exist or may have moved.</p>
        <div className="cluster">
          <ButtonLink to="/" variant="primary">
            <Home size={18} aria-hidden="true" /> Go to home
          </ButtonLink>
          <ButtonLink to="/design-system" variant="secondary">
            <ArrowLeft size={18} aria-hidden="true" /> Design system
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
