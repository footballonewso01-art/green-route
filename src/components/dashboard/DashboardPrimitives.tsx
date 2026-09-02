import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./DashboardPrimitives.module.css";

type BaseProps = HTMLAttributes<HTMLElement> & { children: ReactNode };

export function DashboardPage({ children, className, ...props }: BaseProps) {
  return <div className={cn(styles.page, className)} {...props}>{children}</div>;
}

interface DashboardPageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}

export function DashboardPageHeader({ title, description, eyebrow, actions, className, ...props }: DashboardPageHeaderProps) {
  return (
    <header className={cn(styles.header, className)} {...props}>
      <div className={styles.intro}>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}

interface DashboardPanelProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  raised?: boolean;
}

export function DashboardPanel({ as: Component = "section", raised = false, className, children, ...props }: DashboardPanelProps) {
  return <Component className={cn(styles.panel, raised && styles.panelRaised, className)} {...props}>{children}</Component>;
}

interface DashboardMetricRailProps extends HTMLAttributes<HTMLElement> {
  columns?: number;
}

export function DashboardMetricRail({ columns = 3, className, style, children, ...props }: DashboardMetricRailProps) {
  return (
    <section
      className={cn(styles.metricRail, className)}
      style={{ ...style, "--dashboard-metric-columns": columns } as CSSProperties}
      {...props}
    >
      {children}
    </section>
  );
}

interface DashboardMetricProps extends HTMLAttributes<HTMLElement> {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
}

export function DashboardMetric({ label, value, icon, className, ...props }: DashboardMetricProps) {
  return (
    <article className={cn(styles.metric, className)} {...props}>
      <div className={styles.metricLabel}>{icon}{label}</div>
      <div className={styles.metricValue}>{value}</div>
    </article>
  );
}

interface DashboardEmptyStateProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}

export function DashboardEmptyState({ icon, title, description, action, className, ...props }: DashboardEmptyStateProps) {
  return (
    <section className={cn(styles.empty, className)} {...props}>
      <span className={styles.emptyIcon} aria-hidden="true">{icon}</span>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyDescription}>{description}</p>
      {action && <div className={styles.emptyAction}>{action}</div>}
    </section>
  );
}
