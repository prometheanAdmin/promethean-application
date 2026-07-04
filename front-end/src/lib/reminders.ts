export interface Reminder {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'Standup' | 'Deadline' | 'Review' | 'Class' | 'Mentor session';
  actionLabel: string;
  actionHref: string;
}

// Sample data — swap for a real notifications/calendar API later.
export const reminders: Reminder[] = [
  {
    id: 'r1',
    title: 'Daily standup — Fintech Batch 12',
    date: 'Today',
    time: '9:00 AM',
    type: 'Standup',
    actionLabel: 'Join',
    actionHref: '/dashboard/zoom',
  },
  {
    id: 'r2',
    title: 'PR #128 code review with Aisha',
    date: 'Today',
    time: '4:00 PM',
    type: 'Review',
    actionLabel: 'Join',
    actionHref: '/dashboard/zoom',
  },
  {
    id: 'r3',
    title: 'Ledger service: idempotency fix due',
    date: 'Tomorrow',
    time: '6:00 PM',
    type: 'Deadline',
    actionLabel: 'View ticket',
    actionHref: '/dashboard/jira',
  },
  {
    id: 'r4',
    title: 'System design workshop',
    date: 'Tomorrow',
    time: '11:00 AM',
    type: 'Class',
    actionLabel: 'View class',
    actionHref: '/dashboard/zoom',
  },
  {
    id: 'r5',
    title: 'Week 3 sprint demo',
    date: 'Fri, Jul 3',
    time: '4:00 PM',
    type: 'Review',
    actionLabel: 'View class',
    actionHref: '/dashboard/zoom',
  },
];
