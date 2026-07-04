import type { Metadata } from 'next';
import PageHeader from '@/components/dashboard/PageHeader';
import CommunityChat from '@/components/dashboard/community/CommunityChat';
import { chatRooms } from '@/lib/community';

export const metadata: Metadata = {
  title: 'Community Chats - Promethean',
};

export default function CommunityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Community Chats"
        subtitle="Chat with your batch, your mentor, and the wider Promethean community."
      />
      <CommunityChat rooms={chatRooms} />
    </>
  );
}
