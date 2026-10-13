import CountUp from '../components/CountUp';
import Reveal from '../components/Reveal';

const STATS = [
  { to: 9, suffix: '', label: 'safety rules enforced in code, not policy PDFs' },
  { to: 54, suffix: '', label: 'automated tests guard every state change' },
  { to: 100, suffix: '%', label: 'code-verified pickups & dropoffs, every run' },
  { to: 0, suffix: '', label: 'naira reconciliation gap — the ledger won\u2019t allow it' },
];

export default function Stats() {
  return (
    <section className="stats">
      <div className="section__padding">
        <div className="stats__grid">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.07} className="stats__cell">
              <div className="stat">
                <span className="stat__num gradient__text">
                  <CountUp to={s.to} suffix={s.suffix} />
                </span>
                <span className="stat__label">{s.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
