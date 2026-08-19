# Module 16 — Export & Interoperability

> **MVP:** PDF + Prescriptionly JSON export.
> **POST-MVP:** FHIR and regional/country-specific adapters.

Implement **Export & Interoperability** within the existing Prescriptionly modular monolith, following all architecture, strict TypeScript, authorization, validation, audit/provenance, security, frontend, API, background-processing, and testing conventions established in Modules 0–15.

## Purpose

Allow patients to export authorized medical-wallet data without modifying or coupling the canonical internal domain model to any external healthcare format.

Architecture must remain:

```text
Canonical Prescriptionly Model
        ↓
Exporter / Adapter
        ├── PDF
        ├── Prescriptionly JSON
        ├── FHIR R4/R5       // later
        └── Regional formats // later
```

## MVP implementation

### PDF Export

Generate a clear human-readable medical report containing selected available data such as:

* patient/profile information appropriate for export
* current and previous medications/treatments
* prescribed vs actual medication history
* relevant prescriptions/records
* source/provenance indicators where appropriate

### Prescriptionly JSON Export

Provide a versioned, documented machine-readable export representing the canonical supported data without exposing internal implementation details unnecessarily.

Support:

* selected data categories
* optional date range/scope
* export format/version
* generated timestamp
* authenticated patient ownership
* export status/file metadata
* repeatable generation without mutating source records

Use background processing where export generation can be expensive.

## Data integrity rules

* Export only data the patient is authorized to access.
* Preserve distinctions between prescribed, patient-reported, confirmed, and unverified information.
* Never silently convert uncertain data into confirmed facts.
* Preserve approximate/unknown dates and original units/instructions where exact normalization is unavailable.
* Do not silently discard unsupported data. Fail validation or surface explicit warnings.
* Each export is a historical artifact with its own timestamp, scope, format/version, and audit record.
* Regenerating an export creates a new export result rather than overwriting previous audit history.
* Deleted/archived/versioned information must follow existing retention and visibility policies.

## Post-MVP interoperability foundation

Design interfaces now so future exporters can implement:

```ts
Exporter<Input, Output>
```

or an equivalent strongly typed abstraction without contaminating domain entities with FHIR/regional schemas.

Do **not** fully implement FHIR unless explicitly requested in a later phase.

Future adapters must:

* map from the canonical model
* declare supported target/version/profile
* validate generated resources
* report unsupported mappings
* never claim that a valid export is guaranteed to import into every EHR/hospital

FHIR R4, R5, C-CDA, and regional formats must remain distinct adapters where applicable.

## UX/API

Allow the user to choose:

* export format
* data categories/scope
* date range where relevant

Show processing, completed, failed, validation-warning, and download states.

Implement only necessary Prisma models/migrations, exporter interfaces/services, routes/controllers, frontend flow, authorization, storage/background-job integration, audit events, and tests.

## Scope control

Do not add:

* hospital/EHR direct integrations
* country-specific exporters
* FHIR implementation
* sharing links/recipient access
* clinician portal
* automatic external transmission

Those belong to later modules/phases.

At completion, run relevant checks/tests and create:

`summary/module-16-summary.md`

Document exporters implemented, export schema/versioning, scope/authorization rules, background-processing/storage decisions, API/schema changes, tests, limitations/TODOs, and clearly separate **MVP export functionality from future interoperability work**.
