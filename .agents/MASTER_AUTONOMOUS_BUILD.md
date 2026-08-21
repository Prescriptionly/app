# Prescriptionly Autonomous Full-Application Build Prompt

This is the task-specific master file for the repository. It is governed by the root `AGENTS.md` and is designed to work with `.github/copilot-instructions.md` and `.github/agents/prescriptionly-full-builder.agent.md`. Read all applicable files together. The root agent rules define the authority boundary; this file defines the full-build workflow and completion criteria.

You are the principal engineer responsible for completing the entire Prescriptionly application in autonomous execution mode. Start with Module 0, then execute every available module prompt in order until the whole application is implemented, integrated, documented, and verified.

Do not stop after producing a plan. Do not merely scaffold files or describe what should be built. Inspect the repository, make the changes, run the application checks, repair failures, record progress, and continue to the next module without waiting for routine confirmation.

## Mission

Build Prescriptionly as a trustworthy personal medication and medical-record wallet focused on the relationship between:

1. What the original source document said.
2. What OCR or AI extracted.
3. What the user reviewed and confirmed.
4. What was prescribed.
5. What treatment was actually started.
6. What doses were expected.
7. What the patient reports actually happened.
8. What the system calculated or inferred.

These states must never be silently merged or confused.

The core product principle is:

> The prescription is historical evidence. Medication events are the patient's reported reality. Neither overwrites the other.

The completed system must let a user preserve original medical documents, review extracted prescription information, manage medications and treatments, record actual medication events, compare prescribed versus actual usage, view a traceable timeline, and securely export or share deliberately selected information.

## Known Starting Point

The current `Prescriptionly/prescriptionly-frontend` repository is an early scaffold, not a finished frontend.

At the time this instruction was written, its default branch was `frontend-setup` and it contained:

- React 19, TypeScript, Vite, React Router, and ESLint.
- `src/app/router.tsx` for routing.
- `src/components/AppLayout.tsx` for the application shell.
- Feature folders under `src/features/`, currently including basic authentication and dashboard placeholders.
- Placeholder login, registration, dashboard, and navigation markup.
- Links to routes that are not implemented.
- No completed authentication integration, API client, domain state management, medical workflows, production documentation, or real backend integration.
- A Vite starter README that must eventually be replaced with a public, project-specific README.

Do not mistake the current pages for completed modules. Preserve useful structure and assets, but replace placeholder behavior with real, integrated product behavior.

## Required Source Material

Before editing code, recursively inspect the entire provided workspace and read all applicable instruction files. Locate files by name if their paths differ. Required sources include:

- `AGENTS.md` and any nested repository instructions.
- The Module 0 prompt.
- Every numbered or grouped module prompt.
- Existing module summaries and progress files.
- `Raw-idea.txt`.
- `Idea-Vision-and-solution.txt`.
- `Modules.txt`.
- All README, architecture, API, schema, design, and deployment documentation.
- Existing frontend and backend source code, migrations, environment examples, scripts, and lockfiles.
- Any supplied screenshots, mockups, or design references.

Create an ordered module manifest before implementation. The manifest must show the actual module prompt files found, their order, dependencies, whether they are MVP or Phase 2, and whether several conceptual modules have been grouped into one prompt.

Do not execute a grouped prompt twice. The expected conceptual coverage is Modules 0 through 22, but the actual prompt files are authoritative for numbering and grouping. Cross-check them against the module inventory later in this instruction. If a prompt combines Modules 17 through 20, execute that combined prompt once and mark all four conceptual areas covered. If a detailed module prompt is missing, use the corresponding section of `Modules.txt`, this master file, and completed dependency summaries as the bounded fallback, record the missing prompt in the module summary, and continue without inventing unrelated scope.

## Instruction Priority and Conflict Resolution

Obey higher-level platform and repository instructions first. Within the project material, use this precedence:

1. This master execution prompt, especially its stack, testing, safety, and continuous-execution requirements.
2. Module 0 for project layout and foundational architecture.
3. The exact prompt for the module currently being implemented.
4. Confirmed decisions recorded in earlier module summaries.
5. `Raw-idea.txt`, `Idea-Vision-and-solution.txt`, and `Modules.txt`.
6. Existing placeholder code.

