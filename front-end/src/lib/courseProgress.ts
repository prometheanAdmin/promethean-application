import { mentors } from './mentors';

export interface WeekTask {
  id: string;
  title: string;
}

export interface CourseWeek {
  week: number;
  title: string;
  tasks: WeekTask[];
}

// Hand-written 12-week roadmap for the Fintech / Payments & Ledgers track —
// the featured demo account. Other domains get a themed roadmap generated
// from their mentor's expertise tags (see getCourseWeeks below) so every
// demo login has a plausible, non-generic weekly plan without hand-writing
// four full 12-week datasets.
const FINTECH_WEEKS: CourseWeek[] = [
  { week: 1, title: 'Onboarding & repo setup', tasks: [
    { id: 'w1t1', title: 'Set up the ledger service repo' },
    { id: 'w1t2', title: 'Configure the CI pipeline' },
    { id: 'w1t3', title: 'Pair with your mentor on the domain model' },
  ]},
  { week: 2, title: 'Core ledger endpoints', tasks: [
    { id: 'w2t1', title: 'Build double-entry accounting logic' },
    { id: 'w2t2', title: 'Ship the account balance endpoint' },
    { id: 'w2t3', title: 'Add test coverage for both' },
  ]},
  { week: 3, title: 'Dashboard UI pass', tasks: [
    { id: 'w3t1', title: 'Build the internal ops dashboard' },
    { id: 'w3t2', title: 'Fix accessibility gaps flagged by your mentor' },
  ]},
  { week: 4, title: 'Staging deployment', tasks: [
    { id: 'w4t1', title: 'Deploy the ledger service to staging' },
    { id: 'w4t2', title: 'Wire up environment secrets' },
    { id: 'w4t3', title: 'Smoke-test the payment flow' },
  ]},
  { week: 5, title: 'Idempotency key bug fix', tasks: [
    { id: 'w5t1', title: 'Reproduce the duplicate-entry race condition' },
    { id: 'w5t2', title: 'Ship the idempotency key fix' },
    { id: 'w5t3', title: 'Add a regression test' },
  ]},
  { week: 6, title: 'Risk-scoring API design', tasks: [
    { id: 'w6t1', title: 'Design the risk-scoring API contract' },
    { id: 'w6t2', title: 'Implement the fraud-flag scoring logic' },
    { id: 'w6t3', title: 'Review the design with your mentor' },
  ]},
  { week: 7, title: 'Payment retries & webhooks', tasks: [
    { id: 'w7t1', title: 'Add a payment retry queue' },
    { id: 'w7t2', title: 'Implement signed webhook delivery' },
    { id: 'w7t3', title: 'Handle webhook delivery failures' },
  ]},
  { week: 8, title: 'Security & compliance review', tasks: [
    { id: 'w8t1', title: 'Run the security checklist on the payments API' },
    { id: 'w8t2', title: 'Fix flagged compliance issues' },
    { id: 'w8t3', title: 'Document PCI-relevant flows' },
  ]},
  { week: 9, title: 'Load testing & performance tuning', tasks: [
    { id: 'w9t1', title: 'Load test the ledger service' },
    { id: 'w9t2', title: 'Profile and fix the slowest queries' },
    { id: 'w9t3', title: 'Tune connection pool settings' },
  ]},
  { week: 10, title: 'Mentor code review sprint', tasks: [
    { id: 'w10t1', title: 'Full code review sprint with your mentor' },
    { id: 'w10t2', title: 'Address review feedback' },
    { id: 'w10t3', title: 'Refactor flagged modules' },
  ]},
  { week: 11, title: 'Production launch prep', tasks: [
    { id: 'w11t1', title: 'Write the production deployment checklist' },
    { id: 'w11t2', title: 'Dry-run the production migration' },
    { id: 'w11t3', title: 'Finalize the rollback plan' },
  ]},
  { week: 12, title: 'Final demo & handoff', tasks: [
    { id: 'w12t1', title: 'Ship to production' },
    { id: 'w12t2', title: 'Present your final demo to the batch' },
    { id: 'w12t3', title: 'Hand off documentation to your mentor' },
  ]},
];

const WEEK_THEMES = [
  'Onboarding & repo setup',
  'Core feature build',
  'Internal dashboard UI pass',
  'Staging deployment',
  'Production-style bug fix',
  'New feature design',
  'Retries & error handling',
  'Security & compliance review',
  'Load testing & performance tuning',
  'Mentor code review sprint',
  'Production launch prep',
  'Final demo & handoff',
];

