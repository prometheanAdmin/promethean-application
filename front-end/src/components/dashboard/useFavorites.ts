'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { loadFavorites, toggleFavorite, FAVORITES_EVENT } from '@/lib/favorites';

const EMPTY: string[] = [];

function subscribe(callback: () => void) {
  window.addEventListener(FAVORITES_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(FAVORITES_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, loadFavorites, () => EMPTY);

  const toggle = useCallback((mentorId: string) => {
    toggleFavorite(mentorId);
  }, []);

  return { favorites, toggle, isFavorite: (id: string) => favorites.includes(id) };
}
