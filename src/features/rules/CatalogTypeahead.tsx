import { useMemo, useRef, useState } from "react";
import type { CatalogCourse } from "@/domain/types";
import { store } from "@/domain/store";
import { IconSearch, IconCheck } from "@/ui/icons";

/**
 * Typeahead bound to the university's PUBLISHED catalog (Layer 0). The registrar
 * cannot free-type a target course — they must select a published entry. This
 * enforces rule integrity and forces catalog maintenance (PRD F7).
 */
export function CatalogTypeahead({
  universityId,
  value, // selected course_code or ""
  disabled = false,
  onSelect,
}: {
  universityId: string;
  value: string;
  disabled?: boolean;
  onSelect: (course: CatalogCourse | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number>();

  const published = useMemo(() => store.getPublishedCatalog(universityId), [universityId, open]);
  const selected = published.find((c) => c.course_code === value);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return published.slice(0, 8);
    return published
      .filter((c) => `${c.course_code} ${c.course_name} ${c.program_name}`.toLowerCase().includes(term))
      .slice(0, 8);
  }, [published, query]);

  if (published.length === 0) {
    return (
      <div className="rounded-md border border-status-warn/30 bg-status-warn-bg px-3 py-2.5 text-sm text-status-warn">
        Your course catalog is empty. Publish your course catalog in the Catalog tab before creating rules.
      </div>
    );
  }

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center justify-between rounded-md border border-status-published/40 bg-status-published-bg px-3 py-2.5">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-edmo-ink">
              <IconCheck width={15} height={15} className="text-status-published" />
              {selected.course_code} — {selected.course_name}
            </div>
            <div className="text-xs text-edmo-muted">
              {selected.program_name} · {selected.credit_hours ?? "—"} credits · {selected.catalog_year}
            </div>
          </div>
          {!disabled && (
            <button
              className="btn-ghost py-1"
              onClick={() => {
                onSelect(null);
                setQuery("");
                setOpen(true);
              }}
            >
              Change
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-edmo-muted" width={16} height={16} />
            <input
              className="input pl-9"
              placeholder="Search your published catalog…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                blurTimer.current = window.setTimeout(() => setOpen(false), 150);
              }}
              disabled={disabled}
            />
          </div>
          {open && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-edmo-line bg-white shadow-card scroll-thin">
              {matches.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-edmo-muted">No published course matches “{query}”.</li>
              ) : (
                matches.map((c) => (
                  <li key={c.id}>
                    <button
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-edmo-blue-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        window.clearTimeout(blurTimer.current);
                        onSelect(c);
                        setOpen(false);
                      }}
                    >
                      <span className="text-sm font-bold text-edmo-navy">
                        {c.course_code} — {c.course_name}
                      </span>
                      <span className="text-xs text-edmo-muted">
                        {c.program_name} · {c.credit_hours ?? "—"} credits
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
