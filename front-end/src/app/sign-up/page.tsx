import AuthModal from '@/components/AuthModal';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up — Promethean',
};

/*
 * Sign-up page. Uses the custom AuthModal component with Clerk hooks under
 * the hood. The URL /sign-up matches NEXT_PUBLIC_CLERK_SIGN_UP_URL.
 */
export default function SignUpPage() {
  return (
    <AuthModal
      title="Join the hive."
      subtitle="Claim your seat in the next engineering batch."
      submitText="Create account"
      isSignup={true}
      footerText="Already have an account?"
      footerLinkText="Log in"
      footerLinkHref="/sign-in"
    />
  );
}
