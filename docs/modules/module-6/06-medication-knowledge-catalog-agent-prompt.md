# Prescriptionly Module 6 Agent Prompt: Medication Knowledge & Catalog

Implement **Module 6: Medication Knowledge & Catalog** in the existing Prescriptionly repository.

First inspect Modules 0-5, their completion summaries, Prisma schema/migrations, `PrescriptionItem` model, API conventions, tests, and frontend patterns. Preserve the existing React + Vite + strict TypeScript frontend, Node.js + Express + strict TypeScript backend, MySQL + Prisma modular-monolith architecture.

Do not reorganize working foundations.

## Goal

Add an optional medication knowledge layer that provides:

* medication autocomplete/search;
* canonical medication concepts;
* aliases/brand names;
* normalized identifiers;
* strengths;
* dosage forms;
* references to external terminology systems;
* optional normalization of Module 5 `PrescriptionItem`s;
* custom medication fallback when no catalog match exists.

The catalog is an **enrichment system**, not the source of truth for what the prescription actually said.

The original entered/source medication text must always remain preserved.

## Core rule

Never force:

```text
Medication = catalog record
```

Use the conceptual relationship:

```text
PrescriptionItem
├── enteredMedicationName
├── medicationConceptId?      optional
└── normalizationStatus
```

A prescription item must remain valid even when no medication concept exists.

The application must continue working when:

* the external drug API is unavailable;
* no terminology match exists;
* the medicine is regional;
* the user typed a custom medicine;
* the product is compounded;
* the item is a vitamin, supplement, or herbal product.

## Data model

Add Prisma models/migrations appropriate to existing conventions.

### `MedicationConcept`

Conceptually include:

* `id`
* canonical/display name
* optional generic name
* optional brand name
* optional normalized strength text
* optional dosage form
* optional combination-product indicator
* active/inactive terminology state if supplied by source
* timestamps

Do not assume every concept has all fields.

### `MedicationAlias`

Support many searchable aliases per concept:

* alias text
* alias type where known, such as brand/generic/synonym
* normalized/search form
* optional language/region metadata if genuinely available

### `MedicationExternalIdentifier`

Store external terminology references separately:

* `medicationConceptId`
* terminology/source name
* identifier/code
* optional source/version
* optional URI/system identifier

A concept may have identifiers from multiple terminology systems.

Do not design Prescriptionly's internal schema around one external terminology provider.

## PrescriptionItem normalization

Extend Module 5 `PrescriptionItem` minimally with:

* optional `medicationConceptId`;
* `normalizationStatus`.

Use statuses such as:

* `UNMATCHED`
* `MATCHED`
* `CUSTOM`
* `NEEDS_REVIEW`

Use existing naming conventions if equivalent statuses already exist.

Rules:

* `enteredMedicationName` remains source-preserving;
* linking a catalog concept never replaces `enteredMedicationName`;
* removing/changing normalization must not erase source text;
* a custom medicine remains fully usable without a concept ID;
* normalization is not proof that the prescribed drug was interpreted correctly.

## Search/autocomplete

Provide a medication search/autocomplete API.

A reasonable endpoint is:

```text
GET /api/medications/search?q=...
```

Requirements:

* sensible minimum query length;
* bounded result count;
* case-insensitive search;
* search canonical names and aliases;
* return enough information to distinguish similar medicines;
* show strength/form when known;
* avoid returning huge terminology payloads;
* do not expose provider-specific raw responses;
* prevent expensive unbounded queries.

Typical result:

```text
{
  id,
  displayName,
  genericName?,
  brandName?,
  strength?,
  dosageForm?,
  externalIdentifiers?: [...]
}
```

Do not include medical advice, indications, contraindications, interaction warnings, or prescribing recommendations.

## Matching and normalization

Provide an explicit normalization workflow for a `PrescriptionItem`.

A reasonable API is:

```text
POST   /api/prescriptions/:prescriptionId/items/:itemId/normalize
DELETE /api/prescriptions/:prescriptionId/items/:itemId/normalization
```

The user should be able to:

1. search suggestions;
2. select a matching medication concept;
3. preserve the original entered name;
4. choose **Use custom medication** when nothing matches;
5. change/remove an incorrect match.

Do not automatically normalize based only on fuzzy similarity.

If automatic candidate suggestions exist, they are suggestions only and require explicit user confirmation before linking.

## External terminology/provider integration

Use a provider abstraction such as:

```text
MedicationTerminologyProvider
├── search(query)
├── lookup(identifier)
└── sync/import if needed
```

Prescriptionly should consume its own normalized internal representation.

Do not couple controllers, UI, or `PrescriptionItem` directly to one external API.

If no external terminology provider is configured:

* implement the local catalog/search architecture;
* support synthetic development concepts where needed;
* support custom medication entry;
* document external provider integration as deferred.

An external API must never be required for normal prescription/manual-entry workflows.

Do not scrape websites.

