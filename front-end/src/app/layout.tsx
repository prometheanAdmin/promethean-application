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
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        {/* Gate reveal animations behind JS so no-JS users still see everything,
            and set the class before first paint to avoid any flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `try{var d=document.documentElement;d.classList.add('js-reveal');` +
              // Apply the saved/system theme before first paint to avoid a flash
              // of the wrong palette.
              `var t=localStorage.getItem('theme');` +
              `if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}` +
              `d.setAttribute('data-theme',t);` +
              // Failsafe: if the app bundle never hydrates (chunk error, JS off,
              // slow network), force everything visible after 2.5s so content is
              // never trapped behind the reveal state. This inline script runs
              // independently of the main bundle.
              `setTimeout(function(){d.classList.add('rv-failsafe');},2500);}catch(e){}`,
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
