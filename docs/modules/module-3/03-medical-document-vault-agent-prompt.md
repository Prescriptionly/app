# Prescriptionly Module 3 Agent Prompt: Medical Document Vault

Implement **Module 3: Medical Document Vault** in the existing Prescriptionly repository.

First inspect Modules 0-2, their summaries, Prisma schema/migrations, authentication/profile ownership rules, API conventions, storage/config patterns, tests, and frontend conventions. Preserve the existing React + Vite + strict TypeScript frontend, Node.js + Express + strict TypeScript backend, MySQL + Prisma modular-monolith architecture. Do not reorganize working foundations.

## Goal

Create a private document vault where an authenticated patient can securely upload, view, classify, rename/update metadata, preview/download, and archive their original medical documents.

This module owns **documents and original uploaded files only**.

It does **not** perform OCR, AI extraction, prescription parsing, medication creation, clinical interpretation, or structured medical-data extraction. Those belong to later modules.

The original uploaded bytes are evidence and must never be silently modified when later extracted/structured information changes.

## Supported documents

MVP file types:

* PDF
* JPEG/JPG
* PNG

Document classifications must support at least:

* `PRESCRIPTION`
* `LAB_REPORT`
* `IMAGING_REPORT`
* `DISCHARGE_DOCUMENT`
* `DOCTOR_LETTER`
* `OTHER`

A document may have **multiple classifications** because one PDF can contain more than one medical-document type.

A document may also contain **multiple original assets/pages**:

```text
Document: Prescription - 16 Aug 2026
├── page-1.jpg
├── page-2.jpg
└── page-3.jpg
```

A multi-page PDF remains one asset. Never force each photographed page to become a separate medical record.

## Data model

Use Prisma migrations and existing naming conventions.

Prefer these responsibilities:

### `Document`

* `id`
* `patientProfileId`
* user-editable `title`
* optional document date
* optional notes
* `createdAt`
* `updatedAt`
* `archivedAt` nullable

### `DocumentAsset`

* `id`
* `documentId`
* ordered `position`
* storage/object key
* original filename
* detected MIME type
* byte size
* SHA-256 content hash
* upload timestamp

### `DocumentClassification`

* `documentId`
* classification enum
* optional custom label when classification is `OTHER`

Add appropriate relationships, indexes, and uniqueness constraints.

Do not store uploaded binary files in MySQL.

Do not create OCR/extraction/version tables yet.

## Storage

Use a storage abstraction instead of direct filesystem calls throughout the module.

If no storage provider exists, create a local development adapter that can later be replaced by object storage without changing document-domain logic.

Requirements:

* generate opaque/random storage keys;
* never use user filenames as filesystem paths;
* preserve original filenames only as metadata;
* store files outside public/static frontend directories;
* never expose filesystem paths or internal storage keys;
* retrieve files only through authenticated application logic;
* prevent path traversal;
* never overwrite an existing stored object;
* clean up orphaned uploads when database creation fails where safely possible.

Do not add S3/cloud infrastructure unless already established.

## Upload security

Validate files on the server.

At minimum:

* configurable document/request size limit;
* configurable maximum asset/page count;
* verify actual file signatures/MIME content rather than trusting extension or browser `Content-Type`;
* accept only supported PDF/JPEG/PNG;
* reject empty files;
* reject malformed files when safely detectable;
* sanitize filenames used in response/download headers;
* serve files with safe `Content-Type` and `Content-Disposition`;
* never log document contents.

Do not claim antivirus/malware scanning unless actually implemented. Leave it as explicit deferred work if unavailable.

Password-protected/encrypted PDFs should be detected when practical and produce a safe documented result. Never attempt to bypass passwords.

Rotated, low-quality, unreadable, or partially photographed documents may still be valid vault files. Their readability belongs to Module 4.

## Duplicate detection

Calculate SHA-256 from the original uploaded bytes.

Detect exact duplicate assets within the **same patient profile**.

Never compare files across patients in a way that exposes whether another patient owns the same file.

If the same bytes already exist in the patient's vault, do not silently create another duplicate. Return a stable duplicate result/error referencing only that patient's existing document.

The hash is used for duplicate/integrity purposes, not authentication or encryption.

## Ownership

Every endpoint requires existing authentication and patient-profile ownership.

Resolve ownership from the authenticated server context.

Never trust client-supplied:

* `accountId`
* `patientProfileId`

to determine ownership.

Users may only access their own documents/assets.

Guessed document IDs, asset IDs, filenames, or storage keys must never bypass authorization.

Do not create public document URLs.

## API

Follow existing API conventions. If none exist, use approximately:

```text
POST   /api/documents
GET    /api/documents
GET    /api/documents/:documentId
PATCH  /api/documents/:documentId
POST   /api/documents/:documentId/archive

GET    /api/documents/:documentId/assets/:assetId
```

