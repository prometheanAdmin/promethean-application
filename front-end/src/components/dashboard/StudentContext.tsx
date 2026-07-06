'use client';

import { createContext, useContext } from 'react';
import type { UseCurrentStudentResult } from './useCurrentStudent';

/*
 * StudentContext — single source of truth for the current student across the
 * entire dashboard subtree.
 *
 * DashboardShell calls useCurrentStudent() once and provides the result here.
 * Every child component reads from this context via useStudentContext() instead
 * of calling useCurrentStudent() (and therefore useUser/useAuth/useClerk)
 * independently — that would create redundant Clerk subscriptions and
 * re-render every consumer on every Clerk tick.
 */
const StudentContext = createContext<UseCurrentStudentResult | null>(null);

export { StudentContext };

export function useStudentContext(): UseCurrentStudentResult {
  const ctx = useContext(StudentContext);
  if (!ctx) {
    throw new Error(
      'useStudentContext() must be called inside a component rendered inside DashboardShell. ' +
        'Make sure the component is inside the /dashboard route tree.'
    );
  }
  return ctx;
}
