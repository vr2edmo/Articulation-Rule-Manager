import type { ArticulationRule, EquivalencyType, ImportResult } from "@/domain/types";
import type { RawRow } from "@/domain/fileio";
import { store } from "@/domain/store";
import { parseCredits } from "@/domain/util";

// TES-format articulation rule template. Universities upload their rules here —
// there is no automated TES seeding.
export const RULE_TEMPLATE_HEADERS = [
  "source_university",
  "source_city",
  "source_state",
  "source_course_id",
  "source_course_name",
  "source_course_credits",
  "target_course_code",
  "target_course_credits",
  "equivalency",
  "begin_date",
  "end_date",
  "notes",
];

export const RULE_TEMPLATE_EXAMPLE = [
  "Arizona State University",
  "Tempe",
  "AZ",
  "HIST 202",
  "Modern World History",
  "3",
  "HIST 101",
  "3",
  "FULL",
  "2024-08-01",
  "", // open-ended
  "",
];

export const RULE_MAX_ROWS = 500;

const VALID_EQUIV: EquivalencyType[] = ["FULL", "PARTIAL", "ELECTIVE", "NO_CREDIT"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export type RuleDraft = Omit<ArticulationRule, "id" | "version_history">;

export function validateRuleRows(universityId: string, actor: string) {
  // Target codes are validated against the PUBLISHED catalog during import.
  const publishedByCode = new Map(
    store.getPublishedCatalog(universityId).map((c) => [c.course_code.trim().toLowerCase(), c]),
  );

  return (rows: RawRow[]): ImportResult<RuleDraft> => {
    const valid: RuleDraft[] = [];
    const errors: ImportResult<RuleDraft>["errors"] = [];
    const duplicateWarnings: ImportResult<RuleDraft>["duplicateWarnings"] = [];
    const seen = new Set<string>();

    rows.forEach((row, i) => {
      const rowNum = i + 2;
      const institution = (row.source_university ?? "").trim();
      const city = (row.source_city ?? "").trim();
      const state = (row.source_state ?? "").trim();
      const srcCode = (row.source_course_id ?? "").trim();
      const srcName = (row.source_course_name ?? "").trim();
      const tgtCode = (row.target_course_code ?? "").trim();
      const equivRaw = (row.equivalency ?? "FULL").trim().toUpperCase();
      const beginDate = (row.begin_date ?? "").trim();
      const endDate = (row.end_date ?? "").trim();

      let ok = true;
      const req = (val: string, field: string) => {
        if (!val) { errors.push({ row: rowNum, field, message: "Required" }); ok = false; }
      };
      req(institution, "source_university");
      req(city, "source_city");
      req(state, "source_state");
      req(srcCode, "source_course_id");
      req(srcName, "source_course_name");
      req(tgtCode, "target_course_code");

      const equiv = (VALID_EQUIV.includes(equivRaw as EquivalencyType) ? equivRaw : null) as EquivalencyType | null;
      if (!equiv) {
        errors.push({ row: rowNum, field: "equivalency", message: `Must be one of: ${VALID_EQUIV.join(", ")}` });
        ok = false;
      }

      // Begin date required; end date optional (blank = ongoing).
      if (!beginDate) {
        errors.push({ row: rowNum, field: "begin_date", message: "Required (YYYY-MM-DD)" });
        ok = false;
      } else if (!isValidDate(beginDate)) {
        errors.push({ row: rowNum, field: "begin_date", message: `Invalid date "${beginDate}" — use YYYY-MM-DD` });
        ok = false;
      }
      if (endDate && !isValidDate(endDate)) {
        errors.push({ row: rowNum, field: "end_date", message: `Invalid date "${endDate}" — use YYYY-MM-DD` });
        ok = false;
      }
      if (beginDate && endDate && isValidDate(beginDate) && isValidDate(endDate) && endDate < beginDate) {
        errors.push({ row: rowNum, field: "end_date", message: "End date is before begin date" });
        ok = false;
      }

      // Target must resolve to a published catalog entry.
      const target = publishedByCode.get(tgtCode.toLowerCase());
      if (tgtCode && !target) {
        errors.push({
          row: rowNum,
          field: "target_course_code",
          message: `"${tgtCode}" is not in your published catalog. Publish it first, then re-import.`,
        });
        ok = false;
      }
      if (!ok || !target || !equiv) return;

      const key = `${srcCode.toLowerCase()}→${tgtCode.toLowerCase()}`;
      if (store.ruleExists(universityId, srcCode, tgtCode) || seen.has(key)) {
        duplicateWarnings.push({ row: rowNum, message: `Rule ${srcCode} → ${tgtCode} already exists` });
      }
      seen.add(key);

      valid.push({
        source_institution_id: `src_${institution.toLowerCase().replace(/\s+/g, "_")}`,
        source_institution_name: institution,
        source_city: city,
        source_state: state.toUpperCase(),
        source_course_code: srcCode,
        source_course_name: srcName,
        source_course_description: "",
        source_course_credits: parseCredits(row.source_course_credits),
        target_university_id: universityId,
        target_course_code: target.course_code,
        target_course_name: target.course_name,
        target_course_credits: parseCredits(row.target_course_credits) ?? target.credit_hours,
        equivalency_type: equiv,
        begin_date: beginDate,
        end_date: endDate,
        rule_source: "UNIVERSITY_ENTERED",
        status: "DRAFT",
        version_number: 0,
        published_at: null,
        last_modified_by: actor,
        last_modified_at: new Date().toISOString(),
        notes: (row.notes ?? "").trim(),
        unmatched: false,
      });
    });

    return { valid, errors, duplicateWarnings, totalRows: rows.length };
  };
}
