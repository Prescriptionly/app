# Prescriptionly Module 12 Agent Prompt: Medical Timeline

Implement **Module 12: Medical Timeline** in the existing Prescriptionly repository.

First inspect Modules 0-11, their completion summaries, Prisma schema/migrations, prescriptions, treatments, schedules, medication events, documents, provenance/version history, patient timezone/date handling, API conventions, tests, and frontend patterns.

Preserve the existing React + Vite + strict TypeScript frontend, Node.js + Express + strict TypeScript backend, MySQL + Prisma modular-monolith architecture. Do not reorganize working foundations.

## Goal

Create a trustworthy chronological view of the patient's medication and medical-record history.

The timeline should show the progression:

```text
Doctor prescribed
      ↓
Treatment started
      ↓
Expected schedule existed
      ↓
Patient reported actual medication events
      ↓
Treatment stopped/completed
      ↓
History remains available
```

## Core rule

Do **not** collapse different facts into one ambiguous chronological stream.

Every timeline entry must clearly show:

* what happened;
* when it happened;
* which medication/record it concerns;
* whether it is prescribed, patient-reported, AI/OCR-derived, document-derived, or system-generated;
* which canonical source record it links to.

Use Module 11 provenance rather than guessing source labels.

At minimum distinguish:

```text
Prescribed
Patient reported
AI/OCR
Document
System generated
```

## Architecture

Module 12 is primarily a **read/composition layer**.

Do not create duplicate authoritative copies of every medical record just to power the timeline.

Prefer a typed timeline service that reads canonical data from:

* `Prescription`
* `PrescriptionItem`
* `Treatment`
* `MedicationEvent`
* `Document`
* relevant Module 11 provenance/version information

Schedules/expected doses should appear only when they materially help the patient's history. Do not flood the timeline with every generated `ExpectedDose`.

If performance later requires a denormalized projection, it must be derived/rebuildable and never replace the canonical source records.

## Timeline entry model

Create a typed DTO/view model, not a new clinical source-of-truth entity.

Conceptually include:

* stable timeline entry ID;
* event/category type;
* occurrence date/time;
* date/time precision;
* IANA timezone where relevant;
* display title;
* concise description;
* medication name where relevant;
* provenance/source category;
* originating resource type;
* originating resource ID;
* optional linked document/source;
* optional prescription/treatment references;
* small typed metadata required by the UI.

Useful event types may include:

* `PRESCRIBED`
* `TREATMENT_STARTED`
* `TREATMENT_STOPPED`
* `TREATMENT_COMPLETED`
* `MEDICATION_TAKEN`
* `MEDICATION_ADMINISTERED`
* `MEDICATION_APPLIED`
* `MEDICATION_USED`
* `MEDICATION_SKIPPED`
* `MEDICATION_PARTIAL`
* `STANDALONE_MEDICATION_EVENT`
* `DOCUMENT_ADDED`
* meaningful `CORRECTION`

Use existing naming conventions.

Never invent timeline facts that do not exist in canonical records.

## Avoid timeline noise

Do not add every technical/internal event.

Do not include by default:

* every generated expected dose;
* schedule-horizon extensions;
* every OCR field;
* every audit event;
* processing retries;
* background-job statuses.

These belong on record/history/detail screens when needed.

The medical timeline should remain readable.

## Prescribed vs actual

This distinction must remain obvious.

Example:

```text
16 Aug 2026
PRESCRIBED
Amoxicillin 500 mg
1 capsule three times daily
Source: uploaded prescription
```

Later:

```text
17 Aug 2026, 08:12
PATIENT REPORTED
Amoxicillin 500 mg
Taken: 1 capsule
```

Never merge these into wording that implies a prescription proves actual consumption.

Likewise, an expected schedule is not an actual medication event.

## Current and previous medications

Support useful history views/filters for:

* current active treatments;
* previous stopped/completed treatments;
* standalone/OTC medication history;
* prescriptions;
* documents;
* date ranges.

