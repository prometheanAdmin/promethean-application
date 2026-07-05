import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

/*
 * OAuth callback handler. Google and GitHub redirect here after the user
 * approves access. Clerk completes the session exchange and then redirects
 * to the dashboard.
 *
 * This page renders nothing visible — it exists solely to run
 * AuthenticateWithRedirectCallback which finalises the OAuth handshake.
 *
 * Explicit force-redirect props guard against misconfiguration: even if the
 * ClerkProvider env vars are missing, the user lands on the dashboard.
 * We use signInForceRedirectUrl / signUpForceRedirectUrl (the v7 naming)
 * rather than the deprecated afterSignInUrl / afterSignUpUrl.
 */
export default function SsoCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
    />
  );
}
