# Admin User Creation Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make failed administrator-created account requests diagnosable without exposing passwords, SMTP credentials, or internal server details.

**Architecture:** Preserve the existing synchronous SMTP delivery policy. Add safe stage/error codes and correlate API logs with the existing request ID; return that ID to the admin UI for support. Do not change account roles, password policy, or retry semantics in this plan.

**Tech Stack:** Existing Express 5 API, React 19 frontend, PostgreSQL, Nodemailer, existing `X-Request-Id` middleware.

**Spec:** `docs/superpowers/specs/2026-10-16-data-model-and-user-management-design.md`

## Global Constraints

- Never log or return passwords, password hashes, reset links, cookies, session tokens, SMTP credentials, full SMTP error messages, or submitted personal data.
- Preserve `409 USER_EXISTS`, `503 MAIL_NOT_CONFIGURED`, authentication and authorization status semantics.
- Keep the generic user-facing message for server errors; add a safe correlation ID instead of revealing internals.
- Do not change SMTP configuration or read `.env` values during implementation.

## Review Focus

- SMTP is absent or incomplete: preserve the clear configuration response and do not leave an active account.
- SMTP rejects credentials or cannot connect: log a safe error code and request ID; never log the transport error message.
- Mail is delivered but activation/audit fails: report one correlation ID and preserve the existing cleanup behavior; do not claim the account is usable.
- Duplicate email/username: preserve a conflict response without logging the submitted email.
- API/DB unavailable: distinguish the operation stage while keeping a generic response to the browser.

---

### Task 1: Correlate API errors safely

**Files:**
- Modify: `api/src/app.js`
- Manual verification: existing Qase AUTH/ADM account-management cases

**Interfaces:**
- Consumes: `request.id` already generated and returned as `X-Request-Id`.
- Produces: error JSON may include `{ code, message, requestId }`; server log records only request ID, safe code, and HTTP status.

- [ ] Preserve each error's HTTP status and safe `code`; include `requestId` in error responses.
- [ ] Update the 5xx logger to emit one structured line with `request.id`, safe `error.code`/name, and status; do not emit `error.message`, stack, request body, or headers.
- [ ] Manually inspect responses for `MAIL_NOT_CONFIGURED`, `USER_EXISTS`, and generic 500 to confirm the ID is present and no secret/detail is exposed.

### Task 2: Identify the account-creation failure stage

**Files:**
- Modify: `api/src/modules/users/users.routes.js`
- Manual verification: Qase account creation scenarios

**Interfaces:**
- Consumes: existing admin-authenticated `POST /api/admin/users` and request ID.
- Produces: stable safe codes for insertion, SMTP delivery, activation/audit, and cleanup failures; no raw transport/database error reaches the browser.

- [ ] Keep input validation and role allow-list behavior unchanged.
- [ ] Wrap each create phase so expected configuration/conflict errors retain their current codes and unexpected errors receive a non-secret stage code.
- [ ] Preserve cleanup of a newly-created disabled account after delivery/activation failure; make cleanup failure distinguishable in logs by stage without logging row contents.
- [ ] Manually check the scenarios with SMTP absent, SMTP rejection, successful delivery, and duplicate address. Do not use production recipients or real credentials.

### Task 3: Show a support reference in the administrator UI

**Files:**
- Modify: `frontend/src/services/usersApi.js`
- Modify: `frontend/src/screens/administracion-usuarios/UserManagementScreen.jsx`

**Interfaces:**
- Consumes: API error body `{ code, message, requestId }`.
- Produces: ordinary 4xx messages remain unchanged; 5xx banner adds the short request ID for support.

- [ ] Preserve the current `Error.message` behavior for expected 4xx responses.
- [ ] Carry status, safe code, and request ID on the thrown API error without including request payloads.
- [ ] For a 5xx, display the existing generic text plus “Referencia: <requestId>”; do not display stack traces or server error messages.
- [ ] Manually verify that validation errors remain readable and that the 5xx reference matches the response header/body.

## Handoff

The user must configure valid SMTP settings outside the repository before the successful email scenario can pass. This plan diagnoses the exact failed stage; it does not rotate credentials or alter the delivery workflow. No database migration is required for this plan.
