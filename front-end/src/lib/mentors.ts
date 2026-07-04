export interface Mentor {
  id: string;
  name: string;
  initials: string;
  imageSrc: string;
  role: string;
  company: string;
  domain: string;
  expertise: string[];
  bio: string;
  rating: number;
  sessionsCompleted: number;
  slotMinutes: number;
  /** Which hours (24h) this mentor generally holds office hours on. Used to
   * deterministically generate the next few days of availability. */
  hours: number[];
}

// Sample data — swap for a real mentors/availability API later. Names match
// the mentors already referenced elsewhere (landing page, Zoom classes,
// community chat, student profile) so the app's fictional world stays
// consistent.
export const mentors: Mentor[] = [
  {
    id: 'aisha-verma',
    name: 'Aisha Verma',
    initials: 'AV',
    imageSrc: '/mentor_aisha.png',
    role: 'Senior Engineer',
    company: 'Northwind Pay',
    domain: 'Fintech',
    expertise: ['Payments', 'Ledgers', 'Risk', 'System design'],
    bio: 'Leads the Fintech batch — ex-payments infra at Northwind Pay. Great for ledger design, API architecture, and code review habits.',
    rating: 4.9,
    sessionsCompleted: 214,
    slotMinutes: 30,
    hours: [9, 11, 14, 16],
  },
  {
    id: 'marcus-cole',
    name: 'Marcus Cole',
    initials: 'MC',
    imageSrc: '/mentor_marcus.png',
    role: 'Staff Data Eng',
    company: 'Vitalink Health',
    domain: 'Healthcare',
    expertise: ['Pipelines', 'FHIR', 'Analytics', 'ETL'],
    bio: 'Runs the Healthcare batch — builds compliant data pipelines at Vitalink. Good for data modeling and pipeline debugging.',
    rating: 4.8,
    sessionsCompleted: 176,
    slotMinutes: 30,
    hours: [10, 13, 15],
  },
  {
    id: 'diego-santos',
    name: 'Diego Santos',
    initials: 'DS',
    imageSrc: '/mentor_diego.png',
    role: 'Backend Lead',
    company: 'Cargologic',
    domain: 'Logistics',
    expertise: ['APIs', 'Routing', 'Scale', 'Go'],
    bio: 'Leads backend at Cargologic — routing engines and high-throughput APIs. Sharp on scaling and Go performance questions.',
    rating: 4.7,
    sessionsCompleted: 132,
    slotMinutes: 30,
    hours: [9, 12, 17],
  },
  {
    id: 'lena-hoffmann',
    name: 'Lena Hoffmann',
    initials: 'LH',
    imageSrc: '/mentor_lena.png',
    role: 'Frontend Eng',
    company: 'Marketplace Co',
    domain: 'E-commerce',
    expertise: ['Checkout', 'React', 'UX', 'Accessibility'],
    bio: 'Frontend engineer at Marketplace Co, checkout and conversion specialist. Great for React architecture and UX review.',
    rating: 4.9,
    sessionsCompleted: 158,
    slotMinutes: 30,
    hours: [11, 14, 16, 18],
  },
];

export function getMentorById(id: string): Mentor | undefined {
  return mentors.find((m) => m.id === id);
}

/**
 * A student can only DM a mentor once they're enrolled in the course that
 * mentor teaches — approximated here as "same domain as the student's
 * batch" since each mentor leads exactly one domain's batch. Swap for a
 * real enrollment/roster check once batches have real membership.
 */
export function isEnrolledWithMentor(studentDomain: string, mentor: Mentor): boolean {
  return studentDomain === mentor.domain;
}

function formatHour(hour: number) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

export interface AvailabilityDay {
  dateISO: string;
  weekday: string;
  dayNumber: number;
  monthLabel: string;
  isToday: boolean;
  slots: string[];
}

/** Deterministically generates the next `days` days of availability for a
 * mentor, skipping weekends and thinning slots based on a stable per-day
 * hash so the schedule looks organic without being random on every render. */
export function getMentorAvailability(mentor: Mentor, days = 7): AvailabilityDay[] {
  const result: AvailabilityDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cursor = 0;
  while (result.length < days) {
    const date = new Date(today);
    date.setDate(today.getDate() + cursor);
    cursor += 1;

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    const seed = date.getDate() + mentor.hours.length;
    const slots = mentor.hours
      .filter((_, i) => (seed + i) % 3 !== 0) // thin the schedule a bit per day
      .map(formatHour);

    result.push({
      dateISO: date.toISOString().slice(0, 10),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate(),
      monthLabel: date.toLocaleDateString('en-US', { month: 'short' }),
      isToday: cursor === 1,
      slots: slots.length > 0 ? slots : mentor.hours.map(formatHour).slice(0, 1),
    });
  }

  return result;
}