Honor compatible requirements together. When they conflict, apply the higher-priority instruction and document the conflict and decision in the current module summary.

Important resolved conflict: use **MySQL with Prisma**, not PostgreSQL. The source material's PostgreSQL suggestion is architectural guidance, but the explicit selected stack is MySQL with Prisma. Do not use PostgreSQL-only types or behavior such as JSONB-specific queries.

## Mandatory Technology and Architecture

Use the versions and layout established by Module 0 and the existing repositories. Unless Module 0 specifies a more precise compatible choice, use:

- Frontend: React with Vite and strictly typed TypeScript.
- Backend: Node.js with Express and strictly typed TypeScript.
- Database: MySQL with Prisma ORM and versioned Prisma migrations.
- Architecture: a modular monolith with domain-oriented boundaries.
- Documents: private object storage through an adapter, with a safe local-development implementation.
- Background work: a durable queue or worker abstraction inside the modular-monolith deployment model.

Use current stable, mutually compatible package versions. Inspect the lockfiles and current runtime before changing dependencies. Do not churn dependencies merely because a newer version exists. Never weaken strict TypeScript settings to make errors disappear. Do not introduce `any`, unsafe casts, or unvalidated external payloads as shortcuts.

Keep backend and frontend domain language aligned. Prefer a structure similar to:
 docs/modules/module-0/00-project-foundation-agent-prompt.md
Adapt this to the actual Module 0 structure rather than performing a gratuitous rewrite.

If a separate backend already exists in the workspace, use it. If no backend exists and Module 0 does not specify its location, create a `backend/` directory at the project worktree root and document that decision. Do not place backend code inside the frontend `src/` directory. Do not create or publish a new remote repository without explicit permission.

## Canonical Domain Model

Implement a relational model that preserves these distinctions:

```text
User
└── PatientProfile
    ├── Document
    │   ├── DocumentVersion
    │   └── Extraction
    ├── Prescription
    │   └── PrescriptionItem
    │       ├── MedicationConcept?       optional normalization
    │       ├── DosageInstruction[]
    │       └── Treatment[]
    │           ├── Schedule
    │           │   └── ExpectedDose[]
    │           └── MedicationEvent[]
    ├── StandaloneMedicationEvent[]
    ├── Symptom[]                        Phase 2
    └── ShareGrant[]

AuditEvent
ExportJob
Notification
BackgroundJob
```

This is a conceptual model. Normalize it appropriately for MySQL and Prisma. Preserve flexible but validated structures where dosage or interoperability payloads genuinely require them.

Use decimal-safe quantities for medication amounts. Do not use binary floating-point for dose quantities where precision matters. Model unknown and approximate dates or times honestly rather than manufacturing false precision. Preserve both the recorded event time and the time the event was entered or corrected.

## Non-Negotiable Product Invariants

The following invariants apply across every module:

1. Original uploaded documents remain intact. Derived information may be corrected through versions, but corrections never rewrite the original evidence.
2. OCR and AI output always begins as untrusted draft extraction. It cannot silently become confirmed clinical-style data.
3. Important extracted fields have field-level confidence and provenance, not only one overall score.
4. The review flow must make dangerous ambiguities visible, including `0.5 mg` versus `5 mg`.
5. A prescription may contain multiple prescription items.
6. Store both original instruction text and structured dosage interpretation.
7. Medication catalog normalization is optional. Preserve the user's entered name and always allow a custom medication when no catalog match exists.
8. Treatment is not identical to prescription. A user may start later, stop, and restart, producing separate historical treatment periods.
9. Expected doses are separate from medication events.
10. A reminder firing never marks a dose taken or skipped. Only an explicit user action creates or updates an actual medication event.
11. Medication events support taken, administered, applied, used, skipped, partial, and other appropriate states without treating every form as “consumed.”
12. Medication events can exist without a prescription for OTC medication, supplements, custom products, injections, or retrospective records.
13. Corrections are versioned or auditable. Destructive silent overwrites are forbidden for clinically meaningful records.
14. A correction must never make the UI imply that the original source contained the corrected value.
15. Similar medication names must be distinguished with strength, dosage form, and identifier where available.
16. PRN or “as needed” instructions do not produce ordinary missed-dose semantics.
17. Timezone changes, daylight-saving changes, travel, approximate times, late entry, and retrospective entry must remain representable.
18. Never auto-merge two accounts or patient medical histories.
19. Account identity and patient profile are separate concepts.
20. Sharing exposes only the explicitly selected patient, categories, records, and time range. Expiration and revocation stop future access while preserving the access audit.
21. The emergency card has its own deliberately limited dataset. It never exposes the whole wallet.
22. Exports identify their format/version, scope, creation time, validation state, and source record versions. Unsupported information produces an explicit warning rather than silent loss.
23. AI output must clearly distinguish “not present in this document” from “the patient does not have this condition.”
24. Prescriptionly records patient-reported facts without presenting dangerous behavior as approved medical advice.
25. Do not claim HIPAA, GDPR, regional, or medical-device compliance merely because security controls exist. Document controls and state that jurisdiction-specific review is required before compliance claims.

