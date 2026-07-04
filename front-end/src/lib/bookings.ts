export interface Booking {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorInitials: string;
  domain: string;
  dateISO: string;
  dateLabel: string;
  time: string;
  durationMinutes: number;
  topic: string;
  createdAt: string;
}

const STORAGE_KEY = 'pm:mentor-bookings';
export const BOOKINGS_EVENT = 'pm:bookings';

function isBrowser() {
  return typeof window !== 'undefined';
}

// Cache the parsed snapshot and only produce a new array when the underlying
// storage actually changes. `useSyncExternalStore` (see useBookings.ts) calls
// this on every render to check for updates, and needs a stable reference
// when nothing changed to avoid re-rendering (or looping) forever.
let cachedRaw: string | null = null;
let cachedBookings: Booking[] = [];

export function loadBookings(): Booking[] {
  if (!isBrowser()) return cachedBookings;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedBookings;

  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cachedBookings = Array.isArray(parsed) ? parsed : [];
  } catch {
    cachedBookings = [];
  }
  return cachedBookings;
}

function persist(bookings: Booking[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  window.dispatchEvent(new CustomEvent(BOOKINGS_EVENT));
}

export function addBooking(booking: Booking) {
  const bookings = loadBookings();
  persist([...bookings, booking]);
}

export function removeBooking(id: string) {
  const bookings = loadBookings();
  persist(bookings.filter((b) => b.id !== id));
}

export function isSlotBooked(bookings: Booking[], mentorId: string, dateISO: string, time: string) {
  return bookings.some((b) => b.mentorId === mentorId && b.dateISO === dateISO && b.time === time);
}
