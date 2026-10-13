import { Menu, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { primaryNav } from '../../content/site';
import { Container } from './Container';
import { Logo } from './Logo';

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navId = useId();

  // Close the mobile menu whenever the route or hash changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Allow keyboard users to dismiss the open menu with Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <Container>
        <div className="site-header__inner">
          <Link to="/" className="site-header__brand" aria-label="ROOT-X home">
            <Logo />
          </Link>

          <nav className="site-nav" aria-label="Primary" id={navId} data-open={menuOpen}>
            <ul className="site-nav__list">
              <li>
                <NavLink to="/" end className="nav-link">
                  Home
                </NavLink>
              </li>
              {primaryNav.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="nav-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <button
            type="button"
            className="btn btn--ghost btn--small site-header__menu-toggle"
            aria-expanded={menuOpen}
            aria-controls={navId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            <span>{menuOpen ? 'Close menu' : 'Menu'}</span>
          </button>
        </div>
      </Container>
    </header>
  );
}
