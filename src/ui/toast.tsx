import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { IconCheck, IconClose, IconInfo, IconWarn } from "./icons";

type ToastKind = "success" | "info" | "warn";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-edmo-line bg-white p-3 shadow-card"
          >
            <span
              className={
                t.kind === "success"
                  ? "text-status-published"
                  : t.kind === "warn"
                  ? "text-status-warn"
                  : "text-edmo-blue"
              }
            >
              {t.kind === "success" ? <IconCheck /> : t.kind === "warn" ? <IconWarn /> : <IconInfo />}
            </span>
            <p className="flex-1 text-sm text-edmo-ink">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-edmo-muted hover:text-edmo-ink">
              <IconClose width={16} height={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
