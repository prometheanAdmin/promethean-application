'use client';

import { useEffect, useRef } from 'react';

export default function HexagonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let w = 0, h = 0;
    const radius = 54;
    const hexWidth = Math.sqrt(3) * radius;
    const hexHeight = 2 * radius;
    const xOffset = hexWidth;
    const yOffset = hexHeight * 0.75;
    
    let hexagons: {x: number, baseY: number}[] = [];
    let targetMouse = { x: -2000, y: -2000 };
    let currentMouse = { x: -2000, y: -2000 };
    let scrollY = window.scrollY;

    let faintStroke = 'rgba(10, 10, 11, 0.03)';
    const updateFaintStroke = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      faintStroke = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(10, 10, 11, 0.03)';
    };
    updateFaintStroke();

    const onMouseMove = (e: MouseEvent) => {
      targetMouse.x = e.clientX;
      targetMouse.y = e.clientY;
    };
    const onScroll = () => { scrollY = window.scrollY; };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pm:theme', updateFaintStroke);

    const hexPath = new Path2D();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const px = radius * Math.cos(angle);
      const py = radius * Math.sin(angle);
      if (i === 0) hexPath.moveTo(px, py);
      else hexPath.lineTo(px, py);
    }
    hexPath.closePath();

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      
      hexagons = [];
      const cols = Math.ceil(w / xOffset) + 2;
      const rows = Math.ceil(h / yOffset) + 6; 
      
      for (let r = -4; r < rows; r++) {
        for (let c = -2; c < cols; c++) {
          let x = c * xOffset;
          let y = r * yOffset;
          if (r % 2 !== 0) x += xOffset / 2;
          hexagons.push({ x: x, baseY: y });
        }
      }
    };

    let animationId = 0;
    const animate = (time: number) => {
      ctx.clearRect(0, 0, w, h);
      
      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.08;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.08;

      const driftY = (time * 0.015 + scrollY * 0.3) % (yOffset * 2);
      ctx.lineJoin = "round";
      
      hexagons.forEach(hex => {
        let currentY = hex.baseY - driftY;
        let fillOpacity = 0;
        let strokeColor = faintStroke;
        
        const dx = currentMouse.x - hex.x;
        const dy = currentMouse.y - currentY;
        
        if (Math.abs(dx) < 350 && Math.abs(dy) < 350) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 350) {
             const hoverIntensity = Math.pow(1 - (dist / 350), 1.5);
             fillOpacity = hoverIntensity * 0.04;
             strokeColor = `rgba(0, 82, 255, ${0.05 + hoverIntensity * 0.3})`;
          }
        }
        
        const isHovered = fillOpacity > 0;

        ctx.save();
        ctx.translate(hex.x, currentY);

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isHovered ? 1.5 : 1;
        ctx.stroke(hexPath);

        if (fillOpacity > 0) {
          ctx.fillStyle = `rgba(0, 82, 255, ${fillOpacity})`;
          ctx.fill(hexPath);
        }

        ctx.restore();
      });
      
      animationId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pm:theme', updateFaintStroke);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: -1,
          overflow: 'hidden',
          backgroundColor: 'var(--bg-soft)'
        }}
      >
        <canvas 
          ref={canvasRef} 
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)'
          }}
        />
      </div>
    </>
  );
}
