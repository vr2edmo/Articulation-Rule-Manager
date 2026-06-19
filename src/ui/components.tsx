import { useEffect, type ReactNode } from "react";
import type { RecordStatus } from "@/domain/types";
import { IconClose, IconWarn } from "./icons";

// --- Status & source badges -----------------------------------------------
export function StatusBadge({ status }: { status: RecordStatus }) {
  const map: Record<RecordStatus, string> = {
    DRAFT: "bg-status-draft-bg text-status-draft",
    PUBLISHED: "bg-status-published-bg text-status-published",
    ARCHIVED: "bg-status-archived-bg text-status-archived",
  };
  return <span className={`badge ${map[status]}`}>{status[0] + status.slice(1).toLowerCase()}</span>;
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "blue" | "warn" | "purple" }) {
  const map = {
    neutral: "bg-edmo-blue-50 text-edmo-muted",
    blue: "bg-edmo-blue-100 text-edmo-navy",
    warn: "bg-status-warn-bg text-status-warn",
    purple: "bg-purple-50 text-purple-700",
  };
  return <span className={`badge ${map[tone]}`}>{children}</span>;
}

// --- Modal (centered dialog) ----------------------------------------------
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-edmo-navy-900/40" onClick={onClose} />
      <div className={`card relative z-10 w-full ${maxWidth} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between border-b border-edmo-line px-5 py-3.5">
          <h2 className="text-base font-bold text-edmo-navy">{title}</h2>
          <button onClick={onClose} className="text-edmo-muted hover:text-edmo-ink">
            <IconClose />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 scroll-thin">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-edmo-line bg-edmo-bg/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// --- Slide-over (right panel, used for Add/Edit forms) --------------------
export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-edmo-navy-900/40" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-panel">
        <div className="flex items-start justify-between border-b border-edmo-line px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-edmo-navy">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-edmo-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-edmo-muted hover:text-edmo-ink">
            <IconClose />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 scroll-thin">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-edmo-line bg-edmo-bg/60 px-6 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

// --- Inline notice / banner -----------------------------------------------
export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "success";
  children: ReactNode;
}) {
  const map = {
    info: "border-edmo-blue-100 bg-edmo-blue-50 text-edmo-navy",
    warn: "border-status-warn/30 bg-status-warn-bg text-status-warn",
    success: "border-status-published/30 bg-status-published-bg text-status-published",
  };
  return (
    <div className={`flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-sm ${map[tone]}`}>
      {tone === "warn" && <IconWarn className="mt-0.5 shrink-0" width={16} height={16} />}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

// --- Empty state ----------------------------------------------------------
export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-base font-bold text-edmo-ink">{title}</p>
      <p className="max-w-md text-sm text-edmo-muted">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// --- Field wrapper --------------------------------------------------------
export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="label">
        {label} {required && <span className="text-status-danger">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-edmo-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs font-bold text-status-danger">{error}</p>}
    </div>
  );
}
