'use client';

import ReminderCard from './ReminderCard';
import { useReminders } from './useReminders';
import { BellIcon } from './icons';
import styles from './RemindersList.module.css';

export default function RemindersList() {
  const reminders = useReminders();

  if (reminders.length === 0) {
    return (
      <div className={styles.emptyState}>
        <BellIcon />
        <p>You&apos;re all caught up — no reminders right now.</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {reminders.map((r) => (
        <ReminderCard key={r.id} reminder={r} />
      ))}
    </div>
  );
}
