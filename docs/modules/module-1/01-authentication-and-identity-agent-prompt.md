# Prescriptionly Module 1 Agent Prompt: Authentication & Identity

## Role and goal

Implement **Module 1: Authentication & Identity** for Prescriptionly, a modular monolith using React on the frontend, Node.js + Express on the backend, and SQL as the relational database.

Work only on this module and the minimum shared infrastructure it requires. Inspect the repository first and preserve existing conventions, package choices, TypeScript/JavaScript choice, linting, testing, API structure, and database tooling. Do not rewrite working project foundations merely to match this prompt.

This module owns the application account identity. It does **not** own the patient's medical/clinical profile.

## Non-negotiable domain rule

Keep these concepts separate:

* `Account`: authentication identity, credentials, account status, sessions, security actions.
* `PatientProfile`: medical/patient information created in Module 2 and linked to an account later.

Never use medical profile fields as credentials or identity proof. Never make a medical record the login identity. Do not create, infer, merge, or transfer medical histories in this module.

## MVP scope

Implement:

1. Registration with email + password.
2. Email verification.
3. Login.
4. Logout of current session.
5. Logout/revoke all sessions.
6. `GET /me` for the authenticated account.
7. Forgot-password request.
8. Password reset with a one-time expiring token.
9. Change password while authenticated.
10. Change email using current-password confirmation plus verification of the new email before the change becomes active.
11. Account lifecycle/status enforcement.
12. Revocable server-managed sessions.
13. Authentication-specific security events.
14. React pages/forms and protected-route behavior for the flows above.
15. Validation, rate limiting, CSRF protection, tests, migrations, and concise documentation required by this module.

## Explicitly out of scope

Do not implement now:

* MFA, TOTP, SMS authentication, passkeys, WebAuthn.
* Google/Apple/social login.
* Family/dependent accounts.
* Doctor/provider identities.
* Account merging.
* Admin impersonation.
* Patient demographics or medical profile fields.
* Medical records, prescriptions, documents, medications, exports, sharing.
* General compliance claims such as "HIPAA compliant" or "GDPR compliant."
* A self-service hard-delete workflow. The account model must support a deleted state, but deletion/retention policy belongs to the later privacy/security module.

Design so future MFA/passkeys can be added without rewriting the entire auth module, but do not build speculative abstractions for them.

## Authentication architecture

Use **opaque server-managed sessions**, not JWTs stored in browser storage.

Required behavior:

* On successful authentication, generate a cryptographically random session token.
* Send the raw token only in an `HttpOnly` cookie.
* Store only a secure digest/hash of the session token in SQL.
* A session must be individually revocable.
* Rotate/create a new session after login and after sensitive credential recovery.
* Revoke all existing sessions after a successful password reset.
* Provide "logout all sessions" for compromised-account recovery.
* Do not put auth tokens, password reset tokens, or verification tokens in `localStorage` or `sessionStorage`.
* Do not place medical/patient identifiers into the session as authorization shortcuts.

Production cookie requirements:

* `HttpOnly=true`
* `Secure=true`
* `SameSite=Lax` unless the existing deployment architecture demonstrably requires another secure setting
* `Path=/`
* no broad `Domain` attribute unless deployment requires it

For local development, allow `Secure=false` only when HTTPS is unavailable.

Use a configurable idle expiry and absolute expiry. Keep expiry enforcement on the server, not only in the browser.

## CSRF and origin rules

Because authentication uses cookies:

* Protect state-changing authenticated requests with CSRF protection.
* Use a server-generated synchronizer CSRF token tied to the session, or an equivalent established pattern already present in the repository.
* The React API client must send the CSRF value in a custom header on protected mutations.
* Validate allowed origins for credentialed requests.
* Never configure credentialed CORS with wildcard origins.
* Do not rely on `SameSite` alone as the entire CSRF defense.

## Password rules