## Full Module Coverage

Execute the actual prompt files in their discovered order. Use this inventory as a completeness and regression checklist:

- Module 0: project foundation, repository structure, strict TypeScript, configuration, local development, database, public README, and shared conventions.
- Module 1: authentication and account identity.
- Module 2: patient profile.
- Module 3: medical document vault.
- Module 4: OCR and document-processing review workflow.
- Module 5: prescriptions and prescription items.
- Module 6: medication knowledge/catalog with custom fallback.
- Module 7: dosage and prescription instructions.
- Module 8: treatments and medication courses.
- Module 9: schedules and expected doses.
- Module 10: actual medication-event tracking and prescribed-versus-actual behavior.
- Module 11: provenance, versions, corrections, and audit trail.
- Module 12: source-aware medical timeline.
- Module 13: symptoms and observations, clearly treated as Phase 2 if specified.
- Module 14: document-grounded AI assistant, clearly treated as Phase 2 if specified.
- Module 15: traceable health summaries generated only from eligible confirmed and clearly labeled user-reported data, clearly treated as Phase 2 if specified.
- Module 16: PDF and Prescriptionly JSON export first, then any explicitly requested and validated FHIR or regional adapters.
- Module 17: scoped sharing and consent.
- Module 18: deliberately limited emergency card.
- Module 19: reminders and notifications.
- Module 20: privacy, security, consent, retention, account controls, and access auditing.
- Module 21: background processing, retries, idempotency, and failure handling.
- Module 22: privacy-preserving admin and operational tools.

The source material labels some later modules as Phase 2 or outside MVP 1. That does not mean they should be skipped in this assignment. Finish MVP-critical modules first, then complete Phase 2 modules in dependency-safe order. Use feature flags when an exact module prompt requires them. Only omit a module if its own prompt explicitly says it is documentation-only or must not yet be implemented, and explain the omission in the final report.

## Autonomous Execution Workflow

### 1. Preflight

Before Module 0 changes:

- Inspect Git status and preserve all existing user changes.
- Identify every repository and its writable root.
- Find instruction files, module prompts, summaries, design sources, and environment examples.
- Determine package manager and use the existing lockfile consistently.
- Record the detected Node, package-manager, MySQL, and Prisma requirements.
- Map existing routes, features, APIs, data models, migrations, and incomplete placeholders.
- Identify missing external credentials without exposing secret values.
- Create or update one progress ledger under the existing documentation convention. If no convention exists, use `docs/automation/full-build-progress.md`.

The progress ledger must contain the ordered module manifest, status, completion date, checks run, unresolved external verification, and next module. Keep it compact enough to survive context resets.

### 2. Execute Each Module

For each module, repeat this loop:

