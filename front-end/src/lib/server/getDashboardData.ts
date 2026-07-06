/**
 * Server-side dashboard data prefetch — runs exclusively in the Node.js
 * runtime as part of the async dashboard layout.tsx Server Component.
 *
 * Why this matters
 * ----------------
 * Without SSR prefetch the browser must complete a chain of:
 *   HTML → JS load → Clerk hydrate (~200 ms) → getToken → 2 API waves (~300 ms)
 * = ~500–650 ms of skeleton on every hard refresh.
 *
 * With this function all backend data is fetched server-to-server (~5–20 ms
 * for localhost, ~10–30 ms in production on the same VPC) before the HTML is
 * sent. The store is seeded before Clerk finishes hydrating, so the moment
 * isLoaded flips to true the page renders without any additional API calls.
 *
 * Result: skeleton time drops from ~500 ms → ~200 ms (Clerk hydration only).
 */

import { auth } from '@clerk/nextjs/server';
import type {
  CurrentStudent,
  CurrentStudentProfile,
  DashboardSSRData,
} from '@/components/dashboard/useCurrentStudent';
import type { AppRole } from '@/lib/auth';

// ─── Internal backend response shapes ────────────────────────────────────────
// Defined locally so we don't couple the server utility to client-component
// internals or force-export internal types from useCurrentStudent.

interface BackendUserRead {
  id: string;
  clerk_user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  roles: string[];
  created_at: string;
  updated_at: string;
}

interface BackendStudentProfileRead {
  id: string;
  user_id: string;
  education: string | null;
  skills: string[];
  career_goals: string | null;
  github_username: string | null;
  domain_id: string | null;
  profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

interface BackendEnrollmentRead {
  id: string;
  student_id: string;
  batch_id: string;
  status: 'active' | 'completed' | 'withdrawn';
  payment_status: 'free' | 'paid' | 'refunded';
  github_repo_url: string | null;
  enrolled_at: string;
  updated_at: string;
}

interface BackendBatchRead {
  id: string;
  name: string;
  project_track: string;
  domain_id: string;
  mentor_id: string;
  start_date: string;
  end_date: string;
  max_students: number;
  description: string | null;
  github_template_repo: string | null;
  github_repo_url: string | null;
  status: string;
  enrollment_count: number;
  created_at: string;
  updated_at: string;
}

interface BackendDomainRead {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface BackendMentorListResponse {
  items: Array<{ id: string; user_id: string }>;
  total: number;
}

interface BackendMentorDetailRead {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  company: string | null;
  experience_yrs: number | null;
}

// ─── Presentation overrides (mirrors the map in useCurrentStudent.ts) ─────────

const PRESENTATION_OVERRIDES = new Map<string, { location: string; bio: string }>([
  [
    'charan.kdf15@gmail.com',
    {
      location: 'Hyderabad, India',
      bio: 'Full-stack engineer in training, currently shipping the payments and ledger experience with Promethean mentors.',
    },
  ],
]);

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const API_BASE =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:8000';

/**
 * Authenticated server-to-server fetch.
 * Returns null on any non-2xx response or network failure — never throws.
 */
async function authFetch<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store', // user-specific data must never be shared between requests
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

/**
 * Public server-to-server fetch with Next.js ISR cache.
 * Domains and the mentor list change rarely — 5 min TTL is safe.
 */
async function publicFetch<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// ─── Pure derivation helpers (duplicated from useCurrentStudent to keep the
//     server module fully independent of client-component code) ────────────────

function deriveInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => (p[0] ?? '').toUpperCase())
    .join('');
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function computeTotalWeeks(start?: string | null, end?: string | null): number {
  if (!start || !end) return 12;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 12;
  const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000));
  return Math.max(1, Math.ceil(diffDays / 7));
}

function mapEnrollmentStatus(
  status: BackendEnrollmentRead['status'] | null
): CurrentStudent['status'] {
  if (status === 'completed') return 'Completed';
  if (status === 'withdrawn') return 'On break';
  return 'Active';
}

function pickRole(roles: string[]): AppRole {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('mentor')) return 'mentor';
  return 'student';
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetches all data needed to render the dashboard, entirely server-side.
 *
 * Returns null when:
 *   - The user is not authenticated (Clerk auth() returns no userId)
 *   - The backend /api/v1/me call fails (new user not yet synced, or outage)
 *   - Any unexpected error is thrown
 *
 * In all null cases DashboardShell falls back to the existing client-side
 * loading flow — no regression from current behaviour.
 */
