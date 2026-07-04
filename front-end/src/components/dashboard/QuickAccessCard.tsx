import Link from 'next/link';
import styles from './QuickAccessCard.module.css';

interface QuickAccessCardProps {
  title: string;
  description: string;
  href: string;
  icon: () => React.ReactElement;
  linkLabel?: string;
  linkIcon?: () => React.ReactElement;
  badge?: string;
  external?: boolean;
}

export default function QuickAccessCard({
  title,
  description,
  href,
  icon: Icon,
  linkLabel = 'Open',
  linkIcon: LinkIcon,
  badge,
  external = false,
}: QuickAccessCardProps) {
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.iconWrap}>
          <Icon />
        </span>
        {badge && <span className={styles.badge}>{badge}</span>}
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.desc}>{description}</p>
      <Link href={href} className={styles.link} {...linkProps}>
        {linkLabel}
        {LinkIcon && <LinkIcon />}
      </Link>
    </div>
  );
}
