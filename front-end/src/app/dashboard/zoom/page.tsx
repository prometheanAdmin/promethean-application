import type { Metadata } from 'next';
import PageHeader from '@/components/dashboard/PageHeader';
import ZoomClassCard from '@/components/dashboard/ZoomClassCard';
import { VideoIcon } from '@/components/dashboard/icons';
import { zoomClasses } from '@/lib/zoom';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Zoom Classes - Promethean',
};

export default function ZoomPage() {
  return (
    <>
      <PageHeader
        eyebrow="Live sessions"
        title="Zoom Classes"
        subtitle="Join live batch sessions and standups, or catch a class you missed."
      />

      {zoomClasses.length > 0 ? (
        <div className={styles.grid}>
          {zoomClasses.map((zc) => (
            <ZoomClassCard key={zc.id} zoomClass={zc} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <VideoIcon />
          <p>No upcoming classes right now — check back soon.</p>
        </div>
      )}
    </>
  );
}
