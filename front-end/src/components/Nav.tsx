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
        <Link href="/login" className={styles.loginBtn}>Login</Link>
        <Link href="/signup" className={styles.signupBtn}>Sign up</Link>
      </div>
    </nav>
  );
}
