# Module 14 — AI Document Assistant

> **POST-MVP / LATER PHASE — NOT PART OF MVP 1.**
> Implement only after the core medication-history workflow is reliable.

Implement the **AI Document Assistant** within the existing Prescriptionly modular monolith, following all architecture, strict TypeScript, authorization, validation, audit/provenance, security, API, frontend, testing, and coding conventions established in Modules 0–13.

## Purpose

Allow a patient to select an uploaded medical document and use AI to:

* summarize the document
* explain medical terminology in understandable language
* answer questions **grounded only in the selected document**
* help locate/retrieve information contained in that document

This is a **document assistant**, not a doctor, diagnostic engine, or general medical chatbot.

## Critical grounding model

Every response must clearly distinguish:

```text
FROM THE DOCUMENT
AI EXPLANATION
NOT PRESENT / NOT DETERMINABLE FROM DOCUMENT
```

Never blur these categories.

The assistant must know exactly which document/version/source it is answering from and must not silently use unrelated wallet data unless a future feature explicitly allows a broader scope.

Critical distinction:

```text
"The document does not mention diabetes."
```

is valid.

```text
"You do not have diabetes."
```

is not.

Absence from a document is never evidence that a condition, medication, diagnosis, or event does not exist.

## Required behavior

* Ground answers in the selected document and its available extracted/verified content.
* Preserve traceability to the relevant source/document where practical.
* Clearly indicate uncertainty, unreadable sections, missing information, or insufficient evidence.
* Do not invent values, diagnoses, medications, dates, test results, conclusions, or document content.
* Do not treat OCR/AI extraction as verified truth when it remains unconfirmed.
* Never silently resolve ambiguous medical abbreviations or unclear handwriting as fact.
* Preserve the difference between original source content, OCR extraction, user-confirmed data, and AI-generated explanation.
* Support documents where extraction failed or is incomplete without fabricating answers.
* Handle multilingual documents according to existing document-processing conventions while preserving the original meaning/source.
* Prevent cross-user/document data leakage in prompts, retrieval, caching, logs, or responses.

## Safety boundaries

The assistant must not:

* diagnose the patient
* claim that a treatment is appropriate/safe
* prescribe or modify medication
* infer causation from document content
* contradict or overwrite confirmed medical records
* present AI-generated explanations as statements written by the clinician
* claim something is absent from the patient's overall health history merely because it is absent from the selected document

Where the requested answer cannot be supported by the document, explicitly say that the document does not provide enough information.

## Architecture

Implement only what is necessary for:

```text
Selected Document
      ↓
Authorized Context Retrieval
      ↓
Relevant document/extraction content
      ↓
AI request
      ↓
Grounded response
      ↓
Source/provenance metadata
```

Include as appropriate:

* backend AI document-assistant module
* provider abstraction so the AI vendor/model is not embedded throughout business logic
* prompt/context construction
* authorization and ownership enforcement
* document/version scoping
* response/source metadata
* error, timeout and provider-unavailable handling
* strictly typed frontend document-assistant experience
* loading/error/empty states
* tests for grounding, authorization and important failure cases

Do not duplicate the OCR pipeline from Module 4. Consume existing document/extraction data through established module boundaries.

The core wallet must continue functioning normally if the AI provider is unavailable.

## UX

Present the assistant as **Document Assistant**, with the selected document clearly visible.

Where appropriate visually separate:

```text
From your document
AI explanation
Not found in this document
```

Avoid UI language that makes the AI appear to be the patient's clinician.

## Scope control

Do not expand this module into:

* general AI health chat
* symptom diagnosis
* drug interaction analysis
* treatment recommendations
* autonomous clinical decision-making
* whole-wallet health conclusions
* web-based medical research

Those require separate future specifications and safety review.

At completion, run all relevant checks/tests and create:

`summary/module-14-summary.md`

Document implemented functionality, AI/provider architecture, grounding strategy, source/provenance handling, API/schema changes, tests performed, safety limitations/TODOs, and explicitly state that **Module 14 is post-MVP and excluded from MVP 1**.
