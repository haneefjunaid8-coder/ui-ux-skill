import { useEffect, useRef } from 'react';
import { motion, MotionConfig, useScroll } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import BrandStrip from './components/BrandStrip';
import WhatIsRootx from './sections/WhatIsRootx';
import Features from './sections/Features';
import Possibility from './sections/Possibility';
import Stats from './sections/Stats';
import Cta from './components/Cta';
import Blog from './sections/Blog';
import Footer from './sections/Footer';

/** 3px gradient progress bar pinned above the navbar. */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return <motion.div className="scroll-progress" style={{ scaleX: scrollYProgress }} aria-hidden />;
}

/** Soft violet spotlight that follows the cursor (pointer:fine only). */
function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX - 260}px, ${e.clientY - 260}px)`;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);
  return <div className="cursor-glow" ref={ref} aria-hidden />;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="page">
        <ScrollProgress />
        <CursorGlow />
        <Navbar />
        <main>
          <Hero />
          <BrandStrip />
          <WhatIsRootx />
          <Features />
          <Possibility />
          <Stats />
          <Cta />
          <Blog />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
