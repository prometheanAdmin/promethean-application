const STORAGE_KEY = 'pm:session';
export const SESSION_EVENT = 'pm:session-event';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function loadSessionStudentId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function login(studentId: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, studentId);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function logout() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}
