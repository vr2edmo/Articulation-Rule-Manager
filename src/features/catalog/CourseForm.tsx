import { useState } from "react";
import type { CatalogCourse } from "@/domain/types";
import { store } from "@/domain/store";
import { useSession } from "@/app/session";
import { useToast } from "@/ui/toast";
import { Field, Notice, SlideOver } from "@/ui/components";
import { parseCredits } from "@/domain/util";

interface Props {
  open: boolean;
  course: CatalogCourse | null; // null => add
  readOnly?: boolean;
  onClose: () => void;
  onEdit?: () => void; // called when user clicks Edit in read-only mode
}

const empty = {
  program_name: "",
  course_code: "",
  course_name: "",
  course_description: "",
  credit_hours: "3",
  prerequisites: "",
  catalog_year: "2025-2026",
};

export function CourseForm({ open, course, readOnly = false, onClose, onEdit }: Props) {
  const { user, activeUniversity } = useSession();
  const toast = useToast();
  const isEdit = !!course;

  const [form, setForm] = useState(() =>
    course
      ? {
          program_name: course.program_name,
          course_code: course.course_code,
          course_name: course.course_name,
          course_description: course.course_description,
          credit_hours: course.credit_hours?.toString() ?? "",
          prerequisites: course.prerequisites,
          catalog_year: course.catalog_year,
        }
      : { ...empty },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Duplicate warning (warn, not block — PRD F3 AC).
  const dupWarning =
    !!activeUniversity &&
    form.course_code.trim() &&
    store.catalogCodeExists(activeUniversity.id, form.course_code, course?.id);

  const thinDescription = form.course_description.trim().length > 0 && form.course_description.trim().length < 40;

  function save() {
    const e: Record<string, string> = {};
    if (!form.program_name.trim()) e.program_name = "Program name is required";
    if (!form.course_code.trim()) e.course_code = "Course code is required";
    if (!form.course_name.trim()) e.course_name = "Course name is required";
    if (!form.catalog_year.trim()) e.catalog_year = "Catalog year is required";
    setErrors(e);
    if (Object.keys(e).length || !activeUniversity || !user) return;

    const actor = user.name;
    if (isEdit && course) {
      store.updateCatalogCourse(
        course.id,
        {
          program_name: form.program_name.trim(),
          course_code: form.course_code.trim(),
          course_name: form.course_name.trim(),
          course_description: form.course_description.trim(),
          credit_hours: parseCredits(form.credit_hours),
          prerequisites: form.prerequisites.trim(),
          catalog_year: form.catalog_year.trim(),
          status: "DRAFT", // edits return the record to DRAFT until re-published
        },
        actor,
      );
      toast("info", `“${form.course_code}” saved as draft. Publish to make it live for AI matching.`);
    } else {
      store.createCatalogCourse(
        {
          target_university_id: activeUniversity.id,
          program_name: form.program_name.trim(),
          course_code: form.course_code.trim(),
          course_name: form.course_name.trim(),
          course_description: form.course_description.trim(),
          credit_hours: parseCredits(form.credit_hours),
          prerequisites: form.prerequisites.trim(),
          status: "DRAFT",
          version_number: 0,
          catalog_year: form.catalog_year.trim(),
          published_at: null,
          last_modified_by: actor,
          last_modified_at: new Date().toISOString(),
          record_source: "MANUALLY_ENTERED",
        },
        actor,
      );
      toast("info", `“${form.course_code}” added as draft. Publish to make it live for AI matching.`);
    }
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={readOnly ? "View course" : isEdit ? "Edit course" : "Add course"}
      subtitle={isEdit ? `${course?.course_code} · v${course?.version_number}` : "New courses are saved as DRAFT until published"}
      footer={
        readOnly ? undefined : (
          <>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={save}>Save as Draft</button>
          </>
        )
      }
    >
      <Field label="Program name" required={!readOnly} error={errors.program_name}>
        {readOnly ? (
          <div className="text-sm font-semibold text-edmo-navy py-1">{form.program_name || "—"}</div>
        ) : (
          <input
            className="input"
            value={form.program_name}
            onChange={(e) => set("program_name", e.target.value)}
            placeholder="Bachelor of Science in Computer Science"
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Course code" required={!readOnly} error={errors.course_code}>
          {readOnly ? (
            <div className="text-sm font-semibold text-edmo-navy py-1">{form.course_code || "—"}</div>
          ) : (
            <input
              className="input"
              value={form.course_code}
              onChange={(e) => set("course_code", e.target.value)}
              placeholder="CS 301"
            />
          )}
        </Field>
        <Field label="Credit hours">
          {readOnly ? (
            <div className="text-sm font-semibold text-edmo-navy py-1">{form.credit_hours || "—"}</div>
          ) : (
            <input
              className="input"
              value={form.credit_hours}
              onChange={(e) => set("credit_hours", e.target.value)}
              placeholder="3"
              inputMode="decimal"
            />
          )}
        </Field>
      </div>

      {!readOnly && dupWarning && (
        <div className="-mt-2 mb-4">
          <Notice tone="warn">
            A course with code “{form.course_code}” already exists for this university. You can still
            save — codes are not required to be unique, but duplicates may confuse rule targeting.
          </Notice>
        </div>
      )}

      <Field label="Course name" required={!readOnly} error={errors.course_name}>
        {readOnly ? (
          <div className="text-sm font-semibold text-edmo-navy py-1">{form.course_name || "—"}</div>
        ) : (
          <input
            className="input"
            value={form.course_name}
            onChange={(e) => set("course_name", e.target.value)}
            placeholder="Data Structures and Algorithms"
          />
        )}
      </Field>

      <Field
        label="Course description"
        hint={!readOnly ? "This description is used by EDMO's AI for transfer credit matching — include as much detail as possible (topics, methods, learning outcomes)." : undefined}
      >
        {readOnly ? (
          <div className="text-sm text-edmo-ink whitespace-pre-wrap py-1 leading-relaxed">{form.course_description || "—"}</div>
        ) : (
          <textarea
            className="input min-h-[140px]"
            value={form.course_description}
            onChange={(e) => set("course_description", e.target.value)}
            placeholder="Describe the topics covered, methods, and learning outcomes…"
          />
        )}
      </Field>

      {!readOnly && thinDescription && (
        <div className="-mt-2 mb-4">
          <Notice tone="warn">
            This description is quite short. Detailed descriptions measurably improve AI matching
            accuracy.
          </Notice>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Catalog year" required={!readOnly} error={errors.catalog_year}>
          {readOnly ? (
            <div className="text-sm font-semibold text-edmo-navy py-1">{form.catalog_year || "—"}</div>
          ) : (
            <input
              className="input"
              value={form.catalog_year}
              onChange={(e) => set("catalog_year", e.target.value)}
              placeholder="2025-2026"
            />
          )}
        </Field>
        <Field label="Prerequisites" hint={!readOnly ? "Optional" : undefined}>
          {readOnly ? (
            <div className="text-sm font-semibold text-edmo-navy py-1">{form.prerequisites || "—"}</div>
          ) : (
            <input
              className="input"
              value={form.prerequisites}
              onChange={(e) => set("prerequisites", e.target.value)}
              placeholder="CS 101, MATH 120"
            />
          )}
        </Field>
      </div>
    </SlideOver>
  );
}
