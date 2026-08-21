# Prescriptionly Module 2 Agent Prompt: Patient Profile

Implement **Module 2: Patient Profile** in the existing Prescriptionly repository.

First inspect the existing codebase, Module 0 foundation, Module 1 authentication implementation, Prisma schema/migrations, conventions, tests, and existing module summaries. Preserve the established React + Vite + strict TypeScript frontend, Node.js + Express + strict TypeScript backend, MySQL + Prisma architecture. Do not reorganize working foundations.

## Goal

Create the authenticated user's basic patient profile while keeping it strictly separate from authentication identity.

`Account` answers: **who can authenticate?**
`PatientProfile` answers: **whose personal/medical wallet is this?**

Never use profile fields such as name or DOB for login, account recovery, authorization, or identity proof.

## MVP scope

Implement one self-profile per authenticated account with:

* name;
* date of birth;
* preferred language;
* IANA timezone;
* only other basic administrative/profile fields already clearly required by the existing UI/product.

Keep fields optional unless genuinely required. Do **not** turn this module into a medical questionnaire.

Do not add allergies, emergency contacts, medications, diagnoses, addresses, insurance, documents, prescriptions, symptoms, family/dependents, doctor data, or medical-history fields. Later modules may reference `PatientProfile`.

Do not add sex/gender/biological fields merely because they might someday be useful. Add sensitive demographic fields only if an existing approved product requirement already needs them, and keep them optional.

## Data model

Create a Prisma `PatientProfile` model linked to the Module 1 account.

Requirements:

* internal UUID/opaque `id`;
* `accountId` foreign key;
* database-level unique constraint on `accountId` so one account has at most one self-profile in MVP;
* Unicode-safe name fields;
* DOB representation that does **not invent precision**;
* preferred language using a standard language tag/string;
* timezone using an IANA timezone identifier such as `Asia/Dubai`;
* `createdAt` and `updatedAt`.

For DOB, support people who may know only year, year+month, exact date, or not know it. Do not store a fabricated date such as `1900-01-01`. Use a clean typed representation, for example nullable year/month/day with validation, or an equally sound model.

For names, support non-Latin scripts, long names, changed names, mononyms, and cultures where "first name / last name" is not reliable. Prefer a required/primary `displayName` and optional structured name components only if genuinely useful.

Do not create a displayed identifier that resembles an official hospital/national patient number. If the internal profile ID is ever shown, label it clearly as a **Prescriptionly** identifier.

## Ownership and authorization

All profile endpoints require Module 1 authentication.

Never accept `accountId` from the client to choose which profile to read or update. Resolve ownership from the authenticated server session.

A user may access/update only their own MVP profile.

Do not implement account merging, profile transfer, dependents, guardianship, delegated access, or multiple profiles yet.

## API

Follow existing API conventions. If none exist, use:

```text
GET  /api/profile
PUT  /api/profile
```

Behavior:

* `GET` returns the authenticated account's profile or a clear "profile not created" state.
* `PUT` creates the profile if absent or updates it if present, atomically and idempotently where practical.
* Validate every request at runtime with the project's established validation library.
* Return only profile fields, never password/session/security fields.
* Use stable public error codes and existing centralized error handling.
* Prevent mass assignment by explicitly mapping allowed fields.

Do not expose generic CRUD endpoints such as `/profiles/:id`.

## Validation

At minimum:

* trim accidental surrounding whitespace without destroying meaningful Unicode;
* reject empty display names after normalization;
* use sensible maximum lengths;
* preserve Unicode characters;
* validate DOB component combinations and reject impossible/future dates;
* do not require exact DOB;
* validate language tags reasonably without a giant hardcoded list;
* validate timezone against IANA timezone data, not abbreviations such as `GST`, `EST`, or `PST`;
* do not silently replace invalid timezone with UTC.

Changing current profile name/DOB must not rewrite metadata embedded in future historical clinical documents.

## Frontend

Create/update the profile feature using existing design conventions.

Provide:

* profile view/edit screen;
* initial profile setup when no profile exists;
* implemented profile fields;
* clear handling of partial/unknown DOB;
* language input/selection;
* IANA timezone selection, using browser timezone only as an editable suggestion;
* loading, validation, save-success, and API-error states.

Do not build the health dashboard here.

Do not put password/email credential changes on the patient-profile form. Those belong to Module 1.

## Internationalization

* Do not assume ASCII or English names.
* Do not assume US date formats.
* Use unambiguous API date representations.
* Keep timezone separate from language/locale.
* Do not infer country or nationality from language/timezone.
* Never automatically translate or transliterate names.

Full UI localization is out of scope unless already present.

## Required edge cases

Handle/test:

1. profile not created yet;
2. concurrent first-profile creation;
3. non-Latin and single-part names;
4. changed name;
5. exact DOB;
6. year/month-only DOB;
7. year-only DOB;
8. unknown DOB;
9. impossible/future DOB;
10. invalid language/timezone;
11. changed timezone after travel;
12. unauthenticated access;
13. attempt to access another profile using supplied IDs;
14. suspended/deleted account;
15. future dependents are not blocked by auth/profile coupling.

## Tests

Add focused tests for:

* Prisma uniqueness/ownership;
* create/read/update self-profile;
* unauthenticated access;
* prevention of client-selected `accountId`;
* name/DOB/language/timezone validation;
* duplicate/concurrent creation;
* frontend setup, edit/save, validation, and error states.

Run the repository's normal lint, format check, strict typecheck, tests, Prisma validation/generation, and production builds. Add and commit the Prisma migration.

## Do not overbuild

Do not implement:

* family/dependent profiles;
* profile history/audit/versioning beyond current infrastructure;
* allergies/emergency card;
* avatars/uploads;
* addresses;
* insurance;
* national/health identifiers;
* medical records;
* deletion policy;
* AI-generated profile information.

Leave these to their designated modules.

## Acceptance criteria

Module 2 is complete when an authenticated user can create, view, and edit exactly one patient profile; ownership comes only from the authenticated account; international names, timezone/language, and uncertain DOB are handled safely; unnecessary medical data is not collected; migrations/tests/typecheck/lint/build pass; and later modules can reference the profile without confusing it with authentication identity.

Before finishing, critique the implementation for over-collected sensitive data, auth/profile coupling, false DOB precision, Western-only name assumptions, invalid timezone handling, mass assignment, ownership bypasses, duplicate profiles, and unnecessary abstractions. Fix all high-severity findings.

**After completing Module 2, create the summary directory if needed and write a concise completion summary to the project's existing summary folder using `patient-profile-YYYY-MM-DD-HHmm.md` (use `docs summary/` if that is the convention established by Modules 0/1). Include implemented behavior, schema/migration changes, endpoints/UI, tests/checks run, important decisions, limitations, and deferred work.**

---

### Context & Memory Management
**Clear your memory:** When starting this module, clear your memory / context. Read only the necessary information that you need from prerequisite module summaries after reading this prompt. If your memory/context is inflating or floating, you are free to write down the references and notes you need in a temporary file (e.g., `.memory` or `scratch/memory.md`) and keep referencing and updating that memory file as long as you need.
