# Prescriptionly Module 7 Agent Prompt: Dosage & Prescription Instructions

Implement **Module 7: Dosage & Prescription Instructions** in the existing Prescriptionly repository.

First inspect Modules 0-6, their completion summaries, Prisma schema/migrations, `PrescriptionItem`, medication catalog links, API conventions, tests, and frontend patterns. Preserve the existing React + Vite + strict TypeScript frontend, Node.js + Express + strict TypeScript backend, MySQL + Prisma modular-monolith architecture.

Do not reorganize working foundations.

## Goal

Represent what a prescription says about **how a medication should be used**, while permanently preserving the original instruction text.

The core rule is:

```text
originalInstructionText
+
structuredDosage
```

Never replace the original prescription instruction with a parsed/normalized representation.

A model such as:

```text
dose = 1
frequency = 3
duration = 7
```

is not sufficient.

Module 7 must support instructions such as:

```text
1 tablet every 8 hours
```

```text
2 tablets on day 1,
then 1 tablet daily
```

```text
5 mL when required,
maximum four times daily
```

```text
20 units before breakfast,
10 units before dinner
```

## Module boundary

Module 7 owns:

* dose quantity;
* dose unit;
* route;
* frequency semantics;
* duration;
* timing instructions;
* PRN/as-needed rules;
* multi-step/tapered dosage structure;
* original free-text instruction;
* structured interpretation and its review state.

Module 7 does **not** own:

* medication catalog concepts, Module 6;
* treatment start/stop/completion, Module 8;
* actual calendar dose occurrences, Module 9;
* reminders, Module 19;
* medication events/what the patient actually took, Module 10.

A dosage instruction describes **what was prescribed**. It is not proof the patient followed it.

## Data model

Create a structured dosage layer linked to `PrescriptionItem`.

Use the existing Module 5 `originalInstructionText` as the preserved source text. Do not create competing source-of-truth fields unless migration compatibility requires it.

A `PrescriptionItem` may need **multiple structured dosage components/steps**.

Prefer responsibilities similar to:

### `DosageInstruction`

* `id`
* `prescriptionItemId`
* ordered `position`
* optional dose amount
* optional dose unit
* optional route
* frequency type
* optional interval value/unit
* optional times-per-period value/unit
* optional timing/daypart or event anchor
* optional duration value/unit
* `isPrn`
* optional maximum-use text/structured limit
* optional structured notes
* interpretation/review status
* timestamps

If a taper/change requires phases, represent ordered phases/steps cleanly rather than overwriting one dosage row.

Do not force every instruction into every field. Nullable/unknown values are valid.

### Numeric safety

Do not use floating-point arithmetic for medication quantities.

Use Prisma `Decimal` or an equally exact representation for values such as:

* `0.5 tablet`
* `2.5 mL`
* `10 units`

Preserve the source text when a quantity is ambiguous.

## Frequency semantics

Do not treat these as equivalent:

```text
every 8 hours
```

and:

```text
3 times daily
```

They may generate different schedules later.

Represent frequency intent explicitly, using a typed model such as:

* interval-based: every N minutes/hours/days;
* times-per-period: N times per day/week;
* specific/event-based timing: morning, evening, before breakfast, after food, bedtime;
* PRN/as-needed;
* one-time;
* custom/unstructured when safe structuring is impossible.

Do not force clock times into Module 7 unless the prescription actually gives clock times.

Do not generate expected doses here. Module 9 will interpret confirmed dosage instructions into schedules.

## Units and routes

Support common dose units without making a closed enum the only valid option.

Examples:

* tablet
* capsule
* mL
* drop
* puff
* unit
* application
* patch
* suppository
* spray
* custom text

Routes may include common values such as oral, topical, inhaled, ophthalmic, otic, IV, IM, subcutaneous, and custom/unknown.

Preserve original route/unit text where necessary.

Never infer:

* `1 spoon` = a specific number of mL;
* an unknown injection route;
* a route from dosage form alone;
* prescribed dose from Module 6 catalog strength.

If information is ambiguous, preserve it as text and mark structured interpretation incomplete rather than guessing.

## Creating structured dosage

Structured dosage can originate from:

1. manual user entry; or
2. confirmed Module 4/5 source information.

If source text came from OCR:

* only use confirmed/corrected extraction/prescription information;
* never use unreviewed machine candidates;
* preserve the original instruction text;
* require explicit user review before structured interpretation becomes confirmed.

Do not automatically "improve" or medically correct the doctor's wording.

If the instruction appears internally contradictory, flag it for review rather than deciding which part is medically correct.

## Status/review

Use a small explicit status model such as:

* `UNSTRUCTURED`
* `DRAFT`
* `CONFIRMED`
* `NEEDS_REVIEW`

Use existing equivalent naming if already established.

Rules:

* source text can exist without structured dosage;
* inability to structure must never block preserving/confirming the prescription itself;
* structured dosage must not become confirmed through an AI/parser result alone;
* confirmed dosage represents the user's reviewed transcription/interpretation of the prescription, not medical validation.

## API

