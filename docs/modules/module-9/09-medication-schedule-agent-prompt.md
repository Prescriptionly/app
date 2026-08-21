# Prescriptionly Module 9 Agent Prompt: Medication Schedule

Implement **Module 9: Medication Schedule** in the existing Prescriptionly repository.

First inspect Modules 0-8, their completion summaries, Prisma schema/migrations, `PrescriptionItem`, confirmed `DosageInstruction`s, `Treatment` periods, patient timezone handling, API conventions, tests, and frontend patterns. Preserve the existing React + Vite + strict TypeScript frontend, Node.js + Express + strict TypeScript backend, MySQL + Prisma modular-monolith architecture.

Do not reorganize working foundations.

## Goal

Convert an active treatment plus confirmed dosage instructions into a trustworthy **expected medication schedule**.

Keep this distinction absolute:

```text
ExpectedDose
≠
MedicationEvent
```

Module 9 records what the prescription/treatment expects to happen.

Module 10 records what the patient says actually happened.

Never mark a medication as taken, skipped, partial, late, or missed merely because an expected dose exists or its time has passed.

## Inputs

Schedules may be generated only from:

```text
Treatment
+
confirmed DosageInstruction[]
```

Do not generate schedules directly from:

* raw OCR;
* unconfirmed prescriptions;
* unconfirmed dosage interpretations;
* reminder activity;
* medication events.

A treatment must have a valid treatment period before scheduling.

## Scheduling semantics

Preserve Module 7 meaning.

These are not equivalent:

```text
1 tablet every 8 hours
```

```text
1 tablet three times daily
```

Support:

* fixed clock-time schedules;
* interval schedules;
* times-per-day schedules;
* morning/evening/bedtime timing;
* meal/event-relative timing;
* one-time doses;
* multi-step/taper phases;
* treatment-bound schedule periods.

### Never invent clock times

If the instruction says:

```text
with breakfast
```

do not silently convert it to:

```text
08:00
```

Preserve it as an event-relative occurrence unless the user explicitly assigns a time.

Likewise, `three times daily` does not automatically mean `08:00 / 14:00 / 20:00`.

When exact scheduling requires information not present in the prescription, let the user choose it. These choices are scheduling preferences, not changes to the prescription.

## PRN / as-needed medication

For instructions such as:

```text
5 mL as needed, maximum four times daily
```

do **not** generate normal recurring expected-dose rows.

Preserve the PRN rule and any maximum-use constraint.

PRN medication must not automatically produce:

* overdue;
* missed;
* skipped;
* adherence-failure

semantics because time passed.

Module 10 may later record actual PRN medication events independently.

## Data model

Use Prisma migrations and existing conventions.

### `MedicationSchedule`

Conceptually include:

* `id`
* `treatmentId`
* `dosageInstructionId` or dosage-step reference
* schedule type
* effective start
* optional effective end
* IANA timezone
* validated schedule configuration
* status such as `ACTIVE`, `SUPERSEDED`, `ENDED`
* timestamps

Do not reduce all scheduling semantics to a cron expression.

### `ExpectedDose`

Conceptually include:

* `id`
* `scheduleId`
* sequence/order where useful
* scheduled local date
* nullable local scheduled time
* nullable semantic timing anchor such as `BREAKFAST` or `BEDTIME`
* nullable UTC instant when an exact instant exists
* IANA timezone used for interpretation
* expected quantity/unit snapshot/reference
* route where applicable
* cancellation/superseded marker
* timestamps

Do **not** add outcome fields such as:

* `TAKEN`
* `SKIPPED`
* `PARTIAL`
* `MISSED`

Those belong to Module 10.

A past expected dose with no linked actual event means only:

```text
Expected occurrence
with no recorded actual event
```

It does not automatically mean skipped.

## Timezone handling

Patient timezone from Module 2 may provide defaults, but every schedule must preserve the timezone under which it was created/interpreted.

For exact occurrences preserve:

```text
local date/time
+
IANA timezone
+
UTC instant
```

Do not store only UTC because that loses intended local schedule meaning.

