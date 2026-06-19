# EDMO · Articulation Rules Manager (ARM) + Course Catalog Manager (CCM)

A front-end prototype of EDMO's university-facing portal for managing the two
data layers that power Transfer Credit Evaluation (TCE): the **Course Catalog**
(Layer 0 — the AI matching reference set) and the **Articulation Rules**
(Layer 1 — deterministic standing rules).

Built to the PRD *Articulation Rules Manager v1.2*. Scope: **F1–F9** (the two
core portals + versioned publish/rollback + activity log).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Sign in with a demo account (any password):

| Account | Role | Sees |
|---|---|---|
| `registrar@meridian.edu` (Dana Whitfield) | University | Meridian State data |
| `registrar@lakeside.edu` (Priya Nair) | University | Lakeside data |
| `ops@goedmo.com` (EDMO Operations) | EDMO Admin | All universities (switcher in top bar) |

## What's implemented

**Course Catalog Manager (Module A)**
- **F1** Dashboard — paginated table, full-text search, filters (status / program / year / source), bulk publish & archive, stat cards, "EDMO Migration" review badge + first-login migration notice.
- **F2** CSV/XLSX bulk upload — downloadable template, parse → validation summary (row-level errors, duplicate *warnings*), valid rows import as DRAFT.
- **F3** Inline add/edit — slide-over with the AI-description prompt + short-description nudge; saves as DRAFT.
- **F4** Versioned publish + rollback — publish confirmation, version history per course, one-click restore.
- **F5** Archive (soft delete) — warns when the course is referenced by active rules.

**Articulation Rules Manager (Module B)** — rules use the **TES format**:
Source University · City · State · Source Course (Course ID + Name) · Source
Course Credits · Target Course · Target Course Credits · Equivalency · Begin
Date · End Date. Universities upload/enter their own rules — **no TES seeding**.
- **F6** Dashboard — table with the TES fields, validity window (begin–end / "Present"), `Promoted from AI` badge, `UNMATCHED` flagging, filters, search, stats.
- **F7** Add/edit rule — full TES field set; target course is a **typeahead bound to the published catalog only** (no free-typing; DRAFT/archived courses excluded); empty-catalog warning; begin-date required, end-date optional.
- **F8** Bulk import — TES-format template + validation (date format, both credit fields, equivalency); target codes validated against the published catalog (unpublished targets are errors).
- **F9** Versioned publish + rollback — identical governance to the catalog.

**Cross-cutting**
- Email/password login (V1 model; EDMO-provisioned). EDMO-admin cross-tenant view.
- Per-university data isolation; UNMATCHED rules recomputed live against the published catalog.
- Activity Log with CSV export (audit trail for both modules).
- EDMO branding (navy `#1B3A6B`, Arial family).

## Deferred (per agreed scope)
F10 Promote-to-Rule UI (lives in TCE — stubbed: rules can carry `PROMOTED_FROM_AI`),
F12 catalog migration on first login, F13 full auth (SSO is V2), F14 EDMO admin
panel. **TES seeding (F11) removed** — universities upload their own rules.

## Architecture

```
src/
  domain/      types · store (localStorage) · seed · fileio (csv/xlsx) · hooks
  app/         session (auth + tenancy) · Layout · Login
  ui/          design-system primitives (DataTable, Modal, SlideOver, ImportDialog…)
  features/
    catalog/   CCM (F1–F5)
    rules/     ARM (F6–F9)
    audit/     Activity Log
```

**Swap note:** all reads/writes go through `src/domain/store.ts`, whose method
signatures map 1:1 to the REST endpoints a Node + Postgres backend would expose.
Replacing that one module with an API client (and moving reads behind React
Query) graduates the prototype to a real backend without touching any feature
component. Data currently persists to `localStorage`.

### Reset demo data
Clear the `edmo_arm_state_v1` key in localStorage (or run
`localStorage.clear()` in the console) and reload.
