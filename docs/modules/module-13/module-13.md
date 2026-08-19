# Module 13 — Symptoms & Observations

> **PHASE 2 ONLY — NOT PART OF THE MVP.**
> Implement this module only when Phase 2 development begins. Do not make the MVP depend on it.

Implement **Symptoms & Observations** within the existing Prescriptionly modular monolith, following all established architecture, TypeScript strictness, validation, authorization, audit/provenance, API, UI, testing, and coding conventions from Modules 0–12.

## Scope

Allow a patient to record symptoms/observations independently or optionally associate them with a medication or treatment period.

### Symptom record

Support:

* symptom/name or user-entered description
* severity using a clearly defined scale
* occurred/start timestamp and optional end timestamp/duration
* approximate/unknown timing where supported by existing timeline conventions
* free-text notes
* optional related medication
* optional related treatment/course
* created-at/updated-at and appropriate provenance/audit information

Users must be able to:

* create a symptom
* view symptom details/history
* edit/correct it without destroying required audit history
* remove/archive it according to existing deletion policies
* browse/filter symptoms by date, severity, medication/treatment association, where useful

Integrate confirmed symptoms into the **Medical Timeline** while visually preserving that they are **patient-reported observations**, not prescriptions, medication events, or system conclusions.

## Critical domain rules

* A symptom must exist without any medication/treatment relationship.
* Medication/treatment relationships are optional **associations only**.
* Never infer, store, display, or word temporal correlation as causation.
  Example: `Headache occurred during Treatment X` is acceptable; `Treatment X caused headache` is not unless such causation was explicitly provided from an appropriate source.
* Do not automatically diagnose conditions or provide medical conclusions from symptoms.
* Do not silently derive symptoms from AI/OCR/document content.
* Preserve user-entered wording where normalization is uncertain.
* Multiple symptoms may overlap, recur, change severity, or relate to the same treatment.
* Handle ongoing symptoms and incomplete/approximate timestamps without inventing precision.

Design the model so **simple future observations** can be added later without turning this module into a full generic health-tracking platform.

## Engineering

Implement only the necessary:

* Prisma/MySQL models and migrations
* backend module/service/repository/controller/routes/validation/policies
* strictly typed frontend feature, forms, views and API integration
* authorization and patient ownership checks
* audit/provenance integration
* timeline integration
* appropriate unit/integration tests and important edge cases

Keep module boundaries clean and do not introduce unnecessary abstractions or unrelated health-tracking features.

At completion, run the relevant checks/tests and create:

`summary/module-13-summary.md`

Document what was implemented, schema/API changes, important architectural decisions, tests performed, limitations/TODOs, and explicitly state that **Module 13 belongs to Phase 2 and is excluded from the MVP**.
