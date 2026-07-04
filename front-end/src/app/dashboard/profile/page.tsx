import type { Metadata } from 'next';
import ProfilePageContent from '@/components/dashboard/ProfilePageContent';

export const metadata: Metadata = {
  title: 'My Profile - Promethean',
};

export default function ProfilePage() {
  return <ProfilePageContent />;
}
