'use client';

import styles from './CourseCard.module.css';
import { useTilt } from './useTilt';

interface CourseCardProps {
  domain: string;
  domainColor: string;
  title: string;
  dateStr: string;
  duration: string;
  mentorName: string;
  mentorRole: string;
  mentorAvatar: string;
}

export default function CourseCard({
  domain,
  domainColor,
  title,
  dateStr,
  duration,
  mentorName,
  mentorRole,
  mentorAvatar,
}: CourseCardProps) {
  const tilt = useTilt(6);

  return (
    <div
      className={styles.card}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseEnter={tilt.onMouseEnter}
      onMouseLeave={tilt.onMouseLeave}
    >
      <div className={styles.tilt}>
        <div className={styles.inner}>
          <div className={styles.content}>
            <div className={styles.header}>
              <div className={styles.tag}>
                <span className={styles.tagDot} style={{ background: domainColor }} />
                {domain}
              </div>
              <span className={styles.seatBadge}>Seats filling</span>
            </div>

            <h3 className={styles.title}>{title}</h3>
            <p className={styles.meta}>
              Starts <b style={{ color: 'var(--ink)' }}>{dateStr}</b> &middot; {duration}
            </p>

            <div className={styles.mentorRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mentorAvatar} alt={mentorName} className={styles.avatar} />
              <div>
                <div className={styles.mentorName}>{mentorName}</div>
                <div className={styles.mentorRole}>{mentorRole}</div>
              </div>
            </div>

            <button className={styles.reserveBtn} type="button">
              <span>Reserve seat</span>
              <span className={styles.arrow} aria-hidden>
                &rarr;
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
