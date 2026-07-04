const STORAGE_KEY = 'pm:favorite-mentors';
export const FAVORITES_EVENT = 'pm:favorites';

function isBrowser() {
  return typeof window !== 'undefined';
}

let cachedRaw: string | null = null;
let cachedFavorites: string[] = [];

export function loadFavorites(): string[] {
  if (!isBrowser()) return cachedFavorites;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedFavorites;

  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cachedFavorites = Array.isArray(parsed) ? parsed : [];
  } catch {
    cachedFavorites = [];
  }
  return cachedFavorites;
}

function persist(favorites: string[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
}

export function toggleFavorite(mentorId: string) {
  const favorites = loadFavorites();
  const next = favorites.includes(mentorId)
    ? favorites.filter((id) => id !== mentorId)
    : [...favorites, mentorId];
  persist(next);
}
