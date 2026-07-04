'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckSquareIcon, ExternalLinkIcon } from './icons';
import styles from './WhatToDoEmbed.module.css';

const WHAT_TO_DO_URL = 'https://what-to-do-nu.vercel.app/';
// Cross-origin iframes never fire a reliable "it's actually broken" event
// (blocked frames just render blank). Give the load a fixed window before
// treating it as a failure and surfacing the fallback.
const LOAD_TIMEOUT_MS = 6000;

export default function WhatToDoEmbed() {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setStatus((current) => (current === 'loading' ? 'failed' : current));
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleLoad = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('loaded');
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.chrome}>
        <div className={styles.chromeLeft}>
          <span className={styles.dots}>
            <span />
            <span />
            <span />
          </span>
          <span className={styles.url}>what-to-do-nu.vercel.app</span>
        </div>
        <a href={WHAT_TO_DO_URL} target="_blank" rel="noopener noreferrer" className={styles.openBtn}>
          Open in new tab
          <ExternalLinkIcon />
        </a>
      </div>

      <div className={styles.frameArea}>
        <iframe
          src={WHAT_TO_DO_URL}
          title="What-To-Do productivity tracker"
          className={styles.frame}
          onLoad={handleLoad}
          style={{ visibility: status === 'loaded' ? 'visible' : 'hidden' }}
        />

        {status === 'loading' && (
          <div className={styles.loading}>
            <span className={styles.spinner} />
            <p className={styles.loadingText}>Loading What-To-Do&hellip;</p>
          </div>
        )}

        {status === 'failed' && (
          <div className={styles.fallback}>
            <span className={styles.fallbackIcon}>
              <CheckSquareIcon />
            </span>
            <h3 className={styles.fallbackTitle}>Couldn&apos;t load What-To-Do here</h3>
            <p className={styles.fallbackDesc}>
              The tracker didn&apos;t load in this window. Open it directly in a new tab instead — your tasks are unaffected.
            </p>
            <a href={WHAT_TO_DO_URL} target="_blank" rel="noopener noreferrer" className={styles.fallbackCta}>
              Open What-To-Do
              <ExternalLinkIcon />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
