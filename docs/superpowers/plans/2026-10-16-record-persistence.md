# Record Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Pesca and Acuacultura records and drafts in PostgreSQL, with ownership and server-side authorization, while preserving existing users and audit history.

**Architecture:** Add a new migration; never rewrite migration 001. Store common lifecycle/ownership on `expedientes`, person-specific fields in 1:1 subtype tables, and module data in typed tables with child rows for multiselects. Add authenticated Express routes and connect the React forms/dashboard to them. Leave views or actions that depend on unresolved SEDER policies closed until confirmed.

**Tech Stack:** PostgreSQL, existing `pg` pool and migration runner, Express 5, React 19, existing fetch services and session middleware.

**Spec:** `docs/superpowers/specs/2026-10-16-data-model-and-user-management-design.md`

## Global Constraints

- Reuse `users`, `auth_sessions`, and append-only `audit_events` from migration 001; do not edit its SQL or checksum.
- Assign `owner_user_id` from the authenticated server session, never from request JSON.
- Enforce role, ownership, module, and lifecycle checks in API queries; UI-only checks are insufficient.
- Use parameterized SQL and transactions for multi-table save/finalize operations.
- Do not seed real people or invent SEDER catalogs; keep personal data out of logs and audit metadata.
- Preserve pending decisions P-01..P-14; do not add unapproved uniqueness, required-field, deletion, retention, or access rules.

## Review Focus

- Request omits, spoofs, or changes the owner: server assigns/retains the authenticated user and rejects unauthorized updates.
- Draft is incomplete: nullable data saves without falsely finalizing it.
- A finalized record is modified by Capturista: API denies the write even if called directly.
- Person subtype does not match `tipo_persona`: the transaction is rejected without a partial expediente.
- Catalog or optional conditional field is absent: do not invent a value or make an unresolved field mandatory.

---

### Task 1: Add the additive expediente schema

**Files:**
- Create: `database/migrations/002_expedientes.sql`
- Modify: `api/src/modules/audit/audit.repository.js` only if needed for typed record references
- Manual verification: migration runner and PostgreSQL schema inspection

**Interfaces:**
- Consumes: existing `users(id)` and `audit_events(id)`.
- Produces: `expedientes`, person subtype, Pesca and Acuacultura detail tables, FKs, checks, and owner/status query indexes.

- [ ] Create `expedientes(id UUID PK, modulo, tipo_persona, estado, owner_user_id FK users, folio nullable, created_at, updated_at, finalized_at, created_by, updated_by)` with checks for approved enum values and lifecycle consistency.
- [ ] Create `persona_contacto` as a shared 1:1 table for domicilio/contacto so drafts can persist those fields before type selection; create `personas_fisicas` and `personas_morales` for type-specific identity data. Keep nullable draft columns and use `text` for identifiers/telephone/postal code.
- [ ] Create typed `pesca_detalles`, `pesca_meses` (month check 1..12), and `embarcaciones`; create typed `acuacultura_detalles`, `upas`, `upa_permisos`, `upa_infraestructura`, and child tables for approved multi-select data.
- [ ] Add only constraints backed by defined SRS facts; do not assert CURP/RFC uniqueness, mandatory fields, official catalog contents, document attachments, or final folio format while P-09/P-10/RF-63 remain unresolved.
- [ ] Add nullable `audit_events.record_id` FK; do not add a physical-delete path or choose a deletion behavior while SEDER's P-04 is pending. Keep audit rows append-only.
- [ ] Apply migration to a disposable/local database and verify a second migration run is a no-op; preserve real `.env` and existing data.

### Task 2: Add record repository and authenticated API

**Files:**
- Create: `api/src/modules/records/records.repository.js`
- Create: `api/src/modules/records/records.routes.js`
- Modify: `api/src/app.js`
- Modify: `api/src/modules/audit/audit.repository.js`
- Manual verification: Qase cases for owner isolation, draft lifecycle, and direct API authorization

**Interfaces:**
- Routes consume the authenticated `request.user`; the service/repository receives explicit `actorId`, `recordId`, module, and typed record data.
- `POST /api/records` creates a draft and derives owner from `request.user.id`.
- `GET /api/records` returns only records permitted by the role policy currently resolved for that route.
- `GET /api/records/:id` and `PATCH /api/records/:id` enforce ownership and state in SQL/transaction.
- `POST /api/records/:id/finalize` validates only approved rules and changes state atomically.

- [ ] Implement transactional create/update across expediente, subtype, and module tables; reject mismatched module/person subtype and spoofed owner fields.
- [ ] Enforce Capturista create/edit on own drafts; all finalized records remain read-only until SEDER resolves P-03, including for Administrator.
- [ ] Keep Invitado and unresolved cross-owner/finalized views closed until SEDER confirms P-01/P-02; do not expose PII by default.
- [ ] Write append-only audit events for defined record changes using `record_id`; log action and result, not submitted form values.
- [ ] Manually verify direct API calls for unauthenticated users, non-owner capturista, finalized record edits, transaction rollback, and safe audit content.

### Task 3: Connect the existing capture and dashboard UI

**Files:**
- Create: `frontend/src/services/recordsApi.js`
- Modify: `frontend/src/app/App.jsx`
- Modify: `frontend/src/screens/dashboard/DashboardScreen.jsx`
- Modify: `frontend/src/screens/registration/RegistrationScreen.jsx`

**Interfaces:**
- `recordsApi` uses `fetch` with `credentials: 'include'` and server-derived identity.
- App loads record/draft lists from the API and submits create, update, and finalize actions; it does not treat React state as persistence.

- [ ] Replace in-memory create/save/finalize callbacks with API calls and handle loading/error states without losing the current form contents.
- [ ] Load the user's permitted records on dashboard entry and keep draft/final status from the server authoritative.
- [ ] Retain client-side form navigation, but do not treat it as authorization or final validation.
- [ ] Manually verify draft survives reload/new login, finalization removes it from the draft list, and UI displays API authorization failures safely.

### Task 4: Add RF-51 search after permitted result scope is defined

**Files:**
- Modify: `api/src/modules/records/records.repository.js`
- Modify: `api/src/modules/records/records.routes.js`
- Modify: `frontend/src/screens/dashboard/DashboardScreen.jsx`
- Manual verification: Qase search cases

- [x] Support parameterized search by name, locality, and person type, plus module/state filters required by authorization.
- [x] Paginate and cap page size; apply access predicates before returning results.
- [ ] Verify searches find expected synthetic fixtures without returning drafts or records outside the caller's permission.

### Task 5: Defer unresolved views and exports

**Files:**
- Follow-up spec/plan after SEDER decisions; no files changed in this task.

- [ ] Do not implement guest data visibility, cross-capturista finalized visibility, physical deletion, PDF authorization, attachments, or official catalogs until P-01..P-14 decisions are recorded.
- [ ] After those decisions, create a separate plan for SEDER search/detail/PDF, privacy masking, export audit, and catalog data.

## Explicitly out of scope

- Editing or rerunning migration 001, importing the current in-memory records, external registry integrations, attachment storage, performance/load goals marked proposed, PDF output, policy choices awaiting SEDER, and changing password/rate-limit defaults marked proposed.
