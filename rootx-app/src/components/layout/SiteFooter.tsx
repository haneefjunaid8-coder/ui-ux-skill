import { Link } from 'react-router-dom';
import { primaryNav, serviceArea, siteName } from '../../content/site';
import { Container } from './Container';
import { Logo } from './Logo';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <Container>
        <div className="site-footer__grid">
          <div className="stack">
            <Logo light />
            <p>
              Campus deliveries for {serviceArea}. Service is still in development.
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="site-footer__heading">
              Explore
            </h2>
            <ul className="site-footer__list">
              <li>
                <Link to="/">Home</Link>
              </li>
              {primaryNav.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="site-footer__heading">
              Project status
            </h2>
            <p>Step 1 foundation. Placeholder branding, not yet approved.</p>
          </div>
        </div>

        <p className="site-footer__bottom">
          © {year} {siteName}. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
