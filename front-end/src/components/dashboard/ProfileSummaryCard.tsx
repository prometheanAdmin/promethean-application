import Link from 'next/link';
import type { CurrentStudent } from './useCurrentStudent';
import { ArrowRightIcon } from './icons';
import styles from './ProfileSummaryCard.module.css';

export default function ProfileSummaryCard({ student }: { student: CurrentStudent }) {
  return (
    <div className={styles.card}>
      <span className={styles.avatar}>{student.initials}</span>
      <div className={styles.info}>
        <h2 className={styles.name}>{student.name}</h2>
        <p className={styles.meta}>
          {student.program} &middot; {student.batch}
        </p>
      </div>
      <span className={styles.statusPill}>
        <span className={styles.statusDot} />
        {student.status}
      </span>
      <Link href="/dashboard/profile" className={styles.cta}>
        View full profile
        <ArrowRightIcon />
      </Link>
    </div>
  );
}
