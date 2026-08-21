# Prescriptionly Module 5 Agent Prompt: Prescription Management

Implement **Module 5: Prescription Management** in the existing Prescriptionly repository.

First inspect Modules 0-4, their summaries, Prisma schema/migrations, authentication/profile ownership rules, Module 3 documents, Module 4 confirmed extractions, API conventions, tests, and frontend patterns. Preserve the existing React + Vite + strict TypeScript frontend, Node.js + Express + strict TypeScript backend, MySQL + Prisma modular-monolith architecture.

Do not reorganize working foundations.

## Goal

Create Prescriptionly's structured **Prescription** record.

A prescription may be created:

1. manually by the patient; or
2. from a **confirmed Module 4 extraction** linked to a Module 3 source document.

A confirmed extraction may prefill a prescription draft, but **must never automatically become a prescription**. The user must explicitly create/review the prescription record.

Keep these layers separate:

```text
Original document
      ↓
Confirmed extraction
      ↓
Prescription
      ↓
PrescriptionItem[]
```

Manual entry starts directly at `Prescription`.

## Scope

A prescription contains:

* prescription date, optional if unknown;
* prescriber name as entered/source text;
* clinic/facility name as entered/source text;
* optional source document;
* optional confirmed source extraction;
* patient notes;
* record status;
* one or many `PrescriptionItem`s.

Do not create doctor/provider accounts or clinic entities.

Do not implement medication consumption, treatment state, schedules, reminders, or adherence here.

## Data model

Use Prisma migrations and existing naming conventions.

### `Prescription`

Conceptually:

* `id`
* `patientProfileId`
* `sourceType`: manual or document/extraction
* nullable `sourceDocumentId`
* nullable `sourceExtractionId`
* nullable prescription date
* nullable `prescriberName`
* nullable `clinicName`
* nullable notes
* record status
* `createdAt`
* `updatedAt`
* optional `confirmedAt`
* optional `archivedAt`

Use a minimal record-status model such as:

* `DRAFT`
* `CONFIRMED`
* `ARCHIVED`

These are **record lifecycle states**, not treatment states.

Do not use `ACTIVE`, `STOPPED`, or `COMPLETED` to describe whether a patient is taking medication. Module 8 owns treatment/course state.

### `PrescriptionItem`

A prescription must model items separately:

```text
Prescription
├── PrescriptionItem
├── PrescriptionItem
└── PrescriptionItem
```

Each item should include:

* `id`
* `prescriptionId`
* ordered `position`
* medication name exactly as entered/confirmed;
* optional raw/source strength text;
* optional raw/source dosage form text;
* optional `originalInstructionText`;
* optional raw/source quantity text;
* optional raw/source duration text;
* optional item notes;
* timestamps.

These are source-preserving fields, not a medication catalog or fully parsed dosage model.

Do not put multiple medications into JSON inside one prescription row.

## Module boundaries

### Module 6 owns medication knowledge/catalog

Do not require a medication catalog match.

Every item must remain usable with its entered name:

```text
PrescriptionItem
├── enteredMedicationName
└── future medicationConceptId?   // Module 6
```

Do not implement RxNorm/openFDA/SNOMED or autocomplete in this module unless Module 6 already exists.

### Module 7 owns structured dosage

Real instructions can be complex:

```text
1 tablet every 8 hours
2 tablets day 1, then 1 daily
5 mL as needed, maximum four times daily
```

Module 5 must preserve the original instruction text without forcing it into simplistic `dose/frequency/duration` columns.

Do not reject:

* PRN/as-needed instructions;
* missing duration;
* missing quantity;
* changing/tapered instructions;
* unclear handwritten instructions.

Never invent missing structured values.

### Module 8 owns treatment/course

A prescription does not prove that the patient started, stopped, completed, or is currently taking the medication.

Do not create treatment records or `isActive`.

## Creating from Module 4

When creating from a confirmed extraction:

* verify the extraction belongs to the authenticated patient's document;
* require extraction status `CONFIRMED`;
* use only user-confirmed/corrected values, never unreviewed machine candidates;
* link the resulting prescription to the source extraction/document;
* preserve medication grouping/order where Module 4 supplied it;
* create a `DRAFT` prescription first so the user can verify the final structured record;
* never modify the source extraction or document.

If a field remains unknown/unreadable, leave it null or unresolved. Do not guess.

The same confirmed extraction must not accidentally create duplicate prescriptions through repeated clicks. Make creation idempotent or detect an existing linked prescription and return a deterministic result.

## Manual prescription entry

Provide a manual creation flow for prescriptions that have no uploaded document.

The user must be able to:

* enter prescription date if known;
* enter prescriber/clinic text;
* add one or many medication items;
* reorder items;
* preserve free-text instructions;
* leave quantity/duration unknown;
* save as draft;
* explicitly confirm.

Manual prescriptions must be clearly identifiable as **user-entered**, not presented as document-derived or clinician-verified.

## Confirmation rules

A draft is editable.

To confirm:

* require at least one valid `PrescriptionItem`;
* require a non-empty entered medication name for each confirmed item;
* validate ownership;
* validate source links if present;
* confirmation must be an explicit user action.

After confirmation, do not silently rewrite the source document/extraction.

Do not implement the complete version/audit system from Module 11 here. If corrections to confirmed structured prescriptions are not already supported safely by existing provenance infrastructure, keep confirmed records read-only and document that correction/version workflow is deferred to Module 11 rather than implementing destructive overwrite.

