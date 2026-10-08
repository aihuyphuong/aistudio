import type { ReactNode } from 'react';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function StageHeader({ step, title, subtitle, actions }: { step: number; title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <header className="stage-header">
      <div>
        <div className="stage-step">Bước {step}</div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function ErrorNote({ error }: { error: string | null }) {
  return error ? <div className="error">{error}</div> : null;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
