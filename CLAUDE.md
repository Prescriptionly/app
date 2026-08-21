# Prescriptionly Agent Rules

## Scope

This file applies to the entire repository. Every AI coding agent must read it before planning, editing, reviewing, running migrations, or changing dependencies.

A more deeply nested `AGENTS.md` may add directory-specific guidance. It must not weaken the health-data provenance, authorization, privacy, security, testing, or change-safety requirements in this file.

For an autonomous full-product build, also read `docs/ai/MASTER_AUTONOMOUS_BUILD.md` in full. For GitHub Copilot, `.github/copilot-instructions.md` and `.github/agents/prescriptionly-full-builder.agent.md` provide compatible GitHub-specific guidance.

## Authority Boundaries

Within the requested task, an agent may:

- Read the whole repository and applicable product documentation.
- Edit files inside the provided worktree.
- Add compatible dependencies when they are necessary and justified.
- Run local development services, builds, linters, typechecks, minimal backend tests, Prisma validation, and development-database migrations.
- Create safe local seed data that is obviously fictional.
- Update documentation and progress summaries required by the module workflow.

Without separate explicit authorization, an agent must not:

- Push branches, open or merge pull requests, publish packages, deploy, or change production infrastructure.
- Access, modify, migrate, seed, truncate, or delete a production database.
- Send emails, notifications, or external messages to real recipients.
- Create remote repositories, cloud resources, paid services, or external accounts.
- Guess, expose, reuse, or commit credentials, tokens, private medical data, or secrets.
- Rewrite Git history or use destructive Git commands.
- Make legal, regulatory, diagnostic, treatment, or medical-device compliance claims.
- Expand the task beyond the repository or the user's stated product scope.

When operating through GitHub Copilot cloud agent or another managed coding-agent workflow, assigning an implementation task authorizes the platform to create and update its isolated task branch, make task-scoped commits, and create a draft pull request when that workflow requires it. This does not authorize direct changes to the default branch, merging, deployment, release publication, production access, or unrelated repository changes.

If an operation is destructive, externally visible, costly, irreversible, or production-affecting, stop and request authorization after completing all independent safe work.

## Project Mission

Prescriptionly is a patient-controlled medication and medical-record wallet. It preserves original prescriptions and medical documents, converts eligible documents into user-reviewed structured information, records what was prescribed, tracks what the patient reports actually happened, and supports traceable sharing or export.

The primary value is not generic reminders or AI chat. It is the trustworthy relationship between:

1. Original source evidence.
2. OCR or AI draft extraction.
3. User-confirmed structured information.
4. Prescribed medication and instructions.
5. Actual treatment periods.
6. Expected dose occurrences.
7. Patient-reported medication events.
8. System-generated calculations or inferences.

These layers must remain independently identifiable in the data model, API, UI, audit history, summaries, exports, and administrative tools.

## Product Sources

Before implementing a product module, locate and read:

- `project_sources/01-Raw-idea.txt` or `Raw-idea.txt`.
- `project_sources/02-Idea-Vision-and-solution.txt` or `Idea-Vision-and-solution.txt`.
- `project_sources/03-Modules.txt` or `Modules.txt`.
- The Module 0 prompt.
- The exact prompt for the current module.
- Summaries for all completed prerequisite modules.
- Relevant architecture, schema, API, security, design, and deployment documentation.

If a detailed module prompt is absent, use the matching section of `Modules.txt` together with `docs/ai/MASTER_AUTONOMOUS_BUILD.md` as the bounded fallback. Record that fallback in the module summary. Do not invent unrelated scope.

When project sources conflict, use this order unless a higher-level platform instruction requires otherwise:

1. The user's current explicit request.
2. This `AGENTS.md` and any stricter applicable nested agent rule.
3. `docs/ai/MASTER_AUTONOMOUS_BUILD.md` for the full-build assignment.
4. Module 0 architectural decisions.
5. The exact current module prompt.
6. Confirmed decisions in earlier module summaries.
7. Product vision and module-source files.
8. Existing placeholder code.

Apply compatible requirements together. For a material unresolved conflict, use the safer non-destructive interpretation, document it, finish independent work, and ask only if the conflict blocks correct implementation.

## Selected Stack

Use the project decisions established by Module 0. The selected baseline is:

- Frontend: React, Vite, and strict TypeScript.
- Backend: Node.js, Express, and strict TypeScript.
- Database: MySQL with Prisma ORM and versioned migrations.
- Architecture: a domain-oriented modular monolith.
- Documents: private object storage through a typed adapter, with safe local-development behavior.
- Long-running work: a worker or durable queue abstraction within the modular-monolith deployment model.

MySQL with Prisma is authoritative. A historical product note recommending PostgreSQL is advisory and does not override this choice. Do not introduce PostgreSQL-only data types or queries.

