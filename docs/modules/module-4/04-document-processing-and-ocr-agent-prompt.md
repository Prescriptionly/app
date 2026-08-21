# Prescriptionly Module 4 Agent Prompt: Document Processing & OCR

Implement **Module 4: Document Processing & OCR** in the existing Prescriptionly repository.

First inspect Modules 0-3, their summaries, Prisma schema/migrations, document-storage abstraction, authentication/profile ownership rules, API conventions, tests, and frontend patterns. Preserve the existing React + Vite + strict TypeScript frontend, Node.js + Express + strict TypeScript backend, MySQL + Prisma modular-monolith architecture.

Do not reorganize working foundations.

## Goal

Process eligible documents from Module 3 and produce **reviewable extraction drafts**.

Required workflow:

```text
Original document
      ↓
Processing
      ↓
Machine/OCR extraction draft
      ↓
User review and correction
      ↓
Confirmed extraction
```

Never implement:

```text
Upload → AI/OCR → automatically trusted medical record
```

Module 4 owns extraction results and verification state only.

It must **not** create prescriptions, prescription items, medications, treatments, schedules, medication events, diagnoses, or medical advice.

## Core principle

Prescriptionly must distinguish:

* what the original document contains;
* what OCR/AI interpreted;
* confidence in each interpretation;
* what the user corrected;
* what the user confirmed.

Never overwrite the original machine value when the user corrects it.

Module 3 source documents/assets must remain unchanged.

## Processing scope

Support extraction from PDF/JPEG/PNG Module 3 documents.

Handle:

* printed text;
* handwriting where the provider supports it;
* multi-page PDFs;
* several images forming one document;
* mixed languages;
* rotated pages;
* several medications/sections;
* partial extraction;
* processing failure.

Do not promise handwriting or language accuracy beyond the configured provider's capabilities.

## Provider abstraction

Do not couple the application directly to one OCR/AI vendor.

Create an abstraction similar to:

```text
DocumentExtractionProvider
  extract(document/assets)
      ↓
normalized Prescriptionly extraction
```

Requirements:

* provider-specific output is transformed into Prescriptionly's internal format;
* provide a deterministic mock/test provider;
* use a real configured OCR/AI provider only through this abstraction;
* never commit credentials;
* never expose provider secrets/errors directly to users.

If no real provider credentials exist, complete the feature with a development/mock adapter and clearly document what remains required for real OCR.

## Processing lifecycle

Use explicit statuses such as:

* `QUEUED`
* `PROCESSING`
* `NEEDS_REVIEW`
* `CONFIRMED`
* `FAILED`

Use repository naming conventions where they already exist.

Requirements:

* processing starts explicitly;
* duplicate clicks do not create uncontrolled duplicate jobs;
* processing failure never damages the original document;
* failed processing can be retried;
* confirmed extraction stays separate from later reprocessing;
* do not hold a normal HTTP request open for a long OCR operation when background infrastructure already exists.

If Module 21 background infrastructure does not exist yet, add only the minimum replaceable processing runner needed here. Do not create a distributed queue platform prematurely.

## Data model

Add Prisma models/migrations with responsibilities similar to:

### `DocumentExtraction`

* `id`
* `documentId`
* `status`
* provider identifier
* provider/model/version identifier where available
* detected language(s) where available
* processing start/completion timestamps
* safe failure information
* `createdAt`
* `updatedAt`
* `confirmedAt`

### `ExtractionField`

Each important candidate must be independently represented.

Include conceptually:

* `id`
* `extractionId`
* field/type/key
* machine-extracted value
* machine confidence, nullable
* user-corrected/confirmed value
* review status
* source asset/page
* bounding region/coordinates when available
* source snippet where useful
* timestamps

JSON may be used for provider-specific geometry or complex structures, but do not store the complete result only as an opaque JSON blob if doing so prevents field-level review, confidence, and provenance.

## Candidate fields

Module 4 may extract candidates such as:

* doctor/prescriber name;
* document/prescription date;
* clinic/facility;
* medication-name text;
* strength text;
* dosage/instruction text;
* quantity;
* duration;
* other visible document text.

These are **candidates only**.

Do not create medication catalog records or structured prescription entities.

When several medications appear, preserve grouping/order where possible.

Never invent missing information.

## Confidence

Do not use one overall confidence score as the sole safety mechanism.

Important fields require independent confidence when the provider supports it.

Example:

```text
Medication: Amoxicillin       0.93
Strength: 500 mg              0.81
Dose: 1 capsule               0.89
Frequency: 3 times daily      0.72
```

If the provider supplies no confidence, store `null`/unknown. Never manufacture confidence values.

Low confidence should increase review prominence, not trigger guessing.

Treat these as particularly sensitive:

* decimal numbers;
* dosage strengths;
* quantities;
* frequencies;
* units;
* similar medication names.

For example:

```text
0.5 mg
```

must never silently become:

```text
5 mg
```

## Source grounding and hallucination control

Every candidate should remain traceable to its source asset/page and, where supported, a bounding region or source snippet.

Configure/instruct extraction providers to return only information supported by the document.

When information is missing or unreadable:

