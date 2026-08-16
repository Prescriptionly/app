# Module 1: Authentication & Identity

**Contains**

* Registration, login, logout, password reset and session/token handling.
* Account ownership, account status, security settings and future MFA/passkeys.

**Critique / edge cases**

* Do not use the medical profile itself as the authentication identity.
* Handle changed email addresses, lost accounts, compromised accounts, duplicate accounts and deleted accounts.
* Never allow an account merge to silently merge two people's medical histories.

---

# Module 2: Patient Profile

**Contains**

* Name, DOB, biological/administrative fields you genuinely need, language, timezone and relevant profile information.
* Allergies and emergency information can later reference this module without turning the profile into an unrestricted medical questionnaire.

**Critique / edge cases**

* People may not know their exact DOB.
* Names change and can have non-Latin scripts.
* One account may eventually manage children, parents or dependents.
* Do not invent a "Patient ID" that looks like an official hospital identifier unless it is clearly a Prescriptionly identifier.

---

# Module 3: Medical Document Vault

This corresponds closely to your second UI screen.

**Contains**

* Upload PDF/JPG/PNG, document classification, metadata, original file and thumbnails/previews.
* Types such as prescription, lab report, imaging report, discharge document, doctor letter and other.

**Critique / edge cases**

* One PDF may contain several document types.
* One prescription may span several pages.
* Duplicate uploads need detection.
* A document can be unreadable, password-protected, rotated or partially photographed.
* The original file should remain intact even if extracted information is corrected later.

---

# Module 4: Document Processing & OCR

**Contains**

* OCR/extraction pipeline, processing status, confidence values and extracted candidate fields.
* Review workflow before extracted information becomes trusted structured data.

**Critique / edge cases**

Never implement:

```text
Upload → AI → automatically accepted medication
```

Implement:

```text
Upload
   ↓
Processing
   ↓
Draft extraction
   ↓
User verification
   ↓
Confirmed information
```

Edge cases include handwriting, abbreviations, unclear decimal points, mixed languages, multiple medications on one page and AI returning something not actually present in the document.

A particularly dangerous case is:

```text
0.5 mg
```

being interpreted as:

```text
5 mg
```

Therefore confidence should not just be one overall percentage. Important fields should have independent confidence/provenance.

---

# Module 5: Prescription Management

**Contains**

* Prescription date, prescriber, clinic, source document, notes and status.
* One prescription containing one or many `PrescriptionItems`.

**Critique / edge cases**

Do not put everything directly in a single `prescriptions` table.

Use approximately:

```text
Prescription
   ├── PrescriptionItem
   ├── PrescriptionItem
   └── PrescriptionItem
```

A prescription may contain:

* Multiple medications.
* PRN medication, meaning "as needed."
* No duration.
* No total quantity.
* Dosage changes over several days.
* Medication stopped by another physician.
* Handwritten instructions that cannot confidently be interpreted.

---

# Module 6: Medication Knowledge / Catalog

**Contains**

* Medication names, aliases, normalized identifiers, strengths, dosage forms and external terminology references.
* Autocomplete and custom medication fallback.

**Critique / edge cases**

Never force:

```text
Medication = catalog record
```

Instead:

```text
PrescriptionItem
├── enteredName
├── medicationConceptId?    optional
└── normalizationStatus
```

Because you will encounter:

* Regional brands.
* Misspellings.
* Compounded medications.
* Herbal products.
* Vitamins/supplements.
* Products absent from your chosen terminology.
* Same brand name with different strengths.
* Combination products.

---

# Module 7: Dosage & Prescription Instructions

This deserves its own conceptual layer.

**Contains**

* Dose quantity, unit, route, frequency, duration, timing and textual instructions.
* Original instruction text plus structured interpretation.

**Critique / edge cases**

A simple database model such as:

```text
dose = 1
frequency = 3
duration = 7
```

will fail quickly.

Real instructions may resemble:

```text
1 tablet every 8 hours
```

or:

```text
2 tablets on day 1,
then 1 tablet daily
```

or:

```text
5 mL when required, maximum four times daily
```

or:

```text
20 units before breakfast,
10 before dinner
```

Keep both:

```text
originalInstructionText
structuredDosage
```

---

# Module 8: Treatment / Medication Course

This is a module missing from your current conceptual model.

A prescription and an active treatment should not necessarily be the same thing.

**Contains**

* Start/end dates, active/stopped/completed state and connection back to a prescription item.
* User-selected actual treatment period.

