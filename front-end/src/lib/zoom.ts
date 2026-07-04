export interface ZoomClass {
  id: string;
  title: string;
  host: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: 'live' | 'upcoming' | 'ended';
  meetingLink: string;
}

// Sample data — swap for a real calendar/Zoom API integration later.
export const zoomClasses: ZoomClass[] = [
  {
    id: 'z1',
    title: 'Sprint standup — Fintech Batch 12',
    host: 'Aisha Verma',
    date: 'Today',
    time: '9:00 AM',
    durationMinutes: 15,
    status: 'live',
    meetingLink: 'https://zoom.us/j/1234567890',
  },
  {
    id: 'z2',
    title: 'Code review: ledger service PR #128',
    host: 'Aisha Verma',
    date: 'Today',
    time: '4:00 PM',
    durationMinutes: 45,
    status: 'upcoming',
    meetingLink: 'https://zoom.us/j/1234567891',
  },
  {
    id: 'z3',
    title: 'System design workshop',
    host: 'Marcus Cole',
    date: 'Tomorrow',
    time: '11:00 AM',
    durationMinutes: 60,
    status: 'upcoming',
    meetingLink: 'https://zoom.us/j/1234567892',
  },
  {
    id: 'z4',
    title: 'Week 3 sprint demo',
    host: 'Aisha Verma',
    date: 'Fri, Jul 3',
    time: '4:00 PM',
    durationMinutes: 30,
    status: 'upcoming',
    meetingLink: 'https://zoom.us/j/1234567893',
  },
  {
    id: 'z5',
    title: 'Onboarding: Git workflow at Promethean',
    host: 'Diego Santos',
    date: 'Last Mon',
    time: '10:00 AM',
    durationMinutes: 40,
    status: 'ended',
    meetingLink: 'https://zoom.us/j/1234567894',
  },
];
