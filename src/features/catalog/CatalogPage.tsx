import { useMemo, useState } from "react";
import { useSession } from "@/app/session";
import { useStoreSnapshot } from "@/domain/hooks";
import { store } from "@/domain/store";
import { useToast } from "@/ui/toast";
import type { CatalogCourse, RecordStatus, CatalogRecordSource } from "@/domain/types";
import { PageHeader, StatCard } from "@/ui/PageHeader";
import { DataTable, type Column } from "@/ui/DataTable";
import { Modal, Notice, Pill, StatusBadge, EmptyState } from "@/ui/components";
import { ImportDialog } from "@/ui/ImportDialog";
import { IconPlus, IconUpload, IconDownload, IconEdit, IconHistory, IconArchive, IconSearch, IconCheck, IconRollback } from "@/ui/icons";
import { downloadCsv } from "@/domain/fileio";
import { formatDate } from "@/domain/util";
import { CourseForm } from "./CourseForm";
import { CatalogVersionHistory } from "./VersionHistory";
import {
  CATALOG_MAX_ROWS,
  CATALOG_TEMPLATE_EXAMPLE,
  CATALOG_TEMPLATE_HEADERS,
  validateCatalogRows,
  type CatalogDraft,
} from "./catalogImport";

const SOURCE_LABEL: Record<CatalogRecordSource, string> = {
  CSV_IMPORT: "CSV Import",
  MANUALLY_ENTERED: "Manually Entered",
  MIGRATED_FROM_EDMO: "Migrated from EDMO",
};

