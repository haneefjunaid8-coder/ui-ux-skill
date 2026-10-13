import { ArrowRight, Star } from 'lucide-react';
import Reveal from '../components/Reveal';

/** CSS phone mock running a miniature ROOT-X delivery card. */
function PhoneMock() {
  return (
    <div className="phone" aria-hidden>
      <div className="phone__screen">
        <div className="phone__topbar">
          <span className="phone__ref">RX-0102 · Groceries</span>
          <span className="chip chip--live">In transit</span>
        </div>

        <div className="phone__map">
          <svg viewBox="0 0 240 150" className="mini-map">
            <defs>
              <linearGradient id="routeGrad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#AE67FA" />
                <stop offset="1" stopColor="#F49867" />
              </linearGradient>
            </defs>
            <path className="mini-map__streets" d="M0 40 H240 M0 90 H240 M60 0 V150 M150 0 V150 M210 0 V150" />
            <path
              className="mini-map__route"
              d="M28 122 C 64 116, 72 74, 118 62 S 196 44, 212 30"
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="28" cy="122" r="5" fill="#AE67FA" />
            <circle cx="212" cy="30" r="5" fill="#F49867" />
            <g className="mini-map__rider">
              <circle cx="96" cy="82" r="9" fill="#040C18" stroke="#F49867" strokeWidth="2" />
              <circle cx="96" cy="82" r="3" fill="#F49867" />
            </g>
          </svg>
          <span className="phone__eta">Arriving in 12 min</span>
        </div>

        <div className="phone__rider">
          <span className="rider__avatar">KM</span>
          <div>
            <strong>Kofi M. · Motorcycle</strong>
            <span className="rider__rating">
              <Star size={11} fill="currentColor" /> 4.9 · 128 runs
            </span>
          </div>
          <div className="code-dots" aria-hidden>
            <i>8</i>
            <i>3</i>
            <i>1</i>
            <i>4</i>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Possibility() {
  return (
    <section className="possibility" id="possibility">
      <div className="section__padding possibility__grid">
        <Reveal className="possibility__phone">
          <PhoneMock />
        </Reveal>

        <div className="possibility__content">
          <Reveal>
            <p className="eyebrow">Request early access for your campus</p>
            <h1>
              The possibilities are <span className="gradient__text">beyond your imagination</span>
            </h1>
            <p className="possibility__text">
              Piloting a safer way to move parcels, documents and stock across campus — with live honest tracking, verified student
              riders and money rules you can audit. Book, watch, receive, repeat.
            </p>
            <a className="link-arrow" href="#cta">
              Request early access
              <ArrowRight size={16} />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
