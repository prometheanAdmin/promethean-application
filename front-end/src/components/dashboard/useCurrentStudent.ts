'use client';

import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { useEffect, useSyncExternalStore } from 'react';
import { ApiError, api } from '@/lib/api';
import { getAppRole, isAppRole, type AppRole } from '@/lib/auth';
import { syncClerkUser, type SyncableClerkUser } from '@/lib/backendAuth';
import { fetchDomains } from '@/lib/domains';
import { fetchMentorDirectory, findMentorByUserId } from '@/lib/mentorDirectory';

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

type ClerkUserLike = SyncableClerkUser & {
  fullName: string | null;
  publicMetadata?: Record<string, unknown>;
};

type StudentStatus = 'Active' | 'On break' | 'Completed';

type StudentPresentationOverride = {
  location: string;
  bio: string;
};

const PRESENTATION_OVERRIDES = new Map<string, StudentPresentationOverride>([
  [
    'charan.kdf15@gmail.com',
    {
      location: 'Hyderabad, India',
      bio: 'Full-stack engineer in training, currently shipping the payments and ledger experience with Promethean mentors.',
    },
  ],
]);

/*
 * The shape every dashboard component depends on. Derived from the real Clerk
 * user + backend data, with safe fallbacks so no component ever receives null
 * or undefined user data during hydration or transient API failures.
 */
export interface CurrentStudent {
  id: string;
  name: string;
  initials: string;
  email: string;
  program: string;
  domain: string;
  batch: string;
  batchStartDate: string;
  mentorName: string;
  status: StudentStatus;
  joinedDate: string;
  location: string;
  bio: string;
  totalWeeks: number;
}

export interface UseCurrentStudentResult {
  student: CurrentStudent;
  profile: CurrentStudentProfile;
  role: AppRole;
  isLoaded: boolean;
  isLoggedIn: boolean;
  needsProfileSetup: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

type StoreSnapshot = {
  student: CurrentStudent;
  profile: CurrentStudentProfile;
  role: AppRole;
  isLoaded: boolean;
  needsProfileSetup: boolean;
};

export interface CurrentStudentProfile {
  education: string;
  skills: string[];
  careerGoals: string;
  domainId: string;
  githubUsername: string | null;
  profileComplete: boolean;
}

/**
 * Pre-computed snapshot delivered by the server-side getDashboardData() prefetch.
 * When present DashboardShell seeds the store on mount — no client API calls needed.
 * clerkUserId is used as the cache key so ensureDashboardData correctly
 * short-circuits when it sees the store is already loaded for this user.
 */
export interface DashboardSSRData {
  clerkUserId: string;
  student: CurrentStudent;
  profile: CurrentStudentProfile;
  role: AppRole;
  needsProfileSetup: boolean;
}

const listeners = new Set<() => void>();

const LOADING_PLACEHOLDER: CurrentStudent = {
  id: 'loading',
  name: 'Loading…',
  initials: '…',
  email: '',
  program: '',
  domain: '',
  batch: '',
  batchStartDate: '',
  mentorName: '',
  status: 'Active',
  joinedDate: '',
  location: '',
  bio: '',
  totalWeeks: 0,
};

const EMPTY_PROFILE: CurrentStudentProfile = {
  education: '',
  skills: [],
  careerGoals: '',
  domainId: '',
  githubUsername: null,
  profileComplete: false,
};

let snapshot: StoreSnapshot = {
  student: LOADING_PLACEHOLDER,
  profile: EMPTY_PROFILE,
  role: 'student',
  isLoaded: false,
  needsProfileSetup: false,
};

let activeUserId: string | null = null;
let inflightLoad: Promise<void> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot() {
  return snapshot;
}

function setSnapshot(next: StoreSnapshot) {
  snapshot = next;
  emit();
}

function deriveInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => (part[0] ?? '').toUpperCase())
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

function computeTotalWeeks(startDate: string | null | undefined, endDate: string | null | undefined): number {
  if (!startDate || !endDate) return 12;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 12;
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  return Math.max(1, Math.ceil(diffDays / 7));
}

