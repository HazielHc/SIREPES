# User Management Implementation Plan

> **For agentic workers:** Implement each task using the subagent-driven workflow requested by the user; stop for review when task interfaces or security behavior changes.

**Goal:** Add PostgreSQL-backed accounts, secure login sessions, forced password change, and an administrator-only user management interface for SIREPES.

**Architecture:** React continues to call the Express API through Vite's `/api` proxy. Express owns all authentication and role checks; PostgreSQL stores accounts, opaque sessions, and audit events. The administrator is provisioned once through a private CLI command; subsequent accounts are created through admin-only API endpoints and receive one-time temporary passwords by configured SMTP.

**Tech Stack:** Existing Node.js 24 / Express 5, React 19 / Vite / Tailwind 4; PostgreSQL with `pg`; Argon2id password hashes; SMTP mail transport configured only through environment variables.

**Spec:** `docs/superpowers/specs/2026-10-15-user-management-and-record-access-design.md`

## Global Constraints

- Only Administrador can create and manage accounts or assign a role.
- Persist the four roles: `administrador`, `capturista`, `personal_seder`, `invitado`.
- Store password hashes only; temporary credentials force a password change before normal access.
- Apply authorization in the API for every protected operation; frontend visibility is not a security boundary.
- Use versioned SQL migrations; do not commit real credentials or PII fixtures.
- Personal de SEDER is read-only; this plan enables its account and role, while record persistence, search, and PDF are a subsequent implementation plan because the current forms and records remain in memory.
- Do not hard-delete user accounts with audit history; disable accounts and revoke their sessions.

## Review Focus

- Unknown, malformed, or wrong credentials produce a generic failure without exposing whether a username exists.
- Disabled accounts and revoked/expired sessions cannot call protected endpoints.
- A request cannot gain privileges by sending a different role or user identifier from the browser.
- SMTP failure does not leave a usable account whose temporary credential was never delivered.
- A forced-password-change session cannot reach modules, even by calling their APIs directly.

## Files and Interfaces

- `database/migrations/001_users_sessions_audit.sql`: creates `users`, `auth_sessions`, `audit_events` and indexes/constraints.
- `api/src/config/env.js`: reads and validates database, cookie, password, and SMTP settings.
- `api/src/db/pool.js`, `api/src/db/migrate.js`: shared PostgreSQL pool and ordered, repeat-safe SQL migration runner.
- `api/src/shared/passwords.js`: `hashPassword(plain)`, `verifyPassword(hash, plain)`, and `createTemporaryPassword()`.
- `api/src/middleware/authenticate.js`: reads the opaque session cookie and attaches `{ id, username, fullName, role, status, mustChangePassword }` to the request.
- `api/src/middleware/authorize.js`: `requireRole(...roles)` and forced-change gate.
- `api/src/modules/auth/{auth.routes,auth.service,auth.repository}.js`: login, logout, current session, and password change.
- `api/src/modules/users/{users.routes,users.service,users.repository}.js`: paginated list, create, profile/status update, and temporary-password reset.
- `api/src/modules/audit/audit.repository.js`: append-only event writer; callers provide actor/action/target/result, never secret values.
- `api/src/modules/mail/mailer.js`: sends account and reset messages using SMTP environment configuration; no credentials in logs or API bodies.
- `api/src/scripts/bootstrap-admin.js`: idempotence-checked initial admin provisioning; never exposed over HTTP.
- `api/src/app.js`, `api/src/server.js`, `api/package.json`: mount modules, readiness route, configuration and scripts.
- `frontend/src/services/authApi.js`, `frontend/src/services/usersApi.js`: credentialed API calls; no access tokens in browser storage.
- `frontend/src/app/App.jsx`: restore `/api/auth/me` on load, route forced password change, admin user management, and clear local screen state on logout.
- `frontend/src/screens/menu/MenuScreen.jsx`: expose account administration only to Administrador.
- `frontend/src/screens/administracion-usuarios/UserManagementScreen.jsx`: list, search/filter, create, change role/status and request a reset.
- `frontend/src/screens/auth/ChangePasswordScreen.jsx`: required-first-login and voluntary authenticated password change.
- `frontend/src/styles/global.css`: add only shared tokens if the existing marine/navy palette needs a missing state.
- `.env.example`, `.gitignore`, `README.md`: safe configuration examples and local setup instructions.

## Tasks

### Task 1: PostgreSQL configuration and schema

**Files:**
- Create the migration, environment loader, pool, and migration runner above.
- Modify `api/package.json` and root scripts/lockfile for PostgreSQL access and migrations.
- Modify `.env.example`, `.gitignore`, and API README instructions.

**Interfaces:** `pool.query(text, params)` returns standard `pg` query results; `runMigrations()` applies each SQL file once and records its name/checksum in `schema_migrations`.

- [ ] Create tables: `users` (UUID, unique normalized username/email, name, constrained role/status, hash, force-change and timestamps, creator FK), `auth_sessions` (hash of random session id, user FK, created/last-seen/expiry/revoked), and append-only `audit_events`.
- [ ] Add migration-runner lock/transaction behavior and deterministic SQL ordering.
- [ ] Add configuration validation that fails clearly when required database variables are absent; never print passwords or connection secrets.
- [ ] Add a DB readiness endpoint separate from the existing process liveness endpoint.
- [ ] Run the migration command against a local PostgreSQL instance when configured; confirm a second run is a no-op.

### Task 2: Password primitives and first-admin bootstrap

