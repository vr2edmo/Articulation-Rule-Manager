// Small framework-agnostic helpers shared across the data layer.

let _counter = 0;

/** Stable-enough id for a client-only prototype. */
export function uid(prefix = "id"): string {
  _counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${_counter.toString(36)}${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Parse a credit-hours cell into a number or null (accepts "3", "3.0", ""). */
export function parseCredits(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

export function normalizeCode(code: string): string {
  return code.trim().replace(/\s+/g, " ").toUpperCase();
}
