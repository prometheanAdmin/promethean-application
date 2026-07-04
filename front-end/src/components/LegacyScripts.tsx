'use client';
import { useEffect } from 'react';

export default function LegacyScripts() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.add('js-reveal');

    // ---- Scroll reveal (self-contained, no library dependency) ----
    const revealEls = Array.from(
      document.querySelectorAll<HTMLElement>('[data-rv]')
    );

    let observer: IntersectionObserver | null = null;
    if (reduce || !('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('rv-in'));
    } else {
      observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('rv-in');
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
      );
      revealEls.forEach((el) => {
        // Anything already in view on load reveals immediately (no wait).
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92) {
          el.classList.add('rv-in');
        } else {
          observer!.observe(el);
        }
      });
    }

    // ---- Nav elevation on scroll ----
    const onScroll = () => {
      document.body.classList.toggle('nav-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return null;
}
