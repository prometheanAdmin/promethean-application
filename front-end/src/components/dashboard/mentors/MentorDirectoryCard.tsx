import type { Mentor } from '@/lib/mentors';
import { isEnrolledWithMentor } from '@/lib/mentors';
import { useFavorites } from '@/components/dashboard/useFavorites';
import type { CurrentStudent } from '@/components/dashboard/useCurrentStudent';
import { StarIcon, CalendarCheckIcon, ChatIcon, LockIcon, HeartIcon } from '@/components/dashboard/icons';
import styles from './MentorDirectoryCard.module.css';

const TOP_RATED_THRESHOLD = 4.8;

interface MentorDirectoryCardProps {
  mentor: Mentor;
  student: CurrentStudent;
  onBook: (mentor: Mentor) => void;
  onMessage: (mentor: Mentor) => void;
  onViewProfile: (mentor: Mentor) => void;
}

export default function MentorDirectoryCard({ mentor, student, onBook, onMessage, onViewProfile }: MentorDirectoryCardProps) {
  const { isFavorite, toggle } = useFavorites();
  const favorite = isFavorite(mentor.id);
  const enrolled = isEnrolledWithMentor(student.domain, mentor);
  const isYourMentor = student.mentorName === mentor.name;
  const isTopRated = mentor.rating >= TOP_RATED_THRESHOLD;

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <button type="button" className={styles.avatarBtn} onClick={() => onViewProfile(mentor)} aria-label={`View ${mentor.name}'s profile`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mentor.imageSrc} alt={mentor.name} className={styles.avatar} />
        </button>
        <div className={styles.identity}>
          <button type="button" className={styles.nameBtn} onClick={() => onViewProfile(mentor)}>
            <h3 className={styles.name}>{mentor.name}</h3>
          </button>
          <p className={styles.role}>{mentor.role} &middot; {mentor.company}</p>
        </div>
        <button
          type="button"
          className={`${styles.favoriteBtn} ${favorite ? styles.favoriteBtnActive : ''}`}
          onClick={() => toggle(mentor.id)}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorite}
        >
          <HeartIcon filled={favorite} />
        </button>
      </div>

      <div className={styles.badgeRow}>
        <span className={styles.domainBadge}>{mentor.domain}</span>
        {isTopRated && (
          <span className={styles.trustBadge}>
            <StarIcon /> Top rated
          </span>
        )}
        {isYourMentor && <span className={styles.yourMentorBadge}>Your mentor</span>}
        <span className={styles.rating}>
          <StarIcon />
          {mentor.rating.toFixed(1)}
        </span>
        <span className={styles.sessions}>{mentor.sessionsCompleted} sessions</span>
      </div>

      <p className={styles.bio}>{mentor.bio}</p>

      <div className={styles.tags}>
        {mentor.expertise.map((tag) => (
          <span key={tag} className={styles.tag}>{tag}</span>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.bookBtn} onClick={() => onBook(mentor)}>
          <CalendarCheckIcon />
          Book session
        </button>
        <button
          type="button"
          className={styles.messageBtn}
          onClick={() => onMessage(mentor)}
          disabled={!enrolled}
          aria-label={enrolled ? `Message ${mentor.name}` : `Enroll in the ${mentor.domain} batch to message ${mentor.name}`}
          title={enrolled ? `Message ${mentor.name}` : `Enroll in the ${mentor.domain} batch to message ${mentor.name}`}
        >
          {enrolled ? <ChatIcon /> : <LockIcon />}
        </button>
      </div>

      <button type="button" className={styles.viewProfileLink} onClick={() => onViewProfile(mentor)}>
        View profile &amp; reviews
      </button>
    </div>
  );
}
