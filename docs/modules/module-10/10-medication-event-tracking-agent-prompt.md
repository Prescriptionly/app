# Prescriptionly Module 10 Agent Prompt: Medication Event Tracking

Implement **Module 10: Medication Event Tracking** in the existing Prescriptionly repository.

First inspect Modules 0-9, their completion summaries, Prisma schema/migrations, `PrescriptionItem`, `Treatment`, `MedicationSchedule`, `ExpectedDose`, medication catalog/custom-medication behavior, timezone handling, API conventions, tests, and frontend patterns.

Preserve the existing React + Vite + strict TypeScript frontend, Node.js + Express + strict TypeScript backend, MySQL + Prisma modular-monolith architecture.

Do not reorganize working foundations.

## Goal

Implement the heart of Prescriptionly: a trustworthy record of **what the patient says actually happened with a medication**.

Keep these layers separate:

```text
What was prescribed
      ↓
What was scheduled / expected
      ↓
What the patient reports actually happened
```

A `MedicationEvent` represents the last layer.

Never change the prescription or expected schedule to make it match actual behavior.

## Event types

Support:

* `TAKEN`
* `ADMINISTERED`
* `APPLIED`
* `USED`
* `SKIPPED`
* `PARTIAL`
* `OTHER`

Use equivalent names if existing project conventions already define them.

Examples:

* tablet/capsule: taken;
* injection: administered;
* cream: applied;
* inhaler: used;
* expected dose intentionally not taken: skipped;
* only part of intended amount: partial.

Do not call every medication action "consumption."

## Data model

Create a Prisma `MedicationEvent` model with responsibilities approximately like:

* `id`
* `patientProfileId`
* nullable `treatmentId`
* nullable `expectedDoseId`
* nullable `prescriptionItemId`
* nullable `medicationConceptId`
* preserved `enteredMedicationName`
* event type
* nullable exact quantity using Prisma `Decimal`
* nullable quantity unit
* optional route/form context
* actual event date/time
* timezone where known
* exact/approximate/unknown time precision
* optional notes
* `recordedAt`
* nullable `correctsEventId`
* corrected/superseded marker
* timestamps

Use the smallest schema that safely satisfies these responsibilities.

Never use floating-point medication quantities.

Keep:

```text
actualEventTime
```

separate from:

```text
recordedAt
```

Example:

```text
Medication happened:
Monday 08:00

User entered it:
Wednesday 19:20
```

Both facts matter.

## Expected-dose relationship

A medication event may optionally reference one Module 9 `ExpectedDose`.

Examples:

```text
Expected: 08:00
Actual:   07:52
Event:    TAKEN
```

```text
Expected: 14:00
Actual:   16:10
Event:    TAKEN
```

```text
Expected: 22:00
Event:    SKIPPED
```

Never rewrite the expected-dose record.

Early/late behavior should normally be **derived** from scheduled versus actual time.

Do not make `LATE` or `DELAYED` replace the underlying event fact.

An expected dose with no medication event means:

```text
No actual event recorded
```

It does **not** automatically mean:

```text
Skipped
Missed
Not taken
```

Only explicit patient input should create those facts.

Prevent accidental duplicate active events for the same expected dose.

## Standalone medication events

Medication events must work without:

* prescription;
* treatment;
* schedule;
* expected dose.

Required examples:

```text
OTC aspirin
vitamin
supplement
one-time injection
custom medication
```

For standalone events:

* preserve user-entered medication name;
* optionally link to Module 6 `MedicationConcept`;
* never require catalog normalization;
* capture event type;
* quantity/unit;
* actual date/time;
* notes;
* clearly identify the record as standalone/patient-entered.

Never create a fake prescription or fake treatment to support standalone medication use.

## Quantity and units

Support exact values such as:

```text
0.5 tablet
5 mL
2 drops
1 puff
10 units
1 injection
```

Use exact decimal storage.

Do not require quantity for `SKIPPED`.

