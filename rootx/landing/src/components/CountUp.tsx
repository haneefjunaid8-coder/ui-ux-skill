import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'framer-motion';

/** Number that counts up when scrolled into view. */
export default function CountUp({ to, suffix = '', duration = 1.8 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (x) => setV(Math.round(x)),
    });
    return () => controls.stop();
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {v.toLocaleString()}
      {suffix}
    </span>
  );
}
