import React, { useRef, useEffect } from 'react';

// ─── Component ────────────────────────────────────────────────────────────────

export default function CanvasBoard(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Canvas init: HiDPI scaling + resize handler ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      // Physical pixels = CSS pixels × devicePixelRatio
      // This prevents blurry rendering on Retina / HiDPI screens
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;

      const ctx = canvas.getContext('2d')!;
      // Scale the context so all drawing coordinates are in CSS pixels
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        background: '#ffffff',
        display: 'block',
        touchAction: 'none', // prevent browser scroll/zoom on touch
      }}
    />
  );
}
