'use client';

import { useMemo } from 'react';
import { reminders as staticReminders, type Reminder } from '@/lib/reminders';
import { useBookings } from './useBookings';

export function useReminders(): Reminder[] {
  const { bookings } = useBookings();

  return useMemo(() => {
    const mentorReminders: Reminder[] = bookings.map((b) => ({
      id: b.id,
      title: `Session with ${b.mentorName}`,
      date: b.dateLabel,
      time: b.time,
      type: 'Mentor session',
      actionLabel: 'View session',
      actionHref: '/dashboard/mentors',
    }));

    return [...mentorReminders, ...staticReminders];
  }, [bookings]);
}
