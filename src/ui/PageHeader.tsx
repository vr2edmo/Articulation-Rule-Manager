import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-edmo-navy">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-edmo-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: "warn" | "ok" }) {
  return (
    <div className="card px-4 py-3">
      <div
        className={`text-2xl font-extrabold ${
          tone === "warn" ? "text-status-warn" : tone === "ok" ? "text-status-published" : "text-edmo-navy"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs font-bold uppercase tracking-wide text-edmo-muted">{label}</div>
    </div>
  );
}
