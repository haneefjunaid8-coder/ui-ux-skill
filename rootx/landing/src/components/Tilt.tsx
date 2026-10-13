import { useRef, useState, type MouseEvent, type ReactNode } from 'react';

/** 3D tilt wrapper: perspective rotate toward the cursor + moving glare. */
export default function Tilt({ children, className = '', max = 9 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState({ rx: 0, ry: 0, x: 50, y: 50, on: false });

  const move = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setS({ rx: (0.5 - py) * max, ry: (px - 0.5) * max, x: px * 100, y: py * 100, on: true });
  };

  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      onMouseMove={move}
      onMouseLeave={() => setS((v) => ({ ...v, rx: 0, ry: 0, on: false }))}
      style={{
        transform: `perspective(1000px) rotateX(${s.rx}deg) rotateY(${s.ry}deg)${s.on ? ' translateZ(6px)' : ''}`,
        transition: s.on ? 'transform 80ms linear' : 'transform 600ms cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <div
        className="tilt__glare"
        style={{
          opacity: s.on ? 1 : 0,
          background: `radial-gradient(circle at ${s.x}% ${s.y}%, rgba(174,103,250,.18), transparent 55%)`,
        }}
      />
      {children}
    </div>
  );
}