function mapEnrollmentStatus(status: BackendEnrollmentRead['status'] | null): StudentStatus {
  if (status === 'completed') return 'Completed';
  if (status === 'withdrawn') return 'On break';
  return 'Active';
}

function pickRole(roles: string[], fallback: AppRole): AppRole {
  const priority = ['admin', 'mentor', 'student'] as const;
  for (const candidate of priority) {
    if (roles.includes(candidate)) {
      return candidate;
    }
  }
  return fallback;
}

function mapProfile(profile: BackendStudentProfileRead | null): CurrentStudentProfile {
  if (!profile) {
    return EMPTY_PROFILE;
  }

  return {
    education: profile.education ?? '',
    skills: profile.skills,
    careerGoals: profile.career_goals ?? '',
    domainId: profile.domain_id ?? '',
    githubUsername: profile.github_username,
    profileComplete: profile.profile_complete,
  };
}

function buildFallbackStudent(user: ClerkUserLike | null | undefined, role: AppRole): CurrentStudent {
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.fullName?.trim() ||
    email.split('@')[0] ||
    'Promethean Student';
  const presentation = PRESENTATION_OVERRIDES.get(email);

  return {
    id: user?.id ?? 'unknown',
    name: displayName,
    initials: deriveInitials(displayName),
    email,
    program: role === 'mentor' ? 'Mentor Workspace' : 'Onboarding',
    domain: 'General',
    batch: 'Upcoming',
    batchStartDate: 'TBD',
    mentorName: 'TBD',
    status: 'Active',
    joinedDate: formatDateLabel(new Date().toISOString()),
    location: presentation?.location ?? 'Remote',
    bio:
      presentation?.bio ??
      'Building real engineering experience through live job simulations at Promethean.',
    totalWeeks: 12,
  };
}

function shouldReturnNull(error: unknown, statuses: number[]) {
  return error instanceof ApiError && statuses.includes(error.status);
}

async function maybeGetStudentProfile(authToken: string): Promise<BackendStudentProfileRead | null> {
  try {
    return await api.get<BackendStudentProfileRead>('/api/v1/me/student-profile', { authToken });
  } catch (error) {
    if (shouldReturnNull(error, [404])) {
      return null;
    }
    throw error;
  }
}

async function maybeGetEnrollment(authToken: string): Promise<BackendEnrollmentRead | null> {
  try {
    return await api.get<BackendEnrollmentRead>('/api/v1/enrollments/me', { authToken });
  } catch (error) {
    if (shouldReturnNull(error, [403, 404])) {
      return null;
    }
    throw error;
  }
}

