# 3D & Interaction Recipes — modern-3d-uiux-gpt3

The original GPT-3 page is static CSS. These recipes add the 3D/interactive/
dynamic layer while keeping the language calm. Stack: `three` +
`@react-three/fiber` + `@react-three/drei` + `framer-motion`.

## 1. WebGL hero scene

```tsx
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import { useRef } from 'react';
import type { Group } from 'three';

// camera drifts toward the pointer — max ~1.4 units, eased 4%/frame
function Rig() {
  useFrame((state) => {
    const { camera, pointer } = state;
    camera.position.x += (pointer.x * 1.4 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * 1.0 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Orb() {
  const group = useRef<Group>(null);
  useFrame((s) => { if (group.current) group.current.rotation.y = s.clock.elapsedTime * 0.15; });
  return (
    <group ref={group}>
      <Float speed={1.3} rotationIntensity={0.5} floatIntensity={1.2}>
        <mesh>
          <icosahedronGeometry args={[1.75, 16]} />
          <MeshDistortMaterial color="#5b2fb8" metalness={0.32} roughness={0.22} distort={0.42} speed={1.7} />
        </mesh>
      </Float>
      {/* wireframe shell + thin torus ring + 2–3 floating satellites */}
    </group>
  );
}

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 8.5], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 6, 8]} intensity={1.6} />
      <pointLight position={[-6, -2, 4]} intensity={50} color="#ae67fa" />
      <pointLight position={[6, 3, 6]} intensity={60} color="#f49867" />
      <Rig />
      <Orb />
      <Sparkles count={110} scale={[11, 7, 5]} size={2.2} speed={0.32} color="#81afdd" />
    </Canvas>
  );
}
```

Rules: colors only from the token palette (violet / orange / light-blue);
`dpr={[1, 2]}`; the canvas sits in an absolutely-positioned, `aria-hidden`
layer; on mobile it goes full-bleed behind content at ~35% opacity with
`pointer-events: none`. Lights: one ambient + one directional + two tinted
point lights (three r155+ uses physical light units — point intensities 40–80
at distance ~7 read as ~1).

## 2. 3D tilt card (with glare)

```tsx
function Tilt({ children, max = 9 }: { children: ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState({ rx: 0, ry: 0, x: 50, y: 50, on: false });
  return (
    <div
      ref={ref}
      className="tilt"
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        setS({ rx: (0.5 - py) * max, ry: (px - 0.5) * max, x: px * 100, y: py * 100, on: true });
      }}
      onMouseLeave={() => setS((v) => ({ ...v, rx: 0, ry: 0, on: false }))}
      style={{
        transform: `perspective(1000px) rotateX(${s.rx}deg) rotateY(${s.ry}deg)${s.on ? ' translateZ(6px)' : ''}`,
        transition: s.on ? 'transform 80ms linear' : 'transform 600ms cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <div className="tilt__glare" style={{ opacity: s.on ? 1 : 0,
        background: `radial-gradient(circle at ${s.x}% ${s.y}%, rgba(174,103,250,.18), transparent 55%)` }} />
      {children}
    </div>
  );
}
```

CSS: `.tilt { position: relative; will-change: transform; } .tilt__glare { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; transition: opacity .4s; }`

## 3. Scroll reveal

```tsx
<motion.div initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-60px' }}
  transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
```
Stagger siblings with `delay = i * 0.08`. Use `once: true` — reveals that
replay feel cheap.

## 4. Count-up stats

```tsx
const ref = useRef<HTMLSpanElement>(null);
const inView = useInView(ref, { once: true, margin: '-80px' });
const [v, setV] = useState(0);
useEffect(() => {
  if (!inView) return;
  const c = animate(0, to, { duration: 1.8, ease: [0.16, 1, 0.3, 1], onUpdate: (x) => setV(Math.round(x)) });
  return () => c.stop();
}, [inView, to]);
```

## 5. Scroll progress bar

```tsx
const { scrollYProgress } = useScroll();
<motion.div className="scroll-progress" style={{ scaleX: scrollYProgress }} />
```
CSS: fixed top, 3px, `var(--gradient-bar)`, `transform-origin: 0 50%`, z-index above navbar.

## 6. Cursor glow (pointer:fine only)

Fixed 500px circle, `radial-gradient(circle, rgba(174,103,250,.07), transparent 60%)`,
`mix-blend-mode: screen`, `pointer-events: none`, transform follows
`pointermove`. Hide under `@media (pointer: coarse)` and reduced-motion.

## 7. Marquee

Two identical groups in a `width: max-content` flex track;
`@keyframes marquee { to { transform: translateX(-50%); } }` 28s linear
infinite; `:hover` pauses. Separator: gradient ✦ character or 6px gradient dot.

## 8. Performance & accessibility contract

- One `<Canvas>` per page; `dpr` capped at 2; no shadows/postprocessing at this scale.
- Motion budget: reveals ≤ 700ms; hover transforms ≤ 600ms return; marquee is the only infinite animation (plus gentle 3D idle).
- `@media (prefers-reduced-motion: reduce)`: kill marquee, float, cursor glow,
  tilt (serve flat transforms) — keep opacity fades only.
- Every interactive element: `:focus-visible { outline: 2px solid #ae67fa; outline-offset: 3px; }`
- The 3D layer is `aria-hidden` — it is decoration, never information.
