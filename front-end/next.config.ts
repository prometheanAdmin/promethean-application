import type { NextConfig } from 'next';

/*
 * Security headers applied to every response.
 *
 * X-DNS-Prefetch-Control: reduces DNS leakage in embedded contexts.
 * X-Frame-Options: prevents clickjacking (SAMEORIGIN allows our own iframes).
 * X-Content-Type-Options: prevents MIME-type sniffing attacks.
 * Referrer-Policy: limits referrer data sent to third parties.
 * Permissions-Policy: disables browser APIs we never use.
 * Strict-Transport-Security: enforces HTTPS after first visit (prod only).
 *
 * Content-Security-Policy is intentionally omitted here because it requires
 * per-route tuning and will be added as a dedicated task once the full
 * page inventory is confirmed (inline scripts in layout.tsx need nonces).
 */
const SECURITY_HEADERS: Array<{ key: string; value: string }> = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  ...(process.env.NODE_ENV === 'production'
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ];
  },

  reactStrictMode: true,
};

export default nextConfig;