Do not automatically copy the expected quantity into the actual event unless the user confirms that amount.

If the actual quantity is unknown, preserve it as unknown.

Do not convert ambiguous values such as:

```text
1 spoon
```

into:

```text
5 mL
```

without explicit information.

Support custom unit text when required.

## Time and retrospective logging

Users may:

* log immediately;
* log hours later;
* log days later;
* take medication early;
* take medication late;
* know only the date;
* know an approximate time;
* not remember the exact time.

Represent uncertainty honestly.

Never fabricate:

```text
00:00
12:00
08:00
```

just because the database prefers a timestamp.

Use the established IANA timezone model from earlier modules.

Historical medication-event timestamps must retain their original timezone context where known.

Changing the patient's current timezone later must not rewrite historical events.

## Corrections without deleting history

Users must be able to correct mistakes.

Example:

```text
Original event:
08:00 → 2 tablets

Correction:
08:00 → 1 tablet
```

Never destructively overwrite the original event.

Until Module 11 introduces the generic provenance/version system, implement a minimal correction chain:

```text
Original MedicationEvent
        ↓
Correction MedicationEvent
        ↓
Current effective event
```

Requirements:

* original event remains stored;
* correction creates a new event/correction record;
* correction references the event it replaces;
* original becomes marked as superseded/corrected for normal current views;
* current APIs return the latest effective event;
* historical original remains available for Module 11;
* correction is transactional;
* concurrent conflicting corrections are handled deterministically.

Do not build the complete generic audit framework here.

Do not allow two competing "current" corrections for one event.

## More than prescribed

Prescriptionly records facts.

If a patient reports taking more than the expected or prescribed amount:

* store the actual reported amount;
* do not alter the prescription;
* do not reject it merely because it differs;
* do not portray the application as approving the behavior.

If existing safety messaging exists, a neutral warning may be displayed.

Do not implement dose recommendations or clinical advice.

## Treatment relationship

When linked to a treatment:

* verify treatment ownership;
* verify relationship consistency;
* preserve the event;
* do not change treatment lifecycle.

A medication event must never automatically:

```text
start treatment
stop treatment
complete treatment
```

Module 8 remains authoritative for treatment state.

Retrospective events may reference historical treatment periods when their dates are compatible.

## API

Follow existing conventions. If none exist, use approximately:

```text
POST /api/medication-events
GET  /api/medication-events
GET  /api/medication-events/:eventId

POST /api/expected-doses/:expectedDoseId/events
POST /api/medication-events/:eventId/corrections
```

Avoid unrestricted destructive `PATCH` or `DELETE` operations for historical medication events.

Support bounded filtering by:

* date range;
* treatment;
* prescription item;
* medication;
* standalone/linked;
* event type.

When logging against an expected dose, derive ownership through that expected dose.

Never trust client-supplied:

* `accountId`
* `patientProfileId`

Use idempotency/conflict handling for duplicate clicks and network retries.

## Frontend

Build the medication-event UX around expected doses and manual medication logging.

For expected doses, provide actions appropriate to the medication:

```text
Taken
Administered
Applied
Used
Partial
Skipped
```

Then allow:

* actual amount/unit;
* actual date/time;
* approximate/unknown time;
* notes.

Provide a separate:

```text
+ Log medication
```

flow for OTC/custom/standalone medication.

Always distinguish:

```text
Expected
```

from:

```text
Actual
```

Examples:

```text
Expected: 1 capsule at 08:00
Actual:   1 capsule at 08:12
```

```text
Expected: 1 tablet
Actual:   0.5 tablet
Status:   Partial
```

Provide correction UI explaining that the original entry remains part of history.

Do not implement adherence percentages here.

## Required edge cases

Handle/test:

