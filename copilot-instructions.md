# Prescriptionly Repository Instructions

Prescriptionly is a patient-controlled medication and medical-record wallet. Its defining behavior is the traceable relationship between original evidence, OCR/AI draft extraction, user-confirmed data, what was prescribed, actual treatment periods, expected doses, patient-reported medication events, and system inference. Never silently merge these states.

Before changing code, read the root `AGENTS.md`. For autonomous Module 0 through final-module execution, also read `docs/ai/MASTER_AUTONOMOUS_BUILD.md`, the current module prompt, prerequisite module summaries, and the product files under `project_sources/`.

## Current Repository

The repository began as a small frontend scaffold on the `frontend-setup` branch. It uses React, Vite, React Router, strict TypeScript, ESLint, and npm. Existing authentication, dashboard, layout, and navigation code is placeholder-level and is not proof that a module is complete.

The selected full stack is React + Vite on the frontend, Node.js + Express on the backend, and MySQL + Prisma for persistence. MySQL is authoritative even where older product notes mention PostgreSQL. Keep a domain-oriented modular monolith. If no separate backend exists and Module 0 provides no different path, create `backend/` at the worktree root, never inside frontend `src/`.

Keep frontend domain code under `src/features/<domain>`, application composition under `src/app`, and genuinely shared UI under `src/components`. Keep backend controllers thin, policies explicit, and storage, queue, AI, OCR, terminology, and email behind typed infrastructure adapters.

## Required Product Invariants

- Preserve original documents and prescription evidence.
- Treat OCR/AI output as untrusted draft data until user review and confirmation.
- Keep field-level provenance and confidence for important extracted values.
- Preserve original instruction text alongside structured dosage.
- Allow custom medication when normalization or an external catalog has no match.
- Keep prescription, treatment, schedule, expected dose, and actual medication event distinct.
- A reminder never creates a taken or skipped event.
- Support standalone OTC, supplement, injection, and retrospective medication events.
- Version or audit clinically meaningful corrections instead of silently overwriting them.
- Store event time separately from recorded-at and corrected-at times; support approximate time.
- Enforce account ownership, patient scope, consent, and share scope in the backend.
- Keep emergency-card data deliberately limited.
- Never imply medical diagnosis, causation, approval, or certainty unsupported by evidence.
- Never claim regulatory compliance from architecture alone.

## Engineering Rules

Use the existing package manager and lockfiles. Verify compatibility before changing dependencies. Keep TypeScript strict and validate external inputs. Do not use `any`, unchecked casts, unbounded list endpoints, or frontend-only authorization.

Treat medical information as highly sensitive. Do not log document text, medication details, tokens, passwords, exports, or credentials. Keep uploaded files private and validate file size, MIME type, signature, ownership, and safe storage keys. Prevent insecure direct-object references. Use transactions and constraints for multi-record invariants, ownership, idempotency, and retry safety.

Manual prescription entry, custom medication entry, medication-event tracking, history, and safe account controls must remain available when AI, OCR, email, storage, or terminology providers are unavailable. Missing provider credentials are not permission to fake success.

Write no frontend unit, component, or snapshot tests. Do not add Vitest, Jest, React Testing Library, or a frontend testing framework. Validate the frontend with strict typechecking, ESLint, production builds, and focused browser smoke checks.

Keep backend testing minimal. Cover only critical invariants such as ownership isolation, evidence/correction history, unconfirmed extraction, reminder-versus-event separation, prescribed-versus-actual behavior, sharing revocation or expiry, and one background-job idempotency case.

## Build and Validation

Inspect package scripts before running commands. The initial frontend supports:

```bash
npm ci
npm run lint
npm run build
npm run dev
```

Do not assume `npm test` exists. Once the backend is created, follow its documented scripts for Prisma validation and migration, lint, strict typecheck, minimal tests, build, startup, and health checks.

After each module, inspect affected existing features, run relevant checks, fix introduced failures, write the module summary using the existing convention, update the progress ledger, and continue automatically. Critique each result for regressions, privacy leaks, provenance confusion, external-service hard dependencies, duplicate/retry/concurrency bugs, timezones, decimals, unknown values, and unsafe medical implications.

When running through GitHub Copilot cloud agent, the assigned task authorizes commits and pushes only to the platform-managed task branch and creation of a draft pull request when required by that workflow. Never push directly to the default branch, merge, deploy, release, change production infrastructure, or touch production data without explicit authorization. Preserve unrelated work and never rewrite Git history.
