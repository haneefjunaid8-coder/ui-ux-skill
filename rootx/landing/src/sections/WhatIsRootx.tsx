import Reveal from '../components/Reveal';

const CARDS = [
  {
    title: 'Verified student riders',
    text: 'Every rider passes a matric-number check, a student-ID upload and a human review before their first offer. No verification, no riding — ever.',
    highlight: false,
  },
  {
    title: 'Approved zones only',
    text: 'The campus and the student townships around it — nothing more. Boundaries are geofenced in the engine, not in marketing copy.',
    highlight: true,
  },
  {
    title: 'Honest by design',
    text: 'Stale locations say so. Unconfirmed payments never pass. Every state change is a checked, logged event you can point at.',
    highlight: false,
  },
];

const MINIS = [
  { label: 'Student riders', line: 'earning around lectures' },
  { label: 'Live maps', line: 'campus-aware routing' },
  { label: 'Safety hours', line: '6 PM warning · 9 PM cutoff' },
  { label: 'Auditable money', line: 'ledger invariant, always' },
];

export default function WhatIsRootx() {
  return (
    <section className="what section-glow" id="what">
      <div className="section__padding">
        <div className="what__grid">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08}>
              <div className={`feature-card${c.highlight ? ' feature-card--highlight' : ''}`}>
                <div className="feature__bar" />
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="what__heading">
          <Reveal>
            <h1>A new kind of campus network</h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p>We rebuilt the delivery playbook around one question: what keeps students safe?</p>
          </Reveal>
        </div>

        <div className="what__minis">
          {MINIS.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.06}>
              <div className="mini">
                <strong>{m.label}</strong>
                <span>{m.line}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
