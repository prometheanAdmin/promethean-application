'use client';

import { useCurrentStudent } from './useCurrentStudent';
import { MailIcon, BookIcon, UserIcon, CalendarIcon, MapPinIcon } from './icons';
import styles from './ProfilePageContent.module.css';

export default function ProfilePageContent() {
  const { student } = useCurrentStudent();

  return (
    <>
      <div className={styles.header}>
        <p className={styles.eyebrow}>My Profile</p>
        <h1 className={styles.title}>Your student profile.</h1>
      </div>

      <div className={styles.heroCard}>
        <span className={styles.avatar}>{student.initials}</span>
        <div className={styles.heroInfo}>
          <h2 className={styles.name}>{student.name}</h2>
          <p className={styles.role}>
            {student.domain} &middot; {student.program}
          </p>
        </div>
        <span className={styles.statusPill}>
          <span className={styles.statusDot} />
          {student.status}
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Student details</h3>
          <div className={styles.fieldList}>
            <div className={styles.field}>
              <span className={styles.fieldIcon}><MailIcon /></span>
              <div>
                <p className={styles.fieldLabel}>Email</p>
                <p className={styles.fieldValue}>{student.email}</p>
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldIcon}><BookIcon /></span>
              <div>
                <p className={styles.fieldLabel}>Program / Course</p>
                <p className={styles.fieldValue}>{student.domain} &mdash; {student.program}</p>
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldIcon}><UserIcon /></span>
              <div>
                <p className={styles.fieldLabel}>Mentor</p>
                <p className={styles.fieldValue}>{student.mentorName}</p>
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldIcon}><MapPinIcon /></span>
              <div>
                <p className={styles.fieldLabel}>Location</p>
                <p className={styles.fieldValue}>{student.location}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Batch details</h3>
          <div className={styles.fieldList}>
            <div className={styles.field}>
              <span className={styles.fieldIcon}><CalendarIcon /></span>
              <div>
                <p className={styles.fieldLabel}>Batch</p>
                <p className={styles.fieldValue}>{student.batch} &middot; starts {student.batchStartDate}</p>
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldIcon}><CalendarIcon /></span>
              <div>
                <p className={styles.fieldLabel}>Joined Promethean</p>
                <p className={styles.fieldValue}>{student.joinedDate}</p>
              </div>
            </div>
          </div>

          <h3 className={styles.cardTitle} style={{ marginTop: 24 }}>About</h3>
          <p className={styles.bio}>{student.bio}</p>
        </div>
      </div>

      <p className={styles.note}>
        You&apos;re signed in as this demo student. Log out from the profile menu (top right) to switch accounts.
      </p>
    </>
  );
}