1. taken exactly as expected;
2. taken early;
3. taken late;
4. explicitly skipped;
5. half tablet / partial;
6. injection administered;
7. topical medication applied;
8. inhaler used;
9. OTC aspirin without prescription;
10. vitamin/supplement;
11. custom medicine absent from catalog;
12. event logged two days later;
13. date known but exact time unknown;
14. approximate time;
15. quantity unknown;
16. amount greater than prescribed;
17. duplicate submission for same expected dose;
18. double click/network retry;
19. correction from 2 tablets to 1;
20. correction preserves original;
21. concurrent corrections;
22. same medication from two prescriptions/treatments;
23. PRN event without expected dose;
24. retrospective event inside historical treatment period;
25. event outside treatment period is not silently reassigned;
26. expected dose with no event remains unrecorded;
27. ignored reminder creates no event;
28. timezone changes after event;
29. unauthorized event access;
30. unauthorized expected-dose access;
31. guessed IDs;
32. medication catalog unavailable;
33. prescription remains unchanged after event;
34. schedule remains unchanged after event.

## Validation

Validate facts without pretending to medically judge them.

At minimum:

* event type required;
* quantity must be positive when present;
* skipped event normally has no administered quantity;
* taken/administered/applied/used/partial may have unknown quantity when genuinely unknown;
* timestamps/timezones must be valid;
* correction target must belong to the same patient;
* correction target must be the current effective event;
* linked expected dose, treatment, prescription item, and medication references must be consistent;
* standalone event requires a non-empty medication name;
* never invent missing actual values.

## Tests and verification

Add focused tests for:

* all event types;
* expected-dose linking;
* standalone events;
* decimal quantities;
* retrospective logging;
* uncertain time;
* early/late derivation;
* skipped versus unrecorded expected dose;
* duplicate/idempotent submissions;
* correction chain preserving original;
* concurrent corrections;
* treatment/prescription/schedule immutability;
* ownership isolation;
* PRN events;
* custom medication without catalog;
* frontend expected-vs-actual/manual/correction/error flows.

Use only synthetic medical data.

Run:

* lint;
* format check;
* strict TypeScript typecheck;
* tests;
* Prisma validation/generation;
* migrations;
* production builds.

Add and commit the required Prisma migration(s).

## Do not overbuild

Do not implement:

* adherence scoring;
* advanced analytics;
* automatic missed-dose classification;
* reminder delivery;
* treatment lifecycle mutation;
* medical advice;
* dosage recommendations;
* drug interactions;
* symptom causation;
* generic full-system audit framework;
* Module 12 timeline aggregation;
* FHIR/export.

## Acceptance criteria

Module 10 is complete when an authenticated patient can:

* record actual medication behavior for an expected dose;
* record standalone OTC/custom medication;
* use taken/administered/applied/used/skipped/partial actions;
* record exact or uncertain times;
* record exact decimal quantities;
* log medication retrospectively;
* correct mistakes without erasing the original record;
* use the system without a medication-catalog match;
* preserve complete separation between prescribed, expected, and actual information.

Before finishing, critique the implementation for:

* reminders or elapsed time becoming proof of medication use;
* automatically skipping unrecorded doses;
* rewriting prescriptions;
* rewriting schedules;
* requiring prescriptions for OTC events;
* forced catalog normalization;
* destructive corrections;
* duplicate events for one expected dose;
* floating-point quantities;
* fabricated timestamps;
* rewriting historical timezone information;
* changing treatment state from events;
* portraying excessive use as approved;
* cross-patient authorization flaws;
* Module 11/12 scope leakage;
* unsafe TypeScript escapes.

Fix all high-severity findings before completion.

**After completing Module 10, create the summary directory if needed and write a concise completion summary to the project's established summary folder as `medication-event-tracking-YYYY-MM-DD-HHmm.md`. Use `docs summary/` if that is the convention established by earlier modules. Include schema/migration changes, event types, expected-dose and standalone-event behavior, quantity/time representation, correction strategy, ownership/idempotency rules, endpoints/UI, tests/checks run, known limitations, and deferred work.**
