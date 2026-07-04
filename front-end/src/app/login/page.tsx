import AuthModal from '@/components/AuthModal';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Promethean',
};

export default function LoginPage() {
  return (
    <AuthModal
      title="Welcome back."
      subtitle="Log in to your workspace."
      submitText="Log in to Workspace"
      footerText="Don't have an account?"
      footerLinkText="Join a batch"
      footerLinkHref="/signup"
    />
  );
}