**Critique / edge cases**

Someone can receive a prescription today and start the medication three days later.

They may also:

```text
start
stop
restart
```

the same medication.

Don't mutate one boolean:

```text
isActive = true/false
```

and lose history.

---

# Module 9: Medication Schedule

**Contains**

* Expected dose occurrences generated from prescription/treatment instructions.
* Morning/evening schedules, interval schedules and future reminders.

**Critique / edge cases**

Time handling will be much harder than it appears.

Consider:

* User changes timezone while travelling.
* Daylight-saving-time changes.
* "Every 8 hours" versus "three times daily."
* "With breakfast" rather than 08:00.
* PRN medications should not generate normal missed-dose events.
* A schedule can change midway through treatment.

Separate:

```text
expected dose
```

from:

```text
actual medication event
```

---

# Module 10: Medication Event Tracking

This is the heart of Prescriptionly.

**Contains**

* Taken/administered/applied/skipped/partial events, actual timestamp, quantity and notes.
* Connection to an expected dose when applicable.

**Critique / edge cases**

Events must also work without a prescription:

```text
OTC aspirin
vitamin
one-time injection
```

which is already part of your original concept. 

Users may:

* Log a dose two days later.
* Accidentally log twice.
* Correct an amount.
* Take a dose early.
* Take a dose late.
* Take half a tablet.
* Not know the exact time.
* Take more than prescribed.
* Record something retrospectively from memory.

The system should capture facts without presenting itself as approving the behavior.

---

# Module 11: Provenance, Versions & Audit Trail

This should be a first-class module, not an afterthought.

**Contains**

* Who created/changed a record, when and through what source.
* Previous versions, corrections and links to original evidence.

Think in terms of:

```text
Source: prescription image
Extraction: AI/OCR
Confirmed by: user
Corrected by: user
Correction timestamp: ...
```

**Critique / edge cases**

"Immutable" alone creates problems.

You need both:

```text
tamper-resistant historical evidence
+
correctable structured information
```

Deletion also needs thought. Hiding something from the user's active timeline and permanently destroying historical data are different operations.

---

# Module 12: Medical Timeline

**Contains**

* Chronological view combining prescriptions, medication starts/stops, medication events and eventually other records.
* Filters for current medications, previous medications, documents and date ranges.

**Critique / edge cases**

Do not collapse everything into one ambiguous chronological stream.

The user should be able to distinguish visually:

```text
Doctor prescribed
Patient reported
AI extracted
System generated
```

Also handle uncertain dates:

```text
"approximately March 2024"
```

rather than forcing false precision.

---

# Module 13: Symptoms & Observations

Your existing dashboard already contains symptoms.

**Contains**

* Symptom, severity, timestamps, free-text notes and optional relationship to a medication or treatment period.
* Later support for simple observations.

**Critique / edge cases**

I would make this **Phase 2**.

It can quickly turn Prescriptionly into a generic health tracker and distract you from the medication-history problem.

Also avoid implying:

```text
Medication X caused symptom Y
```

simply because their timestamps correlate.

Store association separately from causation.

---

# Module 14: AI Document Assistant

This corresponds to your fourth UI.

**Contains**

* Explain document terminology, summarize uploaded records and answer questions grounded in a selected document.
* Extraction and document-navigation assistance.

**Critique / edge cases**

Every answer should know its source scope:

```text
Based on this uploaded document...
```

The AI should distinguish absence from evidence:

```text
"The report does not contain..."
```

instead of:

```text
"You do not have..."
```

Those are medically very different statements.

I would not put this module ahead of reliable medication tracking.

---

# Module 15: Health Summary

**Contains**

* A patient-readable summary and a clinician-oriented summary generated from confirmed records.
* Current medications, prior medication history, allergies if captured and selected recent records.

**Critique / edge cases**

Your dashboard currently has a very prominent **Generate Summary** feature.

I would only summarize:

```text
confirmed structured information
+
clearly marked user-reported information
```

Never silently combine an uncertain OCR extraction with verified records.

Every important summary statement should ideally remain traceable to its source record.

---

# Module 16: Export & Interoperability

**Contains**

* PDF first, structured Prescriptionly JSON second and FHIR adapters later.
* Export jobs, format/version, included date range and selected data categories.

**Critique / edge cases**

Do not advertise:

> "Works with every hospital."

Exportability does not imply importability.

Eventually:

```text
Exporter
├── PDFExporter
├── PrescriptionlyJSONExporter
├── FHIRR4Exporter
├── FHIRR5Exporter
└── RegionalExporter
```

Each exporter should transform the **canonical internal model** rather than controlling your internal schema. This matches the strongest architectural recommendation already made in your source material. 

---

# Module 17: Sharing & Consent

**Contains**

* Generate limited medical reports, temporary share links and future clinician access.
* Expiration, revocation, scope and audit information.

**Critique / edge cases**

"Share my wallet" is too broad.

The user should select:

```text
Share:
[x] Current medications
[x] Medication history
[ ] Laboratory reports
[ ] Prescription originals
[ ] Symptoms

Expires:
24 hours
```

Important cases:

* Link forwarded to somebody else.
* User revokes access.
* User updates their wallet after sharing.
* Recipient downloads a copy.
* Expired link is reopened.
* User shares the wrong patient's profile.

---

# Module 18: Emergency Card

Your existing design includes this, and I think it can become valuable.

**Contains**

* Deliberately selected emergency information and optional QR/access mechanism.
* Emergency contact, selected current medications, allergies and other information the user explicitly chooses.

**Critique / edge cases**

The key contradiction is:

```text
Emergency information must be easy to access
```

versus:

```text
Medical information must remain private
```

So this cannot simply expose the normal wallet.

The emergency card should have its **own deliberately limited dataset**.

---

# Module 19: Notifications & Reminders

**Contains**

* Medication reminders, document-processing completion and account/security notifications.
* User preferences, quiet hours and delivery channels.

**Critique / edge cases**

A reminder is not proof of treatment.

Never do:

```text
Reminder fired
→ medication automatically marked taken
```

Only a user event should create an actual-use record.

If reminders are ignored, don't automatically classify them as skipped without a deliberate product decision.

---

# Module 20: Privacy, Security & Consent

This is cross-cutting but deserves its own module.

**Contains**

* Authorization rules, consent records, encryption strategy, session/device management, data access auditing and retention/deletion mechanisms.
* Data export and account-management controls.

**Critique / edge cases**

Do not wait until "after MVP" to design this.

You are intentionally building a database containing highly sensitive health information.

The exact legal obligations will depend on jurisdictions, product role, users, integrations and deployment model, so I would not claim "we are HIPAA compliant" or "GDPR compliant" from the architecture alone.

Design for strong controls now. Obtain jurisdiction-specific legal/compliance review before making compliance claims.

---

# Module 21: Background Processing

Even inside a monolith, asynchronous work should be separated conceptually.

**Contains**

* OCR jobs, document processing, thumbnails, exports and AI analysis.
* Retry status, job failure handling and idempotency.

**Critique / edge cases**

Don't make an HTTP request wait 60 seconds for:

```text
Upload → OCR → AI → normalization → save → response
```

Instead:

```text
POST document
      ↓
202 Processing
      ↓
background job
      ↓
Needs Review
```

A modular monolith can still have workers. You do not need microservices for this.

---

# Module 22: Admin & Operational Tools

**Contains**

* Failed-processing inspection, terminology-sync monitoring and account/support operations.
* System audit visibility without giving support personnel unrestricted medical-record access.

**Critique / edge cases**

An "admin can see everything" architecture is easy to implement and a bad default.

Support privileges should be deliberately scoped.

---

# What belongs in MVP

I would now define **MVP 1** as only:

```text
Authentication
Patient Profile

Medical Document Vault
    ↓
Prescription Upload
    ↓
OCR / Extraction
    ↓
Verification

Prescription Management
Medication Catalog + custom names
Dosage Instructions
Treatment

Medication Events
Prescribed vs Actual
Medication Timeline

PDF export
Prescriptionly JSON export

Audit / Provenance
Privacy / Security
```

That is already a substantial product.

I would **not put these into MVP 1**:

```text
AI health chat
lab interpretation
symptom analytics
FHIR export
country-specific export
doctor portal
pharmacy integrations
family accounts
QR sharing
advanced adherence analytics
drug interaction analysis
```

Not because they're bad ideas. Because they dilute the experiment you actually need to validate.

---

# The experiment you need to validate

Your MVP should answer one question:

> **Will people build and maintain a useful medication history if Prescriptionly makes it easy to capture prescriptions and record what they actually took?**

If the answer is no, FHIR does not save the product.

If the answer is yes, interoperability makes that data much more valuable.

