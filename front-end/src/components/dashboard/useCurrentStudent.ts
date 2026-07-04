'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { students } from '@/lib/students';
import { loadSessionStudentId, login, logout, SESSION_EVENT } from '@/lib/session';

function subscribe(callback: () => void) {
  window.addEventListener(SESSION_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(SESSION_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

/**
 * Resolves the logged-in student from a localStorage-backed session (there's
 * no backend yet — see src/lib/session.ts). Falls back to the first demo
 * student so pages never break if this is called before a login happens.
 */
export function useCurrentStudent() {
  const studentId = useSyncExternalStore(subscribe, loadSessionStudentId, () => null);
  const student = students.find((s) => s.id === studentId) ?? students[0];

  const signIn = useCallback((id: string) => login(id), []);
  const signOut = useCallback(() => logout(), []);

  return { student, isLoggedIn: studentId !== null, signIn, signOut };
}
