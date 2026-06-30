import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/app/session";
import { useStoreSnapshot } from "@/domain/hooks";
import { store } from "@/domain/store";
import { useToast } from "@/ui/toast";
import type { ArticulationRule, EquivalencyType, RecordStatus, RuleSource } from "@/domain/types";
import { PageHeader, StatCard } from "@/ui/PageHeader";
import { DataTable, type Column } from "@/ui/DataTable";
import { Modal, Notice, Pill, StatusBadge, EmptyState } from "@/ui/components";
import { ImportDialog } from "@/ui/ImportDialog";
import { IconPlus, IconUpload, IconDownload, IconEdit, IconHistory, IconArchive, IconSearch, IconCheck, IconRollback, IconWarn } from "@/ui/icons";
import { downloadCsv } from "@/domain/fileio";
import { formatDate } from "@/domain/util";
import { RuleForm } from "./RuleForm";
import { RuleVersionHistory } from "./RuleVersionHistory";
import { RULE_MAX_ROWS, RULE_TEMPLATE_EXAMPLE, RULE_TEMPLATE_HEADERS, validateRuleRows, type RuleDraft } from "./ruleImport";

const RULE_SOURCE_LABEL: Record<RuleSource, string> = {
  UNIVERSITY_ENTERED: "University Entered",
  PROMOTED_FROM_AI: "Promoted from AI",
};

