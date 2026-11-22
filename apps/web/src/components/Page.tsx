import type { ReactNode } from 'react';
import './components.css';

interface PageProps {
  title: string;
  children?: ReactNode;
}

/** Standard page layout: big title, then sections. */
export function Page({ title, children }: PageProps) {
  return (
    <div className="vt-page">
      <h1 className="vt-display">{title}</h1>
      {children}
    </div>
  );
}

interface SectionProps {
  label: string;
  /** Optional element on the right of the label, e.g. a "+" button. */
  action?: ReactNode;
  children?: ReactNode;
}

/** Labelled section ("QUICK START", "MY TEMPLATES"). */
export function Section({ label, action, children }: SectionProps) {
  return (
    <section className="vt-section">
      <div className="vt-section__header">
        <h2 className="vt-label">{label}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
}

/** Card shown when a section has nothing in it yet. */
export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="vt-card vt-empty">
      <p className="vt-title">{title}</p>
      {children && <p className="vt-muted vt-empty__body">{children}</p>}
    </div>
  );
}
