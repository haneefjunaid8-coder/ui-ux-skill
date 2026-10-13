import { useState } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { appLink } from '../appLink';

const LINKS = [
  { href: '#what', label: 'What is ROOT-X' },
  { href: '#features', label: 'Features' },
  { href: '#possibility', label: 'Possibility' },
  { href: '#blog', label: 'Blog' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="navbar">
      <a className="navbar__logo" href="#home" aria-label="ROOT-X home">
        <span className="logo-badge" aria-hidden>
          R
        </span>
        <span className="navbar__wordmark">
          ROOT<span className="navbar__x">·</span>X
        </span>
      </a>

      <nav className="navbar__links" aria-label="Primary">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      </nav>

      <div className="navbar__actions">
        <a className="btn btn--gradient btn--sm" href={appLink()} target="_blank" rel="noreferrer">
          Open the app
          <ArrowUpRight size={15} />
        </a>
        <button className="navbar__toggle" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="navbar__menu" aria-label="Mobile">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a className="btn btn--gradient" href={appLink()} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            Open the app
            <ArrowUpRight size={15} />
          </a>
        </nav>
      )}
    </header>
  );
}
