'use client';

import Link from 'next/link';
import { useCurrentStudent } from './useCurrentStudent';
import { useCourseProgress } from './useCourseProgress';
import { useBookings } from './useBookings';
import { CalendarCheckIcon, ArrowRightIcon } from './icons';
import styles from './RightRail.module.css';

export default function RightRail() {
  const { student } = useCurrentStudent();
  const { currentWeek, totalWeeks, weeks } = useCourseProgress();
  const { bookings } = useBookings();

  const courseFinished = currentWeek > weeks.length;
  const progressPct = weeks.length > 0 ? (Math.min(currentWeek - 1, weeks.length) / weeks.length) * 100 : 0;

  const nextSession = [...bookings].sort((a, b) => (a.dateISO + a.time).localeCompare(b.dateISO + b.time))[0];

  return (
    <div className={styles.rail}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Course progress</h3>
          <Link href="/dashboard/updates" className={styles.cardLink}>View roadmap</Link>
        </div>
        <p className={styles.weekPill}>
          {courseFinished ? 'Course complete 🎉' : `Week ${currentWeek} of ${totalWeeks}`}
        </p>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <p className={styles.progressCaption}>
          {student.program} &middot; {student.domain}
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Next session</h3>
          <Link href="/dashboard/mentors" className={styles.cardLink}>Book a mentor</Link>
        </div>
        {nextSession ? (
          <div className={styles.sessionRow}>
            <span className={styles.sessionAvatar}>{nextSession.mentorInitials}</span>
            <div className={styles.sessionInfo}>
              <p className={styles.sessionName}>{nextSession.mentorName}</p>
              <p className={styles.sessionMeta}>{nextSession.dateLabel} &middot; {nextSession.time}</p>
            </div>
          </div>
        ) : (
          <div className={styles.emptyCta}>
            <p className={styles.emptyCtaText}>No sessions booked yet — grab time with {student.mentorName} whenever you&apos;re stuck.</p>
            <Link href="/dashboard/mentors" className={styles.ctaBtn}>
              <CalendarCheckIcon />
              Book a session
            </Link>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Your batch</h3>
          <Link href="/dashboard/profile" className={styles.cardLink}>
            Profile <ArrowRightIcon />
          </Link>
        </div>
        <div className={styles.batchList}>
          <div className={styles.batchRow}>
            <span className={styles.batchLabel}>Batch</span>
            <span className={styles.batchValue}>{student.batch}</span>
          </div>
          <div className={styles.batchRow}>
            <span className={styles.batchLabel}>Mentor</span>
            <span className={styles.batchValue}>{student.mentorName}</span>
          </div>
          <div className={styles.batchRow}>
            <span className={styles.batchLabel}>Status</span>
            <span className={styles.statusPill}>{student.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