"Current medication" must derive from Module 8 `ACTIVE` treatment state, not merely from:

* a recent prescription;
* a recent medication event;
* an expected dose.

An old prescription must not appear as current medication unless an active treatment supports that status.

## Uncertain dates

Do not force false precision.

Support existing canonical representations for:

* exact timestamp;
* exact date with unknown time;
* year + month;
* year only;
* approximate date/range;
* actual occurrence unknown but recorded-at known.

The timeline source requirement includes cases such as:

```text
approximately March 2024
```

Never fabricate midnight/noon just to obtain a sortable timestamp.

For internal sorting of uncertain dates, use a deterministic helper while preserving the true precision and displaying the uncertainty.

Do not present the helper value as the actual clinical date.

## Timezones

Respect time semantics established by Modules 2, 9, and 10.

For exact timestamped events:

* preserve the original event timezone/context;
* optionally display in the user's chosen viewing timezone where appropriate;
* never rewrite stored history.

For date-only prescription/treatment/document events, avoid UTC conversion that shifts the calendar date.

## Corrections and versions

Use Module 11's current/effective versions for the default timeline.

Do not display obsolete corrected values as if they remain current facts.

Where useful, show:

```text
Corrected
```

with:

```text
View history
```

Do not reproduce the full Module 11 version history inside the medical timeline.

For corrected medication events, show the latest effective event while maintaining navigation to prior versions.

## Documents

Relevant Module 3 documents may appear in the timeline.

Prefer the document's actual clinical/document date when known.

If unknown, distinguish clearly:

```text
Document date: unknown
Uploaded: 17 Aug 2026
```

Do not silently treat upload date as the medical/document date.

Show classification/title and secure link to document detail where appropriate.

OCR processing completion itself should not normally become a medical-history event.

## Ordering

Sort by clinically meaningful occurrence time first.

Examples:

* prescription date for prescription;
* treatment start/end date for lifecycle events;
* `actualEventTime` for medication events;
* document date where known.

`createdAt`/`recordedAt` may be fallback/tie-breaker values but must not replace a known occurrence date.

Retrospective medication events should appear based on **when they happened**, optionally noting that they were recorded later.

Define deterministic tie-breaking so pagination never reshuffles equal-time events.

## API

Follow existing conventions. If none exist, use approximately:

```text
GET /api/timeline
GET /api/timeline/current-medications
GET /api/timeline/previous-medications
```

A single timeline endpoint with typed filters is also acceptable.

Support bounded filters such as:

```text
from
to
types[]
medication
current/previous
documents
cursor/page
limit
```

Requirements:

* authenticated ownership only;
* never accept `patientProfileId` from the client for authorization;
* deterministic ordering;
* bounded page size/date range;
* cursor pagination if appropriate;
* avoid N+1 queries;
* use typed mappers/resolvers rather than a large controller.

## Timeline composition service

Create a dedicated service, conceptually:

```text
TimelineService
├── loadPrescriptionEntries()
├── loadTreatmentEntries()
├── loadMedicationEventEntries()
├── loadDocumentEntries()
└── mergeAndSort()
```

Exact design may differ.

Keep composition/mapping logic isolated and typed.

Every entry must derive from canonical source data and Module 11 provenance.

## Frontend

Create a Medical Timeline screen using existing UI conventions.

Provide:

* chronological timeline;
* date grouping;
* source/provenance labels;
* medication name and relevant action/amount;
* links to source prescription/document/treatment/event;
* filters:

  * all;
  * current medications;
  * previous medications;
  * medication events;
  * prescriptions;
  * documents;
  * date range;
* empty/loading/error states;
* pagination/infinite loading consistent with API design.

Use labels such as:

```text
Prescribed
Patient reported
Document
AI/OCR
System generated
```

Do not rely only on color for provenance.

Do not make AI/OCR output look clinician-confirmed.

## Required edge cases

Handle/test at least:

