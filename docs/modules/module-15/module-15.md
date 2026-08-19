# Module 15 — Health Summary

> **POST-MVP / LATER PHASE — NOT PART OF MVP 1.**

Implement **Health Summary** within the existing Prescriptionly modular monolith, following all architecture, strict TypeScript, authorization, validation, audit/provenance, security, frontend, API, and testing conventions established in Modules 0–14.

## Purpose

Generate two views of the patient's confirmed medical history:

* **Patient Summary:** clear, understandable overview.
* **Clinician Summary:** concise, structured medical-history view.

Include where available:

* current medications/treatments
* prescribed vs actual medication history
* previous medications/treatments
* allergies captured by the system
* selected recent medical records
* relevant patient-reported information such as Phase 2 symptoms

## Source-of-truth rules

Summary content may use only:

```text
confirmed structured records
+
clearly labeled patient-reported information
```

Never silently treat:

* unverified OCR/AI extraction
* uncertain document interpretation
* system inference
* generated AI text

as confirmed medical facts.

Preserve distinctions between:

```text
Prescribed
Patient reported / actually taken
Document-confirmed
AI/OCR extracted but unverified
```

Exclude unverified information by default, or explicitly mark it if a future workflow intentionally includes it.

Every important summary item should remain traceable to its originating record/document/event.

## Critical behavior

* Do not diagnose, infer new conditions, establish medication causation, or create medical facts.
* Do not convert missing information into negative claims.
* Do not merge conflicting records into a fabricated single truth. Surface meaningful conflicts/uncertainty.
* Preserve approximate/unknown dates rather than inventing precision.
* Respect archived/deleted/versioned records according to existing policies.
* Ensure summaries always belong to the authenticated patient's authorized profile.
* Regenerating a summary must reflect the chosen current record state without altering source data.

## Architecture

Prefer deriving summaries from the canonical structured domain model rather than storing duplicated medical facts.

If summaries are persisted/cached, record:

* patient
* summary type
* generated timestamp
* source/version context
* included scope/date range
* provenance/version as appropriate

Keep generation reusable so Module 16 exports and Module 17 sharing can consume summary data without duplicating business logic.

Implement only necessary Prisma changes, backend services/routes, strictly typed frontend views, source references, authorization, loading/error/empty states, and tests.

If AI is used for wording, it may **format/summarize allowed facts only**. It must not become the source of medical truth, and the feature should degrade safely if the AI provider is unavailable.

## UX

Clearly distinguish:

```text
Current medications
Previous medication history
Patient-reported information
Recent records
```

Provide access from important statements back to their source where practical.

Do not make the summary visually appear more authoritative than the underlying data.

## Scope control

Do not expand this module into:

* diagnosis or risk prediction
* treatment recommendations
* drug interaction analysis
* general AI health chat
* automatic clinical interpretation
* FHIR/export implementation itself

Those belong to separate modules.

At completion, run relevant checks/tests and create:

`summary/module-15-summary.md`

Document implementation, data sources, provenance/traceability approach, API/schema changes, tests, limitations/TODOs, and explicitly state that **Module 15 is post-MVP and excluded from MVP 1**.
