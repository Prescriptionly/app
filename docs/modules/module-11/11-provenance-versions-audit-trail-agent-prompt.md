# Prescriptionly Module 11 Agent Prompt: Provenance, Versions & Audit Trail

Implement **Module 11: Provenance, Versions & Audit Trail** in the existing Prescriptionly repository.

First inspect Modules 0-10, their completion summaries, Prisma schema/migrations, Module 3 source documents/hashes, Module 4 extraction/review data, Module 5 prescriptions, Module 7 dosage confirmation, Module 8 treatments, Module 9 schedules, Module 10 medication-event correction behavior, authentication/security events, API conventions, tests, and frontend patterns.

Preserve the existing React + Vite + strict TypeScript frontend, Node.js + Express + strict TypeScript backend, MySQL + Prisma modular-monolith architecture. Do not reorganize working foundations.

## Goal

Make provenance and correction history a first-class part of Prescriptionly.

The system must be able to answer:

```text
What is this record?
Where did it come from?
Who created it?
Was OCR/AI involved?
Who confirmed it?
Was it corrected?
What was the previous value?
When did each change happen?
What original evidence supports it?
```

Think in terms of:

```text
Source: prescription image
Extraction: OCR/AI
Confirmed by: user
Corrected by: user
Correction timestamp: ...
```

## Core principle

Prescriptionly needs both:

```text
tamper-resistant historical evidence
+
correctable structured information
```

Do not confuse immutable history with uncorrectable data.

Original evidence/history remains preserved. Structured records may be corrected through explicit version/correction operations.

Do not claim a normal MySQL database is tamper-proof or blockchain-immutable.

## Scope

Module 11 owns:

* provenance metadata;
* who/what created or changed a record;
* previous structured versions;
* correction relationships;
* source/actor attribution;
* links to original evidence;
* append-only application audit events;
* user-visible history for important medical records.

Do not replace Module 1 authentication-security events. Clinical provenance and auth-security logging may remain separate systems.

Do not implement permanent deletion/retention policy, full medical timeline, sharing consent, exports, or admin-support access here.

## Actors and sources

Support actor types such as:

* `USER`
* `SYSTEM`
* `OCR_AI`

Store the authenticated account ID when a user performed an action.

Never attribute OCR/AI output to the user unless the user explicitly confirmed/corrected it.

Support source types such as:

* `MANUAL_ENTRY`
* `DOCUMENT`
* `OCR_AI_EXTRACTION`
* `USER_CONFIRMATION`
* `USER_CORRECTION`
* `SYSTEM_GENERATED`

Preserve links to concrete resources where relevant:

```text
Document
DocumentAsset
DocumentExtraction
Prescription
PrescriptionItem
DosageInstruction
Treatment
MedicationSchedule
ExpectedDose
MedicationEvent
```

Never describe a system-generated schedule as doctor-entered/prescribed evidence.

## Audit events

Create an append-only `AuditEvent` or `ProvenanceEvent` model using existing conventions.

Conceptually include:

* `id`
* nullable `patientProfileId`
* `actorType`
* nullable `actorAccountId`
* `action`
* `resourceType`
* `resourceId`
* optional source resource type/id
* optional correlation/parent ID
* safe action metadata
* request/correlation ID where useful
* `occurredAt`

Useful actions include:

* `CREATED`
* `CONFIRMED`
* `CORRECTED`
* `SUPERSEDED`
* `ARCHIVED`
* `GENERATED`
* `LINKED`
* `UNLINKED`

Do not put passwords, tokens, auth headers, binary documents, provider secrets, or arbitrary full medical records into audit metadata.

Normal application clients must never update/delete audit rows.

## Record versions

For confirmed structured records that can later be corrected, implement explicit versions rather than destructive overwrite.

Use a generic or carefully shared `RecordVersion` model conceptually containing:

* `id`
* `patientProfileId`
* `resourceType`
* `resourceId`
* sequential `versionNumber`
* change type/reason
* actor/source metadata
* validated snapshot of versioned structured fields
* optional changed-field metadata
* `createdAt`

JSON is acceptable for a validated resource-version snapshot, but do not serialize arbitrary Prisma objects, relations, secrets, provider payloads, or binary content.

Use resource-specific serializers/schemas so snapshots remain intentional and typed.

Creating a new version and updating the current record must happen in one database transaction.

Concurrency must prevent two conflicting corrections from both silently becoming current.

Never rewrite or renumber historical versions.

## Current vs historical state

Normal APIs may return the latest effective record.

History must remain available:

```text
Version 1: original confirmed value
Version 2: first correction
Version 3: later correction
```

The current table may contain latest values for efficient reads, while previous versions live in `RecordVersion`.

## Integrate Modules 3-10

### Module 3: Documents

Original source assets remain unchanged.

Reuse existing content hashes/source IDs for evidence.

Archiving does not erase provenance.

Do not copy binary files into audit/version tables.

### Module 4: OCR

Keep these distinguishable:

```text
machine value
user correction
user confirmation
```

Do not collapse them into one value.

### Module 5: Prescriptions

Confirmed prescriptions that require correction should now use Module 11 versioning instead of destructive overwrite.

Source document/extraction links remain intact.

### Module 7: Dosage

Corrections to confirmed structured dosage create versions while `originalInstructionText` remains preserved.

### Module 8: Treatment

Add provenance around start/stop/complete/restart actions.

Do not create redundant record versions when the domain's separate historical treatment rows already preserve history adequately.

### Module 9: Schedules

Add meaningful provenance around schedule creation/supersession.

Do not create thousands of noisy audit events for generated `ExpectedDose` rows.

### Module 10: Medication events

Generalize/integrate the existing correction chain with Module 11.

