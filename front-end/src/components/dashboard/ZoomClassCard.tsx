import type { ZoomClass } from '@/lib/zoom';
import { VideoIcon, CalendarIcon, ClockIcon } from './icons';
import styles from './ZoomClassCard.module.css';

const statusLabel: Record<ZoomClass['status'], string> = {
  live: 'Live now',
  upcoming: 'Upcoming',
  ended: 'Ended',
};

const statusClass: Record<ZoomClass['status'], string> = {
  live: styles.statusLive,
  upcoming: styles.statusUpcoming,
  ended: styles.statusEnded,
};

export default function ZoomClassCard({ zoomClass }: { zoomClass: ZoomClass }) {
  const joinable = zoomClass.status !== 'ended';

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.iconWrap}>
          <VideoIcon />
        </span>
        <span className={`${styles.statusPill} ${statusClass[zoomClass.status]}`}>
          <span className={styles.statusDot} />
          {statusLabel[zoomClass.status]}
        </span>
      </div>

      <h3 className={styles.title}>{zoomClass.title}</h3>

      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <CalendarIcon />
          {zoomClass.date}
        </div>
        <div className={styles.metaRow}>
          <ClockIcon />
          {zoomClass.time} &middot; {zoomClass.durationMinutes} min
        </div>
        <div className={styles.metaRow}>
          <VideoIcon />
          Hosted by {zoomClass.host}
        </div>
      </div>

      {joinable ? (
        <a
          href={zoomClass.meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.join} ${styles.joinActive}`}
        >
          Join Class
        </a>
      ) : (
        <span className={`${styles.join} ${styles.joinDisabled}`}>Recording unavailable</span>
      )}
    </div>
  );
}