export async function getDashboardData(): Promise<DashboardSSRData | null> {
  try {
    const { userId, getToken } = await auth();
    if (!userId) return null;

    const token = await getToken();
    if (!token) return null;

    // ── Wave 1: all independent fetches in parallel ──────────────────────────
    // Each helper returns null on error — the race never rejects.
    const [me, profile, enrollment, domains, mentorList] = await Promise.all([
      authFetch<BackendUserRead>('/api/v1/me', token),
      authFetch<BackendStudentProfileRead>('/api/v1/me/student-profile', token),
      authFetch<BackendEnrollmentRead>('/api/v1/enrollments/me', token),
      publicFetch<BackendDomainRead[]>('/api/v1/domains'),
      publicFetch<BackendMentorListResponse>('/api/v1/mentors', 60),
    ]);

    // /api/v1/me is the only hard requirement — everything else degrades gracefully
    if (!me) return null;

    const role = pickRole(me.roles);
    const domainById = new Map((domains ?? []).map((d) => [d.id, d.name]));

    const displayName =
      [me.first_name, me.last_name].filter(Boolean).join(' ').trim() ||
      me.email.split('@')[0] ||
      'Promethean Student';

    // ── Non-student fast path ────────────────────────────────────────────────
    if (role !== 'student') {
      return {
        clerkUserId: me.clerk_user_id,
        student: {
          id: me.id,
          name: displayName,
          initials: deriveInitials(displayName),
          email: me.email,
          program: role === 'mentor' ? 'Mentor Workspace' : 'Admin Panel',
          domain: 'General',
          batch: '',
          batchStartDate: 'TBD',
          mentorName: 'TBD',
          status: 'Active',
          joinedDate: formatDateLabel(me.created_at),
          location: 'Remote',
          bio: 'Building real engineering experience through live job simulations at Promethean.',
          totalWeeks: 12,
        },
        profile: {
          education: '',
          skills: [],
          careerGoals: '',
          domainId: '',
          githubUsername: null,
          profileComplete: false,
        },
        role,
        needsProfileSetup: false,
      };
    }

    // ── Student path ─────────────────────────────────────────────────────────
    const currentProfile: CurrentStudentProfile = profile
      ? {
          education: profile.education ?? '',
          skills: profile.skills,
          careerGoals: profile.career_goals ?? '',
          domainId: profile.domain_id ?? '',
          githubUsername: profile.github_username,
          profileComplete: profile.profile_complete,
        }
      : {
          education: '',
          skills: [],
          careerGoals: '',
          domainId: '',
          githubUsername: null,
          profileComplete: false,
        };

    const needsProfileSetup = !currentProfile.profileComplete;

    // ── Wave 2: batch (sequential — needs enrollment.batch_id) ───────────────
    const effectiveEnrollment = needsProfileSetup ? null : enrollment;
    const batch = effectiveEnrollment?.batch_id
      ? await authFetch<BackendBatchRead>(
          `/api/v1/batches/${effectiveEnrollment.batch_id}`,
          token
        )
      : null;

    // ── Wave 3: mentor detail (sequential — needs batch.mentor_id) ───────────
    // Only one mentor fetch needed: the mentor assigned to this student's batch.
    let mentorName = 'TBD';
    if (batch && mentorList) {
      const mentorBasic = mentorList.items.find((m) => m.user_id === batch.mentor_id);
      if (mentorBasic) {
        const mentorDetail = await authFetch<BackendMentorDetailRead>(
          `/api/v1/mentors/${mentorBasic.id}`,
          token
        );
        if (mentorDetail) {
          mentorName =
            [mentorDetail.first_name, mentorDetail.last_name].filter(Boolean).join(' ').trim() ||
            'Promethean Mentor';
        }
      }
    }

    const domainName =
      (profile?.domain_id ? domainById.get(profile.domain_id) : undefined) ??
      (batch ? domainById.get(batch.domain_id) : undefined) ??
      'General';

    const presentation = PRESENTATION_OVERRIDES.get(me.email.toLowerCase());
    const program = batch?.project_track ?? `${domainName} Foundations`;

    return {
      clerkUserId: me.clerk_user_id,
      student: {
        id: me.id,
        name: displayName,
        initials: deriveInitials(displayName),
        email: me.email,
        program: needsProfileSetup ? 'Complete your profile' : program,
        domain: domainName,
        batch: needsProfileSetup ? 'Profile setup' : (batch?.name ?? 'Not enrolled yet'),
        batchStartDate: batch ? formatDateLabel(batch.start_date) : 'TBD',
        mentorName,
        status: mapEnrollmentStatus(effectiveEnrollment?.status ?? null),
        joinedDate: formatDateLabel(me.created_at),
        location: presentation?.location ?? 'Remote',
        bio:
          presentation?.bio ??
          profile?.career_goals ??
          'Building real engineering experience through live job simulations at Promethean.',
        totalWeeks: computeTotalWeeks(batch?.start_date, batch?.end_date),
      },
      profile: currentProfile,
      role,
      needsProfileSetup,
    };
  } catch {
    // Never let a prefetch failure crash the layout — fall back to client-side loading
    return null;
  }
}