1. Read the exact module prompt in full.
2. Read summaries for every dependency and inspect the current implementation rather than trusting summaries alone.
3. Restate the module's acceptance criteria privately as a checklist.
4. Inspect existing features that the change may affect.
5. Design the smallest stable change that satisfies the module without weakening earlier invariants.
6. Implement database schema and migrations, backend domain behavior and API contract, then frontend integration and user experience as applicable.
7. Replace mocks and placeholder behavior with real API integration when the backend contract exists.
8. Cover loading, success, empty, validation, permission-denied, not-found, conflict, retryable failure, and unrecoverable failure states where relevant.
9. Run the required module checks.
10. Fix all failures introduced by the module. Do not leave the worktree knowingly broken and continue.
11. Perform the mandatory critique and regression review described below.
12. Write the module summary using the repository's exact existing summary-folder and filename convention. Do not create competing `summary` and `summery` directories. If no convention exists, use `docs/summary/module-XX-summary.md`.
13. Update the progress ledger.
14. Continue immediately to the next module.

Do not ask for permission between modules. Do not stop after a summary. Do not wait for the user to say “next.”

### 3. Resume After Context or Runtime Interruption

If execution is interrupted or context is compacted:

- Re-read repository instructions, the progress ledger, the most recent module summary, Git status, and the relevant source files.
- Verify the recorded state with code and checks.
- Resume from the first incomplete acceptance criterion.
- Do not repeat completed modules or discard working changes.

The progress ledger is a recovery mechanism, not a substitute for inspecting the code.

## Backend Implementation Standards

- Keep controllers thin and domain/service behavior explicit.
- Validate every boundary, including request params, query strings, bodies, file metadata, queue payloads, external-service responses, and environment variables.
- Use one consistent error model and avoid leaking stack traces or sensitive details to clients.
- Enforce record ownership and patient scope at the service/repository boundary, not only in frontend route guards.
- Use transactions for multi-record changes that must remain consistent.
- Use database constraints and indexes for invariants, uniqueness, lookup, chronology, job leasing, and idempotency where appropriate.
- Avoid logging prescriptions, document text, access tokens, passwords, medical details, or exported payloads. Use identifiers and redacted operational metadata.
- Keep the API versioned and documented. Produce or maintain OpenAPI documentation if Module 0 or existing conventions support it.
- Keep the frontend API client aligned with the actual backend contract. Prefer generated or schema-derived types where practical, but do not introduce a large toolchain solely for generation.
- Implement pagination and bounded filtering for lists and timelines.
- Design file upload limits, MIME/signature validation, safe filenames, content hashing for duplicate detection, private storage keys, and authorized download access.
- Store passwords only with an appropriate password-hashing algorithm and safe parameters. Implement secure reset/session semantics, rate limiting, and credential invalidation.
- Use secure cookie or token behavior consistently with Module 1. Protect against CSRF when cookies are used, and configure CORS narrowly.
- Never commit real secrets. Maintain a complete `.env.example` with safe placeholders and validation.
- Use idempotency for background jobs, exports, and other retryable operations. Model retries, terminal failure, and manual retry visibility.
- External OCR, AI, email, storage, and terminology providers must sit behind typed interfaces. The application must have safe local-development behavior and clear unavailable/degraded states.
- Core document storage, manual prescription entry, custom medication entry, medication-event tracking, and history must remain usable when AI, OCR, or terminology services are unavailable.

## Frontend Implementation Standards

- Preserve the feature-oriented structure already started in `src/features`.
- Use reusable shared UI only for genuinely shared primitives. Keep domain-specific UI in its feature.
- Implement real form submission, validation, authentication state, protected routes, API error handling, and session expiry behavior.
- Make the application responsive and accessible. Use semantic HTML, associated labels, keyboard navigation, visible focus, appropriate ARIA only when needed, readable contrast, and non-color-only status cues.
- Use a calm, trustworthy medical-record interface. Do not present AI as a doctor, diagnostic authority, or source of clinical certainty.
- Clearly label source-document facts, extracted drafts, user-confirmed data, patient-reported events, and system-generated expectations.
- Preserve route compatibility where feasible. Repair the currently linked but missing routes rather than leaving dead navigation.
- Provide safe confirmation for destructive or privacy-sensitive actions, but do not burden routine dose logging with unnecessary friction.
- Support mobile-sized screens for upload, review, dose logging, timeline, sharing, and emergency-card flows.
- Avoid fabricated metrics, fake “AI insights,” and permanent hard-coded medical examples in production screens. Use explicit development seed data only where appropriate.
- Do not make frontend-only permission decisions authoritative. Treat the backend as the security boundary.

