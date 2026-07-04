import type { Metadata } from 'next';
import PageHeader from '@/components/dashboard/PageHeader';
import JiraBoard from '@/components/dashboard/jira/JiraBoard';
import { jiraTasks } from '@/lib/jira';

export const metadata: Metadata = {
  title: 'Jira Board - Promethean',
};

export default function JiraPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sprint board"
        title="Jira Board"
        subtitle="Your tickets — to do, in progress, in review, and shipped."
      />
      <JiraBoard tasks={jiraTasks} />
    </>
  );
}
