import type { Metadata } from 'next';
import PageHeader from '@/components/dashboard/PageHeader';
import RemindersList from '@/components/dashboard/RemindersList';

export const metadata: Metadata = {
  title: 'Reminders - Promethean',
};

export default function RemindersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stay on track"
        title="Reminders"
        subtitle="Never miss a standup, deadline, code review, or mentor session."
      />
      <RemindersList />
    </>
  );
}
