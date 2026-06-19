// ---------------------------------------------------------------------------
// Domain model for the EDMO Articulation Rules Manager (ARM) + Course Catalog
// Manager (CCM). Mirrors PRD §5 (Data Architecture & Mapping State Model).
//
// These types are the contract between the UI and the repository layer. They
// are intentionally framework-agnostic so a real Node/Postgres API can adopt
// them verbatim when the prototype graduates to a backend.
// ---------------------------------------------------------------------------

export type RecordStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type CatalogRecordSource =
  | "CSV_IMPORT"
  | "MANUALLY_ENTERED"
  | "MIGRATED_FROM_EDMO";

// Rules originate from the university (manual entry or CSV/Excel upload) or are
// promoted from an approved AI suggestion. No TES seeding — partner universities
// upload their own articulation rules.
export type RuleSource = "UNIVERSITY_ENTERED" | "PROMOTED_FROM_AI";

export type EquivalencyType = "FULL" | "PARTIAL" | "ELECTIVE" | "NO_CREDIT";

// --- Layer 0: Course Catalog (PRD §5.2) -----------------------------------
export interface CatalogCourse {
  id: string;
  target_university_id: string;
  program_name: string;
  course_code: string;
  course_name: string;
  course_description: string;
  credit_hours: number | null;
  prerequisites: string;
  status: RecordStatus;
  version_number: number;
  catalog_year: string;
  published_at: string | null;
  last_modified_by: string;
  last_modified_at: string;
  record_source: CatalogRecordSource;
  /** Snapshots of each published version, newest last. Enables F4 rollback. */
  version_history: CatalogVersionSnapshot[];
}

export interface CatalogVersionSnapshot {
  version_number: number;
  published_at: string;
  modified_by: string;
  values: Pick<
    CatalogCourse,
    | "program_name"
    | "course_code"
    | "course_name"
    | "course_description"
    | "credit_hours"
    | "prerequisites"
    | "catalog_year"
  >;
}

// --- Layer 1: Articulation Rules (TES format) -----------------------------
// Field set mirrors the TES articulation-rule record: source institution +
// location, source course identity + credits, target course + credits,
// equivalency, and the validity window (begin/end dates).
export interface ArticulationRule {
  id: string;
  source_institution_id: string;
  source_institution_name: string; // Source University
  source_city: string;
  source_state: string;
  source_course_code: string; // Source Course ID
  source_course_name: string;
  source_course_description: string; // optional — kept for AI audit trail
  source_course_credits: number | null;
  target_university_id: string;
  target_course_code: string;
  target_course_name: string;
  target_course_credits: number | null;
  equivalency_type: EquivalencyType;
  begin_date: string; // YYYY-MM-DD — when the rule takes effect
  end_date: string; // YYYY-MM-DD — "" means ongoing / open-ended
  rule_source: RuleSource;
  status: RecordStatus;
  version_number: number;
  published_at: string | null;
  last_modified_by: string;
  last_modified_at: string;
  notes: string;
  /**
   * UNMATCHED when the target_course_code does not resolve to a PUBLISHED
   * catalog entry. Excluded from live TCE mapping. Computed on read.
   */
  unmatched: boolean;
  version_history: RuleVersionSnapshot[];
}

export interface RuleVersionSnapshot {
  version_number: number;
  published_at: string;
  modified_by: string;
  values: Pick<
    ArticulationRule,
    | "source_institution_name"
    | "source_city"
    | "source_state"
    | "source_course_code"
    | "source_course_name"
    | "source_course_description"
    | "source_course_credits"
    | "target_course_code"
    | "target_course_name"
    | "target_course_credits"
    | "equivalency_type"
    | "begin_date"
    | "end_date"
    | "notes"
  >;
}

// --- Tenancy & identity ----------------------------------------------------
export interface University {
  id: string;
  name: string;
  short_name: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  /** EDMO admins have cross-university visibility (PRD F13/F14). */
  role: "UNIVERSITY" | "EDMO_ADMIN";
  university_id: string | null;
}

// --- Audit log (PRD F4/F9/F14) --------------------------------------------
export type AuditModule = "CCM" | "ARM";

export interface AuditEntry {
  id: string;
  university_id: string;
  module: AuditModule;
  action: string;
  entity_label: string;
  actor: string;
  timestamp: string;
  detail?: string;
}

// --- CSV/XLSX import support ----------------------------------------------
export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult<T> {
  valid: T[];
  errors: ImportRowError[];
  duplicateWarnings: { row: number; message: string }[];
  totalRows: number;
}
