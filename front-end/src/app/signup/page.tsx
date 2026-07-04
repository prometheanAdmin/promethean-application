import AuthModal from '@/components/AuthModal';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - Promethean',
};

export default function SignupPage() {
  return (
    <AuthModal
      title="Join the hive."
      subtitle="Claim your seat in the next engineering batch."
      submitText="Create account"
      isSignup={true}
      footerText="Already have an account?"
      footerLinkText="Log in"
      footerLinkHref="/login"
    />
  );
}
