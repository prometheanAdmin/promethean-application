'use client';

import { useCallback, useRef } from 'react';

/**
 * Pointer-tracked 3D tilt + spotlight.
 *
 * Sets CSS custom properties on the target element (which inherit to children):
 *   --mx / --my : cursor position (%), available for future hover effects
 *   --rx / --ry : tilt rotation (deg)
 *   --active    : 0 | 1 for hover-driven effects
 *
 * Attach `ref` to the element you want to read geometry from (the card root)
 * and spread the returned handlers onto it.
 */
export function useTilt(max = 7) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const prefersReduced = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0..1
      const py = (e.clientY - rect.top) / rect.height; // 0..1

      // Spotlight follows immediately (cheap).
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);

      if (prefersReduced()) return;

      const ry = (px - 0.5) * 2 * max; // rotate around Y for horizontal movement
      const rx = (0.5 - py) * 2 * max; // rotate around X for vertical movement

      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
        el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
      });
    },
    [max]
  );

  const onMouseEnter = useCallback(() => {
    ref.current?.style.setProperty('--active', '1');
  }, []);

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    el.style.setProperty('--active', '0');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  return { ref, onMouseMove, onMouseEnter, onMouseLeave };
}