Preserve all original events and existing correction links.

Do not lose history during migration.

## Provenance links

Provide a lightweight source-evidence relationship where needed.

Examples:

```text
Prescription
DERIVED_FROM
Confirmed Extraction
```

```text
Confirmed Extraction
EXTRACTED_FROM
Document
```

```text
MedicationSchedule
GENERATED_FROM
Treatment + DosageInstruction
```

Do not build a generic graph platform.

Prevent provenance links across different patients.

## Deletion and archiving

Distinguish:

```text
Archived/hidden
```

from:

```text
Permanently destroyed
```

Archiving must preserve history.

Do not implement permanent destruction of medical/audit/version records here. Retention and deletion rules belong to Module 20.

Do not add user-facing hard-delete controls for provenance/audit data.

## API

Follow existing conventions.

Reasonable read endpoints:

```text
GET /api/provenance/:resourceType/:resourceId
GET /api/versions/:resourceType/:resourceId
GET /api/versions/:resourceType/:resourceId/:versionNumber
```

Corrections should normally use the owning domain's resource-specific endpoint, for example:

```text
POST /api/medication-events/:id/corrections
POST /api/prescriptions/:id/corrections
POST /api/prescriptions/:prescriptionId/items/:itemId/dosage/corrections
```

Do not expose public endpoints that allow clients to create/edit/delete arbitrary audit events.

Every history/provenance read must enforce ownership of the underlying patient resource.

Knowing an audit/version ID is never authorization.

## Service integration

Do not scatter direct audit-table writes through controllers.

Create a small typed shared provenance/version service such as:

```text
recordProvenanceEvent(...)
createVersion(...)
recordCorrection(...)
linkProvenance(...)
```

Domain services should call it inside their normal transaction where consistency matters.

If provenance/version recording is required for a medical mutation, both must succeed or fail together.

Controllers remain thin.

## Frontend

On relevant medical-record detail screens provide:

```text
View history
```

Show concise human-readable provenance such as:

```text
Created manually by you
17 Aug 2026, 10:14

Confirmed from OCR extraction
17 Aug 2026, 10:18

Corrected quantity
2 tablets → 1 tablet
17 Aug 2026, 10:31
```

Where possible provide:

```text
View source document
```

Clearly distinguish:

* source evidence;
* OCR/AI;
* user confirmation;
* user correction;
* system-generated data.

Do not expose raw version JSON/provider payloads to normal users.

Do not build Module 12's complete medical timeline here.

## Required edge cases

Handle/test at least:

1. manual prescription provenance;
2. document-derived prescription provenance;
3. OCR extraction confirmed by user;
4. OCR value corrected before confirmation;
5. confirmed medication event corrected later;
6. original value remains available;
7. correction of a correction;
8. concurrent corrections;
9. sequential version numbering;
10. transaction failure creates neither orphan version nor partial current change;
11. archived document still supports provenance;
12. original asset remains unchanged;
13. structured dosage correction preserves source text;
14. treatment lifecycle provenance;
15. schedule supersession without excessive audit noise;
16. standalone OTC-event provenance;
17. system-generated expected dose distinguished from patient event;
18. cross-patient provenance-link attempt;
19. guessed version/audit IDs;
20. user cannot edit/delete audit rows;
21. archived record retains authorized history;
22. missing source reference handled safely;
23. historical versions remain readable after later changes;
24. no secrets appear in snapshots/metadata;
25. older version snapshots remain readable after schema evolution.

## Tests and verification

Add focused tests for:

* append-only audit behavior;
* actor/source attribution;
* source-evidence links;
* version creation/retrieval;
* correction transactions;
* concurrency;
* previous/current version behavior;
* integration with Modules 3-10;
* Module 10 correction compatibility/migration;
* ownership isolation;
* archive/history behavior;
* sensitive-field exclusion;
* frontend provenance/history UI.

Use synthetic medical data only.

Run:

* lint;
* format check;
* strict TypeScript typecheck;
* tests;
* Prisma validation/generation;
* migrations;
* production builds.

Add and commit required Prisma migration(s).

## Do not overbuild

Do not implement:

* blockchain;
* external notarization;
* "tamper-proof" claims;
* SIEM/log-management platforms;
* permanent deletion/retention policy;
* sharing-consent audit;
* admin/support tooling;
* medical timeline aggregation;
* export provenance bundles;
* automatic medical conflict resolution.

Avoid audit events for trivial generated rows when they add no meaningful provenance.

## Acceptance criteria

Module 11 is complete when Prescriptionly can show who/what created or changed important structured medical records, when it happened, what source/evidence supports the record, previous corrected values, and the current effective version while preserving original evidence.

The system must distinguish user-entered, OCR/AI-extracted, user-confirmed, user-corrected, and system-generated information.

Before finishing, critique the implementation for:

* destructive overwrite;
* editable/deletable audit records;
* missing/duplicate version numbers;
* race conditions;
* current-record changes without required provenance;
* snapshots containing secrets or excessive sensitive duplication;
* audit noise;
* false immutability claims;
* cross-patient source links;
* AI activity attributed to users;
* system-generated information presented as doctor-entered;
* archiving destroying history;
* Module 12/20 scope leakage;
* unsafe TypeScript escapes.

Fix all high-severity findings before completion.

**After completing Module 11, create the summary directory if needed and write a concise completion summary to the project's established summary folder as `provenance-versions-audit-trail-YYYY-MM-DD-HHmm.md`. Use `docs summary/` if that is the convention established by earlier modules. Include schema/migration changes, audit/version design, actor/source semantics, correction integration, evidence links, transaction/concurrency rules, endpoints/UI, tests/checks run, known limitations, and deferred work.**
