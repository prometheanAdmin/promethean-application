'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import Topbar from './Topbar';
import { dashboardNavItems } from './navItems';
import { ArrowLeftIcon, MenuIcon, CloseIcon } from './icons';
import { useCurrentStudent } from './useCurrentStudent';
import styles from './DashboardShell.module.css';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoaded, isLoggedIn } = useCurrentStudent();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  /*
   * Render a minimal skeleton while Clerk hydrates the session. This prevents
   * dashboard content flashing with placeholder data before the real user
   * loads and acts as a client-side fallback while auth redirects settle.
   */
  if (!isLoaded) {
    return (
      <div className={styles.shell}>
        <div className={styles.loadingState} aria-label="Loading dashboard…" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className={styles.shell}>
      <button
        type="button"
        className={styles.mobileToggle}
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
      >
        {mobileOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <Link href="/" className={styles.logoGroup}>
          <span className={styles.logoMark} />
          <span className={styles.logoText}>Promethean</span>
        </Link>

        <nav className={styles.nav}>
          {dashboardNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className={styles.navIcon}>
                  <Icon />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeftIcon />
            Back to site
          </Link>
          <ThemeToggle />
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className={styles.content}>
        <Topbar />
        {children}
      </main>
    </div>
  );
}
