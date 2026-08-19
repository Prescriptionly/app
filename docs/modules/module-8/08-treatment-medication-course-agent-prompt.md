# Prescriptionly Module 8 Agent Prompt: Treatment / Medication Course

Implement **Module 8: Treatment / Medication Course** in the existing Prescriptionly repository.

First inspect Modules 0-7, their completion summaries, Prisma schema/migrations, `Prescription`, `PrescriptionItem`, confirmed dosage instructions, API conventions, tests, and frontend patterns. Preserve the existing React + Vite + strict TypeScript frontend, Node.js + Express + strict TypeScript backend, MySQL + Prisma modular-monolith architecture.

Do not reorganize working foundations.

## Goal

Represent the **actual medication treatment period** separately from the prescription.

A prescription records what was prescribed. A treatment records when the patient says they actually started and stopped/completed that prescribed medication course.

Never assume:

```text
Prescription confirmed
=
Treatment started
```

A patient may receive a prescription today and start it several days later.

They may also:

```text
start
stop
restart
```

without changing the original prescription.

## Core model

Use:

```text
Prescription
  └── PrescriptionItem
        ├── Treatment
        ├── Treatment
        └── Treatment
```

Each `Treatment` represents one historical treatment period.

Do **not** use a single mutable boolean such as:

```text
isActive = true/false
```

because it destroys treatment history.

A stopped/completed treatment remains historical. Restarting the same prescribed medication creates a **new Treatment period** linked to the same `PrescriptionItem`.

## Scope

Module 8 owns:

* treatment start date;
* treatment end date when applicable;
* treatment lifecycle state;
* connection to the originating `PrescriptionItem`;
* patient-entered treatment notes;
* explicit start/stop/complete/restart behavior;
* current-versus-previous treatment presentation.

Module 8 does **not** own:

* prescription content, Module 5;
* medication normalization, Module 6;
* dosage semantics, Module 7;
* expected dose generation, Module 9;
* reminders, Module 19;
* actual taken/administered/skipped events, Module 10;
* full correction/version audit history, Module 11.

A treatment state does not prove medication consumption.

## Data model

Add a Prisma `Treatment` model linked to `PrescriptionItem`.

Conceptually include:

* `id`
* `prescriptionItemId`
* `startedOn`
* nullable `endedOn`
* `status`
* optional patient note
* optional stop/completion reason text
* `createdAt`
* `updatedAt`

Prefer date-only values for course boundaries unless the existing product has already established a need for exact treatment-start timestamps. Module 9 should own dose-level clock scheduling.

Use statuses such as:

* `ACTIVE`
* `STOPPED`
* `COMPLETED`

Use existing equivalent naming if already established.

Rules:

* `ACTIVE` has no final `endedOn`;
* `STOPPED` and `COMPLETED` require an end date;
* end date cannot precede start date;
* terminal periods remain historical;
* do not reopen a stopped/completed row to represent restart;
* restart creates a new treatment period;
* prevent overlapping active periods for the same `PrescriptionItem` unless a future requirement explicitly proves overlap is meaningful.

Enforce important invariants transactionally and at database level where MySQL/Prisma permits. Where a database constraint cannot express an invariant cleanly, enforce it in the service transaction and test concurrency.

## Starting treatment

Starting treatment must be an explicit user action.

Requirements:

* treatment can start only for a prescription item owned by the authenticated patient;
* prescription/item must be in a valid confirmed state according to Module 5;
* source prescription remains unchanged;
* user selects/confirms actual start date;
* do not automatically start treatment when a prescription is created or confirmed;
* do not infer start date from prescription date;
* do not infer treatment start from reminders, schedules, or medication events.

If an active treatment already exists for the same prescription item, reject another start with a stable conflict error.

## Stopping and completing

Provide distinct actions.

### Stop

Use when treatment ended before or outside normal completion.

### Complete

Use when the user reports that the treatment course is complete.

Both actions:

* close the current active period;
* record end date;
* preserve the historical period;
* may include optional user reason/note;
* must not alter the prescription or dosage instruction.

Do not infer completion merely because prescribed duration elapsed.

Do not infer stopping because reminders were ignored or doses were missed.

## Restarting

Restart is not:

```text
oldTreatment.status = ACTIVE
```

Instead:

```text
Treatment #1
start: Aug 1
end:   Aug 5
status: STOPPED

Treatment #2
start: Aug 9
end:   null
status: ACTIVE
```

The UI may provide **Restart treatment**, but the backend must create a new treatment period.

Preserve the connection to the same prescription item.

## Historical entry

Allow the user to record treatment retrospectively where appropriate.

Example:

```text
Started: 1 March 2026
Completed: 7 March 2026
```

Historical entry must obey the same lifecycle and validation rules.

Do not fabricate dates when the user does not know them.

If uncertain dates are already supported elsewhere, reuse that established representation. Otherwise require known dates for structured treatment periods and defer uncertain treatment chronology rather than inventing precision.

