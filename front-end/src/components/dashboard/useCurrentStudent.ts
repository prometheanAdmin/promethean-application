'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { getAppRole } from '@/lib/auth';
import { students } from '@/lib/students';
import type { AppRole } from '@/lib/auth';

/*
 * The shape every dashboard component depends on. Derived from the real Clerk
 * user when loaded, falls back to a safe placeholder during the hydration frame
 * so no component ever receives null or undefined user data.
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
  status: 'Active' | 'On break' | 'Completed';
  joinedDate: string;
  location: string;
  bio: string;
  totalWeeks: number;
}

export interface UseCurrentStudentResult {
  student: CurrentStudent;
  role: AppRole;
  isLoaded: boolean;
  isLoggedIn: boolean;
  signOut: () => Promise<void>;
}

function deriveInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => (part[0] ?? '').toUpperCase())
    .join('');
}

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

/*
 * Resolves the signed-in Clerk user into a CurrentStudent view model.
 *
 * Data precedence:
 *   1. Clerk user data (name, email, initials) — always authoritative.
 *   2. Mock student match by email — provides batch/program/mentor data until
 *      the real backend ships a profile endpoint.
 *   3. Safe defaults — for users whose email does not match any mock.
 */
export function useCurrentStudent(): UseCurrentStudentResult {
  const { user, isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();

  if (!isLoaded) {
    return {
      student: LOADING_PLACEHOLDER,
      role: 'student',
      isLoaded: false,
      isLoggedIn: false,
      signOut: () => clerk.signOut({ redirectUrl: '/' }),
    };
  }

  const role = getAppRole(user);
  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? '';
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.fullName?.trim() ||
    primaryEmail.split('@')[0] ||
    'Promethean Student';

  const matchedMock = students.find(
    (student) => student.email.toLowerCase() === primaryEmail.toLowerCase()
  );

  const student: CurrentStudent = matchedMock
    ? {
        ...matchedMock,
        id: user?.id ?? matchedMock.id,
        name: displayName,
        initials: deriveInitials(displayName),
        email: primaryEmail,
      }
    : {
        id: user?.id ?? 'unknown',
        name: displayName,
        initials: deriveInitials(displayName),
        email: primaryEmail,
        program: 'Onboarding',
        domain: 'General',
        batch: 'Upcoming',
        batchStartDate: 'TBD',
        mentorName: 'TBD',
        status: 'Active',
        joinedDate: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        location: 'Remote',
        bio: 'Building real engineering experience through live job simulations.',
        totalWeeks: 8,
      };

  return {
    student,
    role,
    isLoaded: true,
    isLoggedIn: Boolean(isSignedIn),
    signOut: () => clerk.signOut({ redirectUrl: '/' }),
  };
}