* Hash passwords with Argon2id through a maintained library. Never implement password crypto manually.
* Never log passwords or password hashes.
* Allow password-manager paste/autofill.
* Use a reasonable minimum length and a generous maximum length. Do not require arbitrary composition rules such as "must contain one symbol" unless the repository already has an agreed policy.
* Reject known-empty/whitespace-only input after validation.
* Change-password requires the current password.
* Successful password reset must invalidate all existing sessions.
* If password hashing parameters change later, allow rehash-on-login.

## Tokens

Email-verification, password-reset, and pending-email-change tokens must be:

* cryptographically random;
* single use;
* short lived;
* stored only as a digest/hash in the database;
* invalid after successful consumption;
* invalid after expiry;
* never written to logs.

Do not reuse one token type for another purpose. Record purpose, creation time, expiry, and consumed time.

Password reset requests must return a generic successful response whether or not the email exists.

## Account lifecycle

Use a clear account status model. At minimum support:

* `PENDING_VERIFICATION`
* `ACTIVE`
* `SUSPENDED`
* `DELETED`

Rules:

* New accounts start as `PENDING_VERIFICATION`.
* Only verified, active accounts may create normal authenticated sessions.
* `SUSPENDED` and `DELETED` accounts cannot log in.
* Existing sessions belonging to a suspended/deleted account must stop authorizing requests.
* Deleting/suspending an account must be capable of revoking sessions.
* Do not automatically free/reuse a deleted account's email in MVP. Reuse can create medical-history ownership ambiguity and must wait for an explicit retention/recovery policy.
* Temporary brute-force lockout/backoff must not be modeled as permanent account suspension.

## Email identity rules

Store:

* the user-facing email;
* a normalized email used for lookup/uniqueness.

Normalize consistently and enforce uniqueness at the database level.

Changing email:

1. Authenticated user supplies current password and a new email.
2. Reject if the normalized new email belongs to another account, but avoid unnecessary account-enumeration detail.
3. Keep the current email active.
4. Create a one-time verification token for the pending new email.
5. Only after verification, atomically replace the account email.
6. Invalidate the token.
7. Record a security event.
8. Notify the previous email through the mail abstraction if mail delivery exists.
9. Do not merge accounts if the new email is already associated with another identity.

## Duplicate and lost-account rules

* Duplicate normalized emails must be prevented by a database unique constraint, not only application validation.
* Never auto-merge duplicate accounts.
* Never use matching name, DOB, prescription, medication, document, or other medical information to decide that two accounts are the same person.
* Do not implement "lost access to email" recovery by asking medical-history questions.
* If the user has lost the registered email and has no valid session, mark manual identity recovery as a deferred product/security workflow rather than inventing an unsafe bypass.

## Brute force and enumeration protection

Apply rate limiting/backoff to registration, login, verification resend, forgot password, reset password, and email-change token operations.

Requirements:

* Avoid permanent lockout caused solely by repeated failures.
* Login errors should not reveal whether the email exists.
* Forgot-password should use the same outward response for existing and non-existing accounts.
* Verification resend should avoid leaking account existence where practical.
* Use structured internal reasons for debugging while returning safe public errors.
* Never log submitted passwords or raw tokens.

If the project is deployed across multiple instances, rate-limit state must not depend only on one process's memory. If the MVP is single-instance, keep the limiter replaceable and document this deployment constraint.

## Data model

Use migrations. Adapt names to existing project conventions, but preserve the responsibilities below.

### `accounts`

Required fields conceptually:

* `id` UUID/opaque internal identifier
* `email`
* `email_normalized` unique
* `password_hash`
* `status`
* `email_verified_at`
* `created_at`
* `updated_at`

Optional operational fields only when needed:

* `last_login_at`
* `password_changed_at`

Do not add patient name, DOB, sex, allergies, medical identifiers, or clinical data here.

### `sessions`

Conceptual fields:

* `id`
* `account_id` FK
* `token_hash` unique
* `created_at`
* `last_seen_at`
* `expires_at`
* `absolute_expires_at` if separate from idle expiry
* `revoked_at`
* minimal user-agent/device metadata if useful

Do not persist raw session tokens.