Follow existing API conventions. If none exist, use approximately:

```text
GET    /api/prescriptions/:prescriptionId/items/:itemId/dosage
PUT    /api/prescriptions/:prescriptionId/items/:itemId/dosage
POST   /api/prescriptions/:prescriptionId/items/:itemId/dosage/confirm
DELETE /api/prescriptions/:prescriptionId/items/:itemId/dosage
```

If the design uses multiple dosage steps, the API may expose them as an ordered collection.

Requirements:

* all mutations require authenticated ownership through the prescription;
* never trust client `accountId` or `patientProfileId`;
* validate every structured field at runtime;
* explicitly map allowed fields;
* preserve `originalInstructionText`;
* use deterministic ordering for phases/steps;
* protect confirmed records from destructive mutation unless the existing provenance/version system safely supports corrections.

## Frontend

Extend the Module 5 prescription-item UI.

Always show the original instruction text prominently.

Provide a structured dosage editor that can express:

* amount + unit;
* route;
* every-N interval;
* N-times-per-period;
* timing anchors such as morning/evening/bedtime/before breakfast;
* duration;
* PRN/as-needed;
* maximum-use instruction where present;
* multiple ordered phases/steps;
* custom/unstructured fallback.

Example:

```text
Original instruction:
"Take 2 tablets on day 1, then 1 tablet daily"

Structured interpretation:
Step 1: 2 tablets | day 1
Step 2: 1 tablet | once daily | thereafter/as specified
```

Do not hide the original text after structuring it.

Do not show generated schedule times, missed doses, adherence, or actual consumption yet.

## Required edge cases

Handle/test:

1. `1 tablet every 8 hours`;
2. `1 tablet three times daily`;
3. `2 tablets day 1, then 1 daily`;
4. `5 mL PRN, maximum four times daily`;
5. `20 units before breakfast, 10 before dinner`;
6. half tablet / decimal quantity;
7. drops/puffs/units/injections/topical application;
8. one-time dose;
9. duration absent;
10. total quantity absent;
11. route absent;
12. ambiguous unit such as `1 spoon`;
13. exact clock time stated;
14. meal-relative timing;
15. bedtime/morning/evening timing;
16. conflicting instruction text;
17. unreadable/partially structured instruction;
18. free-text instruction that cannot safely be structured;
19. user changes draft interpretation;
20. source text remains unchanged;
21. same medication has multiple dosage components;
22. concurrent edits/confirmation;
23. attempted access to another patient's item;
24. archived prescription/item;
25. Module 6 catalog strength differs from prescribed dose.

## Validation

Validate semantic combinations, not only field types.

Examples:

* dose quantity cannot be negative or zero when explicitly represented as a dose;
* interval values must be positive;
* times-per-period values must be positive;
* duration must be positive when specified;
* PRN may legitimately have no normal frequency;
* custom/unstructured dosage must retain source text;
* invalid field combinations must not be silently accepted;
* ambiguous instructions must not be converted into false precision.

Do not add medical safety rules that determine whether the prescribed dose is clinically appropriate.

## Tests and verification

Add focused tests for:

* source-text preservation;
* simple and complex structured dosage;
* ordered dosage phases;
* interval versus times-per-day distinction;
* PRN/max-use representation;
* exact decimal quantities;
* optional/unknown fields;
* custom/unstructured fallback;
* ownership isolation;
* review/confirmation states;
* invalid semantic combinations;
* frontend editor/review flows.

Use only synthetic medical examples.

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

* schedule generation;
* expected dose rows;
* reminders;
* treatment start/end state;
* actual medication events;
* adherence calculation;
* dose recommendation or medical advice;
* drug interactions;
* automatic clinical correction;
* FHIR/export mappings;
* full audit/version module.

## Acceptance criteria

Module 7 is complete when a patient can preserve the original prescription instruction and optionally create/review a structured representation that safely supports simple, interval-based, times-per-day, PRN, event-relative, decimal, and multi-step/tapered instructions without inventing missing information.

The structured dosage must provide enough semantics for Module 9 to generate schedules later, while Module 7 itself generates **no expected doses**.

Before finishing, critique the implementation for:

* oversimplified `dose/frequency/duration` design;
* loss or mutation of original instruction text;
* treating every frequency as equivalent;
* floating-point medication quantities;
* closed unit/route enums with no fallback;
* false precision from ambiguous text;
* automatic confirmation of parsed instructions;
* confusion between catalog strength and prescribed dose;
* schedule/treatment/event logic leaking into Module 7;
* cross-patient authorization issues;
* destructive confirmed-record edits;
* unsafe TypeScript escapes.

Fix all high-severity findings before completion.

**After completing Module 7, create the summary directory if needed and write a concise completion summary to the project's established summary folder as `dosage-and-prescription-instructions-YYYY-MM-DD-HHmm.md`. Use `docs summary/` if that is the convention established by earlier modules. Include schema/migration changes, structured dosage model, original-text preservation, supported frequency/timing/PRN/phase semantics, endpoints/UI, validation decisions, tests/checks run, known limitations, and deferred work.**