Do not store only local time because that loses the absolute instant.

Use IANA identifiers such as:

```text
Asia/Dubai
Europe/London
America/New_York
```

Do not use fixed abbreviations such as `EST` or manually calculated UTC offsets.

## Travel and timezone changes

If the patient travels:

* never rewrite historical expected doses;
* preserve their original timezone context;
* make changes to future scheduling explicit.

If supported, provide choices such as:

```text
Keep schedule anchored to original timezone
```

or:

```text
Use my current timezone from [effective date]
```

A future timezone change should create a new effective schedule period rather than modifying historical occurrences.

Do not automatically guess what the patient wants while travelling.

## Daylight-saving time

Use timezone-aware IANA rules.

Handle:

* nonexistent local times during DST spring-forward;
* repeated/ambiguous times during fall-back;
* interval schedules crossing DST boundaries.

Do not implement DST by manually adding/subtracting UTC offsets.

Use a maintained timezone-aware library if native APIs are insufficient.

Define and test deterministic behavior for ambiguous/nonexistent local times.

For `every 8 hours`, preserve interval semantics across DST rather than converting it to three fixed local times.

## Schedule creation

Schedule creation must be explicit.

The user may need to provide missing scheduling choices such as:

* first-dose time for `every N hours`;
* actual clock times for `N times daily`;
* mapping of morning/evening/meal anchors;
* effective timezone.

Example:

```text
Prescription:
1 tablet three times daily

Scheduling preference:
08:00
14:00
20:00
```

These selected times belong to the schedule.

Do not write them back into Module 7 as though they were prescribed by the doctor.

## Schedule changes

Schedules may change because of:

* dosage phase transitions;
* confirmed dosage changes;
* user timing changes;
* timezone/travel changes;
* treatment stop/completion.

Never rewrite historical expected doses.

When changing schedule:

1. preserve past expected doses;
2. supersede/cancel only invalid future occurrences;
3. end/supersede the previous schedule period;
4. create a new schedule period;
5. generate future expected doses from the new configuration.

Generation/regeneration must be idempotent.

Repeated requests must not create duplicate expected-dose rows.

## Treatment integration

Module 8 controls treatment lifecycle.

When treatment is stopped/completed:

* preserve schedule history;
* preserve past expected doses;
* prevent expected-dose generation after treatment end;
* invalidate only future occurrences beyond the effective end where appropriate.

Restarting medication creates a new Module 8 `Treatment`, therefore it must have a **new schedule**.

Never reopen the old schedule.

Module 9 must not change treatment status.

## Generation horizon

Do not generate unlimited future rows for long-running treatments.

Use a bounded rolling horizon or lazy generation strategy.

Requirements:

* configurable horizon;
* deterministic generation;
* idempotency;
* no duplicate rows;
* no unbounded database growth.

Extend the horizon as needed.

Do not create reminder jobs here. Module 19 owns reminders/notifications.

## API

Follow existing conventions. If none exist, use approximately:

```text
POST /api/treatments/:treatmentId/schedules
GET  /api/treatments/:treatmentId/schedules
GET  /api/schedules/:scheduleId

PATCH /api/schedules/:scheduleId
POST  /api/schedules/:scheduleId/regenerate

GET /api/expected-doses?from=...&to=...
GET /api/treatments/:treatmentId/expected-doses?from=...&to=...
```

Requirements:

* all patient-specific endpoints require authentication/ownership;
* never trust client `accountId` or `patientProfileId`;
* bound date ranges and pagination;
* validate schedule configurations at runtime;
* do not expose generic mutation of historical expected doses;
* use stable errors for schedule conflicts or invalid state.

## Frontend

Create medication scheduling UI integrated with active treatments.

Provide:

* schedule setup after treatment start;
* original confirmed dosage instruction;
* derived schedule type;
* user inputs only where scheduling requires missing information;
* timezone display;
* today's expected doses;
* upcoming expected doses;
* event-relative items such as `With breakfast`;
* schedule editing with clear future-effective behavior;
* previous schedule history;
* stopped/completed treatment schedule history;
* loading, validation, timezone/DST, conflict, and API-error states.

