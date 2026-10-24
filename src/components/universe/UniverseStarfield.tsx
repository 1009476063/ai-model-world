'use client';

import { useEffect, useRef } from 'react';

const STAR_COUNT = 180;

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  drift: number;
  phase: number;
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * The canvas only paints the non-semantic star field. Vendor and model labels
 * stay in the DOM so search, keyboard navigation and screen readers keep working.
 */
export function UniverseStarfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const random = seededRandom(240526);
    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      x: random(),
      y: random(),
      radius: 0.35 + random() * 1.1,
      alpha: 0.18 + random() * 0.62,
      drift: 0.1 + random() * 0.35,
      phase: random() * Math.PI * 2,
    }));
    let frame = 0;
    let width = 0;
    let height = 0;

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const pulse = motion.matches ? 1 : 0.76 + Math.sin(time * 0.00035 * star.drift + star.phase) * 0.24;
        context.beginPath();
        context.fillStyle = `rgba(222, 238, 249, ${star.alpha * pulse})`;
        context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
        context.fill();
      }
      if (!motion.matches) frame = window.requestAnimationFrame(draw);
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      window.cancelAnimationFrame(frame);
      draw(0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const onMotionChange = () => {
      window.cancelAnimationFrame(frame);
      draw(0);
    };
    motion.addEventListener('change', onMotionChange);

    return () => {
      observer.disconnect();
      motion.removeEventListener('change', onMotionChange);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="universe-starfield" aria-hidden />;
}
