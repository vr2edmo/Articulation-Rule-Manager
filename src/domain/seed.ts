// Minimal seed data (per the agreed "minimal seed" scope). Enough to log in,
// see populated dashboards across both modules, and exercise every flow:
// migrated DRAFT catalog rows, PUBLISHED rows, a TES-seeded rule, an UNMATCHED
// TES rule (no catalog match), and a PROMOTED_FROM_AI draft.

import type {
  ArticulationRule,
  CatalogCourse,
  University,
  CurrentUser,
} from "./types";

export const UNIVERSITIES: University[] = [
  { id: "u_meridian", name: "Meridian State University", short_name: "Meridian State" },
  { id: "u_lakeside", name: "Lakeside University", short_name: "Lakeside" },
];

export const USERS: CurrentUser[] = [
  {
    id: "user_meridian",
    name: "Dana Whitfield",
    email: "registrar@meridian.edu",
    role: "UNIVERSITY",
    university_id: "u_meridian",
  },
  {
    id: "user_lakeside",
    name: "Priya Nair",
    email: "registrar@lakeside.edu",
    role: "UNIVERSITY",
    university_id: "u_lakeside",
  },
  {
    id: "user_edmo",
    name: "EDMO Operations",
    email: "ops@goedmo.com",
    role: "EDMO_ADMIN",
    university_id: null,
  },
];

const t = (offsetDays: number) =>
  new Date(Date.now() - offsetDays * 86400000).toISOString();

function catalog(
  partial: Partial<CatalogCourse> & Pick<CatalogCourse, "target_university_id" | "program_name" | "course_code" | "course_name">,
): CatalogCourse {
  return {
    id: `cat_${partial.target_university_id}_${partial.course_code.replace(/\s+/g, "")}`,
    course_description: "",
    credit_hours: 3,
    prerequisites: "",
    status: "PUBLISHED",
    version_number: 1,
    catalog_year: "2025-2026",
    published_at: t(20),
    last_modified_by: "EDMO Migration",
    last_modified_at: t(20),
    record_source: "MIGRATED_FROM_EDMO",
    version_history: [],
    ...partial,
  };
}

export const SEED_CATALOG: CatalogCourse[] = [
  catalog({
    target_university_id: "u_meridian",
    program_name: "Bachelor of Science in Computer Science",
    course_code: "CS 101",
    course_name: "Introduction to Programming",
    course_description:
      "Foundational programming course covering variables, control flow, functions, and basic data structures using Python. Emphasis on problem decomposition and debugging.",
    status: "PUBLISHED",
    version_number: 2,
    record_source: "MIGRATED_FROM_EDMO",
    last_modified_by: "Dana Whitfield",
    last_modified_at: t(12),
    version_history: [
      {
        version_number: 1,
        published_at: t(20),
        modified_by: "EDMO Migration",
        values: {
          program_name: "Bachelor of Science in Computer Science",
          course_code: "CS 101",
          course_name: "Introduction to Programming",
          course_description: "Intro programming course.",
          credit_hours: 3,
          prerequisites: "",
          catalog_year: "2025-2026",
        },
      },
    ],
  }),
  catalog({
    target_university_id: "u_meridian",
    program_name: "Bachelor of Science in Computer Science",
    course_code: "CS 301",
    course_name: "Data Structures and Algorithms",
    course_description:
      "In-depth study of arrays, linked lists, trees, graphs, hashing, sorting and searching algorithms, and algorithmic complexity analysis (Big-O).",
    credit_hours: 4,
    status: "PUBLISHED",
    last_modified_by: "Dana Whitfield",
    last_modified_at: t(18),
  }),
  catalog({
    target_university_id: "u_meridian",
    program_name: "Bachelor of Arts in History",
    course_code: "HIST 101",
    course_name: "World History to 1500",
    course_description:
      "Survey of major world civilizations from antiquity through 1500 CE, covering political, social, and cultural developments across continents.",
    status: "PUBLISHED",
    last_modified_by: "Dana Whitfield",
    last_modified_at: t(15),
  }),
  catalog({
    target_university_id: "u_meridian",
    program_name: "Bachelor of Science in Computer Science",
    course_code: "CS 450",
    course_name: "Machine Learning",
    course_description: "", // intentionally thin — exercises the description-quality nudge
    credit_hours: 3,
    status: "DRAFT",
    published_at: null,
    record_source: "MANUALLY_ENTERED",
    last_modified_by: "Dana Whitfield",
    last_modified_at: t(2),
    version_history: [],
  }),
  catalog({
    target_university_id: "u_meridian",
    program_name: "Bachelor of Arts in History",
    course_code: "HIST 210",
    course_name: "Modern World History",
    course_description:
      "Examination of global history from 1500 to the present: revolutions, industrialization, world wars, decolonization, and globalization.",
    status: "DRAFT",
    published_at: null,
    record_source: "MIGRATED_FROM_EDMO",
    last_modified_by: "EDMO Migration",
    last_modified_at: t(20),
    version_history: [],
  }),
  // Lakeside — a second tenant to prove data isolation.
  catalog({
    target_university_id: "u_lakeside",
    program_name: "Bachelor of Business Administration",
    course_code: "BUS 200",
    course_name: "Principles of Management",
    course_description:
      "Introduction to organizational management: planning, organizing, leading, and controlling. Covers motivation theory and decision-making frameworks.",
    status: "PUBLISHED",
    last_modified_by: "Priya Nair",
    last_modified_at: t(9),
  }),
];

