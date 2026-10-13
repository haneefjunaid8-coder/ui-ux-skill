import { useState, type FormEvent } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import Scene from './Scene';
import Reveal from './Reveal';

const AVATARS = [
  { initials: 'KA', tone: 1 },
  { initials: 'TO', tone: 2 },
  { initials: 'EB', tone: 3 },
  { initials: 'AM', tone: 4 },
];

export default function Hero() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim().includes('@')) setDone(true);
  };

  return (
    <section className="hero gradient__bg" id="home">
      <div className="hero__scene" aria-hidden>
        <Scene />
      </div>

      <div className="hero__content section__padding">
        <Reveal>
          <p className="hero__eyebrow">Campus delivery · Osogbo · concept v0.1</p>
          <h1>
            Let&rsquo;s move something <span className="gradient__text">amazing</span> across campus.
          </h1>
          <p className="hero__sub">
            ROOT-X is a delivery network of <strong>verified student riders</strong>, locked to approved campus zones, with live honest
            tracking, safety-first hours and money you can audit — built for university life, not adapted to it.
          </p>

          {done ? (
            <div className="hero__done" role="status">
              <Check size={18} />
              You&rsquo;re on the early-access list. We&rsquo;ll write when the pilot opens.
            </div>
          ) : (
            <form className="hero__cta" onSubmit={submit}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                aria-label="Email address for early access"
              />
              <button type="submit" className="btn btn--gradient">
                Get early access
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          <div className="hero__people">
            <div className="hero__avatars" aria-hidden>
              {AVATARS.map((a) => (
                <span key={a.initials} className={`avatar avatar--${a.tone}`}>
                  {a.initials}
                </span>
              ))}
            </div>
            <p className="hero__people-text">
              Early access opens soon — <span>join the campus waitlist.</span>
            </p>
          </div>

          <p className="hero__note">Design concept · demo only · not affiliated with or endorsed by UNIOSUN</p>
        </Reveal>
      </div>
    </section>
  );
}
