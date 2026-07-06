import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/*
 * Route protection matrix:
 *
 * /dashboard/(*) and /profile-setup → PROTECTED  Student and mentor workspace.
 *                                      Unauthenticated requests are redirected to
 *                                      NEXT_PUBLIC_CLERK_SIGN_IN_URL.
 *
 * /api/(*)       → PUBLIC at the edge. Individual handlers enforce auth via
 *                  the FastAPI backend JWT check. Not protected here because:
 *                    1. /api/health must be publicly accessible for uptime monitoring.
 *                    2. Webhook endpoints (e.g. /api/webhooks/clerk) must accept
 *                       unauthenticated POST requests from Clerk.
 *                    3. FastAPI independently validates every JWT — edge protection
 *                       here would be redundant and would block legitimate endpoints.
 *
 * Everything else → PUBLIC. Landing page, /sign-in, /sign-up, /sso-callback,
 *                   static assets, marketing pages.
 */
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/profile-setup(.*)']);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  /*
   * Inject a correlation ID on every request so logs from the frontend,
   * backend, and Clerk can be correlated in Sentry / Datadog.
   * The backend reads x-correlation-id and includes it in every log line.
   * We forward the same ID in the response so the client can log it too.
   */
  const correlationId =
    request.headers.get('x-correlation-id') ?? crypto.randomUUID();

  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        'x-correlation-id': correlationId,
      }),
    },
  });

  response.headers.set('x-correlation-id', correlationId);

  if (isProtectedRoute(request)) {
    /*
     * auth.protect() reads NEXT_PUBLIC_CLERK_SIGN_IN_URL from env and
     * issues a redirect for unauthenticated requests. No-op for authed requests.
     */
    await auth.protect();
  }

  return response;
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *   - _next/static  (Next.js build output)
     *   - _next/image   (Image optimisation)
     *   - favicon.ico   (Browser default request)
     *   - Static assets by extension
     *
     * This is the Clerk v7 recommended matcher for Next.js App Router.
     * The negative lookahead is intentional — do not simplify it.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