async function loadDashboardSnapshot(
  user: ClerkUserLike,
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>
): Promise<StoreSnapshot> {
  const fallbackRole = getAppRole(user);
  const email = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
  const fallbackStudent = buildFallbackStudent(user, fallbackRole);

  if (!email) {
    return {
      student: fallbackStudent,
      profile: EMPTY_PROFILE,
      role: fallbackRole,
      isLoaded: true,
      needsProfileSetup: false,
    };
  }

  const initialToken = (await getToken({ skipCache: true })) ?? (await getToken()) ?? undefined;

  /*
   * Sync strategy — two paths based on whether the user has been synced before:
   *
   * NEW USER  (no role in publicMetadata):
   *   Await sync so the backend DB record is created and the JWT gets the role
   *   claim before we make any other requests.
   *
   * RETURNING USER (role already in publicMetadata):
   *   The DB record exists and the token already carries the correct role.
   *   Fire sync in the background to keep the backend record fresh (avatar,
   *   email, name) while we proceed immediately with the existing token.
   *   This removes 2 sequential round-trips (POST /auth/sync + getToken) from
   *   the hot path — the main source of visible lag on hard refresh.
   */
  const isReturningUser = Boolean(user.publicMetadata?.role);
  let syncResponse: Awaited<ReturnType<typeof syncClerkUser>> = null;
  let authToken: string | undefined = initialToken;

  if (isReturningUser) {
    syncClerkUser(user, initialToken)
      .then((resp) => { syncResponse = resp; })
      .catch(() => {});
  } else {
    syncResponse = await syncClerkUser(user, initialToken);
    authToken = (await getToken({ skipCache: true })) ?? initialToken;
  }

  if (!authToken) {
    return {
      student: fallbackStudent,
      profile: EMPTY_PROFILE,
      role: pickRole(syncResponse?.roles ?? [], fallbackRole),
      isLoaded: true,
      needsProfileSetup: false,
    };
  }

  /*
   * Single parallel round-trip for everything that doesn't depend on something
   * else — this is the main technique for eliminating refresh lag.
   *
   *   /api/v1/me            — always needed; gives role + identity
   *   /api/v1/me/student-profile — returns null (404) for non-students; safe
   *   domains (public)      — no auth required
   *   /api/v1/enrollments/me — optimistic; returns null on 403 (profile
   *                            incomplete) or 404 (not enrolled); safe for all
   *   fetchMentorDirectory  — public; needed only if enrolled, but cheap
   *                           enough to always prefetch alongside the others
   *
   * Previous waterfall: [me+profile+domains] → [enrollment] → [batch] → [mentors]
   *                     = 4 sequential hops, ~600 ms
   * New waterfall:      [me+profile+domains+enrollment+mentors] → [batch]
   *                     = 2 sequential hops, ~300 ms
   */
  const [me, profile, domains, optimisticEnrollment, allMentors] = await Promise.all([
    api.get<BackendUserRead>('/api/v1/me', { authToken }),
    maybeGetStudentProfile(authToken),
    fetchDomains(),
    maybeGetEnrollment(authToken),
    fetchMentorDirectory(),
  ]);

  const role = pickRole(syncResponse?.roles?.length ? syncResponse.roles : me.roles, fallbackRole);

  if (role !== 'student') {
    return {
      student: {
        ...fallbackStudent,
        id: me.id,
        name:
          [me.first_name, me.last_name].filter(Boolean).join(' ').trim() ||
          fallbackStudent.name,
        initials: deriveInitials(
          [me.first_name, me.last_name].filter(Boolean).join(' ').trim() || fallbackStudent.name
        ),
        email: me.email,
        joinedDate: formatDateLabel(me.created_at),
      },
      profile: EMPTY_PROFILE,
      role,
      isLoaded: true,
      needsProfileSetup: false,
    };
  }
  const currentProfile = mapProfile(profile);
  const needsProfileSetup = !currentProfile.profileComplete;

  // Use the optimistically-fetched enrollment (null if profile incomplete or
  // not enrolled — both handled gracefully by maybeGetEnrollment).
  const enrollment = needsProfileSetup ? null : optimisticEnrollment;

  // Batch is the only remaining sequential fetch — we need enrollment.batch_id
  // first, and the batch detail is too large to blindly prefetch without it.
  const batch = enrollment
    ? await api.get<BackendBatchRead>(`/api/v1/batches/${enrollment.batch_id}`)
    : null;

  const mentor = batch ? findMentorByUserId(allMentors, batch.mentor_id) : null;

  const domainById = new Map(domains.map((domain) => [domain.id, domain.name]));
  const domainName =
    (profile?.domain_id ? domainById.get(profile.domain_id) : undefined) ??
    (batch ? domainById.get(batch.domain_id) : undefined) ??
    fallbackStudent.domain;

  const displayName =
    [me.first_name, me.last_name].filter(Boolean).join(' ').trim() || fallbackStudent.name;
  const presentation = PRESENTATION_OVERRIDES.get(me.email.toLowerCase());
  const program = batch?.project_track ?? `${domainName} Foundations`;

  return {
    student: {
      id: me.id,
      name: displayName,
      initials: deriveInitials(displayName),
      email: me.email,
      program: needsProfileSetup ? 'Complete your profile' : program,
      domain: domainName,
      batch: needsProfileSetup ? 'Profile setup' : batch?.name ?? 'Not enrolled yet',
      batchStartDate: batch ? formatDateLabel(batch.start_date) : 'TBD',
      mentorName: mentor?.name ?? fallbackStudent.mentorName,
      status: mapEnrollmentStatus(enrollment?.status ?? null),
      joinedDate: formatDateLabel(me.created_at),
      location: presentation?.location ?? fallbackStudent.location,
      bio:
        presentation?.bio ??
        profile?.career_goals ??
        fallbackStudent.bio,
      totalWeeks: computeTotalWeeks(batch?.start_date, batch?.end_date),
    },
    profile: currentProfile,
    role,
    isLoaded: true,
    needsProfileSetup,
  };
}

