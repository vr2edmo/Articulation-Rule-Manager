import { useMemo, useState } from "react";
import { useSession } from "@/app/session";
import { useStoreSnapshot } from "@/domain/hooks";
import { store } from "@/domain/store";
import type { AuditModule } from "@/domain/types";
import { PageHeader } from "@/ui/PageHeader";
import { EmptyState, Pill } from "@/ui/components";
import { IconDownload } from "@/ui/icons";
import { downloadCsv } from "@/domain/fileio";
import { formatDateTime } from "@/domain/util";

export default function AuditPage() {
  const { activeUniversity, user } = useSession();
  const snap = useStoreSnapshot();
  const [fModule, setFModule] = useState<AuditModule | "ALL">("ALL");

  const entries = useMemo(
    () => (activeUniversity ? store.getAudit(activeUniversity.id) : []),
    [snap, activeUniversity],
  );
  const filtered = entries.filter((e) => fModule === "ALL" || e.module === fModule);

  if (!activeUniversity || !user) return null;

  function exportLog() {
    const rows = filtered.map((e) => [formatDateTime(e.timestamp), e.module, e.action, e.entity_label, e.actor]);
    downloadCsv(`${activeUniversity!.short_name}-activity-log.csv`, ["Timestamp", "Module", "Action", "Entity", "Actor"], rows);
  }

  return (
    <div>
      <PageHeader
        title="Activity Log"
        subtitle="Every create, edit, publish, rollback, and archive across the Catalog and Rules modules, with timestamp and user attribution."
        actions={
          <>
            <select className="input w-auto py-2" value={fModule} onChange={(e) => setFModule(e.target.value as AuditModule | "ALL")}>
              <option value="ALL">All modules</option>
              <option value="CCM">Course Catalog</option>
              <option value="ARM">Articulation Rules</option>
            </select>
            <button className="btn-secondary" onClick={exportLog} disabled={!filtered.length}>
              <IconDownload width={16} height={16} /> Export CSV
            </button>
          </>
        }
      />

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="No activity yet" body="Actions you take in the Catalog and Rules tabs will appear here." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edmo-line bg-edmo-bg/70 text-left">
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-edmo-muted">When</th>
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-edmo-muted">Module</th>
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-edmo-muted">Action</th>
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-edmo-muted">Entity</th>
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-edmo-muted">By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-edmo-line/70">
                  <td className="whitespace-nowrap px-4 py-2.5 text-edmo-muted">{formatDateTime(e.timestamp)}</td>
                  <td className="px-4 py-2.5">
                    <Pill tone={e.module === "CCM" ? "blue" : "purple"}>{e.module}</Pill>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-edmo-ink">{e.action}</td>
                  <td className="px-4 py-2.5 text-edmo-muted">{e.entity_label}</td>
                  <td className="px-4 py-2.5 text-edmo-muted">{e.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