Use the existing lockfile and package manager. Prefer currently installed compatible versions. Verify compatibility before adding or upgrading dependencies. Do not weaken strict TypeScript, linting, validation, or security settings to make a check pass. Avoid `any`, unchecked type assertions, and unvalidated external payloads.

## Repository Architecture

Keep frontend code feature-oriented:

```text
src/
├── app/
├── features/
├── components/       shared UI only
├── services/
└── utils/
```

Domain-specific components, hooks, schemas, and API operations belong in the relevant feature. Do not create one unstructured global component directory.

Keep the backend modular and domain-oriented:

```text
backend/src/
├── app/
├── modules/
├── infrastructure/
└── shared/
```

Controllers stay thin. Services enforce use cases and policies. Repositories own persistence details. Infrastructure adapters isolate storage, queue, AI, OCR, email, and terminology providers. Authorization must be enforced in the backend service or repository boundary, never only in frontend route guards.

If a separate backend worktree exists, use it. If no backend exists and Module 0 specifies no other location, create `backend/` at the current worktree root. Never place backend code inside frontend `src/`.

## Canonical Health-Data Rules

The following are mandatory invariants:

- Original documents and prescription evidence remain intact.
- Derived structured data is correctable through explicit versions or corrections, never by rewriting the source evidence.
- OCR and AI output begins as an untrusted draft and requires user review before confirmation.
- High-risk fields have field-level confidence and provenance. Make ambiguities such as `0.5 mg` versus `5 mg` visible.
- A prescription contains one or more prescription items.
- Preserve both original instruction text and validated structured dosage.
- Medication normalization is optional. Preserve the entered name and support custom medication, regional brands, compounds, supplements, and products missing from a catalog.
- A prescription is not an active treatment. Treatments can start later, stop, and restart as separate historical periods.
- Expected doses and actual medication events are separate entities.
- A notification or reminder never automatically marks medication as taken or skipped.
- Actual medication events support dosage-form-appropriate language and states such as taken, administered, applied, used, skipped, partial, and other.
- Standalone events must work without a prescription for OTC medication, supplements, injections, and retrospective history.
- Store the event time separately from recorded-at and corrected-at times. Support approximate or unknown time without false precision.
- Corrections remain traceable. Do not silently overwrite clinically meaningful history.
- Do not auto-merge accounts, patient profiles, or medical histories.
- Sharing and export use explicit patient, category, record, and date-range scope.
- Expired or revoked access stops future access while audit history remains.
- The emergency card has its own deliberately limited dataset and never exposes the whole wallet.
- Exports record format, version, scope, creation time, validation state, and source record versions. Unsupported data produces a warning instead of silent loss.
- AI must distinguish “not found in this document” from “the patient does not have this condition.”
- Do not infer diagnosis, adherence, causation, medical approval, or clinical certainty that the evidence does not support.

## Security and Privacy Rules

- Treat all medical content as highly sensitive.
- Enforce account ownership, patient scope, consent scope, and administrative privilege on every protected backend operation.
- Prevent insecure direct-object references by deriving access from authenticated ownership, not user-supplied identifiers alone.
- Validate parameters, queries, bodies, file metadata, queue payloads, environment variables, and all external responses.
- Use safe password hashing, secure reset and session handling, rate limiting, narrow CORS, and CSRF protection when cookie authentication is used.
- Keep object storage private. Validate file size, extension, MIME type, file signature, and ownership before processing or download.
- Do not log document text, medical details, tokens, passwords, exported payloads, or credentials. Use redacted identifiers and operational metadata.
- Use transactions for multi-record invariants and database constraints for ownership, uniqueness, chronology, idempotency, and job leasing where appropriate.
- Do not hard-delete source evidence or audit events through ordinary UI actions. Define archive, soft-delete, retention, and legally required deletion separately.
- Apply least privilege to admin and support features. “Admin can see everything” is forbidden as a default architecture.
- Document implemented controls accurately. Never claim HIPAA, GDPR, regional, or medical-device compliance without the required external review and evidence.

## External Service Resilience

OCR, AI, email, object storage, notifications, and medication terminology must be behind typed interfaces.

Do not make an optional provider a hard dependency for core behavior. Manual prescription entry, custom medication entry, document storage, medication-event tracking, history, and safe account controls must continue when AI, OCR, terminology, or email is unavailable.

If credentials are missing, complete the adapter, configuration validation, local-development implementation, degraded UI state, retry behavior, and documentation. Mark real-provider verification as pending and continue with independent modules. Never fabricate a successful external integration test.

## Frontend Rules

- Preserve feature-oriented organization and route compatibility where practical.
- Replace placeholder forms and data with actual API integration when the contract exists.
- Provide loading, empty, validation, permission-denied, not-found, conflict, degraded-service, retryable-failure, and terminal-failure states where relevant.
- Use semantic HTML, correctly associated labels, keyboard access, visible focus, readable contrast, and non-color-only status cues.
- Keep critical upload, extraction review, dose logging, timeline, sharing, and emergency-card flows usable on mobile-sized screens.
- Visually distinguish source evidence, extracted draft, confirmed data, patient-reported events, and system-generated expectations.
- Do not display fabricated production metrics, medical conclusions, or AI certainty.
- The backend remains the authorization boundary.

