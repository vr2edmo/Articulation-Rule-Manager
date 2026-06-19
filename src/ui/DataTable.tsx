import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Tailwind width / alignment classes for the cell + header. */
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  selectable,
  selected,
  onToggle,
  onToggleAll,
  rowClassName,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: (ids: string[]) => void;
  rowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
}) {
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selected?.has(r.id));

  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-edmo-line bg-edmo-bg/70 text-left">
            {selectable && (
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={!!allSelected}
                  onChange={() => onToggleAll?.(rows.map((r) => r.id))}
                  aria-label="Select all"
                />
              </th>
            )}
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-edmo-muted ${c.className ?? ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`border-b border-edmo-line/70 hover:bg-edmo-blue-50/50 ${
                onRowClick ? "cursor-pointer" : ""
              } ${rowClassName?.(row) ?? ""}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {selectable && (
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!selected?.has(row.id)}
                    onChange={() => onToggle?.(row.id)}
                    aria-label="Select row"
                  />
                </td>
              )}
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-3 align-middle ${c.className ?? ""}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