function generateWeeksForDomain(domain: string, mentorName: string): CourseWeek[] {
  const mentor = mentors.find((m) => m.name === mentorName);
  const expertise = mentor?.expertise ?? [domain];
  const mentorFirst = mentorName.split(' ')[0];
  const pick = (i: number) => expertise[i % expertise.length];

  const taskTemplates: string[][] = [
    [`Set up the ${domain.toLowerCase()} project repo`, 'Configure the CI pipeline', `Pair with ${mentorFirst} on the domain model`],
    [`Build the core ${pick(0)} feature`, 'Write endpoint tests'],
    ['Build the internal dashboard UI', `Fix accessibility gaps flagged by ${mentorFirst}`],
    ['Deploy to staging', 'Wire up environment secrets', 'Smoke-test the core flow'],
    [`Fix a production-style bug in ${pick(1)}`, 'Add a regression test'],
    [`Design a new ${pick(2)} feature`, `Review the design with ${mentorFirst}`],
    [`Add retry handling for ${pick(0)}`, 'Handle edge-case failures gracefully'],
    ['Run a security & compliance pass', 'Fix flagged issues'],
    ['Load test the service', 'Tune performance bottlenecks'],
    [`Full code review sprint with ${mentorFirst}`, 'Refactor flagged modules'],
    ['Write the production deployment checklist', 'Dry-run the migration'],
    ['Ship to production', 'Present your final demo to the batch', 'Hand off documentation'],
  ];

  return WEEK_THEMES.map((title, i) => ({
    week: i + 1,
    title,
    tasks: taskTemplates[i].map((t, j) => ({ id: `${domain.toLowerCase()}-w${i + 1}t${j + 1}`, title: t })),
  }));
}

const domainWeeksCache = new Map<string, CourseWeek[]>();

export function getCourseWeeks(domain: string, mentorName: string): CourseWeek[] {
  if (domain === 'Fintech') return FINTECH_WEEKS;

  const cacheKey = `${domain}::${mentorName}`;
  const cached = domainWeeksCache.get(cacheKey);
  if (cached) return cached;

  const generated = generateWeeksForDomain(domain, mentorName);
  domainWeeksCache.set(cacheKey, generated);
  return generated;
}

/** Weeks 1-3 ship pre-completed by default so a fresh demo login shows
 * realistic mid-course progress instead of a totally blank roadmap. */
export function getDefaultCompletedWeeks(weeks: CourseWeek[]): Record<number, string[]> {
  const seed: Record<number, string[]> = {};
  for (const w of weeks.slice(0, 3)) {
    seed[w.week] = w.tasks.map((t) => t.id);
  }
  return seed;
}

// ---- Per-student persistence (localStorage — no backend yet) ----

const STORAGE_PREFIX = 'pm:course-progress:';
export const COURSE_PROGRESS_EVENT = 'pm:course-progress-event';

function isBrowser() {
  return typeof window !== 'undefined';
}

function storageKey(studentId: string) {
  return `${STORAGE_PREFIX}${studentId}`;
}

const cachedRaw = new Map<string, string | null>();
const cachedData = new Map<string, Record<number, string[]>>();

export function loadCompletedTasks(studentId: string, weeks: CourseWeek[]): Record<number, string[]> {
  const defaults = getDefaultCompletedWeeks(weeks);
  if (!isBrowser()) return defaults;

  const key = storageKey(studentId);
  const raw = window.localStorage.getItem(key);
  if (cachedRaw.has(key) && cachedRaw.get(key) === raw) {
    return cachedData.get(key) ?? defaults;
  }

  cachedRaw.set(key, raw);
  let data = defaults;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = defaults;
    }
  }
  cachedData.set(key, data);
  return data;
}

export function toggleTaskCompletion(studentId: string, weeks: CourseWeek[], week: number, taskId: string) {
  if (!isBrowser()) return;
  const current = loadCompletedTasks(studentId, weeks);
  const currentWeekIds = current[week] ?? [];
  const nextWeekIds = currentWeekIds.includes(taskId)
    ? currentWeekIds.filter((id) => id !== taskId)
    : [...currentWeekIds, taskId];
  const next = { ...current, [week]: nextWeekIds };

  const key = storageKey(studentId);
  window.localStorage.setItem(key, JSON.stringify(next));
  cachedRaw.set(key, window.localStorage.getItem(key));
  cachedData.set(key, next);
  window.dispatchEvent(new CustomEvent(COURSE_PROGRESS_EVENT));
}

export function getCurrentWeekNumber(weeks: CourseWeek[], completed: Record<number, string[]>): number {
  for (const w of weeks) {
    const done = completed[w.week] ?? [];
    if (done.length < w.tasks.length) return w.week;
  }
  return weeks.length + 1; // every week complete — course finished
}

export type WeekStatus = 'done' | 'current' | 'upcoming';

export function getWeekStatus(week: number, currentWeek: number): WeekStatus {
  if (week < currentWeek) return 'done';
  if (week === currentWeek) return 'current';
  return 'upcoming';
}
