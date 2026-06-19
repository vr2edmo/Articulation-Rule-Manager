import type { CatalogCourse } from "@/domain/types";
import { store } from "@/domain/store";
import { useSession } from "@/app/session";
import { useToast } from "@/ui/toast";
import { Modal, Notice } from "@/ui/components";
import { IconRollback } from "@/ui/icons";
import { formatDateTime } from "@/domain/util";

export function CatalogVersionHistory({
  course,
  onClose,
}: {
  course: CatalogCourse | null;
  onClose: () => void;
}) {
  const { user } = useSession();
  const toast = useToast();
  if (!course) return null;

  const history = [...course.version_history].reverse(); // newest first

  return (
    <Modal open={!!course} onClose={onClose} title={`Version history · ${course.course_code}`} maxWidth="max-w-2xl">
      <div className="mb-4">
        <Notice tone="info">
          Current live version is <span className="font-bold">v{course.version_number}</span> ({course.status.toLowerCase()}).
          Restoring re-publishes a prior version; AI matching reflects it within ~60 seconds.
        </Notice>
      </div>

      {history.length === 0 ? (
        <p className="py-6 text-center text-sm text-edmo-muted">
          No prior published versions yet. History is recorded each time this course is published.
        </p>
      ) : (
        <ol className="space-y-3">
          {history.map((v) => (
            <li key={v.version_number} className="rounded-md border border-edmo-line p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-edmo-blue-100 text-edmo-navy">v{v.version_number}</span>
                    <span className="text-xs text-edmo-muted">
                      published {formatDateTime(v.published_at)} · {v.modified_by}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-edmo-ink">
                    {v.values.course_code} — {v.values.course_name}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-edmo-muted">
                    {v.values.course_description || "(no description)"}
                  </p>
                  <p className="mt-1 text-xs text-edmo-muted">
                    {v.values.credit_hours ?? "—"} credits · {v.values.catalog_year}
                  </p>
                </div>
                <button
                  className="btn-secondary shrink-0"
                  onClick={() => {
                    if (!user) return;
                    store.rollbackCatalog(course.id, v.version_number, user.name);
                    toast("success", `Restored ${course.course_code} to v${v.version_number}.`);
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
