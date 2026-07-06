'use client';

import { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import Topbar from './Topbar';
import { dashboardNavItems } from './navItems';
import { ArrowLeftIcon, MenuIcon, CloseIcon } from './icons';
import { useCurrentStudent, seedStoreFromSSR, type DashboardSSRData } from './useCurrentStudent';
import { StudentContext } from './StudentContext';
import PageSkeleton from './PageSkeleton';
import styles from './DashboardShell.module.css';

export default function DashboardShell({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: DashboardSSRData | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  /*
   * SSR store seed — runs synchronously before the browser paints.
   * When the layout Server Component prefetched dashboard data, we seed the
   * module-level store here so that the instant Clerk finishes hydrating,
   * contentReady flips to true with no additional API calls.
   *
   * useLayoutEffect is intentional: it fires before paint, so the skeleton
   * is never visible on hard refresh when initialData is present.
   * The eslint-disable is safe — initialData is stable across renders
   * (it comes from the RSC payload and never changes).
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (initialData) {
      seedStoreFromSSR(initialData);
    }
  }, []);

  // Single call — result is shared via StudentContext.Provider so children
  // (Topbar, RightRail, page content) never call useUser/useAuth/useClerk independently.
  const studentData = useCurrentStudent();
  const { isLoaded, isLoggedIn, needsProfileSetup } = studentData;

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  useEffect(() => {
    if (isLoaded && !isLoggedIn) {
      router.replace('/sign-in');
      return;
    }

    const isAllowedProfileRoute =
      pathname === '/profile-setup' || pathname === '/dashboard/profile';

    if (isLoaded && isLoggedIn && needsProfileSetup && !isAllowedProfileRoute) {
      router.replace('/profile-setup');
      return;
    }

    if (isLoaded && isLoggedIn && !needsProfileSetup && pathname === '/profile-setup') {
      router.replace('/dashboard/profile');
    }
  }, [isLoaded, isLoggedIn, needsProfileSetup, pathname, router]);

  /*
   * Determine whether the main content area is ready to render.
   *
   * The sidebar is ALWAYS rendered immediately — nav items are static and
   * need no user data.  Only the content area (Topbar + page) shows a
   * skeleton while Clerk hydrates or while auth redirects are settling.
   * This eliminates the full-page blank flash that users see on hard refresh.
   */
  const isAllowedProfileRoute =
    pathname === '/profile-setup' || pathname === '/dashboard/profile';
  const contentReady =
    isLoaded &&
    isLoggedIn &&
    (!needsProfileSetup || isAllowedProfileRoute);

  return (
    <StudentContext.Provider value={studentData}>
      <div className={styles.shell}>
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        {/* Sidebar renders immediately — no user data needed for the nav */}
        <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
          <Link href="/" className={styles.logoGroup}>
            <span className={styles.logoMark} />
            <span className={styles.logoText}>Promethean</span>
          </Link>

          <nav className={styles.nav}>
            {dashboardNavItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={index < 3}
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
          {contentReady ? (
            <>
              <Topbar />
              <Suspense fallback={<PageSkeleton />}>
                {children}
              </Suspense>
            </>
          ) : (
            <PageSkeleton />
          )}
        </main>
      </div>
    </StudentContext.Provider>
  );
}