### `auth_tokens`

One table is acceptable if token purpose is explicit.

Conceptual fields:

* `id`
* `account_id` FK
* `purpose` enum: `VERIFY_EMAIL`, `RESET_PASSWORD`, `CHANGE_EMAIL`
* `token_hash` unique
* `pending_email` only for email-change tokens
* `created_at`
* `expires_at`
* `consumed_at`

### `security_events`

Authentication/security events only, not the future clinical provenance system.

Record events such as:

* registration
* email verified
* login success
* login failure/rate-limit decision where appropriate
* logout
* logout all
* password changed
* password reset
* email change requested/completed
* session revoked
* account status blocks

Do not store secrets in event metadata.

## Backend module boundary

Prefer a feature/domain structure consistent with the existing modular monolith. If the repository is new, organize approximately as:

```text
src/modules/auth/
  auth.routes.*
  auth.controller.*
  auth.service.*
  auth.repository.*
  auth.schema.*
  auth.policy.*
  auth.types.*
```

Shared concerns such as database connection, error handling, mail transport, configuration, and generic request middleware belong in shared/infrastructure areas, not duplicated inside auth.

Controllers should be thin. Put business rules in services and database access in repositories/data-access code.

## API contract

Use the repository's existing API conventions. If none exist, implement these endpoints:

```text
POST /api/auth/register
POST /api/auth/verify-email
POST /api/auth/resend-verification
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/logout-all
GET  /api/auth/me
GET  /api/auth/csrf

POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/change-password

POST /api/auth/change-email/request
POST /api/auth/change-email/confirm
```

Rules:

* Validate request bodies at the boundary.
* Return consistent JSON envelopes/errors.
* Do not return password hashes, token hashes, raw reset/verification tokens, or internal security metadata.
* `GET /me` returns only account-level identity information required by the UI.
* Protected routes must resolve the account from the authenticated session on the server.
* Never trust a client-supplied `accountId` to decide ownership.

For local development without an email provider, use a mail abstraction with a development adapter. Do not expose reset/verification tokens in normal production API responses.

## React scope

Create or complete these flows using the project's UI system:

* Register
* Verify email state
* Login
* Forgot password
* Reset password
* Protected-route/session bootstrap
* Security settings:

  * change password;
  * request email change;
  * logout current session;
  * logout all sessions.

Frontend rules:

* Keep auth/session state in application memory, refreshed from `/api/auth/me`.
* Never persist bearer credentials in browser storage.
* Send cookies with credentialed API requests.
* Obtain/send CSRF tokens as required by the backend.
* Handle loading, success, expired-token, invalid-token, rate-limited, suspended/unavailable-account, and generic server-error states.
* Use accessible labels and correct password/email autocomplete attributes.
* Do not put patient/medical-profile fields on registration.

## Mail abstraction

Authentication should call a mail interface rather than directly coupling domain services to one email vendor.

Required message types:

* verify email;
* reset password;
* verify new email;
* notify old email after email change;
* optional security notice after password reset/change.

Templates may be minimal. Never include passwords. Links must use configured frontend/base URLs, not hardcoded localhost values.

## Authorization middleware

Implement a reusable `requireAuth` equivalent that:

1. Reads the session cookie.
2. Hashes/digests it using the same strategy as storage.
3. Finds an unrevoked, unexpired session.
4. Loads the account.
5. Rejects non-`ACTIVE` accounts.
6. Updates `last_seen_at` with sensible throttling rather than writing on every request if that would create unnecessary database load.
7. Attaches a minimal authenticated-account context to the request.

Do not attach the future `PatientProfile` as if it were the account identity.

## Transaction requirements

Use database transactions for multi-step security mutations where partial completion would be unsafe, including:

* consuming a verification token + activating the account;
* consuming reset token + replacing password hash + revoking sessions;
* verifying pending email + changing account email + consuming token;
* logout-all session revocation.

Token consumption must be concurrency-safe so the same token cannot succeed twice.

## Required edge cases

Implement or explicitly test/document behavior for:

1. Same email registered twice concurrently.
2. Email case/normalization variants.
3. Correct login before email verification.
4. Wrong password without email enumeration.
5. Repeated failed logins.
6. Expired/used/invalid verification token.
7. Expired/used/invalid reset token.
8. Two reset requests where an older token is later used.
9. Password reset while other sessions are active.
10. Logout called twice.
11. Session expired in another browser tab.
12. Suspended/deleted account with an existing cookie.
13. Change email to the same normalized email.
14. Change email to another account's email.
15. Multiple pending email-change requests.
16. Old email remains active until new email is verified.
17. Concurrent token consumption.
18. Database failure during token consumption.
19. CSRF attempt against authenticated mutation.
20. Cross-origin credential request from an unapproved origin.
21. Account with lost email access: no unsafe medical-data recovery path.
22. Duplicate accounts are never silently merged.
23. Deleted account email is not automatically reassigned.
24. Mail provider failure does not expose secrets or corrupt account state.

Choose safe deterministic behavior when a detail is not specified, then document the choice.

## Testing

Add tests at the levels already used by the repository. At minimum cover:

### Unit/service tests

* email normalization;
* password hash/verify;
* token generation/digest/expiry/one-time use;
* account-status decisions;
* session expiry/revocation;
* email-change state rules.

### API/integration tests

* full register -> verify -> login -> `/me` -> logout flow;
* duplicate registration constraint;
* login rejection before verification;
* generic invalid-credential behavior;
* forgot/reset flow;
* reset revokes prior sessions;
* change password;
* change email confirmation;
* logout all;
* suspended/deleted account rejection;
* CSRF enforcement;
* rate limiting/backoff;
* raw secrets never appear in responses.

### Frontend tests

Cover critical form submission, authenticated bootstrap, protected-route redirect, token error states, and logout behavior.

Do not chase arbitrary coverage percentages. Cover security-critical branches and regressions.

## Error handling and observability

* Centralize public API error formatting.
* Give each error a stable machine-readable code.
* Keep user messages safe and concise.
* Log request/security failures with correlation/request IDs if the app already supports them.
* Redact credentials, cookies, auth headers, reset tokens, verification tokens, and password fields.
* Do not return stack traces in production.

## Acceptance criteria

Module 1 is complete only when all are true:

* A new user can register, verify email, log in, reload the React app, remain authenticated through a valid server session, and log out.
* Password reset works with a single-use expiring token and revokes previous sessions.
* Authenticated users can change password and securely change email.
* Sessions are stored/revoked server-side and secrets are not stored in browser storage.
* CSRF and rate-limit protections are active.
* Account status is enforced on every authenticated request.
* Auth identity is independent from `PatientProfile`.
* Duplicate accounts are prevented by database constraints.
* There is no account-merge behavior.
* Suspended/deleted accounts cannot continue using stale sessions.
* Migrations, tests, lint/type checks, and the project's normal test command pass.
* No auth secret appears in logs, API payloads, committed fixtures, or source code.
* No medical data is added to the auth schema.
* The implementation remains a module inside the monolith, not a new microservice.

## Final self-critique before declaring completion

Before finishing:

1. Review the implementation for authentication bypasses, session fixation, stale-session authorization, token replay, CSRF, enumeration, brute force, unsafe logging, race conditions, and database uniqueness gaps.
2. Review whether any code incorrectly treats `PatientProfile` or medical data as authentication identity.
3. Remove duplicated code and unnecessary abstractions.
4. Confirm deferred features were not accidentally implemented.
5. Fix all high-severity findings before completion.
6. In the completion response, briefly list:

   * what was implemented;
   * tests run and their results;
   * migrations/config/env additions;
   * deliberate tradeoffs;
   * remaining risks/deferred work.

**After completing this module, create the directory if needed and write a concise implementation summary to `docs summary/authentication-and-identity-YYYY-MM-DD-HHmm.md`, using the actual completion date and time; include implemented behavior, important files/migrations, tests run, architectural decisions, known limitations, and deferred items.**
