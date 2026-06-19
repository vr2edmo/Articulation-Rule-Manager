import type { ArticulationRule } from "@/domain/types";
import { store } from "@/domain/store";
import { useSession } from "@/app/session";
import { useToast } from "@/ui/toast";
import { Modal, Notice } from "@/ui/components";
import { IconRollback } from "@/ui/icons";
import { formatDateTime } from "@/domain/util";

export function RuleVersionHistory({ rule, onClose }: { rule: ArticulationRule | null; onClose: () => void }) {
  const { user } = useSession();
  const toast = useToast();
  if (!rule) return null;
  const history = [...rule.version_history].reverse();

  return (
    <Modal open={!!rule} onClose={onClose} title={`Version history · ${rule.source_course_code} → ${rule.target_course_code}`} maxWidth="max-w-2xl">
      <div className="mb-4">
        <Notice tone="info">
          Current live version is <span className="font-bold">v{rule.version_number}</span> ({rule.status.toLowerCase()}).
          Restoring re-publishes a prior version into TCE mapping within ~60 seconds.
        </Notice>
      </div>
      {history.length === 0 ? (
        <p className="py-6 text-center text-sm text-edmo-muted">
          No prior published versions yet. History is recorded each time this rule is published.
        </p>
      ) : (
        <ol className="space-y-3">
          {history.map((v) => (
            <li key={v.version_number} className="rounded-md border border-edmo-line p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-edmo-blue-100 text-edmo-navy">v{v.version_number}</span>
                    <span className="text-xs text-edmo-muted">published {formatDateTime(v.published_at)} · {v.modified_by}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-edmo-ink">
                    {v.values.source_course_code} → {v.values.target_course_code}
                  </p>
                  <p className="mt-0.5 text-xs text-edmo-muted">
                    {v.values.source_institution_name}
                    {v.values.source_state ? ` (${v.values.source_state})` : ""} ·{" "}
                    {v.values.target_course_credits ?? "—"} target credits · {v.values.equivalency_type}
                  </p>
                  <p className="mt-0.5 text-xs text-edmo-muted">
                    Valid {v.values.begin_date || "—"} – {v.values.end_date || "Present"}
                  </p>
                </div>
                <button
                  className="btn-secondary shrink-0"
                  onClick={() => {
                    if (!user) return;
                    store.rollbackRule(rule.id, v.version_number, user.name);
                    toast("success", `Restored rule to v${v.version_number}.`);
                    onClose();
                  }}
                >
                  <IconRollback width={16} height={16} /> Restore
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
