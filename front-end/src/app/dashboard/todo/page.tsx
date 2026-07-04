import type { Metadata } from 'next';
import PageHeader from '@/components/dashboard/PageHeader';
import WhatToDoEmbed from '@/components/dashboard/WhatToDoEmbed';

export const metadata: Metadata = {
  title: 'What-To-Do Tracker - Promethean',
};

export default function TodoPage() {
  return (
    <>
      <PageHeader
        eyebrow="Productivity"
        title="What-To-Do Tracker"
        subtitle="Your personal task tracker, integrated right into the dashboard — separate from the batch Jira board."
      />
      <WhatToDoEmbed />
    </>
  );
}
