import styles from './PageSkeleton.module.css';

/*
 * PageSkeleton — shown by the Suspense boundary in DashboardShell while a
 * dashboard page's server data is streaming in.
 *
 * Intentionally lightweight: a pulsing block that fills the main content area
 * without importing any client-side hooks.
 */
export default function PageSkeleton() {
  return (
    <div className={styles.skeleton} aria-label="Loading page…" aria-busy="true">
      <div className={styles.header} />
      <div className={styles.row} />
      <div className={styles.row} style={{ width: '72%' }} />
      <div className={styles.grid}>
        <div className={styles.card} />
        <div className={styles.card} />
        <div className={styles.card} />
      </div>
    </div>
  );
}
