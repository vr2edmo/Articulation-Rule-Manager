// ---------------------------------------------------------------------------
// Data layer. A synchronous, subscribable in-memory store persisted to
// localStorage. It is the single source of truth for the prototype.
//
// SWAP NOTE: every mutation below maps 1:1 to a REST endpoint a Node/Postgres
// backend would expose (e.g. createCatalogCourse -> POST /catalog). To graduate
// to a real backend, replace this module with an API client of the same shape
// and move reads behind React Query; no UI component needs to change its calls.
// ---------------------------------------------------------------------------

import type {
  ArticulationRule,
  AuditEntry,
  AuditModule,
  CatalogCourse,
  RecordStatus,
} from "./types";
import { SEED_CATALOG, SEED_RULES } from "./seed";
import { nowIso, uid } from "./util";

const STORAGE_KEY = "edmo_arm_state_v1";

interface PersistShape {
  catalog: CatalogCourse[];
  rules: ArticulationRule[];
  audit: AuditEntry[];
}

function load(): PersistShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistShape;
  } catch {
    /* ignore corrupt state, fall back to seed */
  }
  return { catalog: SEED_CATALOG, rules: SEED_RULES, audit: [] };
}

class Store {
  private state: PersistShape = load();
  private listeners = new Set<() => void>();

  // --- subscription plumbing for useSyncExternalStore --------------------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private snapshot = this.state;
  getSnapshot = () => this.snapshot;

