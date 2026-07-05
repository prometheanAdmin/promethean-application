import AuthModal from '@/components/AuthModal';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — Promethean',
};

/*
 * Sign-in page. Uses the custom AuthModal component with Clerk hooks under
 * the hood. The URL /sign-in matches NEXT_PUBLIC_CLERK_SIGN_IN_URL so the
 * auth proxy redirects unauthenticated users here automatically.
 */
export default function SignInPage() {
  return (
    <AuthModal
      title="Welcome back."
      subtitle="Log in to your workspace."
      submitText="Log in to Workspace"
      footerText="Don't have an account?"
      footerLinkText="Join a batch"
      footerLinkHref="/sign-up"
    />
  );
}
