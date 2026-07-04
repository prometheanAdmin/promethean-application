import styles from './ComingSoonPanel.module.css';

interface ComingSoonPanelProps {
  eyebrow: string;
  title: string;
  icon: () => React.ReactElement;
  description: string;
  badge?: string;
  panelTitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  ctaIcon?: () => React.ReactElement;
  external?: boolean;
}

export default function ComingSoonPanel({
  eyebrow,
  title,
  icon: Icon,
  description,
  badge = 'Coming soon',
  panelTitle,
  ctaHref,
  ctaLabel,
  ctaIcon: CtaIcon,
  external = false,
}: ComingSoonPanelProps) {
  return (
    <>
      <div className={styles.header}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
      </div>

      <div className={styles.panel}>
        <span className={styles.iconWrap}>
          <Icon />
        </span>
        <span className={styles.badge}>{badge}</span>
        <h2 className={styles.panelTitle}>{panelTitle ?? `${title} is on its way.`}</h2>
        <p className={styles.panelDesc}>{description}</p>
        {ctaHref && ctaLabel && (
          <a
            href={ctaHref}
            className={styles.cta}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {ctaLabel}
            {CtaIcon && <CtaIcon />}
          </a>
        )}
      </div>
    </>
  );
}