  private commit() {
    // new top-level reference so useSyncExternalStore detects the change
    this.snapshot = { ...this.state };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* storage full / unavailable — keep working in-memory */
    }
    this.listeners.forEach((l) => l());
  }

  resetToSeed() {
    this.state = { catalog: SEED_CATALOG, rules: SEED_RULES, audit: [] };
    this.commit();
  }

  // --- audit -------------------------------------------------------------
  private log(
    university_id: string,
    module: AuditModule,
    action: string,
    entity_label: string,
    actor: string,
    detail?: string,
  ) {
    this.state.audit = [
      {
        id: uid("aud"),
        university_id,
        module,
        action,
        entity_label,
        actor,
        timestamp: nowIso(),
        detail,
      },
      ...this.state.audit,
    ];
  }

  getAudit(university_id: string | null): AuditEntry[] {
    if (university_id === null) return this.state.audit;
    return this.state.audit.filter((a) => a.university_id === university_id);
  }

  // =======================================================================
  // CATALOG (Layer 0)
  // =======================================================================
  getCatalog(university_id: string): CatalogCourse[] {
    return this.state.catalog.filter((c) => c.target_university_id === university_id);
  }

  getPublishedCatalog(university_id: string): CatalogCourse[] {
    return this.state.catalog.filter(
      (c) => c.target_university_id === university_id && c.status === "PUBLISHED",
    );
  }

  getCatalogCourse(id: string): CatalogCourse | undefined {
    return this.state.catalog.find((c) => c.id === id);
  }

  /** Duplicate check by course_code within a university (warn, never block). */
  catalogCodeExists(university_id: string, course_code: string, excludeId?: string): boolean {
    const code = course_code.trim().toLowerCase();
    return this.state.catalog.some(
      (c) =>
        c.target_university_id === university_id &&
        c.id !== excludeId &&
        c.course_code.trim().toLowerCase() === code,
    );
  }

  createCatalogCourse(
    course: Omit<CatalogCourse, "id" | "version_history">,
    actor: string,
  ): CatalogCourse {
    const created: CatalogCourse = { ...course, id: uid("cat"), version_history: [] };
    this.state.catalog = [created, ...this.state.catalog];
    this.log(course.target_university_id, "CCM", "Created course", `${course.course_code} — ${course.course_name}`, actor);
    this.commit();
    return created;
  }

  updateCatalogCourse(id: string, patch: Partial<CatalogCourse>, actor: string) {
    this.state.catalog = this.state.catalog.map((c) =>
      c.id === id
        ? { ...c, ...patch, last_modified_by: actor, last_modified_at: nowIso() }
        : c,
    );
    const c = this.getCatalogCourse(id);
    if (c) this.log(c.target_university_id, "CCM", "Edited course", `${c.course_code} — ${c.course_name}`, actor);
    this.commit();
  }

  /** F4 — publish DRAFT courses; snapshot prior published version for rollback. */
  publishCatalog(ids: string[], actor: string) {
    this.state.catalog = this.state.catalog.map((c) => {
      if (!ids.includes(c.id)) return c;
      const history = [...c.version_history];
      // snapshot the version we are about to supersede (if it was ever published)
      if (c.status === "PUBLISHED" || c.version_history.length > 0) {
        history.push({
          version_number: c.version_number,
          published_at: c.published_at ?? nowIso(),
          modified_by: c.last_modified_by,
          values: {
            program_name: c.program_name,
            course_code: c.course_code,
            course_name: c.course_name,
            course_description: c.course_description,
            credit_hours: c.credit_hours,
            prerequisites: c.prerequisites,
            catalog_year: c.catalog_year,
          },
        });
      }
      this.log(c.target_university_id, "CCM", "Published course", `${c.course_code} — ${c.course_name}`, actor);
      return {
        ...c,
        status: "PUBLISHED" as RecordStatus,
        version_number: c.version_number + 1,
        published_at: nowIso(),
        last_modified_by: actor,
        last_modified_at: nowIso(),
        version_history: history,
      };
    });
    this.commit();
  }

  /** F4 — restore a course to a prior published version snapshot. */
  rollbackCatalog(id: string, targetVersion: number, actor: string) {
    const c = this.getCatalogCourse(id);
    if (!c) return;
    const snap = c.version_history.find((v) => v.version_number === targetVersion);
    if (!snap) return;
    this.updateCatalogCourse(
      id,
      {
        ...snap.values,
        status: "PUBLISHED",
        version_number: c.version_number + 1,
        published_at: nowIso(),
      },
      actor,
    );
    this.log(c.target_university_id, "CCM", "Rolled back course", `${c.course_code} → v${targetVersion}`, actor);
    this.commit();
  }

  /** F5 — archive (soft delete). */
  archiveCatalog(ids: string[], actor: string) {
    this.state.catalog = this.state.catalog.map((c) => {
      if (!ids.includes(c.id)) return c;
      this.log(c.target_university_id, "CCM", "Archived course", `${c.course_code} — ${c.course_name}`, actor);
      return { ...c, status: "ARCHIVED" as RecordStatus, last_modified_by: actor, last_modified_at: nowIso() };
    });
    this.commit();
  }

  restoreCatalog(id: string, actor: string) {
    this.updateCatalogCourse(id, { status: "DRAFT" }, actor);
  }

  /** How many published rules reference a given catalog course (F5 warning). */
  rulesReferencing(university_id: string, course_code: string): ArticulationRule[] {
    const code = course_code.trim().toLowerCase();
    return this.state.rules.filter(
      (r) =>
        r.target_university_id === university_id &&
        r.status !== "ARCHIVED" &&
        r.target_course_code.trim().toLowerCase() === code,
    );
  }

  // =======================================================================
  // RULES (Layer 1)
  // =======================================================================
  /** Returns rules with the `unmatched` flag recomputed against the live published catalog. */
  getRules(university_id: string): ArticulationRule[] {
    const published = new Set(
      this.getPublishedCatalog(university_id).map((c) => c.course_code.trim().toLowerCase()),
    );
    return this.state.rules
      .filter((r) => r.target_university_id === university_id)
      .map((r) => ({ ...r, unmatched: !published.has(r.target_course_code.trim().toLowerCase()) }));
  }

  getRule(id: string): ArticulationRule | undefined {
    return this.state.rules.find((r) => r.id === id);
  }

  ruleExists(
    university_id: string,
    source_course_code: string,
    target_course_code: string,
    excludeId?: string,
  ): boolean {
    const s = source_course_code.trim().toLowerCase();
    const tcode = target_course_code.trim().toLowerCase();
    return this.state.rules.some(
      (r) =>
        r.target_university_id === university_id &&
        r.id !== excludeId &&
        r.source_course_code.trim().toLowerCase() === s &&
        r.target_course_code.trim().toLowerCase() === tcode,
    );
  }

  createRule(rule: Omit<ArticulationRule, "id" | "version_history">, actor: string): ArticulationRule {
    const created: ArticulationRule = { ...rule, id: uid("rule"), version_history: [] };
    this.state.rules = [created, ...this.state.rules];
    this.log(rule.target_university_id, "ARM", "Created rule", `${rule.source_course_code} → ${rule.target_course_code}`, actor);
    this.commit();
    return created;
  }

  updateRule(id: string, patch: Partial<ArticulationRule>, actor: string) {
    this.state.rules = this.state.rules.map((r) =>
      r.id === id ? { ...r, ...patch, last_modified_by: actor, last_modified_at: nowIso() } : r,
    );
    const r = this.getRule(id);
    if (r) this.log(r.target_university_id, "ARM", "Edited rule", `${r.source_course_code} → ${r.target_course_code}`, actor);
    this.commit();
  }

  /** F9 — publish DRAFT rules into live TCE mapping. */
  publishRules(ids: string[], actor: string) {
    this.state.rules = this.state.rules.map((r) => {
      if (!ids.includes(r.id)) return r;
      const history = [...r.version_history];
      if (r.status === "PUBLISHED" || r.version_history.length > 0) {
        history.push({
          version_number: r.version_number,
          published_at: r.published_at ?? nowIso(),
          modified_by: r.last_modified_by,
          values: {
            source_institution_name: r.source_institution_name,
            source_city: r.source_city,
            source_state: r.source_state,
            source_course_code: r.source_course_code,
            source_course_name: r.source_course_name,
            source_course_description: r.source_course_description,
            source_course_credits: r.source_course_credits,
            target_course_code: r.target_course_code,
            target_course_name: r.target_course_name,
            target_course_credits: r.target_course_credits,
            equivalency_type: r.equivalency_type,
            begin_date: r.begin_date,
            end_date: r.end_date,
            notes: r.notes,
          },
        });
      }
      this.log(r.target_university_id, "ARM", "Published rule", `${r.source_course_code} → ${r.target_course_code}`, actor);
      return {
        ...r,
        status: "PUBLISHED" as RecordStatus,
        version_number: r.version_number + 1,
        published_at: nowIso(),
        last_modified_by: actor,
        last_modified_at: nowIso(),
        version_history: history,
      };
    });
    this.commit();
  }

  rollbackRule(id: string, targetVersion: number, actor: string) {
    const r = this.getRule(id);
    if (!r) return;
    const snap = r.version_history.find((v) => v.version_number === targetVersion);
    if (!snap) return;
    this.updateRule(
      id,
      { ...snap.values, status: "PUBLISHED", version_number: r.version_number + 1, published_at: nowIso() },
      actor,
    );
    this.log(r.target_university_id, "ARM", "Rolled back rule", `${r.source_course_code} → v${targetVersion}`, actor);
    this.commit();
  }

  archiveRules(ids: string[], actor: string) {
    this.state.rules = this.state.rules.map((r) => {
      if (!ids.includes(r.id)) return r;
      this.log(r.target_university_id, "ARM", "Archived rule", `${r.source_course_code} → ${r.target_course_code}`, actor);
      return { ...r, status: "ARCHIVED" as RecordStatus, last_modified_by: actor, last_modified_at: nowIso() };
    });
    this.commit();
  }

  restoreRule(id: string, actor: string) {
    this.updateRule(id, { status: "DRAFT" }, actor);
  }
}

export const store = new Store();
