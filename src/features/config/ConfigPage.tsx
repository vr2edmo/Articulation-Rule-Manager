import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/app/session";
import { useStoreSnapshot } from "@/domain/hooks";
import { store } from "@/domain/store";
import type { ConfigToolId, UniversityConfig } from "@/domain/types";
import { PageHeader } from "@/ui/PageHeader";
import { Field, Toggle } from "@/ui/components";
import { useToast } from "@/ui/toast";
import { IconCheck, IconRollback } from "@/ui/icons";

const TOOLS: { id: ConfigToolId; name: string; tagline: string }[] = [
  { id: "transfer_credit", name: "Transfer Credit Evaluator", tagline: "Limits, grade floor & alerts" },
  { id: "gpa", name: "GPA", tagline: "Scale & good-standing rules" },
  { id: "document_analyzer", name: "Document Analyzer", tagline: "OCR & extraction confidence" },
  { id: "email_extractor", name: "Email Doc Extractor", tagline: "Inbox monitoring & routing" },
];

const GRADES = ["A (4.0)", "A- (3.7)", "B+ (3.3)", "B (3.0)", "B- (2.7)", "C+ (2.3)", "C (2.0)", "C- (1.7)", "D (1.0)"];

export default function ConfigPage() {
  const { activeUniversity, user } = useSession();
  const snap = useStoreSnapshot();
  const toast = useToast();
  const [selected, setSelected] = useState<ConfigToolId>("transfer_credit");

  const saved = useMemo(
    () => (activeUniversity ? store.getConfig(activeUniversity.id) : null),
    [snap, activeUniversity],
  );

  // Local editable draft, re-synced whenever the saved config / university changes.
  const [draft, setDraft] = useState<UniversityConfig | null>(saved);
  useEffect(() => setDraft(saved), [saved]);

  if (!activeUniversity || !user || !draft || !saved) return null;

  const tool = TOOLS.find((t) => t.id === selected)!;
  const dirty = JSON.stringify(draft[selected]) !== JSON.stringify(saved[selected]);

  function patch<T extends ConfigToolId>(toolId: T, p: Partial<UniversityConfig[T]>) {
    setDraft((d) => (d ? { ...d, [toolId]: { ...d[toolId], ...p } } : d));
  }

  function save() {
    store.updateToolConfig(activeUniversity!.id, selected, draft![selected], user!.name, tool.name);
    toast("success", `${tool.name} settings saved.`);
  }

  function revert() {
    setDraft((d) => (d ? { ...d, [selected]: saved![selected] } : d));
  }

  return (
    <div>
      <PageHeader
        title="Configuration"
        subtitle="Tune how each EDMO tool processes your applicants. Changes apply to this institution and are recorded in the Activity Log."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* Tool list */}
        <nav className="card h-max overflow-hidden p-1.5">
          {TOOLS.map((t) => {
            const on = draft![t.id].enabled;
            const active = t.id === selected;
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active ? "bg-edmo-navy text-white" : "hover:bg-edmo-blue-50"
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    on ? "bg-status-published" : active ? "bg-white/40" : "bg-edmo-line"
                  }`}
                  title={on ? "Enabled" : "Disabled"}
                />
                <span className="min-w-0">
                  <span className={`block truncate text-sm font-bold ${active ? "text-white" : "text-edmo-ink"}`}>
                    {t.name}
                  </span>
                  <span className={`block truncate text-xs ${active ? "text-white/70" : "text-edmo-muted"}`}>
                    {t.tagline}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Settings panel */}
        <div className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-edmo-line pb-4">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-edmo-navy">{tool.name}</h2>
              <p className="mt-0.5 text-sm text-edmo-muted">{tool.tagline}</p>
            </div>
            <Toggle
              checked={draft![selected].enabled}
              onChange={(v) => patch(selected, { enabled: v } as never)}
              label={draft![selected].enabled ? "Enabled" : "Disabled"}
            />
          </div>

          <div className={draft![selected].enabled ? "" : "pointer-events-none opacity-50"}>
            {selected === "transfer_credit" && <TransferCreditForm draft={draft!} patch={patch} grades={GRADES} />}
            {selected === "gpa" && <GpaForm draft={draft!} patch={patch} />}
            {selected === "document_analyzer" && <DocAnalyzerForm draft={draft!} patch={patch} />}
            {selected === "email_extractor" && <EmailExtractorForm draft={draft!} patch={patch} />}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-edmo-line pt-4">
            {dirty && <span className="mr-auto text-xs font-bold text-status-warn">Unsaved changes</span>}
            <button className="btn-secondary" onClick={revert} disabled={!dirty}>
              <IconRollback width={16} height={16} /> Revert
            </button>
            <button className="btn-primary" onClick={save} disabled={!dirty}>
              <IconCheck width={16} height={16} /> Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Per-tool forms -------------------------------------------------------
type PatchFn = <T extends ConfigToolId>(t: T, p: Partial<UniversityConfig[T]>) => void;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-5">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-edmo-muted">{title}</h3>
      {children}
    </section>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-edmo-line/70 py-3 last:border-0">
      <div>
        <p className="text-sm font-bold text-edmo-ink">{label}</p>
        {hint && <p className="text-xs text-edmo-muted">{hint}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={checked ? "Enabled" : "Off"} />
    </div>
  );
}

function TransferCreditForm({ draft, patch, grades }: { draft: UniversityConfig; patch: PatchFn; grades: string[] }) {
  const c = draft.transfer_credit;
  return (
    <>
      <Section title="Transfer Credit Limits & Notifications">
        <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
          <Field label="Max Allowed Transfer Credits" hint="Maximum number of transfer credits allowed per student">
            <input
              type="number"
              className="input"
              value={c.max_transfer_credits}
              onChange={(e) => patch("transfer_credit", { max_transfer_credits: Number(e.target.value) })}
            />
          </Field>
          <Field label="Credit Limit Warning Threshold" hint="Warn when a student approaches this credit limit">
            <input
              type="number"
              className="input"
              value={c.warning_threshold}
              onChange={(e) => patch("transfer_credit", { warning_threshold: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Minimum Prior Course Grade Required" hint="Courses with grades below this threshold will not be considered for transfer">
          <select className="input" value={c.min_grade} onChange={(e) => patch("transfer_credit", { min_grade: e.target.value })}>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
        <ToggleRow
          label="Auto-approve full equivalencies"
          hint="Skip manual review when a published rule maps to a full equivalency"
          checked={c.auto_approve_full}
          onChange={(v) => patch("transfer_credit", { auto_approve_full: v })}
        />
      </Section>
      <Section title="Email Alert Recipients">
        <ToggleRow label="Notify assigned counselor" checked={c.notify_counselor} onChange={(v) => patch("transfer_credit", { notify_counselor: v })} />
        <ToggleRow label="Notify registrar office" checked={c.notify_registrar} onChange={(v) => patch("transfer_credit", { notify_registrar: v })} />
      </Section>
    </>
  );
}

function GpaForm({ draft, patch }: { draft: UniversityConfig; patch: PatchFn }) {
  const c = draft.gpa;
  return (
    <Section title="GPA Calculation">
      <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
        <Field label="GPA Scale" hint="The maximum grade-point value used in calculations">
          <select className="input" value={c.scale} onChange={(e) => patch("gpa", { scale: e.target.value as never })}>
            <option value="4.0">4.0</option>
            <option value="4.3">4.3</option>
            <option value="5.0">5.0</option>
          </select>
        </Field>
        <Field label="Minimum GPA for Good Standing">
          <input
            type="number"
            step="0.1"
            className="input"
            value={c.min_good_standing}
            onChange={(e) => patch("gpa", { min_good_standing: Number(e.target.value) })}
          />
        </Field>
        <Field label="Rounding" hint="Decimal places shown on computed GPAs">
          <select className="input" value={c.rounding} onChange={(e) => patch("gpa", { rounding: e.target.value as never })}>
            <option value="2">2 decimals (3.67)</option>
            <option value="1">1 decimal (3.7)</option>
          </select>
        </Field>
      </div>
      <ToggleRow
        label="Include transfer credits in GPA"
        hint="Count accepted transfer courses toward the cumulative GPA"
        checked={c.include_transfer}
        onChange={(v) => patch("gpa", { include_transfer: v })}
      />
    </Section>
  );
}

function DocAnalyzerForm({ draft, patch }: { draft: UniversityConfig; patch: PatchFn }) {
  const c = draft.document_analyzer;
  return (
    <>
      <Section title="Extraction">
        <Field label={`Confidence Threshold — ${c.confidence_threshold}%`} hint="Extractions below this confidence are held for review">
          <input
            type="range"
            min={50}
            max={99}
            className="w-full accent-edmo-navy"
            value={c.confidence_threshold}
            onChange={(e) => patch("document_analyzer", { confidence_threshold: Number(e.target.value) })}
          />
        </Field>
        <Field label="OCR Language">
          <select className="input" value={c.ocr_language} onChange={(e) => patch("document_analyzer", { ocr_language: e.target.value as never })}>
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
          </select>
        </Field>
        <ToggleRow
          label="Auto-flag low-confidence extractions"
          hint="Send below-threshold results to a manual review queue"
          checked={c.auto_flag_low_confidence}
          onChange={(v) => patch("document_analyzer", { auto_flag_low_confidence: v })}
        />
      </Section>
      <Section title="Detected Document Types">
        <ToggleRow label="Transcripts" checked={c.detect_transcripts} onChange={(v) => patch("document_analyzer", { detect_transcripts: v })} />
        <ToggleRow label="Course syllabi" checked={c.detect_syllabi} onChange={(v) => patch("document_analyzer", { detect_syllabi: v })} />
      </Section>
    </>
  );
}

function EmailExtractorForm({ draft, patch }: { draft: UniversityConfig; patch: PatchFn }) {
  const c = draft.email_extractor;
  return (
    <Section title="Inbox Monitoring">
      <Field label="Monitored Inbox Address" hint="EDMO watches this mailbox for incoming transcript attachments">
        <input
          type="email"
          className="input"
          value={c.inbox_address}
          onChange={(e) => patch("email_extractor", { inbox_address: e.target.value })}
        />
      </Field>
      <Field label="Allowed Sender Domains" hint="Comma-separated. Leave blank to accept all senders.">
        <input
          type="text"
          className="input"
          placeholder="meridian.edu, registrar.gov"
          value={c.allowed_domains}
          onChange={(e) => patch("email_extractor", { allowed_domains: e.target.value })}
        />
      </Field>
      <Field label="Forward Unrecognized Emails To" hint="Where to route mail that isn't a recognized transcript">
        <input
          type="email"
          className="input"
          placeholder="support@goedmo.com"
          value={c.forward_unrecognized}
          onChange={(e) => patch("email_extractor", { forward_unrecognized: e.target.value })}
        />
      </Field>
      <ToggleRow
        label="Auto-extract attachments"
        hint="Pull and process attachments automatically on arrival"
        checked={c.auto_extract}
        onChange={(v) => patch("email_extractor", { auto_extract: v })}
      />
    </Section>
  );
}
