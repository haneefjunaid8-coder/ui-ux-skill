import { ArrowUpRight } from 'lucide-react';
import { appLink } from '../appLink';

const COLS: { h: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    h: 'Explore',
    links: [
      { label: 'What is ROOT-X', href: '#what' },
      { label: 'Features', href: '#features' },
      { label: 'Possibility', href: '#possibility' },
      { label: 'Blog', href: '#blog' },
    ],
  },
  {
    h: 'App',
    links: [
      { label: 'Open the prototype', href: '', external: true },
      { label: 'Book a delivery', href: '', external: true },
      { label: 'Ride with us', href: '', external: true },
      { label: 'Admin (demo)', href: '', external: true },
    ],
  },
  {
    h: 'Company',
    links: [
      { label: 'About', href: '#what' },
      { label: 'Safety', href: '#features' },
      { label: 'Careers', href: '#cta' },
      { label: 'Contact', href: '#cta' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="section__padding">
        <div className="footer__heading">
          <h1>
            Step into the <span className="gradient__text">future</span> of campus movement.
          </h1>
          <a className="btn btn--gradient" href={appLink()} target="_blank" rel="noreferrer">
            Request Early Access
            <ArrowUpRight size={16} />
          </a>
        </div>

        <div className="footer__cols">
          {COLS.map((c) => (
            <div key={c.h} className="footer__col">
              <h4>{c.h}</h4>
              <div className="footer__links">
                {c.links.map((l) => (
                  <a
                    key={l.label}
                    href={l.external ? appLink() : l.href}
                    {...(l.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
          <div className="footer__col">
            <h4>Get in touch</h4>
            <div className="footer__links">
              <span>Osogbo, Osun State · Nigeria</span>
              <span>hello@rootx.example</span>
              <span>Mon – Sat · 8 AM – 9 PM</span>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <p>
            © 2026 ROOT-X — design concept. Brand &amp; copy are exploratory. Not affiliated with or endorsed by UNIOSUN. Demo
            only; no real payments.
          </p>
          <p>
            Styled with the <span className="gradient__text">modern-3d-uiux-gpt3</span> skill · design language inspired by
            JavaScript Mastery&rsquo;s Modern UI/UX GPT-3 page.
          </p>
        </div>
      </div>
    </footer>
  );
}
