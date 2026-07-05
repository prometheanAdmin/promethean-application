import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import styles from './Nav.module.css';
import ThemeToggle from './ThemeToggle';

export default function Nav() {
  return (
    <nav className={styles.nav} data-nav>
      <Link href="/" className={styles.logoGroup}>
        <span className={styles.logoMark}></span>
        <span className={styles.logoText}>Promethean</span>
      </Link>
      <div className={styles.links}>
        <Link href="#how">How it works</Link>
        <Link href="#domains">Domains</Link>
        <Link href="#mentors">Mentors</Link>
        <Link href="#batches">Pricing</Link>
      </div>
      <div className={styles.actions}>
        <ThemeToggle />
        <Show when="signed-out">
          <SignInButton>
            <button type="button" className={styles.loginBtn}>Login</button>
          </SignInButton>
          <SignUpButton>
            <button type="button" className={styles.signupBtn}>Sign up</button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link href="/dashboard" className={styles.loginBtn}>Dashboard</Link>
          <div className={styles.userButtonWrap}>
            <UserButton />
          </div>
        </Show>
      </div>
    </nav>
  );
}