export const SEED_RULES: ArticulationRule[] = [
  {
    id: "rule_meridian_hist",
    source_institution_id: "src_asu",
    source_institution_name: "Arizona State University",
    source_city: "Tempe",
    source_state: "AZ",
    source_course_code: "HIST 202",
    source_course_name: "Modern World History",
    source_course_description:
      "Survey of world history from the early modern period to the present.",
    source_course_credits: 3,
    target_university_id: "u_meridian",
    target_course_code: "HIST 101",
    target_course_name: "World History to 1500",
    target_course_credits: 3,
    equivalency_type: "FULL",
    begin_date: "2024-08-01",
    end_date: "",
    rule_source: "UNIVERSITY_ENTERED",
    status: "PUBLISHED",
    version_number: 1,
    published_at: t(20),
    last_modified_by: "Dana Whitfield",
    last_modified_at: t(20),
    notes: "",
    unmatched: false,
    version_history: [],
  },
  {
    id: "rule_meridian_cs",
    source_institution_id: "src_mcc",
    source_institution_name: "Maricopa Community College",
    source_city: "Phoenix",
    source_state: "AZ",
    source_course_code: "CIS 120",
    source_course_name: "Programming Fundamentals",
    source_course_description: "First programming course in Java.",
    source_course_credits: 3,
    target_university_id: "u_meridian",
    target_course_code: "CS 101",
    target_course_name: "Introduction to Programming",
    target_course_credits: 3,
    equivalency_type: "FULL",
    begin_date: "2023-08-01",
    end_date: "",
    rule_source: "UNIVERSITY_ENTERED",
    status: "PUBLISHED",
    version_number: 1,
    published_at: t(20),
    last_modified_by: "Dana Whitfield",
    last_modified_at: t(20),
    notes: "",
    unmatched: false,
    version_history: [],
  },
  {
    // UNMATCHED example: target ENGR 110 is not in the published catalog
    // (e.g. the target course was later archived). Excluded from live mapping.
    id: "rule_meridian_engr",
    source_institution_id: "src_pima",
    source_institution_name: "Pima Community College",
    source_city: "Tucson",
    source_state: "AZ",
    source_course_code: "EGR 102",
    source_course_name: "Introduction to Engineering",
    source_course_description: "Survey of engineering disciplines and design process.",
    source_course_credits: 3,
    target_university_id: "u_meridian",
    target_course_code: "ENGR 110",
    target_course_name: "Introduction to Engineering",
    target_course_credits: 3,
    equivalency_type: "ELECTIVE",
    begin_date: "2024-01-01",
    end_date: "",
    rule_source: "UNIVERSITY_ENTERED",
    status: "PUBLISHED",
    published_at: t(20),
    version_number: 1,
    last_modified_by: "Dana Whitfield",
    last_modified_at: t(20),
    notes: "Target course ENGR 110 is not in the published catalog.",
    unmatched: true,
    version_history: [],
  },
  {
    // A promoted-from-AI draft awaiting the registrar's review + publish.
    id: "rule_meridian_ds_promoted",
    source_institution_id: "src_asu",
    source_institution_name: "Arizona State University",
    source_city: "Tempe",
    source_state: "AZ",
    source_course_code: "CSE 205",
    source_course_name: "Object-Oriented Program & Data Structures",
    source_course_description:
      "Object-oriented programming with an emphasis on data structures and algorithm analysis.",
    source_course_credits: 3,
    target_university_id: "u_meridian",
    target_course_code: "CS 301",
    target_course_name: "Data Structures and Algorithms",
    target_course_credits: 4,
    equivalency_type: "FULL",
    begin_date: "2025-08-01",
    end_date: "",
    rule_source: "PROMOTED_FROM_AI",
    status: "DRAFT",
    published_at: null,
    version_number: 0,
    last_modified_by: "Promoted from AI suggestion",
    last_modified_at: t(1),
    notes: "Promoted from AI suggestion (confidence 87%). Confirm credits before publishing.",
    unmatched: false,
    version_history: [],
  },
];
