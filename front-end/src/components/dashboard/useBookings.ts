'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { loadBookings, addBooking, removeBooking, BOOKINGS_EVENT, type Booking } from '@/lib/bookings';

const EMPTY: Booking[] = [];

function subscribe(callback: () => void) {
  window.addEventListener(BOOKINGS_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(BOOKINGS_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

/**
 * Bookings live in localStorage (no backend yet) but are exposed through this
 * hook so every mounted instance — the mentors page, the reminders page,
 * future pages — stays in sync. `addBooking`/`removeBooking` dispatch
 * `BOOKINGS_EVENT`, which every hook instance listens for via
 * `useSyncExternalStore` (the React-correct way to read an external mutable
 * store without tripping "setState in effect" or hydration mismatches).
 */
export function useBookings() {
  const bookings = useSyncExternalStore(subscribe, loadBookings, () => EMPTY);

  const book = useCallback((booking: Booking) => {
    addBooking(booking);
  }, []);

  const cancel = useCallback((id: string) => {
    removeBooking(id);
  }, []);

  return { bookings, book, cancel };
}
