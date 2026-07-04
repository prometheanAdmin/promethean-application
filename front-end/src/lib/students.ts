export interface Student {
  id: string;
  name: string;
  initials: string;
  email: string;
  program: string;
  domain: string;
  batch: string;
  batchStartDate: string;
  mentorName: string;
  status: 'Active' | 'On break' | 'Completed';
  joinedDate: string;
  location: string;
  bio: string;
  totalWeeks: number;
}

// Sample data — swap for a real students/auth API later. Each student sits
// in a different domain/mentor pairing so the enrollment-gated mentor
// messaging feature has something real to demonstrate across logins.
export const students: Student[] = [
  {
    id: 'stu_10234',
    name: 'Ananya Rao',
    initials: 'AR',
    email: 'ananya.rao@student.promethean.io',
    program: 'Payments & Ledgers',
    domain: 'Fintech',
    batch: 'Batch #12',
    batchStartDate: 'Jul 14, 2026',
    mentorName: 'Aisha Verma',
    status: 'Active',
    joinedDate: 'Jun 2, 2026',
    location: 'Bengaluru, India',
    bio: 'Backend-leaning full-stack engineer in training, currently shipping the ledger service for the Fintech batch.',
    totalWeeks: 12,
  },
  {
    id: 'stu_10235',
    name: 'Kabir Singh',
    initials: 'KS',
    email: 'kabir.singh@student.promethean.io',
    program: 'Patient Pipelines',
    domain: 'Healthcare',
    batch: 'Batch #13',
    batchStartDate: 'Jul 28, 2026',
    mentorName: 'Marcus Cole',
    status: 'Active',
    joinedDate: 'Jun 9, 2026',
    location: 'Pune, India',
    bio: 'Data-engineering focused student building FHIR-compliant pipelines under Marcus in the Healthcare batch.',
    totalWeeks: 12,
  },
  {
    id: 'stu_10236',
    name: 'Noah Kim',
    initials: 'NK',
    email: 'noah.kim@student.promethean.io',
    program: 'Fleet Routing API',
    domain: 'Logistics',
    batch: 'Batch #14',
    batchStartDate: 'Aug 11, 2026',
    mentorName: 'Diego Santos',
    status: 'Active',
    joinedDate: 'Jun 16, 2026',
    location: 'Seoul, South Korea',
    bio: 'Backend engineer in training, working with Diego on the dispatch and routing engine for the Logistics batch.',
    totalWeeks: 12,
  },
  {
    id: 'stu_10237',
    name: 'Zara Ahmed',
    initials: 'ZA',
    email: 'zara.ahmed@student.promethean.io',
    program: 'Checkout Flow',
    domain: 'E-commerce',
    batch: 'Batch #15',
    batchStartDate: 'Aug 25, 2026',
    mentorName: 'Lena Hoffmann',
    status: 'Active',
    joinedDate: 'Jun 23, 2026',
    location: 'Dubai, UAE',
    bio: 'Frontend-focused student rebuilding the checkout experience with Lena in the E-commerce batch.',
    totalWeeks: 12,
  },
];

export function getStudentById(id: string): Student | undefined {
  return students.find((s) => s.id === id);
}

export interface DemoAccount {
  email: string;
  password: string;
  studentId: string;
}

// Shared demo password across all four accounts — this is a placeholder
// login system with no backend, so keeping one password keeps the login
// page's "demo accounts" callout short and easy to actually use.
export const DEMO_PASSWORD = 'Promethean@123';

export const demoAccounts: DemoAccount[] = students.map((s) => ({
  email: s.email,
  password: DEMO_PASSWORD,
  studentId: s.id,
}));

export function findDemoAccount(email: string, password: string): DemoAccount | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  return demoAccounts.find(
    (a) => a.email.toLowerCase() === normalizedEmail && a.password === password
  );
}