## Testing and Verification Policy

### Frontend

Write **no frontend unit tests**. Do not add Vitest, Jest, React Testing Library, snapshot tests, or component-test files for this assignment.

Validate the frontend through:

- Strict TypeScript checking.
- ESLint.
- Production build.
- Browser smoke checks of the integrated critical flows when a browser is available.
- Accessibility and responsive-layout inspection of critical screens.

Do not add Cypress or Playwright merely to compensate for the absence of frontend unit tests. Use an existing end-to-end setup only if it is already required by the repository instructions, and keep it narrowly focused.

### Backend

Write a **minimal, high-value backend test suite**, not broad coverage and not one test file for every trivial controller.

Prefer a compact set of integration or service-level tests for the most dangerous invariants:

- Authentication and cross-user/cross-patient authorization isolation.
- Original-document and prescription evidence not being silently overwritten by corrections.
- Unconfirmed OCR extraction not becoming confirmed structured medication data.
- Expected doses or reminders not automatically creating actual medication events.
- Prescribed-versus-actual medication behavior, including a standalone medication event.
- Scoped, expired, or revoked sharing access if sharing is implemented.
- One background-job idempotency/retry case if background processing is implemented.

Keep the suite minimal while ensuring these critical risks are not completely untested. Reuse fixtures and avoid redundant controller-shape tests that are already covered by validation and typechecking.

### Verification Cadence

After every module, run the smallest relevant checks. At stable checkpoints and at the end, run the full available suite:

- Dependency installation integrity.
- Prisma schema validation and migration status.
- Backend lint and strict typecheck.
- Minimal backend tests.
- Backend build.
- Frontend lint and strict typecheck.
- Frontend production build.
- API startup and health check.
- Database migration and seed on a clean development database when safe.
- Integrated smoke path covering registration/login, document or manual prescription creation, extraction review where configured, treatment, medication event, timeline, and export.

If a check fails, diagnose and repair it. Never delete or disable a legitimate check solely to make the build green.

## Mandatory Critique and Regression Review

After each module, explicitly challenge the implementation before marking it complete:

1. What existing feature, route, API, schema, migration, permission, or user flow could this module have broken?
2. Did it blur source evidence, extracted data, confirmed data, prescribed behavior, expected behavior, actual events, or system inference?
3. Did it introduce a privacy leak, insecure direct-object reference, excessive admin access, sensitive logging, unsafe upload, or stale share link?
4. Did it make an external service a hard dependency for a core manual workflow?
5. Did it mishandle duplicate submission, retry, concurrency, partial failure, timezone, approximate time, decimals, unknown values, or deleted/archived data?
6. Did it add unnecessary abstraction, dependency weight, duplicate concepts, dead routes, or inconsistent naming?
7. Does the UI imply medical approval, diagnosis, causation, or certainty that the data does not support?
8. Are empty, loading, error, unauthorized, expired, revoked, and degraded states understandable?

Run relevant regression checks after this review and fix material issues before continuing. Include a concise “Critique and regression impact” section in every module summary.

## Module Summary Requirements

Each module summary must be factual and compact. Include:

- Module name and status.
- Prompt and source files followed.
- User-visible behavior implemented.
- Domain/schema/migration changes.
- API endpoints and authorization rules.
- Frontend routes and key components.
- Background jobs or external adapters.
- Environment/configuration changes.
- Checks and minimal tests run with results.
- Existing features inspected for regressions.
- Critique, known limitations, and external verification still needed.
- Clear handoff to the next module.

Do not claim a check passed unless it was actually run successfully. Distinguish “implemented,” “locally verified,” and “requires configured external service.”

## Handling Blockers Without Losing Automation

Continue independently through ordinary implementation choices. Choose the safest simple option consistent with the specifications and record the decision.

Do not stop for:

- Naming details that can be inferred from existing conventions.
- Routine library choices.
- Non-critical cosmetic preferences.
- A temporarily unavailable optional OCR, AI, email, terminology, or object-storage service when a typed adapter and safe degraded behavior can be completed.
- A later module that can be implemented without the blocked external verification.

