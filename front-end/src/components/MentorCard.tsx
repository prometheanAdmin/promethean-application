'use client';

import styles from './MentorCard.module.css';
import { useTilt } from './useTilt';

interface MentorCardProps {
  name: string;
  role: string;
  company: string;
  imageSrc: string;
  tags?: string[];
}

export default function MentorCard({ name, role, company, imageSrc, tags = [] }: MentorCardProps) {
  const {
    ref: tiltRef,
    onMouseMove,
    onMouseEnter,
    onMouseLeave,
  } = useTilt(8);

  return (
    <div
      className={styles.card}
      ref={tiltRef}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.tilt}>
        <div className={styles.inner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.photo} src={imageSrc} alt={name} />
          <span className={styles.grain} aria-hidden />
          <span className={styles.scrim} aria-hidden />

          {/* Floating status chip, top-right */}
          <span className={styles.statusChip}>
            <span className={styles.statusDot} aria-hidden />
            Mentoring
          </span>

          <div className={styles.content}>
            <div className={styles.company}>
              <span className={styles.companyDot} aria-hidden />
              {company}
            </div>
            <h3 className={styles.name}>{name}</h3>
            <div className={styles.role}>{role}</div>

            {/* Expands on hover */}
            <div className={styles.reveal}>
              <div className={styles.revealInner}>
                <div className={styles.tags}>
                  {tags.map((t, i) => (
                    <span key={t} className={styles.tag} style={{ '--i': i } as React.CSSProperties}>
                      {t}
                    </span>
                  ))}
                </div>
                <button className={styles.profileBtn} type="button">
                  View profile
                  <span className={styles.arrow} aria-hidden>
                    &rarr;
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