## Dosage relationship

A treatment references the `PrescriptionItem`. It does not copy or rewrite Module 7 dosage instructions.

Module 9 will use:

```text
Treatment period
+
confirmed DosageInstruction[]
```

to produce expected schedules.

If dosage changes during treatment, do not mutate treatment history or invent schedule behavior here. Module 9 should manage resulting schedule periods/changes.

## Ownership and authorization

All endpoints require authentication.

Resolve ownership through:

```text
Treatment
→ PrescriptionItem
→ Prescription
→ PatientProfile
```

Never trust client-provided:

* `accountId`
* `patientProfileId`

Guessed treatment, item, or prescription IDs must never bypass ownership checks.

## API

Follow existing conventions. If none exist, use approximately:

```text
POST /api/prescriptions/:prescriptionId/items/:itemId/treatments
GET  /api/prescriptions/:prescriptionId/items/:itemId/treatments
GET  /api/treatments/:treatmentId

POST /api/treatments/:treatmentId/stop
POST /api/treatments/:treatmentId/complete
POST /api/treatments/:treatmentId/restart
```

If historical creation needs terminal status/end date, support that safely through the create contract.

Do not expose unrestricted lifecycle `PATCH` operations that allow clients to arbitrarily switch states.

Use explicit commands and service-layer transition validation.

Treatment listing may support:

* current/active;
* previous;
* basic date filtering.

## Frontend

Create the treatment/course feature integrated with prescription-item details.

Provide:

* `Start treatment`;
* start-date selection;
* active-treatment display;
* `Stop treatment`;
* `Complete treatment`;
* optional reason/note;
* previous treatment periods;
* `Restart treatment`;
* clear connection to prescribed medication/dosage;
* loading, conflict, validation, and API-error states.

Clearly distinguish:

```text
PRESCRIBED
Prescription exists

ACTIVE TREATMENT
Patient reports they started it

PREVIOUS TREATMENT
Patient reports it stopped/completed
```

Do not display medication as taken merely because treatment is active.

Do not generate daily expected doses yet.

## Required edge cases

Handle/test:

1. prescription created today, treatment starts later;
2. treatment starts on prescription date;
3. active treatment stopped;
4. active treatment completed;
5. stopped treatment restarted;
6. completed treatment restarted;
7. restart creates a new treatment row;
8. historical completed treatment;
9. end date before start date;
10. stop/complete without active treatment;
11. second active treatment attempted for same item;
12. concurrent start requests;
13. concurrent stop/complete requests;
14. repeated stop/complete request;
15. another patient's prescription item;
16. guessed treatment ID;
17. archived prescription with historical treatment;
18. PRN dosage;
19. prescription duration missing;
20. prescribed duration elapsed but user has not reported completion;
21. ignored reminder must not stop treatment;
22. missed dose must not stop treatment;
23. medication event must not automatically create treatment;
24. dosage changes while treatment exists;
25. source prescription remains unchanged throughout lifecycle transitions.

## Tests and verification

Add focused tests for:

* treatment relationships;
* start/stop/complete transitions;
* restart creating a new period;
* current versus previous treatment queries;
* historical treatment creation;
* date validation;
* duplicate active-period prevention;
* concurrency/idempotent transition behavior;
* ownership isolation;
* prescription immutability;
* frontend start/stop/complete/restart/history flows.

Use synthetic medication data only.

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

* expected dose generation;
* medication calendar;
* reminders;
* medication-event/consumption logging;
* adherence percentages;
* treatment effectiveness;
* dose recommendations;
* medical advice;
* automatic treatment completion;
* standalone OTC treatment courses unless already established by an approved requirement;
* full audit/version module;
* FHIR/export mapping.

## Acceptance criteria

Module 8 is complete when an authenticated patient can explicitly start a treatment from one of their confirmed prescription items, stop or complete it, view historical treatment periods, and restart medication as a new treatment period without rewriting previous history or the prescription.

Treatment state must remain separate from:

* prescription state;
* schedule state;
* reminder state;
* actual medication-event state.

Before finishing, critique the implementation for:

* automatic treatment creation from prescriptions;
* `isActive`-only modeling;
* reopening terminal periods;
* overlapping active periods;
* destructive history mutation;
* automatic completion from elapsed duration;
* medication events/reminders changing treatment state;
* prescription/dosage mutation;
* cross-patient authorization flaws;
* lifecycle race conditions;
* false historical-date precision;
* Module 9/10 scope leakage;
* unsafe TypeScript escapes.

Fix all high-severity findings before completion.

**After completing Module 8, create the summary directory if needed and write a concise completion summary to the project's established summary folder as `treatment-medication-course-YYYY-MM-DD-HHmm.md`. Use `docs summary/` if that is the convention established by earlier modules. Include schema/migration changes, treatment lifecycle/state rules, restart/history behavior, endpoints/UI, ownership and concurrency decisions, tests/checks run, known limitations, and deferred work.**