---

# Recommended canonical domain model

I would evolve the earlier model into this:

```text
User
│
└── PatientProfile
     │
     ├── Document
     │    ├── DocumentVersion
     │    └── Extraction
     │
     ├── Prescription
     │    └── PrescriptionItem
     │          │
     │          ├── MedicationConcept?
     │          ├── DosageInstruction[]
     │          │
     │          └── Treatment[]
     │                 │
     │                 ├── Schedule
     │                 │     └── ExpectedDose[]
     │                 │
     │                 └── MedicationEvent[]
     │
     ├── StandaloneMedicationEvent[]
     │
     ├── Symptom[]                  // later
     └── ShareGrant[]

AuditEvent
ExportJob
Notification
```

That gives us the relationship we need:

```text
ORIGINAL EVIDENCE
       │
       ▼
  PRESCRIPTION
       │
       ▼
WHAT WAS PRESCRIBED
       │
       ▼
EXPECTED TREATMENT
       │
       ▼
WHAT ACTUALLY HAPPENED
```

---

# I would use SQL

For this particular domain I would strongly favor a relational database over MongoDB.

You have relationships such as:

```text
prescription
→ items
→ treatments
→ schedules
→ medication events
→ provenance
→ exports
```

plus transactional operations, version history and many date queries.

That fits a relational model very naturally.

JSON/JSONB is still useful for flexible structured dosage or future interoperability payloads.

I would therefore start with roughly:

```text
React
    ↓
Express API
    ↓
Domain Modules
    ↓
PostgreSQL

Object Storage
    ↑
Documents / prescription images
```

with background processing added alongside the Express application.

---

# Suggested Node.js backend organization

I would organize the modular monolith approximately like this:

```text
src/
├── app/
│   ├── app.ts
│   ├── routes.ts
│   └── middleware/
│
├── modules/
│   ├── auth/
│   ├── patients/
│   ├── documents/
│   ├── prescriptions/
│   ├── medications/
│   ├── treatments/
│   ├── schedules/
│   ├── medication-events/
│   ├── timeline/
│   ├── exports/
│   ├── sharing/
│   ├── ai/
│   ├── audit/
│   └── notifications/
│
├── infrastructure/
│   ├── database/
│   ├── storage/
│   ├── queue/
│   ├── mail/
│   ├── ai/
│   └── terminology/
│
└── shared/
    ├── errors/
    ├── validation/
    ├── security/
    └── utils/
```

And inside something like `prescriptions/`:

```text
prescriptions/
├── prescription.routes.ts
├── prescription.controller.ts
├── prescription.service.ts
├── prescription.repository.ts
├── prescription.schema.ts
├── prescription.policy.ts
└── prescription.types.ts
```

That is still one Express application.

It just gives you boundaries that can survive growth.

---

# React should follow the same domains

Don't create:

```text
components/
   Button.tsx
   Form.tsx
   Card.tsx
   PrescriptionWhatever.tsx
   MedicationSomething.tsx
   ...900 files
```

I would use feature-oriented organization:

```text
src/
├── app/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── documents/
│   ├── prescriptions/
│   ├── medications/
│   ├── treatments/
│   ├── timeline/
│   ├── exports/
│   └── profile/
│
├── components/
│   └── shared UI only
│
├── services/
└── utils/
```

Backend and frontend then speak the same domain language.

---

# Critique of your current screens

## Dashboard

The design is visually solid, and the hierarchy is understandable.

But right now it says:

```text
Medications
Records
AI Health Summary
Recent Prescription
Symptoms
Quick Actions
```

I would make the core medication behavior much more visible.

Something closer to:

```text
TODAY

Metformin 500 mg
08:00  Taken
20:00  Upcoming

Amoxicillin
10:00  Missed / Unconfirmed

[ Log medication ]

CURRENT TREATMENTS
3 active

RECENT RECORDS
...
```

For your actual product, **today's medication activity should probably outrank AI Health Summary**.

---

# Medical Records Vault

This screen is good conceptually.

But there is navigation duplication:

```text
Medical Records
Prescriptions
```

and then inside Medical Records:

```text
All Records
Prescriptions
Laboratory Results
...
```

You need to decide whether prescriptions are:

1. A document category.
2. A structured clinical module.
3. Both.

My answer is **both**, but the UI needs to communicate the difference.

For example:

```text
Documents
```

contains the actual uploaded prescription.

```text
Medications
```