**Files:**
- Create `api/src/shared/passwords.js` and `api/src/scripts/bootstrap-admin.js`.
- Modify API package scripts and environment examples.

**Interfaces:** `hashPassword(plain) -> encodedHash`, `verifyPassword(encodedHash, plain) -> boolean`, `createTemporaryPassword() -> string`, `bootstrapAdmin({ fullName, email, username, password }) -> user summary`.

- [ ] Use asynchronous Argon2id with one generated salt per password and no plaintext persistence.
- [ ] Generate temporary passwords from a cryptographically secure random source; only their hash is saved.
- [ ] Provision the first administrator from a private command/environment input; make repeated bootstrap refuse to replace or duplicate an existing administrator.
- [ ] Ensure command output shows a non-secret account summary and never echoes the supplied password.

### Task 3: Authentication, sessions, and server-side permissions

**Files:**
- Create auth repository/service/routes and authentication/authorization middleware.
- Modify `api/src/app.js` and `api/src/server.js`.

**Interfaces:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`; successful login sets an HttpOnly session cookie and returns a safe user summary only. Middleware attaches the authenticated user and rejects inactive, expired, revoked, or forced-change sessions where normal access is requested.

- [ ] Create random opaque session identifiers; store only a digest in PostgreSQL and set cookie flags (`HttpOnly`, `SameSite=Lax`, `Secure` in production, bounded expiry).
- [ ] Make login failure generic and rate-limited; update `last_login_at` on successful authentication.
- [ ] Restrict a first-login session to password change and logout; revoke/rotate session after password change.
- [ ] Revoke all sessions when a user is disabled or an administrator requests a reset.
- [ ] Add role middleware that fails closed and never trusts request-body role/user fields.

### Task 4: Administrator user-management API and mail delivery

**Files:**
- Create user and audit repositories/services/routes and the SMTP mailer.
- Modify `api/src/app.js`, database migration if an outbox/status field is needed, `.env.example`.

**Interfaces:**
- `GET /api/admin/users?search=&role=&status=&page=&pageSize=` returns a paginated safe account projection.
- `POST /api/admin/users` accepts `{ fullName, email, role }` (role cannot be `administrador`) and returns a safe account summary after temporary credentials are delivered.
- `PATCH /api/admin/users/:id` accepts only `{ role?, status? }` and protects the final active administrator.
- `POST /api/admin/users/:id/reset-password` issues a one-use temporary credential by configured SMTP without returning it in JSON.

- [ ] Normalize and validate email/name/role; generate a collision-safe username server-side.
- [ ] Write account and audit event transactionally; on delivery failure ensure the account cannot log in with an undelivered password and return a clear retryable error.
- [ ] Prevent administrator creation through the API, self-promotion, self-disable, and removal/demotion of the last active administrator.
- [ ] Audit create, role/status changes, reset requests, and outcomes without recording secret or full account payload.
- [ ] Return only required fields and paginate with a capped page size.

### Task 5: Frontend session and required-password-change flow

**Files:**
- Modify auth API service and `frontend/src/app/App.jsx`.
- Create `frontend/src/screens/auth/ChangePasswordScreen.jsx` and users API service.
- Modify login screen only where API feedback/session behavior requires it.

**Interfaces:** API fetches use `credentials: 'include'`. On startup the app asks `/api/auth/me`; on successful login it routes by server-returned `mustChangePassword`; logout calls the API and clears the in-memory session.

- [ ] Remove role fallback from production authentication; every role comes from `/api/auth/me`/login response.
- [ ] Handle loading, unauthenticated, disabled/expired session, and forced-change states without exposing protected screens.
- [ ] Change password page enforces confirmation and communicates the password policy from API validation.
- [ ] Ensure no password, temporary secret, or session token is persisted in `localStorage` or `sessionStorage`.

### Task 6: Administrator-only user interface

**Files:**
- Create `frontend/src/screens/administracion-usuarios/UserManagementScreen.jsx`.
- Modify `frontend/src/screens/menu/MenuScreen.jsx` and `frontend/src/app/App.jsx`.

**Interfaces:** screen receives `currentUser`, `usersApi` operations, and navigation callbacks; it never chooses the caller's permission from local state.

- [ ] Add an Administrator-only navigation entry and direct-route guard; API remains the security authority.
- [ ] Implement searchable/filterable paginated table with name, username, email, role, status, creation date, and last access.
- [ ] Create form includes name, email, and role picker limited to Capturista, Personal de SEDER, and Invitado.
- [ ] Add role/state change and reset actions with accessible confirmation/error/loading feedback.
- [ ] Match the approved navy/sea palette, keep the SEDER logo upper-left, and support narrow screens without horizontal page overflow.

### Task 7: Integration and handoff

**Files:** all files from Tasks 1–6 plus `README.md`.

- [ ] Run migrations and bootstrap command using a configured local PostgreSQL database.
- [ ] Start API and frontend; confirm login, forced password change, admin list/create/update/disable/reset, and logout flows against SMTP configuration or its clearly reported absence.
- [ ] Run the frontend production build and inspect API startup/configuration output for leaked secrets.
- [ ] Document setup, environment variables, first-admin command, SMTP prerequisite, and the fact that SEDER record search/PDF remains the next plan after records are persisted.

## Handoff

The user explicitly requested work with agents, so use the subagent-driven method: delegate independent tasks only after their prerequisite interfaces are fixed, have each task reviewed before integration, and finish with one whole-change review. The user should approve this plan before implementation begins.
