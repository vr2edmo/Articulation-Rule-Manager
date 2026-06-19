import { useState } from "react";
import type { ArticulationRule, CatalogCourse, EquivalencyType } from "@/domain/types";
import { store } from "@/domain/store";
import { useSession } from "@/app/session";
import { useToast } from "@/ui/toast";
import { Field, Notice, SlideOver } from "@/ui/components";
import { parseCredits } from "@/domain/util";
import { CatalogTypeahead } from "./CatalogTypeahead";

const EQUIV: { value: EquivalencyType; label: string }[] = [
  { value: "FULL", label: "Full equivalency" },
  { value: "PARTIAL", label: "Partial credit" },
  { value: "ELECTIVE", label: "Elective credit" },
  { value: "NO_CREDIT", label: "No credit" },
];

export function RuleForm({
  open,
  rule,
  onClose,
}: {
  open: boolean;
  rule: ArticulationRule | null;
  onClose: () => void;
}) {
  const { user, activeUniversity } = useSession();
  const toast = useToast();
  const isEdit = !!rule;

  const [form, setForm] = useState(() => ({
    source_institution_name: rule?.source_institution_name ?? "",
    source_city: rule?.source_city ?? "",
    source_state: rule?.source_state ?? "",
    source_course_code: rule?.source_course_code ?? "",
    source_course_name: rule?.source_course_name ?? "",
    source_course_description: rule?.source_course_description ?? "",
    source_course_credits: rule?.source_course_credits?.toString() ?? "",
    target_course_code: rule?.target_course_code ?? "",
    target_course_name: rule?.target_course_name ?? "",
    target_course_credits: rule?.target_course_credits?.toString() ?? "",
    equivalency_type: (rule?.equivalency_type ?? "FULL") as EquivalencyType,
    begin_date: rule?.begin_date ?? "",
    end_date: rule?.end_date ?? "",
    notes: rule?.notes ?? "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function onTarget(course: CatalogCourse | null) {
    if (course) {
      setForm((f) => ({
        ...f,
        target_course_code: course.course_code,
        target_course_name: course.course_name,
        target_course_credits: f.target_course_credits || (course.credit_hours?.toString() ?? ""),
      }));
    } else {
      setForm((f) => ({ ...f, target_course_code: "", target_course_name: "" }));
    }
  }

  const dupWarning =
    !!activeUniversity &&
    form.source_course_code.trim() &&
    form.target_course_code.trim() &&
    store.ruleExists(activeUniversity.id, form.source_course_code, form.target_course_code, rule?.id);

  function save() {
    const e: Record<string, string> = {};
    if (!form.source_institution_name.trim()) e.source_institution_name = "Required";
    if (!form.source_city.trim()) e.source_city = "Required";
    if (!form.source_state.trim()) e.source_state = "Required";
    if (!form.source_course_code.trim()) e.source_course_code = "Required";
    if (!form.source_course_name.trim()) e.source_course_name = "Required";
    if (!form.target_course_code.trim()) e.target_course_code = "Select a target course from your published catalog";
    if (!form.begin_date) e.begin_date = "Required";
    if (form.end_date && form.begin_date && form.end_date < form.begin_date) e.end_date = "End date is before begin date";
    setErrors(e);
    if (Object.keys(e).length || !activeUniversity || !user) return;

    const actor = user.name;
    const base = {
      source_institution_name: form.source_institution_name.trim(),
      source_city: form.source_city.trim(),
      source_state: form.source_state.trim().toUpperCase(),
      source_course_code: form.source_course_code.trim(),
      source_course_name: form.source_course_name.trim(),
      source_course_description: form.source_course_description.trim(),
      source_course_credits: parseCredits(form.source_course_credits),
      target_course_code: form.target_course_code,
      target_course_name: form.target_course_name,
      target_course_credits: parseCredits(form.target_course_credits),
      equivalency_type: form.equivalency_type,
      begin_date: form.begin_date,
      end_date: form.end_date,
      notes: form.notes.trim(),
    };

    if (isEdit && rule) {
      store.updateRule(rule.id, { ...base, status: "DRAFT" }, actor);
      toast("info", `Rule saved as draft. Publish to make it live in TCE mapping.`);
    } else {
      store.createRule(
        {
          ...base,
          source_institution_id: `src_${form.source_institution_name.trim().toLowerCase().replace(/\s+/g, "_")}`,
          target_university_id: activeUniversity.id,
          rule_source: "UNIVERSITY_ENTERED",
          status: "DRAFT",
          version_number: 0,
          published_at: null,
          last_modified_by: actor,
          last_modified_at: new Date().toISOString(),
          unmatched: false,
        },
        actor,
      );
      toast("info", `Rule added as draft. Publish to make it live in TCE mapping.`);
    }
    onClose();
  }

  if (!activeUniversity) return null;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit rule" : "Add articulation rule"}
      subtitle={
        isEdit
          ? `${rule?.source_course_code} → ${rule?.target_course_code} · v${rule?.version_number}`
          : "New rules are saved as DRAFT until published into TCE mapping"
      }
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save as Draft</button>
        </>
      }
    >
      <p className="mb-4 text-xs font-bold uppercase tracking-wide text-edmo-muted">Source institution</p>
      <Field label="Source university" required error={errors.source_institution_name}>
        <input className="input" value={form.source_institution_name} onChange={(e) => set("source_institution_name", e.target.value)} placeholder="Arizona State University" />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Field label="City" required error={errors.source_city}>
            <input className="input" value={form.source_city} onChange={(e) => set("source_city", e.target.value)} placeholder="Tempe" />
          </Field>
        </div>
        <Field label="State" required error={errors.source_state}>
          <input className="input" value={form.source_state} onChange={(e) => set("source_state", e.target.value)} placeholder="AZ" maxLength={20} />
        </Field>
      </div>

      <hr className="my-5 border-edmo-line" />

      <p className="mb-4 text-xs font-bold uppercase tracking-wide text-edmo-muted">Source course (incoming)</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Course ID" required error={errors.source_course_code}>
          <input className="input" value={form.source_course_code} onChange={(e) => set("source_course_code", e.target.value)} placeholder="HIST 202" />
        </Field>
        <Field label="Source course credits">
          <input className="input" value={form.source_course_credits} onChange={(e) => set("source_course_credits", e.target.value)} placeholder="3" inputMode="decimal" />
        </Field>
      </div>
      <Field label="Course name" required error={errors.source_course_name}>
        <input className="input" value={form.source_course_name} onChange={(e) => set("source_course_name", e.target.value)} placeholder="Modern World History" />
      </Field>
      <Field label="Source course description" hint="Stored at rule creation time for the AI audit trail. Optional.">
        <textarea className="input min-h-[70px]" value={form.source_course_description} onChange={(e) => set("source_course_description", e.target.value)} />
      </Field>

      <hr className="my-5 border-edmo-line" />

      <p className="mb-4 text-xs font-bold uppercase tracking-wide text-edmo-muted">Target course (your university)</p>
      <Field label="Target course" required error={errors.target_course_code} hint="Must be a course from your published catalog.">
        <CatalogTypeahead universityId={activeUniversity.id} value={form.target_course_code} onSelect={onTarget} />
      </Field>

      {dupWarning && (
        <div className="-mt-2 mb-4">
          <Notice tone="warn">
            A rule already maps {form.source_course_code} → {form.target_course_code} for this
            institution. You can still save, but check for duplicates.
          </Notice>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Target course credits">
          <input className="input" value={form.target_course_credits} onChange={(e) => set("target_course_credits", e.target.value)} placeholder="3" inputMode="decimal" />
        </Field>
        <Field label="Equivalency">
          <select className="input" value={form.equivalency_type} onChange={(e) => set("equivalency_type", e.target.value as EquivalencyType)}>
            {EQUIV.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <hr className="my-5 border-edmo-line" />

      <p className="mb-4 text-xs font-bold uppercase tracking-wide text-edmo-muted">Validity period</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Begin date" required error={errors.begin_date}>
          <input className="input" type="date" value={form.begin_date} onChange={(e) => set("begin_date", e.target.value)} />
        </Field>
        <Field label="End date" hint="Leave blank if ongoing" error={errors.end_date}>
          <input className="input" type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
        </Field>
      </div>

      <Field label="Notes" hint="Optional internal notes.">
        <textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
    </SlideOver>
  );
}
