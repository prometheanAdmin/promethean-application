import type { Booking } from '@/lib/bookings';
import styles from './UpcomingSessionsList.module.css';

export default function UpcomingSessionsList({ bookings, onCancel }: { bookings: Booking[]; onCancel: (id: string) => void }) {
  if (bookings.length === 0) return null;

  const sorted = [...bookings].sort((a, b) => (a.dateISO + a.time).localeCompare(b.dateISO + b.time));

  return (
    <div className={styles.wrap}>
      <h2 className={styles.sectionTitle}>Your upcoming sessions</h2>
      <div className={styles.list}>
        {sorted.map((b) => (
          <div key={b.id} className={styles.row}>
            <span className={styles.avatar}>{b.mentorInitials}</span>
            <div className={styles.info}>
              <p className={styles.mentorName}>{b.mentorName}</p>
              <p className={styles.topic}>{b.topic}</p>
            </div>
            <span className={styles.when}>{b.dateLabel} &middot; {b.time}</span>
            <button type="button" className={styles.cancelBtn} onClick={() => onCancel(b.id)}>
              Cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
