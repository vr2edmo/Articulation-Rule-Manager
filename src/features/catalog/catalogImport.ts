import type { CatalogCourse, ImportResult } from "@/domain/types";
import type { RawRow } from "@/domain/fileio";
import { store } from "@/domain/store";
import { parseCredits } from "@/domain/util";

export const CATALOG_TEMPLATE_HEADERS = [
  "program_name",
  "course_code",
  "course_name",
  "course_description",
  "credit_hours",
  "prerequisites",
  "catalog_year",
];

export const CATALOG_TEMPLATE_EXAMPLE = [
  "Bachelor of Science in Computer Science",
  "CS 301",
  "Data Structures and Algorithms",
  "In-depth study of arrays, linked lists, trees, graphs, hashing, sorting/searching algorithms, and Big-O complexity analysis.",
  "4",
  "CS 101",
  "2025-2026",
];

export const CATALOG_MAX_ROWS = 2000;

/** Draft catalog course built from an import row (no id/history yet). */
export type CatalogDraft = Omit<CatalogCourse, "id" | "version_history">;

export function validateCatalogRows(universityId: string, actor: string) {
  return (rows: RawRow[]): ImportResult<CatalogDraft> => {
    const valid: CatalogDraft[] = [];
    const errors: ImportResult<CatalogDraft>["errors"] = [];
    const duplicateWarnings: ImportResult<CatalogDraft>["duplicateWarnings"] = [];
    const seenInFile = new Set<string>();

    rows.forEach((row, i) => {
      const rowNum = i + 2; // header is row 1
      const program_name = (row.program_name ?? "").trim();
      const course_code = (row.course_code ?? "").trim();
      const course_name = (row.course_name ?? "").trim();
      const catalog_year = (row.catalog_year ?? "").trim() || "2025-2026";

      let rowOk = true;
      if (!program_name) {
        errors.push({ row: rowNum, field: "program_name", message: "Required" });
        rowOk = false;
      }
      if (!course_code) {
        errors.push({ row: rowNum, field: "course_code", message: "Required" });
        rowOk = false;
      }
      if (!course_name) {
        errors.push({ row: rowNum, field: "course_name", message: "Required" });
        rowOk = false;
      }
      const credits = parseCredits(row.credit_hours);
      if (row.credit_hours && credits === null) {
        errors.push({ row: rowNum, field: "credit_hours", message: `Not a number: "${row.credit_hours}"` });
        rowOk = false;
      }
      if (!rowOk) return;

      // Duplicate detection: warn, never block (PRD F2 AC).
      const codeKey = course_code.toLowerCase();
      if (store.catalogCodeExists(universityId, course_code) || seenInFile.has(codeKey)) {
        duplicateWarnings.push({ row: rowNum, message: `Course code "${course_code}" already exists` });
      }
      seenInFile.add(codeKey);

      valid.push({
        target_university_id: universityId,
        program_name,
        course_code,
        course_name,
        course_description: (row.course_description ?? "").trim(),
        credit_hours: credits,
        prerequisites: (row.prerequisites ?? "").trim(),
        status: "DRAFT",
        version_number: 0,
        catalog_year,
        published_at: null,
        last_modified_by: actor,
        last_modified_at: new Date().toISOString(),
        record_source: "CSV_IMPORT",
      });
    });

    return { valid, errors, duplicateWarnings, totalRows: rows.length };
  };
}