async function ensureDashboardData(
  user: ClerkUserLike,
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>
) {
  if (activeUserId === user.id && snapshot.isLoaded) {
    return;
  }

  if (activeUserId === user.id && inflightLoad) {
    return inflightLoad;
  }

  activeUserId = user.id;
  setSnapshot({
    student: LOADING_PLACEHOLDER,
    profile: EMPTY_PROFILE,
    role: getAppRole(user),
    isLoaded: false,
    needsProfileSetup: false,
  });

  inflightLoad = loadDashboardSnapshot(user, getToken)
    .then((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    })
    .catch(() => {
      setSnapshot({
        student: buildFallbackStudent(user, getAppRole(user)),
        profile: EMPTY_PROFILE,
        role: getAppRole(user),
        isLoaded: true,
        needsProfileSetup: false,
      });
    })
    .finally(() => {
      inflightLoad = null;
    });

  return inflightLoad;
}

function resetDashboardData() {
  activeUserId = null;
  inflightLoad = null;
  setSnapshot({
    student: LOADING_PLACEHOLDER,
    profile: EMPTY_PROFILE,
    role: 'student',
    isLoaded: false,
    needsProfileSetup: false,
  });
}

/**
 * Seeds the store from server-side prefetched data.
 *
 * Called from DashboardShell's useLayoutEffect so it runs synchronously
 * before the browser paints — the moment Clerk finishes hydrating, the
 * page renders with fully-populated data instead of triggering a new
 * round of API calls.
 *
 * Guards:
 *   - snapshot.isLoaded: already loaded from a previous navigation; skip.
 *   - activeUserId !== null: a load is in-flight or complete; skip.
 *
 * Uses clerkUserId as the cache key so ensureDashboardData correctly
 * recognises the store as "already loaded for this user" and short-circuits.
 */
export function seedStoreFromSSR(data: DashboardSSRData): void {
  if (snapshot.isLoaded || activeUserId !== null) return;
  activeUserId = data.clerkUserId;
  setSnapshot({
    student: data.student,
    profile: data.profile,
    role: data.role,
    isLoaded: true,
    needsProfileSetup: data.needsProfileSetup,
  });
}

export function useCurrentStudent(): UseCurrentStudentResult {
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const clerk = useClerk();
  const store = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!isUserLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      resetDashboardData();
      return;
    }

    void ensureDashboardData(
      {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        imageUrl: user.imageUrl,
        primaryEmailAddress: user.primaryEmailAddress
          ? { emailAddress: user.primaryEmailAddress.emailAddress }
          : null,
        publicMetadata: user.publicMetadata ?? undefined,
      },
      getToken
    );
  }, [
    getToken,
    isSignedIn,
    isUserLoaded,
    user,
    user?.fullName,
    user?.id,
    user?.imageUrl,
    user?.lastName,
    user?.firstName,
    user?.primaryEmailAddress?.emailAddress,
  ]);

  const refresh = async () => {
    if (!isSignedIn || !user) {
      resetDashboardData();
      return;
    }

    activeUserId = null;
    await ensureDashboardData(
      {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        imageUrl: user.imageUrl,
        primaryEmailAddress: user.primaryEmailAddress
          ? { emailAddress: user.primaryEmailAddress.emailAddress }
          : null,
        publicMetadata: user.publicMetadata ?? undefined,
      },
      getToken
    );
  };

  return {
    student: store.student,
    profile: store.profile,
    role: isAppRole(store.role) ? store.role : 'student',
    isLoaded: isUserLoaded && (!isSignedIn || store.isLoaded),
    isLoggedIn: Boolean(isSignedIn),
    needsProfileSetup: store.needsProfileSetup,
    refresh,
    signOut: () => clerk.signOut({ redirectUrl: '/' }),
  };
}