1. prescription before treatment start;
2. treatment starts days later;
3. retrospective medication event;
4. standalone OTC aspirin;
5. stopped and restarted treatment;
6. corrected medication event;
7. archived prescription/document visible when history filters permit;
8. active medication derived from active treatment;
9. old prescription not marked current;
10. same medication from multiple prescriptions;
11. multiple medications on one prescription;
12. exact timestamp;
13. date-only record;
14. partial/approximate date;
15. document with unknown document date but known upload date;
16. timezone travel/history;
17. DST-sensitive actual event;
18. expected dose with no event does not create a missed entry;
19. PRN schedule does not flood timeline;
20. thousands of expected doses do not flood timeline;
21. OCR field events do not flood timeline;
22. correct provenance labels;
23. user correction attributed to user, not OCR;
24. system schedule not labeled prescribed by doctor;
25. pagination does not duplicate/reorder entries;
26. same-time entries have deterministic ordering;
27. unauthorized access;
28. large timelines avoid N+1 query explosion;
29. missing/archived source handled safely;
30. current corrected version shown while history remains in Module 11.

## Tests and verification

Add focused tests for:

* timeline mapping per resource type;
* prescribed vs patient-reported distinction;
* current/previous medication filters;
* chronological sorting;
* retrospective placement;
* partial/uncertain dates;
* timezone/date-only handling;
* corrected/current versions;
* provenance/source labels;
* document date versus upload date;
* pagination stability;
* ownership isolation;
* query efficiency where practical;
* frontend filtering/date-grouping/source-label/error states.

Use synthetic medical data only.

Run:

* lint;
* format check;
* strict TypeScript typecheck;
* tests;
* Prisma validation/generation;
* migrations only if actually needed;
* production builds.

Prefer **no new clinical table** for the timeline unless there is a justified need. If no schema change is required, do not create a meaningless migration.

## Do not overbuild

Do not implement:

* symptoms/observations, Module 13;
* AI explanations, Module 14;
* health summaries, Module 15;
* adherence analytics;
* notification/reminder history;
* export;
* sharing;
* reporting/BI;
* inferred medical causation;
* duplicated authoritative timeline rows.

## Acceptance criteria

Module 12 is complete when an authenticated patient can view a chronologically ordered history combining prescriptions, treatment starts/stops/completions, actual medication events, standalone medication use, and relevant documents; filter current/previous medications and record types; distinguish prescribed, patient-reported, AI/OCR, system-generated, and document-derived information; handle uncertain dates without false precision; and navigate to canonical source records/history.

Before finishing, critique the implementation for:

* ambiguous mixed entries;
* current medication derived from prescription instead of active treatment;
* prescribed information presented as actual use;
* auto-created missed-dose entries;
* expected-dose/audit/OCR noise;
* fabricated timestamps;
* date-only timezone shifting;
* upload date confused with document date;
* obsolete corrected versions shown as current;
* incorrect provenance labels;
* N+1/performance issues;
* duplicated authoritative timeline data;
* cross-patient authorization flaws;
* Module 13-15 scope leakage;
* unsafe TypeScript escapes.

Fix all high-severity findings before completion.

**After completing Module 12, create the summary directory if needed and write a concise completion summary to the project's established summary folder as `medical-timeline-YYYY-MM-DD-HHmm.md`. Use `docs summary/` if that is the convention established by earlier modules. Include timeline architecture/composition strategy, included/excluded event types, source/provenance labeling, current/previous medication logic, uncertain-date/timezone behavior, API/UI, pagination/performance decisions, tests/checks run, schema changes if any, known limitations, and deferred work.**

---

### Context & Memory Management
**Clear your memory:** When starting this module, clear your memory / context. Read only the necessary information that you need from prerequisite module summaries after reading this prompt. If your memory/context is inflating or floating, you are free to write down the references and notes you need in a temporary file (e.g., `.memory` or `scratch/memory.md`) and keep referencing and updating that memory file as long as you need.
