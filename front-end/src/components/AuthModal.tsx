'use client';

import { useSignIn, useSignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FloatingDomains from '@/components/FloatingDomains';
import ThemeToggle from '@/components/ThemeToggle';
import { DEFAULT_APP_ROLE } from '@/lib/auth';
import styles from './AuthModal.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthModalProps {
  title: string;
  subtitle: string;
  submitText: string;
  isSignup?: boolean;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
}

type OAuthStrategy = 'oauth_google' | 'oauth_github';

/*
 * Clerk error objects differ across error types and SDK versions.
 * This type covers the shapes actually observed: single error, error array,
 * and plain Error instances.
 *
 * Note: @clerk/nextjs v7 uses @clerk/react v6's Signal-based "Future" API.
 * useSignIn() / useSignUp() return SignInSignalValue / SignUpSignalValue,
 * which contain fetchStatus (not isLoaded) and SignInFutureResource /
 * SignUpFutureResource (not SignInResource / SignUpResource).
 * All methods on FutureResource return { error: ClerkError | null } rather
 * than throwing — call site checks result.error before proceeding.
 */
type ClerkErrorLike = {
  code?: string;
  message?: string;
  longMessage?: string;
  errors?: Array<{
    message?: string;
    longMessage?: string;
  }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return DEFAULT_ERROR_MESSAGE;
  }

  const authError = error as ClerkErrorLike;

  if (Array.isArray(authError.errors) && authError.errors.length > 0) {
    return authError.errors
      .map((issue) => issue.longMessage ?? issue.message)
      .filter(Boolean)
      .join(' ');
  }

  return authError.longMessage ?? authError.message ?? DEFAULT_ERROR_MESSAGE;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuthModal({
  title,
  subtitle,
  submitText,
  isSignup = false,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthModalProps) {
  const router = useRouter();

  /*
   * @clerk/react v6 (used by @clerk/nextjs v7) returns the Signal-based
   * Future API. The hook shape is:
   *   { signIn: SignInFutureResource, errors: SignInErrors, fetchStatus: 'idle' | 'fetching' }
   *
   * fetchStatus === 'idle' means the SDK is ready for calls. 'fetching'
   * means a request is in-flight and new calls should wait.
   */
  const { fetchStatus: signInFetchStatus, signIn } = useSignIn();
  const { fetchStatus: signUpFetchStatus, signUp } = useSignUp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const authReady =
    isSignup ? signUpFetchStatus === 'idle' : signInFetchStatus === 'idle';

  // ─── Session finalisation ────────────────────────────────────────────────

  /*
   * SignInFutureResource.finalize() and SignUpFutureResource.finalize() handle
   * session activation and navigation in the Future API. The navigate callback
   * receives a decorateUrl function that must be applied to the destination —
   * this is required for Safari ITP cookie refresh. If decorateUrl returns an
   * absolute URL it must use window.location.href; relative URLs use the router.
   */
  const finalizeAuthentication = async (
    resource: {
      finalize: (params: {
        navigate: (params: { decorateUrl: (url: string) => string }) => void;
      }) => Promise<{ error: unknown }>;
    }
  ) => {
    const result = await resource.finalize({
      navigate: ({ decorateUrl }) => {
        const destination = decorateUrl('/dashboard');

        if (destination.startsWith('http://') || destination.startsWith('https://')) {
          window.location.href = destination;
          return;
        }

        router.replace(destination);
      },
    });

    if (result.error) {
      throw result.error;
    }
  };

  // ─── OAuth handler ──────────────────────────────────────────────────────

  async function handleOAuth(strategy: OAuthStrategy): Promise<void> {
    const authResource = isSignup ? signUp : signIn;

    if (!authResource) {
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      /*
       * SignInFutureResource.sso() / SignUpFutureResource.sso() initiate the
       * OAuth redirect flow. The Future API uses sso() (not authenticateWithRedirect).
       *
       * redirectUrl        = final destination after a successful OAuth flow
       * redirectCallbackUrl = the /sso-callback page that handles the OAuth return
       */
      const result = await authResource.sso({
        strategy,
        redirectUrl: '/dashboard',
        redirectCallbackUrl: '/sso-callback',
        ...(isSignup ? { unsafeMetadata: { role: DEFAULT_APP_ROLE } } : {}),
      });

      if (result.error) {
        throw result.error;
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  // ─── Email verification ─────────────────────────────────────────────────

  async function handleVerification(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    if (!signUp) {
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      /*
       * signUp.verifications.verifyEmailCode() is the Future API method.
       * Returns { error: ClerkError | null } — check error before proceeding.
       */
      const result = await signUp.verifications.verifyEmailCode({
        code: verificationCode,
      });

      if (result.error) {
        throw result.error;
      }

      if (signUp.status === 'complete') {
        await finalizeAuthentication(signUp);
        return;
      }

      setError(
        'We still need a valid verification code before we can finish creating your account.'
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Email + password submit ────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    if (!authReady) {
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      if (isSignup) {
        if (!signUp) {
          return;
        }

        /*
         * signUp.password() is the Future API entry point for email+password
         * sign-up. Returns { error } — unlike the old API which threw on failure.
         */
        const passwordResult = await signUp.password({
          firstName,
          lastName,
          emailAddress: email,
          password,
          unsafeMetadata: {
            role: DEFAULT_APP_ROLE,
          },
        });

        if (passwordResult.error) {
          throw passwordResult.error;
        }

        if (signUp.status === 'complete') {
          await finalizeAuthentication(signUp);
          return;
        }

        /*
         * When email verification is required, send the one-time code and
         * show the verification input. signUp.verifications.sendEmailCode()
         * is the Future API equivalent of prepareEmailAddressVerification().
         */
        const verificationResult = await signUp.verifications.sendEmailCode();

        if (verificationResult.error) {
          throw verificationResult.error;
        }

        setAwaitingVerification(true);
        setVerificationCode('');
      } else {
        if (!signIn) {
          return;
        }

        /*
         * signIn.password() is the Future API entry point for email+password
         * sign-in. Returns { error } on failure rather than throwing.
         */
        const passwordResult = await signIn.password({
          identifier: email,
          password,
        });

        if (passwordResult.error) {
          throw passwordResult.error;
        }

        if (signIn.status === 'complete') {
          await finalizeAuthentication(signIn);
          return;
        }

        /*
         * Non-complete statuses indicate additional steps (MFA, password reset).
         * Handled gracefully rather than silently failing.
         */
        if (signIn.status === 'needs_second_factor') {
          setError(
            'This account requires multi-factor authentication. Continue the sign-in in Clerk-managed recovery screens.'
          );
        } else if (signIn.status === 'needs_new_password') {
          setError('This account needs a password reset before it can sign in here.');
        } else {
          setError(
            'This account needs an additional verification step before it can sign in here.'
          );
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const activeSubtitle = awaitingVerification
    ? 'Enter the verification code we sent to your email to finish creating your account.'
    : subtitle;

  return (
    <>
      <FloatingDomains />

      <div className={styles.pageContainer}>
        <Link href="/" className={styles.logo}>
          Promethean
        </Link>
        <div className={styles.themeToggle}>
          <ThemeToggle />
        </div>

        <div className={styles.wrapper}>
          <div className={styles.inner}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{activeSubtitle}</p>

            {!awaitingVerification && (
              <>
                <button
                  className={styles.ssoBtn}
                  type="button"
                  onClick={() => void handleOAuth('oauth_google')}
                  disabled={submitting || !authReady}
                  aria-label="Continue with Google"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {isSignup ? 'Sign up' : 'Continue'} with Google
                </button>
                <button
                  className={styles.ssoBtn}
                  type="button"
                  onClick={() => void handleOAuth('oauth_github')}
                  disabled={submitting || !authReady}
                  aria-label="Continue with GitHub"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12" />
                  </svg>
                  {isSignup ? 'Sign up' : 'Continue'} with GitHub
                </button>
                <div className={styles.divider}>or</div>
              </>
            )}

            <form
              onSubmit={
                awaitingVerification
                  ? (e) => void handleVerification(e)
                  : (e) => void handleSubmit(e)
              }
              noValidate
            >
              {isSignup && !awaitingVerification && (
                <div className={styles.splitRow}>
                  <div className={styles.inputGroup}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder=" "
                      autoComplete="given-name"
                      required
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setError('');
                      }}
                    />
                    <label className={styles.label}>First name</label>
                  </div>
                  <div className={styles.inputGroup}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder=" "
                      autoComplete="family-name"
                      required
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setError('');
                      }}
                    />
                    <label className={styles.label}>Last name</label>
                  </div>
                </div>
              )}

              {!awaitingVerification ? (
                <>
                  <div className={styles.inputGroup}>
                    <input
                      type="email"
                      className={styles.input}
                      placeholder=" "
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                    />
                    <label className={styles.label}>Email address</label>
                  </div>

                  <div className={styles.inputGroup}>
                    <input
                      type="password"
                      className={styles.input}
                      placeholder=" "
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                    />
                    <label className={styles.label}>Password</label>
                  </div>
                </>
              ) : (
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder=" "
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value);
                      setError('');
                    }}
                  />
                  <label className={styles.label}>Verification code</label>
                </div>
              )}

              {error && (
                <p className={styles.errorMsg} role="alert" aria-live="polite">
                  {error}
                </p>
              )}

              <button
                className={styles.submitBtn}
                type="submit"
                disabled={submitting || !authReady}
              >
                <span>
                  {submitting
                    ? awaitingVerification
                      ? 'Verifying...'
                      : isSignup
                        ? 'Creating account...'
                        : 'Logging in...'
                    : awaitingVerification
                      ? 'Verify email'
                      : submitText}
                </span>
              </button>

              {/* Clerk renders its CAPTCHA widget here when bot protection is enabled */}
              <div id="clerk-captcha" />
            </form>

            <div className={styles.footer}>
              {awaitingVerification ? (
                <>
                  Need a fresh start? <Link href="/sign-up">Restart sign up</Link>
                </>
              ) : (
                <>
                  {footerText} <Link href={footerLinkHref}>{footerLinkText}</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