Do not import or redistribute entire terminology datasets unless their licensing permits it.

## Terminology provenance

External vocabularies may differ by geography, licensing, purpose, and update cycle.

For imported concepts preserve:

* source/provider;
* external identifier;
* terminology/version when available.

Do not claim identifiers from different terminology systems are equivalent unless a maintained mapping establishes that relationship.

Do not delete historical concepts merely because an external terminology later retires them.

Existing historical references must remain resolvable.

## Strength and dosage form

Module 6 may represent catalog metadata such as:

* `500 mg`
* tablet
* capsule
* syrup
* suspension
* drops
* injection
* cream
* ointment
* inhaler
* patch
* suppository
* spray
* other/custom

However:

* never infer the patient's prescribed dose from catalog strength;
* never infer route/frequency/duration;
* never replace Module 5 source strength/form text;
* do not implement Module 7 dosage instructions.

Catalog strength and prescription strength can differ. Preserve both rather than silently reconciling them.

## Frontend

Add medication autocomplete to appropriate Module 5 prescription-item/manual-entry flows.

Provide:

* debounced search;
* loading state;
* no-results state;
* name + strength + form where known;
* explicit selection;
* custom medication fallback;
* ability to remove/change normalization;
* clear distinction between:

  * entered medication text;
  * matched standardized concept.

Provider/search failure must never prevent the user from saving a custom medication.

For similar medicine names, show enough metadata to reduce selection errors.

## Ownership

Medication catalog/search may be shared globally for authenticated users.

Normalization actions on `PrescriptionItem` must enforce ownership through the authenticated patient's prescription.

Never allow users to normalize another patient's prescription item by guessing IDs.

Do not store patient-specific information in shared `MedicationConcept` records.

## Required edge cases

Handle/test:

1. exact generic-name match;
2. brand/alias match;
3. regional brand;
4. misspelled name;
5. medicine absent from catalog;
6. custom medication;
7. compounded medication;
8. herbal product;
9. vitamin/supplement;
10. combination product;
11. same brand with different strengths;
12. similar name with different dosage forms;
13. catalog strength differs from source strength;
14. provider unavailable;
15. provider timeout/error;
16. uncertain fuzzy suggestion;
17. user rejects suggestion;
18. user changes incorrect normalization;
19. external concept becomes retired;
20. terminology version changes;
21. duplicate external identifier;
22. duplicate alias;
23. cross-patient normalization attempt;
24. empty/very short search;
25. abusive large search/result request.

## Tests and verification

Add focused tests for:

* concept/alias/external-ID relationships;
* autocomplete/search;
* alias matching;
* strength/form differentiation;
* custom fallback;
* linking/unlinking `PrescriptionItem`;
* preservation of original entered text;
* normalization status transitions;
* ownership isolation;
* provider failure fallback;
* duplicate identifier/import handling;
* retired concept resolvability;
* frontend search/select/custom/error states.

Use only synthetic medication fixtures unless terminology licensing explicitly permits otherwise.

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

* medical advice;
* drug interactions;
* allergy checking;
* contraindications;
* disease/indication recommendations;
* prescribing suggestions;
* dose calculation;
* Module 7 dosage parsing;
* treatment/course logic;
* schedules;
* medication events;
* pharmacy integration;
* country-specific formulary coverage;
* large terminology synchronization infrastructure unless actually required now.

## Acceptance criteria

Module 6 is complete when users can:

* search medication concepts;
* select a standardized concept for a Module 5 prescription item;
* see useful aliases/strength/form information;
* use custom medication when no suitable match exists;
* change/remove normalization;
* preserve the original medication text at all times.

The application must remain functional when the medication terminology provider is unavailable.

Before finishing, critique the implementation for:

* forced catalog dependency;
* overwriting source medication names;
* unsafe fuzzy auto-matching;
* inability to support regional/custom/compound products;
* confusing strength with prescribed dose;
* provider lock-in;
* terminology licensing/provenance gaps;
* deleting retired historical concepts;
* cross-patient authorization problems;
* duplicate identifiers/aliases;
* unnecessary medical-advice functionality;
* unsafe TypeScript escapes.

Fix all high-severity findings before completion.

**After completing Module 6, create the summary directory if needed and write a concise completion summary to the project's established summary folder as `medication-knowledge-catalog-YYYY-MM-DD-HHmm.md`. Use `docs summary/` if that is the convention established by earlier modules. Include schema/migration changes, catalog/provider architecture, normalization behavior, custom fallback, endpoints/UI, terminology provenance/version decisions, tests/checks run, known limitations, and deferred work.**

---

### Context & Memory Management
**Clear your memory:** When starting this module, clear your memory / context. Read only the necessary information that you need from prerequisite module summaries after reading this prompt. If your memory/context is inflating or floating, you are free to write down the references and notes you need in a temporary file (e.g., `.memory` or `scratch/memory.md`) and keep referencing and updating that memory file as long as you need.
