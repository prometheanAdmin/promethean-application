'use client';

import { useMemo, useState } from 'react';
import { type Mentor } from '@/lib/mentors';
import { useStudentContext } from '@/components/dashboard/StudentContext';
import { useMentorDirectory } from '@/components/dashboard/useMentorDirectory';
import { useBookings } from '@/components/dashboard/useBookings';
import { useFavorites } from '@/components/dashboard/useFavorites';
import { SearchIcon, UserIcon, HeartIcon, StarIcon } from '@/components/dashboard/icons';
import MentorDirectoryCard from './MentorDirectoryCard';
import BookingModal from './BookingModal';
import MentorProfileModal from './MentorProfileModal';
import MessageMentorModal from './MessageMentorModal';
import UpcomingSessionsList from './UpcomingSessionsList';
import styles from './MentorBooking.module.css';

const ratingFilters = [
  { label: 'Any rating', value: 0 },
  { label: '4.5+', value: 4.5 },
  { label: '4.8+', value: 4.8 },
];
const sortOptions = [
  { label: 'Recommended', value: 'recommended' },
  { label: 'Top rated', value: 'rating' },
  { label: 'Most sessions', value: 'sessions' },
  { label: 'Name A–Z', value: 'name' },
] as const;
type SortValue = (typeof sortOptions)[number]['value'];

export default function MentorBooking() {
  const { student } = useStudentContext();
  const { mentors } = useMentorDirectory();
  const { bookings, book, cancel } = useBookings();
  const { favorites, isFavorite, toggle: toggleFavorite } = useFavorites();

  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortValue>('recommended');

  const [bookingMentor, setBookingMentor] = useState<Mentor | null>(null);
  const [profileMentor, setProfileMentor] = useState<Mentor | null>(null);
  const [messagingMentor, setMessagingMentor] = useState<Mentor | null>(null);

  const domains = useMemo(
    () => ['All', ...Array.from(new Set(mentors.map((mentor) => mentor.domain)))],
    [mentors]
  );

  const filteredMentors = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = mentors.filter((m) => {
      const matchesDomain = domainFilter === 'All' || m.domain === domainFilter;
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.expertise.some((e) => e.toLowerCase().includes(q)) ||
        m.domain.toLowerCase().includes(q);
      const matchesRating = m.rating >= minRating;
      const matchesFavorite = !favoritesOnly || favorites.includes(m.id);
      return matchesDomain && matchesQuery && matchesRating && matchesFavorite;
    });

    const sorted = [...list];
    switch (sortBy) {
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'sessions':
        sorted.sort((a, b) => b.sessionsCompleted - a.sessionsCompleted);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recommended':
      default:
        sorted.sort((a, b) => {
          const aMatch = a.domain === student.domain ? 1 : 0;
          const bMatch = b.domain === student.domain ? 1 : 0;
          if (aMatch !== bMatch) return bMatch - aMatch;
          return b.rating - a.rating;
        });
    }

    return sorted;
  }, [query, domainFilter, minRating, favoritesOnly, favorites, mentors, sortBy, student.domain]);

  return (
    <>
      <UpcomingSessionsList bookings={bookings} onCancel={cancel} />

      <div className={styles.controls}>
        <div className={styles.controlsTop}>
          <div className={styles.searchBox}>
            <SearchIcon />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search mentors or skills…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search mentors"
            />
          </div>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortValue)}
            aria-label="Sort mentors"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>Sort: {opt.label}</option>
            ))}
          </select>
          <span className={styles.resultCount}>
            {filteredMentors.length} mentor{filteredMentors.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className={styles.filterRow}>
          {domains.map((d) => (
            <button
              key={d}
              type="button"
              className={`${styles.filterChip} ${domainFilter === d ? styles.filterChipActive : ''}`}
              onClick={() => setDomainFilter(d)}
            >
              {d}
            </button>
          ))}

          <span className={styles.filterDivider} />

          {ratingFilters.map((rf) => (
            <button
              key={rf.value}
              type="button"
              className={`${styles.filterChip} ${minRating === rf.value ? styles.filterChipActive : ''}`}
              onClick={() => setMinRating(rf.value)}
            >
              <StarIcon />
              {rf.label}
            </button>
          ))}

          <span className={styles.filterDivider} />

          <button
            type="button"
            className={`${styles.filterChip} ${favoritesOnly ? `${styles.filterChipActive} ${styles.favoriteChipActive}` : ''}`}
            onClick={() => setFavoritesOnly((v) => !v)}
            aria-pressed={favoritesOnly}
          >
            <HeartIcon filled={favoritesOnly} />
            Favorites
          </button>
        </div>
      </div>

      {filteredMentors.length > 0 ? (
        <div className={styles.grid}>
          {filteredMentors.map((mentor) => (
            <MentorDirectoryCard
              key={mentor.id}
              mentor={mentor}
              student={student}
              onBook={setBookingMentor}
              onMessage={setMessagingMentor}
              onViewProfile={setProfileMentor}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <UserIcon />
          <p>No mentors match your filters.</p>
        </div>
      )}

      {bookingMentor && (
        <BookingModal
          mentor={bookingMentor}
          existingBookings={bookings}
          onClose={() => setBookingMentor(null)}
          onBooked={book}
        />
      )}

      {profileMentor && (
        <MentorProfileModal
          mentor={profileMentor}
          isEnrolled={profileMentor.domain === student.domain}
          isFavorite={isFavorite(profileMentor.id)}
          isTopRated={profileMentor.rating >= 4.8}
          isYourMentor={student.mentorName === profileMentor.name}
          onToggleFavorite={() => toggleFavorite(profileMentor.id)}
          onClose={() => setProfileMentor(null)}
          onBook={() => {
            setBookingMentor(profileMentor);
            setProfileMentor(null);
          }}
          onMessage={() => {
            if (profileMentor.domain !== student.domain) return;
            setMessagingMentor(profileMentor);
            setProfileMentor(null);
          }}
        />
      )}

      {messagingMentor && (
        <MessageMentorModal mentor={messagingMentor} onClose={() => setMessagingMentor(null)} />
      )}
    </>
  );
}