contains its interpreted structured prescription and treatment information.

That will be much clearer than having two competing concepts named "Prescription."

---

# Upload Prescription

Your third screen is a good starting point.

But after uploading, the most important screen is currently missing:

## Review Extraction

```text
We found 3 medications.

1. Metformin
   Strength: 500 mg
   Dose: 1 tablet
   Twice daily

   Confidence warnings:
   Doctor handwriting unclear

   [Edit]

2. ...
```

That review screen will be more important than the upload page itself.

I would design it before implementation.

---

# AI Analysis screen

This is the screen I would change most.

It currently makes AI look like a clinical expert sitting beside the medical report.

I would reposition it as:

```text
Document Assistant
```

and visually distinguish:

```text
FROM YOUR DOCUMENT
```

from:

```text
AI EXPLANATION
```

and:

```text
NOT PRESENT IN DOCUMENT
```

That gives us much better provenance and trust.

---


# High-impact edge cases we should put into the specification now

| Situation                                | Expected behavior                                          |
| ---------------------------------------- | ---------------------------------------------------------- |
| OCR reads 5 mg instead of 0.5 mg         | Require user review, retain source                         |
| User changes OCR result                  | Store correction/version                                   |
| User uploads same prescription twice     | Detect/flag possible duplicate                             |
| Prescription has 7 medicines             | Create 7 prescription items                                |
| Medicine isn't in catalog                | Allow custom entry                                         |
| Brand exists only locally                | Preserve entered brand name                                |
| User takes medicine without prescription | Create standalone medication event/treatment               |
| User takes half a tablet                 | Support decimal/fractional quantity                        |
| User logs yesterday's medication today   | Store event time and recorded-at time separately           |
| User doesn't remember exact time         | Permit approximate/unknown time                            |
| User skips dose                          | Record skipped only when explicitly stated                 |
| Reminder ignored                         | Do not automatically mark skipped                          |
| User travels across timezones            | Preserve meaningful local/absolute timestamps              |
| User corrects a medication event         | Version/correction rather than destructive overwrite       |
| Doctor changes dose                      | New dosage period/version                                  |
| Patient stops then restarts treatment    | Multiple treatment periods                                 |
| Prescription says "as needed"            | No normal missed-dose semantics                            |
| Same drug prescribed by two doctors      | Preserve both prescription sources                         |
| PDF contains prescription + lab report   | Support multi-document classification                      |
| Document cannot be OCRed                 | Manual entry remains available                             |
| AI confidence is low                     | Escalate to user verification                              |
| User deletes uploaded document           | Define relationship to derived records before deletion     |
| Medication export has unsupported data   | Report validation warning, don't silently discard          |
| FHIR target requires different profile   | Select/validate target adapter                             |
| User shares emergency card               | Only explicitly selected emergency fields exposed          |
| Share link expires                       | Access stops while audit remains                           |
| User exports incorrect OCR data          | Mark unverified data or prevent clinical-style export      |
| Two accounts represent same person       | Never auto-merge medical histories                         |
| Child becomes adult                      | Ownership/delegation model needs migration                 |
| User dies/incapacitated                  | Future policy required for delegated access                |
| App has no network                       | Future mobile/offline strategy needed                      |
| AI service unavailable                   | Core wallet and manual entry must continue working         |
| Drug API unavailable                     | Custom medication entry must continue working              |
| External terminology changes             | Existing historical identifiers must remain resolvable     |
| Unit ambiguous, e.g. "1 spoon"           | Preserve text, don't invent exact mL                       |
| Dose instructions contradict quantity    | Flag rather than "correct"                                 |
| User says they took dangerous amount     | Record fact without representing it as medically approved  |
| Two medications have similar names       | Show strength/form/identifier in selection UI              |
| Prescription is in another language      | Preserve original and mark translated/extracted fields     |
| User edits DOB/name                      | Historical clinical documents keep their original metadata |
| Export generated twice                   | Each export records its own timestamp/version/scope        |

That is not literally every possible edge case, because no finite product specification can guarantee that, but these are the high-risk structural cases I would design around before implementation.

---

# The principle I would put at the top of our engineering specification

```text
Prescriptionly never confuses:

what the source document said,
what AI interpreted,
what the user confirmed,
what was prescribed,
what was scheduled,
what the patient says actually happened,
and what the system inferred.
```

Each of those should be independently identifiable.

If we maintain that principle, our system can become trustworthy.
 