Clearly distinguish:

```text
Expected
```

from future Module 10 outcomes:

```text
Taken
Skipped
Partial
```

Do not display a past expected occurrence as **Missed** merely because no event exists.

If a label is necessary before Module 10, use something neutral such as:

```text
No medication event recorded
```

## Required edge cases

Handle/test:

1. `every 8 hours`;
2. `three times daily`;
3. fixed `08:00 / 14:00 / 22:00`;
4. morning/evening;
5. `with breakfast`;
6. before breakfast/before dinner;
7. one-time dose;
8. taper/multi-phase dosage;
9. PRN produces no normal recurring expected doses;
10. treatment without end date;
11. treatment stop prevents future generation;
12. treatment restart gets a new schedule;
13. dosage changes mid-treatment;
14. travel timezone change;
15. keep original timezone;
16. change timezone from effective date;
17. DST spring-forward;
18. DST fall-back;
19. interval crossing DST;
20. daily timing changed by user;
21. regeneration called twice;
22. concurrent schedule creation;
23. future occurrence superseded while history remains;
24. unauthorized access;
25. indefinite treatment does not create unlimited rows;
26. expected time passes with no event and is not auto-skipped;
27. reminder behavior has no effect;
28. event-relative schedule does not invent clock time;
29. scheduling preference does not change Module 7 instructions.

## Tests and verification

Add focused tests for:

* interval versus times-per-day semantics;
* fixed-time schedules;
* event/daypart-relative representation;
* PRN behavior;
* multi-phase transitions;
* rolling generation horizon;
* idempotent generation;
* schedule changes preserving history;
* treatment stop/restart behavior;
* timezone conversion;
* travel behavior;
* DST boundaries;
* authorization isolation;
* absence of taken/skipped/missed outcome creation;
* frontend setup/upcoming/edit/error flows.

Use synthetic medical examples only.

Run the repository's normal:

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

* medication-event logging;
* taken/skipped/partial states;
* automatic missed-dose classification;
* adherence percentages;
* reminders;
* push/email/SMS notifications;
* calendar synchronization;
* treatment-state mutation;
* medical advice;
* "best time to take" recommendations;
* FHIR/export;
* full audit/version system.

## Acceptance criteria

Module 9 is complete when an authenticated patient can generate and view expected medication schedules from active treatments and confirmed dosage instructions; fixed, interval, times-per-day, event-relative, PRN, and phased instructions behave correctly; timezone/DST meaning is preserved; schedule changes keep historical occurrences; future generation is bounded and idempotent; and expected doses are never confused with actual medication events.

Before finishing, critique the implementation for:

* treating `every 8 hours` as `three times daily`;
* invented clock times;
* PRN recurring occurrences;
* UTC-only/local-only timestamp storage;
* incorrect DST handling;
* silent travel timezone rewriting;
* deletion of historical occurrences;
* duplicate regeneration;
* unlimited future generation;
* treatment-state mutation;
* automatic missed/skipped classification;
* reminder logic leaking into Module 9;
* cross-patient authorization flaws;
* unsafe TypeScript escapes.

Fix all high-severity findings before completion.

**After completing Module 9, create the summary directory if needed and write a concise completion summary to the project's established summary folder as `medication-schedule-YYYY-MM-DD-HHmm.md`. Use `docs summary/` if that is the convention established by earlier modules. Include schema/migration changes, schedule/expected-dose model, generation strategy/horizon, timezone and DST rules, PRN behavior, schedule-change/history behavior, endpoints/UI, tests/checks run, known limitations, and deferred work.**

---

### Context & Memory Management
**Clear your memory:** When starting this module, clear your memory / context. Read only the necessary information that you need from prerequisite module summaries after reading this prompt. If your memory/context is inflating or floating, you are free to write down the references and notes you need in a temporary file (e.g., `.memory` or `scratch/memory.md`) and keep referencing and updating that memory file as long as you need.
