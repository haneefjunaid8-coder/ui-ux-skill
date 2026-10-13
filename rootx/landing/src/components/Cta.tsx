import { ArrowRight } from 'lucide-react';
import Reveal from './Reveal';
import { appLink } from '../appLink';

export default function Cta() {
  return (
    <section className="cta">
      <Reveal>
        <div className="cta__inner">
          <h1>
            Register today &amp; start exploring <span className="gradient__text">the campus network.</span>
          </h1>
          <p>It&rsquo;s time to move smarter. Join the waitlist and be first on campus when the pilot opens.</p>
          <a className="btn btn--gradient" href={appLink()} target="_blank" rel="noreferrer">
            Get Started
            <ArrowRight size={16} />
          </a>
        </div>
      </Reveal>
    </section>
  );
}
