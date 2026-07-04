'use client';

import { useEffect } from 'react';
import type { Mentor } from '@/lib/mentors';
import { getReviewsForMentor, getRatingBreakdown } from '@/lib/reviews';
import { CloseIcon, StarIcon, HeartIcon, CalendarCheckIcon, ChatIcon, LockIcon } from '@/components/dashboard/icons';
import styles from './MentorProfileModal.module.css';

interface MentorProfileModalProps {
  mentor: Mentor;
  isEnrolled: boolean;
  isFavorite: boolean;
  isTopRated: boolean;
  isYourMentor: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  onBook: () => void;
  onMessage: () => void;
}

export default function MentorProfileModal({
  mentor,
  isEnrolled,
  isFavorite,
  isTopRated,
  isYourMentor,
  onToggleFavorite,
  onClose,
  onBook,
  onMessage,
}: MentorProfileModalProps) {
  const reviews = getReviewsForMentor(mentor.id);
  const breakdown = getRatingBreakdown(mentor.id);
  const firstName = mentor.name.split(' ')[0];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${mentor.name}'s profile`}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>

        <div className={styles.header}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mentor.imageSrc} alt={mentor.name} className={styles.avatar} />
          <div className={styles.headerText}>
            <h2 className={styles.name}>{mentor.name}</h2>
            <p className={styles.role}>{mentor.role} &middot; {mentor.company}</p>
            <div className={styles.badgeRow}>
              <span className={styles.domainBadge}>{mentor.domain}</span>
              {isTopRated && (
                <span className={styles.trustBadge}>
                  <StarIcon /> Top rated
                </span>
              )}
              {isYourMentor && <span className={styles.yourMentorBadge}>Your mentor</span>}
            </div>
          </div>
          <button
            type="button"
            className={`${styles.favoriteBtn} ${isFavorite ? styles.favoriteBtnActive : ''}`}
            onClick={onToggleFavorite}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={isFavorite}
          >
            <HeartIcon filled={isFavorite} />
          </button>
        </div>

        <div className={styles.ratingSummary}>
          <div className={styles.ratingBigWrap}>
            <div className={styles.ratingBig}>{mentor.rating.toFixed(1)}</div>
            <div className={styles.starsRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} />
              ))}
            </div>
            <p className={styles.ratingCount}>{breakdown.total} reviews</p>
          </div>
          <div className={styles.breakdown}>
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = breakdown.counts[star];
              const pct = breakdown.total > 0 ? (count / breakdown.total) * 100 : 0;
              return (
                <div key={star} className={styles.breakdownRow}>
                  <span>{star}</span>
                  <span className={styles.breakdownTrack}>
                    <span className={styles.breakdownFill} style={{ width: `${pct}%` }} />
                  </span>
                  <span>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className={styles.bio}>{mentor.bio}</p>

        <div className={styles.tags}>
          {mentor.expertise.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.bookBtn} onClick={onBook}>
            <CalendarCheckIcon />
            Book a session
          </button>
          <button
            type="button"
            className={styles.messageBtn}
            onClick={onMessage}
            disabled={!isEnrolled}
            title={isEnrolled ? undefined : `Enroll in the ${mentor.domain} batch to message ${firstName}`}
          >
            {isEnrolled ? <ChatIcon /> : <LockIcon />}
            Message
          </button>
        </div>
        {!isEnrolled && (
          <p className={styles.lockedNote}>
            Enroll in the {mentor.domain} batch to unlock direct messaging with {firstName}.
          </p>
        )}

        <h3 className={styles.sectionTitle}>Reviews</h3>
        {reviews.length > 0 ? (
          <div className={styles.reviewList}>
            {reviews.map((review) => (
              <div key={review.id} className={styles.review}>
                <div className={styles.reviewTop}>
                  <span className={styles.reviewAvatar}>{review.studentInitials}</span>
                  <div className={styles.reviewMeta}>
                    <p className={styles.reviewName}>{review.studentName}</p>
                    <span className={styles.reviewDate}>{review.date}</span>
                  </div>
                  <div className={styles.reviewStars}>
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <StarIcon key={i} />
                    ))}
                  </div>
                </div>
                <p className={styles.reviewComment}>{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyReviews}>No reviews yet.</p>
        )}
      </div>
    </div>
  );
}
