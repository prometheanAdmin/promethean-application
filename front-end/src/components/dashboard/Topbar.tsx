'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStudentContext } from './StudentContext';
import { useReminders } from './useReminders';
import { reminderTypeIcon } from './ReminderCard';
import { BellIcon, UserIcon, LogOutIcon } from './icons';
import styles from './Topbar.module.css';

export default function Topbar() {
  const router = useRouter();
  const { student, signOut } = useStudentContext();
  const reminders = useReminders();
  const [openMenu, setOpenMenu] = useState<'notifications' | 'profile' | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [openMenu]);

  const toggleMenu = (menu: 'notifications' | 'profile') => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  const handleLogout = async () => {
    setOpenMenu(null);
    await signOut();
    router.push('/');
  };

  const preview = reminders.slice(0, 5);

  return (
    <div className={styles.bar} ref={wrapRef}>
      <div className={styles.menuWrap}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => toggleMenu('notifications')}
          aria-label={`Notifications${reminders.length > 0 ? ` (${reminders.length} unread)` : ''}`}
        >
          <BellIcon />
          {reminders.length > 0 && (
            <span className={styles.badge}>{reminders.length > 9 ? '9+' : reminders.length}</span>
          )}
        </button>

        {openMenu === 'notifications' && (
          <div className={`${styles.dropdown} ${styles.notifDropdown}`}>
            <div className={styles.notifHeader}>Notifications</div>
            {preview.length > 0 ? (
              <div className={styles.notifList}>
                {preview.map((r) => {
                  const Icon = reminderTypeIcon[r.type];
                  return (
                    <Link key={r.id} href={r.actionHref} className={styles.notifRow} onClick={() => setOpenMenu(null)}>
                      <span className={styles.notifIcon}><Icon /></span>
                      <span className={styles.notifBody}>
                        <p className={styles.notifTitle}>{r.title}</p>
                        <p className={styles.notifMeta}>{r.date} &middot; {r.time}</p>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className={styles.notifEmpty}>You&apos;re all caught up.</p>
            )}
            <Link href="/dashboard/reminders" className={styles.notifFooter} onClick={() => setOpenMenu(null)}>
              View all reminders
            </Link>
          </div>
        )}
      </div>

      <div className={styles.menuWrap}>
        <button type="button" className={styles.profileBtn} onClick={() => toggleMenu('profile')}>
          <span className={styles.profileAvatar}>{student.initials}</span>
          <span className={styles.profileName}>{student.name.split(' ')[0]}</span>
        </button>

        {openMenu === 'profile' && (
          <div className={`${styles.dropdown} ${styles.profileDropdown}`}>
            <div className={styles.profileDropdownHeader}>
              <p className={styles.profileDropdownName}>{student.name}</p>
              <p className={styles.profileDropdownEmail}>{student.email}</p>
            </div>
            <Link href="/dashboard/profile" className={styles.menuItem} onClick={() => setOpenMenu(null)}>
              <UserIcon />
              View Profile
            </Link>
            <button type="button" className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => void handleLogout()}>
              <LogOutIcon />
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