* return unknown/empty;
* do not infer from medical knowledge;
* do not complete common dosage patterns;
* do not guess medication names.

Distinguish where practical:

```text
Not present in document
```

from:

```text
Present but unreadable/uncertain
```

## Review workflow

Create a user review screen.

Users must be able to:

* view the original document/page;
* navigate pages/assets;
* see extracted candidates;
* see field-level confidence/warnings;
* edit/correct fields;
* mark values unknown/unreadable;
* explicitly confirm the reviewed extraction;
* retry failed processing.

Clearly distinguish:

```text
Machine extracted
User corrected
Low confidence
Unknown
Confirmed
```

Never automatically confirm fields merely because OCR returned them.

## API

Follow existing API conventions. If none exist, use approximately:

```text
POST /api/documents/:documentId/extractions
GET  /api/documents/:documentId/extractions
GET  /api/documents/:documentId/extractions/:extractionId

PATCH /api/documents/:documentId/extractions/:extractionId/fields/:fieldId
POST  /api/documents/:documentId/extractions/:extractionId/confirm
POST  /api/documents/:documentId/extractions/:extractionId/retry
```

Rules:

* require authentication;
* verify ownership of the underlying Module 3 document;
* never trust client `accountId` or `patientProfileId`;
* process only assets owned by that patient;
* never expose internal storage paths or provider secrets;
* sanitize provider errors;
* validate extraction status before confirmation/retry;
* make concurrent confirmation/retry deterministic.

## Privacy

Extracted text is sensitive medical information.

Never:

* process one patient's file under another patient's job;
* expose extraction results through guessed IDs;
* log full OCR text by default;
* log provider payloads containing medical documents unless an explicitly safe diagnostic mechanism exists.

## Required edge cases

Handle/test:

1. clean printed prescription;
2. handwriting;
3. blurred/low-quality image;
4. rotated image;
5. multi-page PDF;
6. multiple image assets;
7. mixed languages;
8. several medicines on one page;
9. abbreviations;
10. `0.5` versus `5` ambiguity;
11. similar medication names;
12. provider supplies no confidence;
13. provider returns unsupported/hallucinated candidate;
14. provider timeout/failure;
15. partial extraction;
16. retry after failure;
17. duplicate processing request;
18. user corrects extracted value;
19. original machine value survives correction;
20. attempted confirmation in invalid state;
21. concurrent edits/confirmation;
22. access to another patient's extraction;
23. archived source document;
24. missing source asset;
25. provider unavailable while the document vault/manual workflows remain functional.

## Tests

Use only synthetic document fixtures.

Cover:

* processing lifecycle/status transitions;
* provider abstraction;
* multi-page/multi-asset documents;
* field-level confidence;
* unknown confidence;
* page/source mappings;
* corrections preserving machine values;
* explicit confirmation;
* retry/failure behavior;
* ownership isolation;
* duplicate/concurrent processing;
* provider-error sanitization;
* frontend review/edit/confirm/failure flows.

Run:

* lint;
* format check;
* strict TypeScript typecheck;
* tests;
* Prisma validation/generation;
* migrations;
* production builds.

Add and commit the Prisma migration.

## Do not overbuild

Do not implement:

* `Prescription` or `PrescriptionItem`;
* medication catalog normalization;
* treatments;
* schedules;
* medication events;
* AI medical advice;
* lab interpretation;
* diagnoses;
* FHIR/export;
* full audit/provenance module;
* country-specific conversion;
* large distributed queue architecture.

Do not allow extraction results to become trusted clinical records without explicit review.

## Acceptance criteria

Module 4 is complete when an authenticated patient can:

* process one of their Module 3 documents;
* receive a structured extraction draft;
* review extracted fields against their source;
* see confidence/provenance where available;
* correct uncertain values;
* preserve the original machine values;
* explicitly confirm the extraction;
* retry failures.

OCR/AI output must never silently become prescription or medication records.

Before completion, critique the implementation for:

* automatic trust of OCR;
* hallucinated fields;
* missing field-level confidence;
* decimal/unit safety;
* loss of original machine values;
* cross-patient leakage;
* OCR/medical text appearing in logs;
* provider lock-in;
* invalid status transitions;
* concurrency/race issues;
* duplicate jobs;
* mutation of Module 3 originals;
* accidental Module 5 implementation;
* unsafe TypeScript escapes.

Fix all high-severity findings.

**After completing Module 4, create the summary directory if needed and write a concise completion summary to the project's established summary folder as `document-processing-and-ocr-YYYY-MM-DD-HHmm.md`. Use `docs summary/` if that is the convention established by earlier modules. Include schema/migration changes, provider/processing architecture, statuses, review workflow, confidence/provenance behavior, endpoints/UI, tests/checks run, known limitations, and deferred work.**

---

### Context & Memory Management
**Clear your memory:** When starting this module, clear your memory / context. Read only the necessary information that you need from prerequisite module summaries after reading this prompt. If your memory/context is inflating or floating, you are free to write down the references and notes you need in a temporary file (e.g., `.memory` or `scratch/memory.md`) and keep referencing and updating that memory file as long as you need.