Upload may use `multipart/form-data`.

Allow:

* one PDF;
* one image;
* multiple ordered images forming one logical document.

The list endpoint should support basic pagination and filtering by:

* classification;
* active/archived state;
* date range where cleanly supported.

Do not build advanced search.

Metadata updates may change:

* title;
* notes;
* document date;
* classifications.

Metadata updates must **never mutate or replace original uploaded bytes**.

Do not implement unrestricted permanent deletion. Use archive/hide behavior for MVP. Permanent deletion and retention rules belong to the later privacy/security module.

## Frontend

Implement the Medical Document Vault using established UI conventions.

Provide:

* document list/grid;
* upload action;
* upload/drop area;
* multi-image selection;
* image ordering for multi-page records;
* multi-classification selection;
* optional title/document date/notes;
* upload status/progress where practical;
* document detail screen;
* image preview;
* PDF preview/open/download behavior;
* original filename/file metadata;
* archive action;
* basic filters;
* empty/loading/error states.

Explicitly handle:

* duplicate file;
* unsupported type;
* oversized file;
* malformed file;
* unavailable preview;
* upload failure.

Do not display:

* OCR text;
* extracted medications;
* confidence scores;
* AI summaries;
* clinical interpretations.

Keep UI concepts clear:

```text
Documents
=
original uploaded evidence
```

Future structured prescriptions/medications are separate domain records.

## Original-file invariant

This is non-negotiable:

```text
Original upload
      ↓
stored unchanged
      ↓
future OCR/extraction references it
      ↓
user corrections to structured data
never rewrite the source file
```

If a corrected or rescanned document is uploaded later, create a new source document/asset instead of overwriting the original.

Formal provenance/version relationships can be expanded later.

## Required edge cases

Handle/test:

1. single JPG/PNG;
2. multi-page PDF;
3. one logical document using several ordered images;
4. multiple document classifications;
5. exact duplicate for same patient;
6. identical file belonging to another patient without leakage;
7. unsupported extension/MIME;
8. MIME spoofing;
9. empty file;
10. oversized file;
11. malformed PDF;
12. password-protected PDF;
13. rotated/unreadable/partial photo;
14. Unicode/long filename;
15. path-traversal filename;
16. unauthorized document/asset access;
17. guessed UUID/storage key;
18. metadata update leaves original hash unchanged;
19. archived document disappears from default active list but remains preserved;
20. concurrent uploads;
21. storage succeeds but DB transaction fails;
22. missing storage object returns controlled error without exposing internals.

## Tests

Add focused backend/integration/frontend tests for:

* ownership isolation;
* multipart uploads;
* supported/rejected files;
* multi-page assets;
* ordering;
* multiple classifications;
* duplicate detection;
* immutable originals;
* metadata updates;
* archive behavior;
* authorized preview/download;
* unauthorized access rejection;
* frontend upload/list/detail/error flows.

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

* OCR;
* handwriting recognition;
* AI extraction;
* AI summaries;
* medication/prescription entities;
* FHIR/export;
* public sharing links;
* complete provenance/audit system;
* hard-delete policy;
* cloud migration;
* antivirus claims;
* image enhancement that changes the original file;
* unnecessary background infrastructure.

If lightweight thumbnails are already safely supported, store them as **derived preview assets**, never as replacements for originals. Otherwise defer thumbnail generation to the background-processing module and use browser previews for now.

## Acceptance criteria

Module 3 is complete when an authenticated patient can:

* upload PDF/JPEG/PNG medical documents;
* upload multi-page/multi-image records;
* assign one or more classifications;
* list and view documents;
* update document metadata;
* securely preview/download only their own files;
* detect exact duplicates within their own vault;
* archive documents;
* preserve every original upload unchanged.

Before finishing, critique the implementation for:

* cross-patient data leakage;
* broken ownership checks;
* unsafe file validation;
* MIME spoofing;
* path traversal;
* public/static file exposure;
* duplicate-detection information leaks;
* original-file mutation;
* orphaned storage objects;
* oversized upload handling;
* accidental OCR/AI scope creep;
* unsafe TypeScript escapes.

Fix all high-severity findings before declaring completion.

**After completing Module 3, create the summary directory if needed and write a concise completion summary to the project's established summary folder as `medical-document-vault-YYYY-MM-DD-HHmm.md`. Use `docs summary/` if that is the convention established by earlier modules. Include schema/migration changes, storage decisions, endpoints/UI, upload/validation rules, tests/checks run, edge cases handled, known limitations, and deferred work.**

---

### Context & Memory Management
**Clear your memory:** When starting this module, clear your memory / context. Read only the necessary information that you need from prerequisite module summaries after reading this prompt. If your memory/context is inflating or floating, you are free to write down the references and notes you need in a temporary file (e.g., `.memory` or `scratch/memory.md`) and keep referencing and updating that memory file as long as you need.
