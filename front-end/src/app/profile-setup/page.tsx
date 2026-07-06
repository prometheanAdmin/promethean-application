import type { Metadata } from 'next';
import DashboardShell from '@/components/dashboard/DashboardShell';
import ProfilePageContent from '@/components/dashboard/ProfilePageContent';

export const metadata: Metadata = {
  title: 'Profile Setup - Promethean',
};

export default function ProfileSetupPage() {
  return (
    <DashboardShell>
      <ProfilePageContent mode="setup" />
    </DashboardShell>
  );
}
