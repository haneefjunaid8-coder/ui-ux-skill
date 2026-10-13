import { MapPinned, ShieldCheck, Clock, Wallet, Repeat, Link2, type LucideIcon } from 'lucide-react';
import Tilt from '../components/Tilt';
import Reveal from '../components/Reveal';

type Feature = { Icon: LucideIcon; title: string; text: string };

const FEATURES: Feature[] = [
  {
    Icon: MapPinned,
    title: 'Live 3D tracking',
    text: 'Watch your run move across a campus-aware map. Stale is labelled stale — the map never lies to you.',
  },
  {
    Icon: ShieldCheck,
    title: 'Verified riders only',
    text: 'Matric-checked, ID-verified, human-approved students. Unapproved applicants never appear, by construction.',
  },
  {
    Icon: Clock,
    title: 'Safety-first hours',
    text: 'A 6 PM heads-up and a 9 PM cutoff. In-flight runs always finish safely, and SOS is available 24/7.',
  },
  {
    Icon: Wallet,
    title: 'Money you can audit',
    text: 'Every naira lands in a double-checked ledger. Finance proposes, admin approves — no one moves money alone.',
  },
  {
    Icon: Repeat,
    title: 'Recurring runs',
    text: 'Stock to your hostel shop every Monday, 8:30 AM. Pause anytime — a plan never becomes a surprise charge.',
  },
  {
    Icon: Link2,
    title: 'Guest receiving',
    text: 'No app needed to receive. Private links that expire on schedule and revoke on your command.',
  },
];

export default function Features() {
  return (
    <section className="features gradient__bg" id="features">
      <div className="section__padding">
        <div className="features__heading">
          <Reveal>
            <h1>
              The future of campus movement is <span className="gradient__text">already here</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p>Step into a delivery network built around student life — safety-first, money-honest, and seriously fast.</p>
          </Reveal>
        </div>

        <div className="features__grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08}>
              <Tilt className="fcard">
                <div className="fcard__icon" aria-hidden>
                  <f.Icon size={22} strokeWidth={2} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