## Testing Policy

Write no frontend unit, component, or snapshot tests. Do not add Vitest, Jest, React Testing Library, or a component-testing framework for this project. Validate frontend changes with strict typechecking, ESLint, production builds, and focused browser smoke checks. Do not add an end-to-end framework solely to compensate for the absence of frontend unit tests.

Keep backend tests minimal and high value. Prefer one compact suite covering the most dangerous invariants:

- Authentication and cross-user or cross-patient isolation.
- Source evidence and confirmed prescription history not being silently overwritten.
- Unconfirmed OCR extraction not becoming confirmed medication data.
- Reminders or expected doses not creating actual medication events.
- Prescribed-versus-actual behavior, including a standalone medication event.
- Expired, revoked, or out-of-scope sharing access when sharing exists.
- One job idempotency or retry case when background processing exists.

Do not create broad coverage, repetitive controller tests, or one test file per trivial module. Do not skip the critical backend invariants merely to save time.

## Module Execution Workflow

For full-build work, execute Module 0 and every discovered module prompt in dependency-safe order. Phase 2 status changes ordering, not whether the module is completed, unless the exact prompt explicitly makes it documentation-only or deferred.

For each module:

1. Read the exact prompt, prerequisites, summaries, and current code.
2. Inspect existing features that could be affected.
3. Define acceptance criteria and risks.
4. Make the smallest coherent full-stack change.
5. Apply schema changes with reviewable Prisma migrations.
6. Implement backend contract and authorization before or alongside frontend integration.
7. Replace mocks when real contracts exist.
8. Run relevant checks and repair introduced failures.
9. Critique the result for regressions, privacy leaks, provenance confusion, unsafe inference, concurrency, retries, timezones, decimal precision, unknown values, and degraded external services.
10. Write the module summary using the existing convention and update the progress ledger.
11. Continue without waiting for “next.”

If there is no summary convention, use `docs/summary/module-XX-summary.md`. If there is no progress ledger, use `docs/automation/full-build-progress.md`. Do not create competing `summary` and `summery` folders when one already exists.

## Verification

Inspect `package.json` files before running commands. In the current frontend scaffold, the expected baseline is:

```bash
npm ci
npm run lint
npm run build
npm run dev
```

Do not assume a test script exists. After backend creation, use its documented scripts for Prisma validation, migration, lint, typecheck, minimal tests, build, startup, and health checks.

At stable checkpoints, verify dependency integrity, Prisma schema and migrations, backend lint/typecheck/build/minimal tests, frontend lint/build, application startup, and an integrated smoke flow. Do not delete or disable a legitimate check to make the result green. Never report an unrun check as passed.

## Mandatory Self-Review

Before declaring any change complete, answer:

- Which existing routes, schemas, APIs, permissions, or flows could this have broken?
- Did it confuse source, extraction, confirmation, prescription, treatment, expectation, event, or inference?
- Could one user access another user's or patient's data?
- Does retry, duplicate submission, concurrency, partial failure, correction, deletion, or timezone behavior remain safe?
- Does core behavior survive optional-provider failure?
- Does the UI imply diagnosis, causation, approval, or certainty unsupported by evidence?
- Did the change introduce needless dependencies, duplication, dead navigation, unsafe casts, or undocumented setup?

Fix material findings before continuing. Record remaining limitations honestly.

## Git and Delivery

Preserve unrelated work and inspect diffs. Do not use `git add .`, `git add -A`, destructive resets, history rewrites, or broad file deletion. A local agent must not commit, push, deploy, or open a pull request unless the current user instruction authorizes it. A managed GitHub cloud agent may use only its platform-created task branch and draft pull-request workflow as described under Authority Boundaries. Never merge or deploy without explicit authorization.

When handing off, lead with the result, list actual checks and their outcomes, identify migrations and configuration changes, confirm the frontend testing policy, summarize the minimal backend tests, and distinguish completed local implementation from external or production verification still required.

Do not add yourself to any Git commit, commit message, author metadata, or repository history.
From now on:
* Do not add `Co-Authored-By: Claude` or any similar trailer.
* Do not add “Generated by Claude,” “Created with Claude Code,” or AI attribution anywhere.
* Do not modify `git user.name` or `git user.email`.
* Use only the Git identity already configured in the repository or system.
* Keep commit messages clean, professional, and focused only on the actual code changes.
* Do not amend or rewrite existing commits unless I explicitly ask.
* Before committing, check the final commit message and remove all AI attribution.
Other agents such as Codex and Gemini do not insert themselves into my Git history. Follow the same behavior. My Git history must contain only the project changes and the configured human author.