Archiving must not delete the source document, extraction, or items.

## Ownership

Every endpoint requires existing authentication and patient-profile ownership.

Resolve ownership from the authenticated server context.

Never trust client-provided `accountId` or `patientProfileId`.

A patient may access only their own prescriptions.

Source document and extraction IDs must also belong to the same patient and, when both are supplied, the extraction must belong to that document.

Guessed prescription/item/source IDs must never bypass authorization.

## API

Follow established conventions. If none exist, use approximately:

```text
POST   /api/prescriptions
POST   /api/prescriptions/from-extraction

GET    /api/prescriptions
GET    /api/prescriptions/:prescriptionId

PATCH  /api/prescriptions/:prescriptionId
POST   /api/prescriptions/:prescriptionId/items
PATCH  /api/prescriptions/:prescriptionId/items/:itemId
DELETE /api/prescriptions/:prescriptionId/items/:itemId

POST   /api/prescriptions/:prescriptionId/confirm
POST   /api/prescriptions/:prescriptionId/archive
```

Item deletion is allowed only while the prescription is `DRAFT`.

List endpoint should support basic pagination/filtering by record status and date range. Do not build advanced search.

Prevent mass assignment by explicitly mapping allowed fields.

## Frontend

Create the Prescription Management feature using existing UI conventions.

Provide:

* prescription list;
* prescription detail;
* manual "Add Prescription" flow;
* "Create Prescription" action from a confirmed Module 4 extraction;
* draft editing;
* add/remove/reorder medication items;
* source document link/preview entry point where applicable;
* clear source label:

  * `From uploaded document`
  * `Entered manually`
* explicit confirmation action;
* archive action;
* empty/loading/validation/error states.

For document-derived prescriptions, show that the original document remains the evidence source.

Do not show a medication as "active", "taken", "completed", or "adherent" in this module.

## Required edge cases

Handle/test:

1. one prescription with one item;
2. one prescription with many medications;
3. manual prescription with no document;
4. prescription created from confirmed extraction;
5. attempt to create from unconfirmed extraction;
6. repeated create-from-extraction request;
7. source document/extraction belongs to another patient;
8. source extraction does not belong to supplied document;
9. PRN/as-needed instruction;
10. no duration;
11. no total quantity;
12. complex/tapered dosage text;
13. unclear handwritten instruction;
14. medication name absent/unreadable;
15. same medication appears twice on one prescription;
16. two different prescriptions contain the same medication;
17. missing prescription date;
18. missing prescriber or clinic;
19. item reordering;
20. confirming empty draft;
21. editing/removing items after confirmation is blocked unless safe versioning already exists;
22. archiving confirmed prescription;
23. archived source document remains linked;
24. guessed prescription/item ID;
25. concurrent confirmation or item edits.

## Tests and verification

Add focused tests for:

* Prescription + PrescriptionItem relationships;
* manual creation;
* creation from confirmed Module 4 extraction;
* confirmed-value mapping only;
* multi-item prescriptions and ordering;
* ownership isolation;
* source-link validation;
* duplicate/idempotent extraction conversion;
* draft editing;
* confirmation validation;
* archive behavior;
* PRN/missing quantity/missing duration/complex instruction preservation;
* frontend manual and extraction-derived flows.

Use only synthetic medical data in tests.

Run the repository's normal:

* lint;
* format check;
* strict TypeScript typecheck;
* tests;
* Prisma validation/generation;
* migrations;
* production builds.

Add and commit the required Prisma migration.

## Do not overbuild

Do not implement:

* medication catalog/normalization;
* external drug APIs;
* structured dosage parsing;
* treatment start/stop/completion;
* schedules/reminders;
* medication events/consumption;
* adherence analytics;
* doctor accounts;
* pharmacy integrations;
* FHIR/export;
* full audit/version system;
* AI medical interpretation.

## Acceptance criteria

Module 5 is complete when an authenticated patient can create a prescription manually or intentionally create one from a confirmed Module 4 extraction; a prescription contains one or many ordered `PrescriptionItem`s; source document/extraction links remain intact; PRN, missing quantity/duration, complex instructions, and uncertain source information can be preserved without guessing; ownership is enforced; and no prescription is confused with treatment or actual medication consumption.

Before finishing, critique the implementation for:

* one-row multi-medication design;
* automatic OCR-to-prescription promotion;
* use of unconfirmed extraction values;
* source/document mutation;
* cross-patient source linking;
* forced medication catalog matches;
* oversimplified dosage columns;
* treatment-state leakage into prescription status;
* destructive edits to confirmed records;
* duplicate conversion from one extraction;
* invented medical values;
* unsafe TypeScript escapes.

Fix all high-severity findings before completion.

**After completing Module 5, create the summary directory if needed and write a concise completion summary to the project's established summary folder as `prescription-management-YYYY-MM-DD-HHmm.md`. Use `docs summary/` if that is the convention established by earlier modules. Include schema/migration changes, manual and extraction-derived flows, source-link rules, endpoints/UI, confirmation behavior, tests/checks run, edge cases handled, known limitations, and deferred work.**

---

### Context & Memory Management
**Clear your memory:** When starting this module, clear your memory / context. Read only the necessary information that you need from prerequisite module summaries after reading this prompt. If your memory/context is inflating or floating, you are free to write down the references and notes you need in a temporary file (e.g., `.memory` or `scratch/memory.md`) and keep referencing and updating that memory file as long as you need.
