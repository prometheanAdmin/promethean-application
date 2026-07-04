import type { Metadata } from 'next';
import PageHeader from '@/components/dashboard/PageHeader';
import WeeklyProgressChart from '@/components/dashboard/updates/WeeklyProgressChart';

export const metadata: Metadata = {
  title: 'Weekly Updates - Promethean',
};

export default function UpdatesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Progress"
        title="Weekly Updates"
        subtitle="Your course roadmap, week by week. Hover or tap a week to see its tasks."
      />
      <WeeklyProgressChart />
    </>
  );
}
