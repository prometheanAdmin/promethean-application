import Link from 'next/link';
import type { Reminder } from '@/lib/reminders';
import { VideoIcon, ClockIcon, BoardIcon, CalendarCheckIcon } from './icons';
import styles from './ReminderCard.module.css';

export const reminderTypeIcon: Record<Reminder['type'], () => React.ReactElement> = {
  Standup: VideoIcon,
  Deadline: ClockIcon,
  Review: BoardIcon,
  Class: VideoIcon,
  'Mentor session': CalendarCheckIcon,
};

export default function ReminderCard({ reminder }: { reminder: Reminder }) {
  const Icon = reminderTypeIcon[reminder.type];

  return (
    <div className={styles.card}>
      <span className={styles.iconWrap}>
        <Icon />
      </span>
      <div className={styles.info}>
        <p className={styles.typeLabel}>{reminder.type}</p>
        <p className={styles.title}>{reminder.title}</p>
      </div>
      <span className={styles.when}>
        {reminder.date} &middot; {reminder.time}
      </span>
      <Link href={reminder.actionHref} className={styles.action}>
        {reminder.actionLabel}
      </Link>
    </div>
  );
}