Stop and ask one concise question only when continuing would require guessing something consequential and irreversible, such as:

- Missing credentials or authorization for a destructive or external production action.
- An unrecoverable database migration affecting real data.
- Two genuinely incompatible product rules with no priority resolution.
- A missing repository or write location that prevents any backend implementation.
- A legal/compliance choice that cannot safely be made as an engineering assumption.

When blocked, finish all independent work first. Record the exact blocker, safe work completed, attempted verification, and the smallest user decision required. Never fabricate credentials, production access, legal approval, or successful external-service verification.

## Git and Change Safety

- Preserve unrelated and pre-existing user changes.
- Never use destructive Git commands or rewrite history.
- Do not push, deploy, open a pull request, or modify production infrastructure unless separately and explicitly authorized.
- Do not commit generated secrets, uploaded medical data, local databases, build outputs, or dependency directories.
- Keep migrations additive and reviewable. Never edit an already-applied production migration merely to hide a schema problem.
- Use formatting tools for mechanical formatting, but inspect the resulting diff.

## Documentation and Developer Experience

By completion, replace the Vite boilerplate README with a public Prescriptionly README that explains:

- The product motivation without overstating clinical or interoperability claims.
- Architecture and repository layout.
- Prerequisites and local setup.
- Environment variables.
- MySQL and Prisma migration/seed workflow.
- Frontend, backend, and worker commands.
- Available scripts and verification.
- External provider configuration and degraded behavior.
- Privacy/security posture and the absence of automatic compliance claims.
- MVP and Phase 2 feature boundaries.
- Contribution and license information if the repository supplies those policies.

Also keep API documentation, data-model notes, and operational runbooks consistent with the final code. Do not allow module summaries to become the only documentation for essential setup.

## Definition of Complete

The assignment is complete only when all discovered module prompts have been processed and all of the following are true:

- The module manifest has no unexplained gaps.
- The frontend and backend are integrated rather than independent demonstrations.
- Authentication and patient ownership are enforced end to end.
- Users can upload or manually add appropriate records and preserve originals.
- Extracted data uses a review-and-confirm workflow.
- Prescriptions, prescription items, dosage, treatments, schedules, expected doses, and actual medication events remain distinct.
- Standalone medication events are supported.
- Prescribed-versus-actual history and a source-aware timeline work.
- Audit/version/provenance behavior is visible and enforced.
- Exports and any sharing behavior operate on explicit scope and record their provenance.
- Phase 2 modules required by their prompts are completed after the MVP foundation.
- Privacy/security rules are implemented across modules, not left as a document-only promise.
- Background jobs do not keep long-running OCR, export, or AI work inside a long HTTP request.
- Admin/support functionality follows least privilege and does not grant unrestricted medical-record access by default.
- No frontend unit tests were created.
- The minimal high-risk backend tests pass.
- Lint, strict typecheck, builds, migrations, and available smoke checks pass.
- The application can be set up from the README and `.env.example` without discovering undocumented steps.
- There are no unexplained TODOs, dead navigation routes, fake production data, disabled safety checks, or silently swallowed failures.

## Final Handoff

When every module is complete, provide one concise final report containing:

1. Overall completion status.
2. Modules completed and any intentional grouped prompts.
3. Architecture and major user flows delivered.
4. Database migrations and data-safety decisions.
5. Verification commands and actual results.
6. Minimal backend tests created and why those cases were chosen.
7. Confirmation that no frontend unit tests were added.
8. Security/privacy controls implemented.
9. External integrations that still require real credentials or production verification.
10. Known limitations and risks found during self-critique.
11. Exact files a maintainer should read first, including the README, progress ledger, and final module summary.

Do not claim “production ready” merely because builds pass. State exactly what is implemented and what still requires environment-specific, security, clinical, legal, load, backup/restore, or disaster-recovery validation.

Start now. Inspect the workspace, build the module manifest, execute Module 0, and continue automatically through every remaining module until the definition of complete is satisfied or a genuine blocker meeting the rules above is reached.
