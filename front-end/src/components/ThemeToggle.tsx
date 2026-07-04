'use client';

import { useSyncExternalStore } from 'react';
import styles from './ThemeToggle.module.css';

function subscribe(onStoreChange: () => void) {
  window.addEventListener('pm:theme', onStoreChange as EventListener);
  window.addEventListener('storage', onStoreChange);

  return () => {
    window.removeEventListener('pm:theme', onStoreChange as EventListener);
    window.removeEventListener('storage', onStoreChange);
  };
}

function getThemeSnapshot() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getThemeSnapshot, () => false);

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('theme', next);
    window.dispatchEvent(new CustomEvent('pm:theme', { detail: next }));
  };

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      suppressHydrationWarning
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
        </svg>
      )}
    </button>
  );
}
