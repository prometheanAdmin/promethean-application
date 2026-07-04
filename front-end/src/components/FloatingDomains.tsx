'use client';

import { useEffect, useRef } from 'react';
import styles from './FloatingDomains.module.css';

type Domain = {
  label: string;
  color: string;
  icon: React.ReactNode;
  top: string;
  left: string;
  size: number;
  depth: number; // parallax factor (also drives blur/opacity for "distance")
  anim: string;
  dur: number;
  delay: number;
};

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const DOMAINS: Domain[] = [
  {
    label: 'Fintech', color: '#3b82f6', top: '17%', left: '9%', size: 76, depth: 1, anim: 'floatA', dur: 13, delay: 0,
    icon: (<svg viewBox="0 0 24 24" {...stroke}><rect x="2.5" y="6" width="19" height="13" rx="2.5" /><path d="M2.5 10h19" /><path d="M6 15h3" /></svg>),
  },
  {
    label: 'Healthcare', color: '#f43f5e', top: '62%', left: '15%', size: 60, depth: 0.7, anim: 'floatB', dur: 15, delay: 1.2,
    icon: (<svg viewBox="0 0 24 24" {...stroke}><path d="M3 13h3l2-5 3 9 2.5-6 1.5 2H21" /></svg>),
  },
  {
    label: 'Logistics', color: '#5b8cff', top: '40%', left: '24%', size: 46, depth: 0.4, anim: 'floatC', dur: 17, delay: 2.4,
    icon: (<svg viewBox="0 0 24 24" {...stroke}><path d="M2.5 6h10v9h-10z" /><path d="M12.5 9h4l3 3v3h-7z" /><circle cx="6" cy="18" r="1.7" /><circle cx="16.5" cy="18" r="1.7" /></svg>),
  },
  {
    label: 'E-commerce', color: '#ec4899', top: '80%', left: '30%', size: 44, depth: 0.5, anim: 'floatA', dur: 14, delay: 0.6,
    icon: (<svg viewBox="0 0 24 24" {...stroke}><path d="M6 8h12l-1 11H7z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg>),
  },
  {
    label: 'Data', color: '#22d3ee', top: '13%', left: '88%', size: 40, depth: 0.35, anim: 'floatB', dur: 16, delay: 1.8,
    icon: (<svg viewBox="0 0 24 24" {...stroke}><ellipse cx="12" cy="6" rx="7" ry="2.6" /><path d="M5 6v12c0 1.5 3.1 2.6 7 2.6s7-1.1 7-2.6V6" /><path d="M5 12c0 1.5 3.1 2.6 7 2.6s7-1.1 7-2.6" /></svg>),
  },
  {
    label: 'AI / ML', color: '#f59e0b', top: '24%', left: '82%', size: 70, depth: 0.95, anim: 'floatC', dur: 12, delay: 0.3,
    icon: (<svg viewBox="0 0 24 24" {...stroke}><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M10 2.5v3M14 2.5v3M10 18.5v3M14 18.5v3M2.5 10h3M2.5 14h3M18.5 10h3M18.5 14h3" /></svg>),
  },
  {
    label: 'Cloud', color: '#38bdf8', top: '60%', left: '87%', size: 56, depth: 0.65, anim: 'floatA', dur: 15, delay: 2,
    icon: (<svg viewBox="0 0 24 24" {...stroke}><path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9.5a3.5 3.5 0 0 1 .5 8.5z" /></svg>),
  },
  {
    label: 'Security', color: '#34d399', top: '82%', left: '74%', size: 48, depth: 0.55, anim: 'floatB', dur: 18, delay: 1,
    icon: (<svg viewBox="0 0 24 24" {...stroke}><path d="M12 2.8 19 5.5v5c0 4.7-3 8.3-7 10.7-4-2.4-7-6-7-10.7v-5z" /><path d="M9 12l2 2 4-4" /></svg>),
  },
];

export default function FloatingDomains() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX / window.innerWidth - 0.5;
      const dy = e.clientY / window.innerHeight - 0.5;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--px', `${(dx * 40).toFixed(1)}px`);
        el.style.setProperty('--py', `${(dy * 40).toFixed(1)}px`);
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // ---- Animated honeycomb grid (light lines that glow near the cursor) ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    const radius = 40;
    const hexW = Math.sqrt(3) * radius;
    const hexH = 2 * radius;
    const xOff = hexW;
    const yOff = hexH * 0.75;
    let hexes: { x: number; baseY: number }[] = [];
    const target = { x: -9999, y: -9999 };
    const cur = { x: -9999, y: -9999 };

    let faintStroke = 'rgba(16, 14, 36, 0.05)';
    const updateFaintStroke = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      faintStroke = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(16, 14, 36, 0.05)';
    };
    updateFaintStroke();
    window.addEventListener('pm:theme', updateFaintStroke);

    const path = new Path2D();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      const px = radius * Math.cos(a);
      const py = radius * Math.sin(a);
      if (i === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    }
    path.closePath();

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hexes = [];
      const cols = Math.ceil(w / xOff) + 2;
      const rows = Math.ceil(h / yOff) + 6;
      for (let r = -4; r < rows; r++) {
        for (let c = -2; c < cols; c++) {
          let x = c * xOff;
          const y = r * yOff;
          if (r % 2 !== 0) x += xOff / 2;
          hexes.push({ x, baseY: y });
        }
      }
    };

    const drawFrame = (drift: number) => {
      ctx.clearRect(0, 0, w, h);
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1;
      for (const hex of hexes) {
        const y = hex.baseY - drift;
        const dx = cur.x - hex.x;
        const dy = cur.y - y;
        let intensity = 0;
        if (Math.abs(dx) < 240 && Math.abs(dy) < 240) {
          const dist = Math.hypot(dx, dy);
          if (dist < 240) intensity = Math.pow(1 - dist / 240, 1.5);
        }
        ctx.save();
        ctx.translate(hex.x, y);
        if (intensity > 0) {
          ctx.strokeStyle = `rgba(37, 99, 235, ${(0.08 + intensity * 0.42).toFixed(3)})`;
          ctx.stroke(path);
          ctx.fillStyle = `rgba(37, 99, 235, ${(intensity * 0.05).toFixed(3)})`;
          ctx.fill(path);
        } else {
          ctx.strokeStyle = faintStroke;
          ctx.stroke(path);
        }
        ctx.restore();
      }
    };

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('resize', resize);
    resize();

    let raf = 0;
    if (reduce) {
      drawFrame(0);
    } else {
      const loop = (t: number) => {
        drawFrame((t * 0.012) % (yOff * 2));
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pm:theme', updateFaintStroke);
    };
  }, []);

  return (
    <div className={styles.space} ref={containerRef} aria-hidden>
      {/* Honeycomb grid */}
      <canvas ref={canvasRef} className={styles.honeycomb} />

      {/* Floating domain objects */}
      {DOMAINS.map((d) => (
        <div
          key={d.label}
          className={styles.obj}
          style={{
            top: d.top,
            left: d.left,
            ['--d' as string]: d.depth,
            ['--sz' as string]: `${d.size}px`,
            ['--clr' as string]: d.color,
          } as React.CSSProperties}
        >
          <div
            className={styles.floatWrap}
            style={{ animationName: d.anim, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }}
          >
            <div className={styles.tile}>
              <div className={styles.icon}>{d.icon}</div>
            </div>
            <span className={styles.tag}>{d.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
