# Module 21 — Background Processing

Implement a **cost-efficient, reliable background-processing system** for Prescriptionly inside the existing modular monolith. Follow all architecture, strict TypeScript, Prisma/MySQL, authorization, audit, security, storage, and testing conventions established by previous modules.

## Goal

Expensive/slow work must not block normal HTTP requests.

Use:

```text
API request
   ↓
Create job
   ↓
202 / processing state
   ↓
Background worker
   ↓
Completed / failed / needs-review
```

Support current/future jobs such as:

* OCR/document processing
* image/thumbnail generation
* AI document analysis
* export generation
* notification delivery
* other genuinely expensive asynchronous operations

## Architecture

Keep this within the **modular monolith**. Do not introduce microservices.

Create a reusable typed job abstraction with:

* job type
* payload
* owner/patient/resource references where required
* status: `pending | processing | completed | failed`
* attempt count
* timestamps
* result/error metadata
* idempotency/deduplication key where appropriate

Separate:

* job creation
* queue/dispatch
* worker execution
* domain-specific job handlers

Business modules should enqueue work through a small abstraction rather than depending directly on a queue vendor.

## Reliability

Implement:

* idempotent handlers where possible
* retry only for retryable/transient failures
* bounded retries with backoff
* permanent-failure handling
* duplicate-job protection
* recovery of interrupted/stuck jobs
* safe concurrent processing
* transactional consistency between domain records and job creation where needed
* meaningful audit/status updates

Never allow retries to create duplicate documents, exports, medication records, AI results, notifications, or charges.

## Cost Efficiency

Design for the **lowest reasonable infrastructure/API cost**:

* perform work synchronously when it is cheap; enqueue only genuinely slow/expensive work
* avoid repeating OCR/AI/export processing when the underlying input/version has not changed
* deduplicate identical pending work
* reuse existing extraction/results where valid
* never call paid AI/OCR providers unnecessarily
* apply sensible concurrency/rate limits
* batch operations where beneficial
* store only useful job metadata/results, not unnecessary duplicated payloads
* clean up disposable job data according to retention policy
* avoid polling external providers aggressively
* do not introduce Redis/extra infrastructure unless justified by the existing project architecture; keep the queue implementation replaceable

Provider failures must not break the core Medical Wallet.

## Security

* Validate ownership/authorization **before enqueueing** sensitive work.
* Workers must independently operate only on explicitly identified authorized resources.
* Never place unnecessary medical data, secrets, access tokens, or full documents into queue payloads/logs.
* Sanitize errors and logs.
* Preserve patient isolation during concurrent processing.

## UX/API Integration

Modules using jobs must expose appropriate states such as:

```text
Processing
Needs Review
Completed
Failed
```

Do not keep HTTP connections open waiting for OCR/AI/export completion.

Clients may retrieve current job/resource status using the project's normal API/data-refresh approach without excessive polling.

## Edge Cases

Handle:

* worker crashes mid-job
* server restarts
* duplicate requests
* same document uploaded/processed twice
* provider timeout/rate limit
* partial processing success
* malformed job payload
* resource deleted while queued
* user account/profile access revoked while queued
* stale jobs
* retry after an external operation actually succeeded
* two workers claiming the same job
* application running multiple instances

Never silently mark failed work as successful.

## Scope Control

Do not build:

* microservices
* unnecessary distributed orchestration
* complex workflow engines
* event sourcing solely for background jobs
* dedicated infrastructure without demonstrated need

Prefer the **simplest reliable abstraction that can later swap queue/worker technology without rewriting domain modules**.

Add only necessary Prisma/schema changes, worker infrastructure, typed interfaces, handlers, lifecycle/status APIs, logging/observability, cleanup strategy, and tests.

At completion, run relevant tests/checks and create:

`summary/module-21-summary.md`

Include implemented architecture, supported job types, retry/idempotency/deduplication strategy, concurrency/cost controls, schema/API changes, failure/recovery behavior, tests performed, and remaining limitations/TODOs.

---

### Context & Memory Management
**Clear your memory:** When starting this module, clear your memory / context. Read only the necessary information that you need from prerequisite module summaries after reading this prompt. If your memory/context is inflating or floating, you are free to write down the references and notes you need in a temporary file (e.g., `.memory` or `scratch/memory.md`) and keep referencing and updating that memory file as long as you need.
