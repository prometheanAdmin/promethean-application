import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

// Premium pairing:
//   Display -> Outfit  (clean, rounded, modern geometric)
//   Body    -> Inter   (the gold-standard UI sans)
// Variable names are kept as --font-sora / --font-manrope so every existing
// module + legacy `var(--font-*)` reference upgrades automatically.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Promethean — Real Engineering Experience',
  description: 'The workplace, not the classroom. Ship real code with industry mentors and launch your engineering career.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /*
     * ClerkProvider must wrap <html>, not just <body>.
     *
     * Placing it inside <body> causes SSR/client session mismatches: the server
     * renders authenticated state before ClerkProvider initialises, producing
     * hydration errors and auth flickers where users briefly see stale data.
     *
     * Wrapping <html> ensures Clerk's session context is established before any
     * child renders on both server and client.
     */
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignOutUrl="/"
    >
      <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
        <head>
          {/*
           * Inline script runs synchronously before the React bundle to:
           *   1. Enable JS-gated reveal animations (js-reveal class) without
           *      a flash of unanimated content.
           *   2. Apply persisted or system theme before first paint to prevent
           *      a flash of the wrong colour palette.
           *   3. Force content visible after 2.5 s if the JS bundle stalls
           *      (chunk error, slow network).
           *
           * Must be in <head> (not <body>) to execute before paint.
           * try/catch prevents any localStorage error from breaking page load.
           */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                `try{var d=document.documentElement;d.classList.add('js-reveal');` +
                `var t=localStorage.getItem('theme');` +
                `if(!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}` +
                `d.setAttribute('data-theme',t);` +
                `setTimeout(function(){d.classList.add('rv-failsafe');},2500);}catch(e){}`,
            }}
          />
        </head>
        <body className={inter.className}>
          {children}
          {/*
           * Fallback anchor for Clerk's CAPTCHA initialisation.
           *
           * Clerk.js scans for #clerk-captcha at startup (before React hydrates).
           * On auth pages AuthModal renders its own #clerk-captcha inside the form,
           * which getElementById finds first and uses for the visible Smart CAPTCHA
           * widget. On every other page this element acts as the fallback so Clerk
           * does not warn "DOM element not found" and silently uses Invisible CAPTCHA.
           *
           * This element has no visible dimensions — it is never shown to users.
           */}
          <div id="clerk-captcha" aria-hidden="true" />
        </body>
      </html>
    </ClerkProvider>
  );
}