export default function CatalogPage() {
  const { user, activeUniversity } = useSession();
  const snap = useStoreSnapshot();
  const toast = useToast();

  const courses = useMemo(
    () => (activeUniversity ? store.getCatalog(activeUniversity.id) : []),
    [snap, activeUniversity],
  );

  // filters
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState<RecordStatus | "ALL">("ALL");
  const [fProgram, setFProgram] = useState("ALL");
  const [fYear, setFYear] = useState("ALL");
  const [fSource, setFSource] = useState<CatalogRecordSource | "ALL">("ALL");

  // dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogCourse | null>(null);
  const [viewingCourse, setViewingCourse] = useState<CatalogCourse | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<CatalogCourse | null>(null);
  const [publishIds, setPublishIds] = useState<string[] | null>(null);
  const [archiveIds, setArchiveIds] = useState<string[] | null>(null);

  // selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const programs = useMemo(() => [...new Set(courses.map((c) => c.program_name))].sort(), [courses]);
  const years = useMemo(() => [...new Set(courses.map((c) => c.catalog_year))].sort(), [courses]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return courses.filter((c) => {
      if (fStatus !== "ALL" && c.status !== fStatus) return false;
      if (fProgram !== "ALL" && c.program_name !== fProgram) return false;
      if (fYear !== "ALL" && c.catalog_year !== fYear) return false;
      if (fSource !== "ALL" && c.record_source !== fSource) return false;
      if (term) {
        const hay = `${c.course_code} ${c.course_name} ${c.course_description}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [courses, q, fStatus, fProgram, fYear, fSource]);

  const migratedDrafts = courses.filter((c) => c.record_source === "MIGRATED_FROM_EDMO" && c.status === "DRAFT");
  const counts = {
    total: courses.length,
    published: courses.filter((c) => c.status === "PUBLISHED").length,
    draft: courses.filter((c) => c.status === "DRAFT").length,
  };

  if (!activeUniversity || !user) return null;
  const actor = user.name;

  // selection helpers
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = (ids: string[]) =>
    setSelected((s) => (ids.every((i) => s.has(i)) ? new Set() : new Set(ids)));
  const clearSelection = () => setSelected(new Set());

  const selectedCourses = courses.filter((c) => selected.has(c.id));
  const selectedDraftIds = selectedCourses.filter((c) => c.status !== "PUBLISHED").map((c) => c.id);
  const selectedArchivableIds = selectedCourses.filter((c) => c.status !== "ARCHIVED").map((c) => c.id);

  function openEdit(c: CatalogCourse) {
    setEditing(c);
    setViewingCourse(null);
    setFormOpen(true);
  }
  function openView(c: CatalogCourse) {
    setViewingCourse(c);
    setEditing(null);
    setFormOpen(true);
  }
  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function doPublish(ids: string[]) {
    store.publishCatalog(ids, actor);
    toast("success", `Published ${ids.length} course${ids.length > 1 ? "s" : ""}. AI matching updates within ~60s. EDMO notified.`);
    setPublishIds(null);
    clearSelection();
  }
  function doArchive(ids: string[]) {
    store.archiveCatalog(ids, actor);
    toast("info", `Archived ${ids.length} course${ids.length > 1 ? "s" : ""}.`);
    setArchiveIds(null);
    clearSelection();
  }

  function exportCsv() {
    const rows = filtered.map((c) => [
      c.program_name,
      c.course_code,
      c.course_name,
      c.course_description,
      c.credit_hours?.toString() ?? "",
      c.prerequisites,
      c.catalog_year,
    ]);
    downloadCsv(`${activeUniversity!.short_name}-catalog.csv`, CATALOG_TEMPLATE_HEADERS, rows);
  }

  const columns: Column<CatalogCourse>[] = [
    { key: "program", header: "Program", render: (c) => <span className="text-edmo-muted">{c.program_name}</span>, className: "max-w-[180px] truncate" },
    {
      key: "code",
      header: "Course Code",
      render: (c) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-edmo-navy">{c.course_code}</span>
          {c.record_source === "MIGRATED_FROM_EDMO" && c.status === "DRAFT" && (
            <Pill tone="warn">EDMO Migration</Pill>
          )}
        </div>
      ),
    },
    { key: "name", header: "Course Name", render: (c) => c.course_name, className: "max-w-[220px] truncate" },
    { key: "credits", header: "Credits", render: (c) => c.credit_hours ?? "—", className: "text-center w-16" },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    { key: "year", header: "Catalog Year", render: (c) => <span className="text-edmo-muted">{c.catalog_year}</span> },
    { key: "source", header: "Source", render: (c) => <span className="text-xs text-edmo-muted">{SOURCE_LABEL[c.record_source]}</span> },
    { key: "modified", header: "Last Modified", render: (c) => <span className="text-xs text-edmo-muted">{formatDate(c.last_modified_at)}</span> },
    {
      key: "actions",
      header: "",
      className: "w-px whitespace-nowrap text-right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconBtn title="Edit" onClick={() => openEdit(c)}>
            <IconEdit width={16} height={16} />
          </IconBtn>
          {c.status !== "DRAFT" && (
            <IconBtn title="Version history" onClick={() => setHistoryFor(c)}>
              <IconHistory width={16} height={16} />
            </IconBtn>
          )}
          {c.status === "DRAFT" && (
            <IconBtn title="Publish" onClick={() => setPublishIds([c.id])}>
              <IconCheck width={16} height={16} />
            </IconBtn>
          )}
          {c.status === "ARCHIVED" ? (
            <IconBtn title="Restore to draft" onClick={() => store.restoreCatalog(c.id, actor)}>
              <IconRollback width={16} height={16} />
            </IconBtn>
          ) : (
            <IconBtn title="Archive" onClick={() => setArchiveIds([c.id])}>
              <IconArchive width={16} height={16} />
            </IconBtn>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Course Catalog"
        subtitle="Your university's course offerings — the reference set EDMO's AI uses to match incoming transfer courses. Publish a course to make it live for matching."
        actions={
          <>
            <button className="btn-secondary" onClick={() => downloadCsv("edmo-catalog-template.csv", CATALOG_TEMPLATE_HEADERS, [CATALOG_TEMPLATE_EXAMPLE])}>
              <IconDownload width={16} height={16} /> Template
            </button>
            <button className="btn-secondary" onClick={() => setImportOpen(true)}>
              <IconUpload width={16} height={16} /> Upload CSV / Excel
            </button>
            <button className="btn-primary" onClick={openAdd}>
              <IconPlus width={16} height={16} /> Add Course
            </button>
          </>
        }
      />

      {migratedDrafts.length > 0 && (
        <div className="mb-4">
          <Notice tone="info">
            <span className="font-bold">{migratedDrafts.length} course{migratedDrafts.length > 1 ? "s" : ""} pre-loaded from EDMO's records.</span>{" "}
            Please review and update each, then publish to activate them for AI matching. They stay in draft until you publish.
          </Notice>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total courses" value={counts.total} />
        <StatCard label="Published" value={counts.published} tone="ok" />
        <StatCard label="Drafts" value={counts.draft} tone={counts.draft ? "warn" : undefined} />
        <StatCard label="Programs" value={programs.length} />
      </div>

      {/* Toolbar */}
      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-edmo-muted" width={16} height={16} />
          <input
            className="input pl-9"
            placeholder="Search code, name, or description…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={fStatus} onChange={(v) => setFStatus(v as RecordStatus | "ALL")} options={[["ALL", "All statuses"], ["DRAFT", "Draft"], ["PUBLISHED", "Published"], ["ARCHIVED", "Archived"]]} />
        <Select value={fProgram} onChange={setFProgram} options={[["ALL", "All programs"], ...programs.map((p) => [p, p] as [string, string])]} />
        <Select value={fYear} onChange={setFYear} options={[["ALL", "All years"], ...years.map((y) => [y, y] as [string, string])]} />
        <Select value={fSource} onChange={(v) => setFSource(v as CatalogRecordSource | "ALL")} options={[["ALL", "All sources"], ["CSV_IMPORT", "CSV Import"], ["MANUALLY_ENTERED", "Manually Entered"], ["MIGRATED_FROM_EDMO", "Migrated from EDMO"]]} />
        <button className="btn-ghost" onClick={exportCsv}>
          <IconDownload width={16} height={16} /> Export
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-md border border-edmo-blue-100 bg-edmo-blue-50 px-4 py-2.5 text-sm">
          <span className="font-bold text-edmo-navy">{selected.size} selected</span>
          <button className="btn-primary py-1.5" disabled={!selectedDraftIds.length} onClick={() => setPublishIds(selectedDraftIds)}>
            <IconCheck width={15} height={15} /> Publish ({selectedDraftIds.length})
          </button>
          <button className="btn-secondary py-1.5" disabled={!selectedArchivableIds.length} onClick={() => setArchiveIds(selectedArchivableIds)}>
            <IconArchive width={15} height={15} /> Archive ({selectedArchivableIds.length})
          </button>
          <button className="btn-ghost py-1.5" onClick={clearSelection}>
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title={courses.length === 0 ? "Your catalog is empty" : "No courses match your filters"}
            body={
              courses.length === 0
                ? "Upload your course list via CSV/Excel, or add courses one at a time. Published courses become the reference set for AI matching."
                : "Try clearing search or filters."
            }
            action={courses.length === 0 ? <button className="btn-primary" onClick={openAdd}><IconPlus width={16} height={16} /> Add your first course</button> : undefined}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            selectable
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onRowClick={openView}
            rowClassName={(c) => (c.status === "ARCHIVED" ? "opacity-60" : "")}
          />
        )}
      </div>
      <p className="mt-2 text-xs text-edmo-muted">
        Showing {filtered.length} of {courses.length} courses.
      </p>

      {/* Dialogs */}
      {formOpen && (
        <CourseForm
          open={formOpen}
          course={viewingCourse ?? editing}
          readOnly={!!viewingCourse && !editing}
          onClose={() => { setFormOpen(false); setViewingCourse(null); setEditing(null); }}
          onEdit={viewingCourse ? () => { setEditing(viewingCourse); setViewingCourse(null); } : undefined}
        />
      )}
      <CatalogVersionHistory course={historyFor} onClose={() => setHistoryFor(null)} />

      <ImportDialog<CatalogDraft>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import courses from CSV / Excel"
        templateHeaders={CATALOG_TEMPLATE_HEADERS}
        exampleRow={CATALOG_TEMPLATE_EXAMPLE}
        templateFilename="edmo-catalog-template.csv"
        maxRows={CATALOG_MAX_ROWS}
        validate={validateCatalogRows(activeUniversity.id, actor)}
        uploadHint="Detailed course descriptions directly improve AI matching accuracy. All imported courses land as DRAFT — review, then publish."
        onConfirm={(valid) => {
          valid.forEach((c) => store.createCatalogCourse(c, actor));
          toast("success", `Imported ${valid.length} course${valid.length > 1 ? "s" : ""} as draft.`);
        }}
      />

      {/* Publish confirmation (F4) */}
      <Modal
        open={!!publishIds}
        onClose={() => setPublishIds(null)}
        title="Publish courses"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPublishIds(null)}>Cancel</button>
            <button className="btn-primary" onClick={() => publishIds && doPublish(publishIds)}>
              Publish {publishIds?.length}
            </button>
          </>
        }
      >
        <p className="text-sm text-edmo-ink">
          Publishing <span className="font-bold">{publishIds?.length}</span> course
          {publishIds && publishIds.length > 1 ? "s" : ""}. These will be used by EDMO's AI for
          transfer credit matching from this point forward.
        </p>
        <p className="mt-2 text-sm text-edmo-muted">
          The previous published version of each course is retained for rollback. In-flight
          evaluations are not affected. EDMO is notified of every publish event.
        </p>
      </Modal>

      {/* Archive confirmation (F5) — warns about referencing rules */}
      <ArchiveDialog
        open={!!archiveIds}
        ids={archiveIds ?? []}
        onClose={() => setArchiveIds(null)}
        onConfirm={doArchive}
      />
    </div>
  );
}

function ArchiveDialog({
  open,
  ids,
  onClose,
  onConfirm,
}: {
  open: boolean;
  ids: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const { activeUniversity } = useSession();
  if (!activeUniversity) return null;

  // Aggregate rule references across the selection (PRD F5).
  const refs = ids.flatMap((id) => {
    const c = store.getCatalogCourse(id);
    if (!c) return [];
    const rules = store.rulesReferencing(activeUniversity.id, c.course_code);
    return rules.length ? [{ code: c.course_code, count: rules.length }] : [];
  });
  const totalRefs = refs.reduce((n, r) => n + r.count, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Archive ${ids.length} course${ids.length > 1 ? "s" : ""}?`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={() => onConfirm(ids)}>Archive</button>
        </>
      }
    >
      <p className="text-sm text-edmo-ink">
        Archived courses are excluded from AI matching but retained for audit. You can restore them to
        draft at any time.
      </p>
      {totalRefs > 0 && (
        <div className="mt-3">
          <Notice tone="warn">
            <p className="font-bold">
              {refs.length === 1
                ? `This course is referenced by ${totalRefs} active articulation rule${totalRefs > 1 ? "s" : ""}.`
                : `These courses are referenced by ${totalRefs} active articulation rules.`}
            </p>
            <p className="mt-1">
              Archiving will not automatically update those rules — they will be flagged UNMATCHED and
              excluded from live mapping. Review your rules after archiving.
            </p>
            <ul className="mt-1.5 list-disc pl-5">
              {refs.map((r) => (
                <li key={r.code}>
                  {r.code}: {r.count} rule{r.count > 1 ? "s" : ""}
                </li>
              ))}
            </ul>
          </Notice>
        </div>
      )}
    </Modal>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded-md p-1.5 text-edmo-muted hover:bg-edmo-blue-50 hover:text-edmo-navy"
    >
      {children}
    </button>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select className="input w-auto py-2" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