function fmtDate(d: string): string {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
const EQUIV_LABEL: Record<EquivalencyType, string> = {
  FULL: "Full",
  PARTIAL: "Partial",
  ELECTIVE: "Elective",
  NO_CREDIT: "No Credit",
};

export default function RulesPage() {
  const { user, activeUniversity } = useSession();
  const snap = useStoreSnapshot();
  const toast = useToast();
  const navigate = useNavigate();

  const rules = useMemo(() => (activeUniversity ? store.getRules(activeUniversity.id) : []), [snap, activeUniversity]);
  const hasPublishedCatalog = useMemo(
    () => (activeUniversity ? store.getPublishedCatalog(activeUniversity.id).length > 0 : false),
    [snap, activeUniversity],
  );

  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState<RecordStatus | "ALL">("ALL");
  const [fInstitution, setFInstitution] = useState("ALL");
  const [fSource, setFSource] = useState<RuleSource | "ALL">("ALL");
  const [fEquiv, setFEquiv] = useState<EquivalencyType | "ALL">("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ArticulationRule | null>(null);
  const [viewingRule, setViewingRule] = useState<ArticulationRule | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<ArticulationRule | null>(null);
  const [publishIds, setPublishIds] = useState<string[] | null>(null);
  const [archiveIds, setArchiveIds] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const institutions = useMemo(() => [...new Set(rules.map((r) => r.source_institution_name))].sort(), [rules]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rules.filter((r) => {
      if (fStatus !== "ALL" && r.status !== fStatus) return false;
      if (fInstitution !== "ALL" && r.source_institution_name !== fInstitution) return false;
      if (fSource !== "ALL" && r.rule_source !== fSource) return false;
      if (fEquiv !== "ALL" && r.equivalency_type !== fEquiv) return false;
      if (term) {
        const hay = `${r.source_course_name} ${r.source_course_code} ${r.target_course_code}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rules, q, fStatus, fInstitution, fSource, fEquiv]);

  if (!activeUniversity || !user) return null;
  const actor = user.name;

  const counts = {
    total: rules.length,
    published: rules.filter((r) => r.status === "PUBLISHED").length,
    draft: rules.filter((r) => r.status === "DRAFT").length,
    unmatched: rules.filter((r) => r.unmatched && r.status !== "ARCHIVED").length,
  };

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = (ids: string[]) => setSelected((s) => (ids.every((i) => s.has(i)) ? new Set() : new Set(ids)));
  const clearSelection = () => setSelected(new Set());

  const selectedRules = rules.filter((r) => selected.has(r.id));
  const selectedDraftIds = selectedRules.filter((r) => r.status !== "PUBLISHED").map((r) => r.id);
  const selectedArchivableIds = selectedRules.filter((r) => r.status !== "ARCHIVED").map((r) => r.id);

  function openEdit(r: ArticulationRule) {
    setEditing(r);
    setViewingRule(null);
    setFormOpen(true);
  }
  function openView(r: ArticulationRule) {
    setViewingRule(r);
    setEditing(null);
    setFormOpen(true);
  }
  function openAdd() { setEditing(null); setViewingRule(null); setFormOpen(true); }

  function doPublish(ids: string[]) {
    // Guard: a rule whose target isn't in the published catalog would publish UNMATCHED.
    const unmatched = ids.map((id) => rules.find((r) => r.id === id)).filter((r) => r?.unmatched);
    store.publishRules(ids, actor);
    if (unmatched.length) {
      toast("warn", `Published ${ids.length} rule(s). ${unmatched.length} remain UNMATCHED until their target course is published in the catalog.`);
    } else {
      toast("success", `Published ${ids.length} rule${ids.length > 1 ? "s" : ""}. TCE mapping updates within ~60s. EDMO notified.`);
    }
    setPublishIds(null);
    clearSelection();
  }
  function doArchive(ids: string[]) {
    store.archiveRules(ids, actor);
    toast("info", `Archived ${ids.length} rule${ids.length > 1 ? "s" : ""}.`);
    setArchiveIds(null);
    clearSelection();
  }

  function exportCsv() {
    const rows = filtered.map((r) => [
      r.source_institution_name, r.source_city, r.source_state,
      r.source_course_code, r.source_course_name, r.source_course_credits?.toString() ?? "",
      r.target_course_code, r.target_course_credits?.toString() ?? "",
      r.equivalency_type, r.begin_date, r.end_date, r.notes,
    ]);
    downloadCsv(`${activeUniversity!.short_name}-rules.csv`, RULE_TEMPLATE_HEADERS, rows);
  }

  const columns: Column<ArticulationRule>[] = [
    {
      key: "institution",
      header: "Source University",
      render: (r) => (
        <div className="max-w-[170px]">
          <div className="truncate text-edmo-ink">{r.source_institution_name}</div>
          <div className="text-xs text-edmo-muted">
            {r.source_city}{r.source_city && r.source_state ? ", " : ""}{r.source_state}
          </div>
        </div>
      ),
    },
    {
      key: "src",
      header: "Source Course",
      render: (r) => (
        <div>
          <div className="font-bold text-edmo-navy">{r.source_course_code}</div>
          <div className="text-xs text-edmo-muted">
            {r.source_course_name}
            {r.source_course_credits != null && <span> · {r.source_course_credits} cr</span>}
          </div>
        </div>
      ),
    },
    {
      key: "tgt",
      header: "Target Course",
      render: (r) => (
        <div>
          <div className="flex items-center gap-1.5 font-bold text-edmo-ink">
            {r.target_course_code}
            {r.unmatched && r.status !== "ARCHIVED" && (
              <span title="Target course not in published catalog — excluded from live mapping">
                <IconWarn width={14} height={14} className="text-status-warn" />
              </span>
            )}
          </div>
          <div className="text-xs text-edmo-muted">
            {r.target_course_name || "—"}
            {r.target_course_credits != null && <span> · {r.target_course_credits} cr</span>}
          </div>
        </div>
      ),
    },
    { key: "equiv", header: "Equivalency", render: (r) => <Pill tone="blue">{EQUIV_LABEL[r.equivalency_type]}</Pill> },
    {
      key: "validity",
      header: "Validity",
      render: (r) => (
        <span className="whitespace-nowrap text-xs text-edmo-muted">
          {fmtDate(r.begin_date) || "—"} – {fmtDate(r.end_date) || "Present"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={r.status} />
          {r.unmatched && r.status !== "ARCHIVED" && <Pill tone="warn">Unmatched</Pill>}
        </div>
      ),
    },
    {
      key: "source",
      header: "Rule Source",
      render: (r) =>
        r.rule_source === "PROMOTED_FROM_AI" ? (
          <Pill tone="purple">Promoted from AI</Pill>
        ) : (
          <span className="text-xs text-edmo-muted">{RULE_SOURCE_LABEL[r.rule_source]}</span>
        ),
    },
    { key: "modified", header: "Last Modified", render: (r) => <span className="text-xs text-edmo-muted">{formatDate(r.last_modified_at)}</span> },
    {
      key: "actions",
      header: "",
      className: "w-px whitespace-nowrap text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconBtn title="Edit" onClick={() => openEdit(r)}><IconEdit width={16} height={16} /></IconBtn>
          {r.status !== "DRAFT" && <IconBtn title="Version history" onClick={() => setHistoryFor(r)}><IconHistory width={16} height={16} /></IconBtn>}
          {r.status === "DRAFT" && <IconBtn title="Publish" onClick={() => setPublishIds([r.id])}><IconCheck width={16} height={16} /></IconBtn>}
          {r.status === "ARCHIVED" ? (
            <IconBtn title="Restore to draft" onClick={() => store.restoreRule(r.id, actor)}><IconRollback width={16} height={16} /></IconBtn>
          ) : (
            <IconBtn title="Archive" onClick={() => setArchiveIds([r.id])}><IconArchive width={16} height={16} /></IconBtn>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Articulation Rules"
        subtitle="Standing rules that map a source institution's course to one of your courses. Applied first in TCE — before AI matching. Rules can only target courses in your published catalog."
        actions={
          <>
            <button className="btn-secondary" onClick={() => downloadCsv("edmo-rules-template.csv", RULE_TEMPLATE_HEADERS, [RULE_TEMPLATE_EXAMPLE])}>
              <IconDownload width={16} height={16} /> Template
            </button>
            <button className="btn-secondary" onClick={() => setImportOpen(true)}>
              <IconUpload width={16} height={16} /> Bulk Import
            </button>
            <button className="btn-primary" onClick={openAdd} disabled={!hasPublishedCatalog}>
              <IconPlus width={16} height={16} /> Add Rule
            </button>
          </>
        }
      />

      {!hasPublishedCatalog && (
        <div className="mb-4">
          <Notice tone="warn">
            <p className="font-bold">Your course catalog is empty.</p>
            <p className="mt-1">
              Rules must target a published catalog course. Publish your catalog first.{" "}
              <button className="font-bold underline" onClick={() => navigate("/catalog")}>Go to Catalog →</button>
            </p>
          </Notice>
        </div>
      )}

      {counts.unmatched > 0 && (
        <div className="mb-4">
          <Notice tone="warn">
            <span className="font-bold">{counts.unmatched} rule{counts.unmatched > 1 ? "s are" : " is"} UNMATCHED</span> — the
            target course is not in your published catalog, so they are excluded from live TCE mapping.
            Add and publish the missing course(s) in the Catalog tab to activate them.
          </Notice>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total rules" value={counts.total} />
        <StatCard label="Published" value={counts.published} tone="ok" />
        <StatCard label="Drafts" value={counts.draft} tone={counts.draft ? "warn" : undefined} />
        <StatCard label="Unmatched" value={counts.unmatched} tone={counts.unmatched ? "warn" : undefined} />
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-edmo-muted" width={16} height={16} />
          <input className="input pl-9" placeholder="Search source/target course…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={fStatus} onChange={(v) => setFStatus(v as RecordStatus | "ALL")} options={[["ALL", "All statuses"], ["DRAFT", "Draft"], ["PUBLISHED", "Published"], ["ARCHIVED", "Archived"]]} />
        <Select value={fInstitution} onChange={setFInstitution} options={[["ALL", "All institutions"], ...institutions.map((p) => [p, p] as [string, string])]} />
        <Select value={fSource} onChange={(v) => setFSource(v as RuleSource | "ALL")} options={[["ALL", "All sources"], ["UNIVERSITY_ENTERED", "University Entered"], ["PROMOTED_FROM_AI", "Promoted from AI"]]} />
        <Select value={fEquiv} onChange={(v) => setFEquiv(v as EquivalencyType | "ALL")} options={[["ALL", "All equivalencies"], ["FULL", "Full"], ["PARTIAL", "Partial"], ["ELECTIVE", "Elective"], ["NO_CREDIT", "No Credit"]]} />
        <button className="btn-ghost" onClick={exportCsv}><IconDownload width={16} height={16} /> Export</button>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-md border border-edmo-blue-100 bg-edmo-blue-50 px-4 py-2.5 text-sm">
          <span className="font-bold text-edmo-navy">{selected.size} selected</span>
          <button className="btn-primary py-1.5" disabled={!selectedDraftIds.length} onClick={() => setPublishIds(selectedDraftIds)}>
            <IconCheck width={15} height={15} /> Publish ({selectedDraftIds.length})
          </button>
          <button className="btn-secondary py-1.5" disabled={!selectedArchivableIds.length} onClick={() => setArchiveIds(selectedArchivableIds)}>
            <IconArchive width={15} height={15} /> Archive ({selectedArchivableIds.length})
          </button>
          <button className="btn-ghost py-1.5" onClick={clearSelection}>Clear</button>
        </div>
      )}

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title={rules.length === 0 ? "No articulation rules yet" : "No rules match your filters"}
            body={
              rules.length === 0
                ? "Upload your articulation rules via CSV/Excel, add them manually, or let approved AI suggestions get promoted to rules during evaluation."
                : "Try clearing search or filters."
            }
            action={rules.length === 0 && hasPublishedCatalog ? <button className="btn-primary" onClick={openAdd}><IconPlus width={16} height={16} /> Add your first rule</button> : undefined}
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
            rowClassName={(r) => (r.status === "ARCHIVED" ? "opacity-60" : "")}
          />
        )}
      </div>
      <p className="mt-2 text-xs text-edmo-muted">Showing {filtered.length} of {rules.length} rules.</p>

      {formOpen && (
        <RuleForm
          open={formOpen}
          rule={viewingRule ?? editing}
          readOnly={!!viewingRule && !editing}
          onClose={() => {
            setFormOpen(false);
            setViewingRule(null);
            setEditing(null);
          }}
          onEdit={
            viewingRule
              ? () => {
                  setEditing(viewingRule);
                  setViewingRule(null);
                }
              : undefined
          }
        />
      )}
      <RuleVersionHistory rule={historyFor} onClose={() => setHistoryFor(null)} />

      <ImportDialog<RuleDraft>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Bulk import rules from CSV / Excel"
        templateHeaders={RULE_TEMPLATE_HEADERS}
        exampleRow={RULE_TEMPLATE_EXAMPLE}
        templateFilename="edmo-rules-template.csv"
        maxRows={RULE_MAX_ROWS}
        validate={validateRuleRows(activeUniversity.id, actor)}
        uploadHint="Target course codes are validated against your published catalog. Rows targeting an unpublished course are flagged as errors. All valid rules land as DRAFT."
        onConfirm={(valid) => {
          valid.forEach((r) => store.createRule(r, actor));
          toast("success", `Imported ${valid.length} rule${valid.length > 1 ? "s" : ""} as draft.`);
        }}
      />

      <Modal
        open={!!publishIds}
        onClose={() => setPublishIds(null)}
        title="Publish rules"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPublishIds(null)}>Cancel</button>
            <button className="btn-primary" onClick={() => publishIds && doPublish(publishIds)}>Publish {publishIds?.length}</button>
          </>
        }
      >
        <p className="text-sm text-edmo-ink">
          Publishing <span className="font-bold">{publishIds?.length}</span> rule{publishIds && publishIds.length > 1 ? "s" : ""} into
          live TCE mapping. From this point forward, matching applicants get an instant deterministic decision — no AI run, no repeat review.
        </p>
        <p className="mt-2 text-sm text-edmo-muted">
          Previous published versions are retained for rollback. EDMO is notified of every publish event.
        </p>
      </Modal>

      <Modal
        open={!!archiveIds}
        onClose={() => setArchiveIds(null)}
        title={`Archive ${archiveIds?.length ?? 0} rule${(archiveIds?.length ?? 0) > 1 ? "s" : ""}?`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setArchiveIds(null)}>Cancel</button>
            <button className="btn-danger" onClick={() => archiveIds && doArchive(archiveIds)}>Archive</button>
          </>
        }
      >
        <p className="text-sm text-edmo-ink">
          Archived rules are removed from live TCE mapping but retained for audit. You can restore them to draft at any time.
        </p>
      </Modal>
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick} className="rounded-md p-1.5 text-edmo-muted hover:bg-edmo-blue-50 hover:text-edmo-navy">
      {children}
    </button>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select className="input w-auto py-2" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
    </select>
  );
}
