import styles from './PageHeader.module.css';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
