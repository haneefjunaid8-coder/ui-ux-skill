const ITEMS = [
  'Verified student riders',
  'Campus-only zones',
  'Honest live tracking',
  'Safety-first hours',
  'Auditable money',
  'Guest-friendly receiving',
  'Code-verified handoffs',
  'Two-person settlement',
];

function Group() {
  return (
    <div className="marquee__group" aria-hidden>
      {ITEMS.map((t) => (
        <span key={t} className="marquee__item">
          {t}
          <span className="marquee__dot" />
        </span>
      ))}
    </div>
  );
}

/** Seamless values marquee — two identical groups, translateX(-50%) loop. */
export default function BrandStrip() {
  return (
    <div className="marquee" role="presentation">
      <div className="marquee__track">
        <Group />
        <Group />
      </div>
    </div>
  );
}
