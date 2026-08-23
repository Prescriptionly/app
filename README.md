# Prescriptionly

Prescriptionly is a patient-controlled medication and medical-record wallet. It preserves original prescriptions and medical documents, converts eligible documents into user-reviewed structured information, records what was prescribed, tracks what the patient reports actually happened, and supports traceable sharing and export.

---

## Core Health-Data Principles

1. **Evidence Preservation**: Original medical prescriptions and documents remain permanently intact in private storage.
2. **Draft Untrusted Extractions**: OCR and AI output begins as untrusted draft predictions and requires explicit patient review before becoming clinical data.
3. **Prescribed vs Actual Separation**: A doctor's prescription is historical evidence of clinical instructions. Medication events are the patient's reported reality. Neither silently overwrites the other.
4. **Standalone Logging**: Over-the-counter (OTC) drugs, supplements, and vaccines can be tracked as standalone events without requiring a doctor's prescription.
5. **Scoped Sharing & Emergency Access**: Sharing grants use explicit category selection, time expiration, and instantaneous revocation. Emergency cards provide a deliberately limited critical dataset for first responders.

---

## Architecture & Technology Stack

- **Monorepo Workspaces**:
  - `apps/api`: Node.js, Express, strict TypeScript, Prisma ORM, MySQL 9+.
  - `apps/web`: React 19, Vite, strict TypeScript, Tailwind CSS, Lucide Icons.
- **Database & Persistence**: MySQL with versioned Prisma migrations.
- **Storage Adapter**: Typed private disk storage adapter with SHA-256 deduplication and MIME validation.
- **Queue**: Database-backed asynchronous job queue with atomic leasing, retries, and deduplication.

---

## Implemented Modules (0–22)

- **Module 0**: Workspace foundation, monorepo setup, environment validation, strict TypeScript.
- **Module 1**: Authentication, password hashing (Argon2/crypto), server-managed opaque sessions, CSRF protection.
- **Module 2**: Patient profiles, multi-profile switching, timezone management, data isolation.
- **Module 3**: Medical document vault, multi-versioning, secure upload/download.
- **Module 4**: OCR draft extraction, field confidence scoring, high-risk decimal ambiguity detection (`0.5 mg` vs `5 mg`).
- **Module 5**: Interactive OCR review and confirmation workflow.
- **Module 6**: Standard medication concepts catalog, custom drug fallback.
- **Module 7**: Multi-item structured prescriptions with detailed dosage instructions.
- **Module 8**: Active, paused, completed, and discontinued treatment courses.
- **Module 9**: Flexible treatment scheduling and expected dose calculations.
- **Module 10**: Patient-reported medication events (taken, administered, applied, skipped, partial) and standalone OTC logs.
- **Module 11**: Real-time Prescribed vs Actual adherence and discrepancy comparison.
- **Module 12**: Source-aware chronological medical timeline with provenance badges (`DOCTOR_PRESCRIBED`, `PATIENT_REPORTED`, `AI_EXTRACTED_DRAFT`, `SYSTEM_GENERATED`).
- **Module 13**: Phase 2 patient-reported symptoms and non-causal timeline associations.
- **Module 14**: Grounded AI document assistant with strict 3-tier grounding model (`FROM_DOCUMENT`, `AI_EXPLANATION`, `NOT_PRESENT`).
- **Module 15**: Traceable patient and clinician health summary generator.
- **Module 16**: Full wallet exports in PDF and canonical machine-readable JSON format.
- **Module 17**: Scoped temporary share links with category selection and instant revocation.
- **Module 18**: Deliberately limited emergency medical ID card and public QR view.
- **Module 19**: Notification center and reminder management.
- **Module 20**: Security consents, audit logging, and soft-delete/account deletion controls.
- **Module 21**: Background worker queue with idempotency and exponential backoff retries.
- **Module 22**: Privacy-preserving operational administration dashboard and job retry tools.

---

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8.0+ or MySQL 9.0+ running on `localhost:3306` (or via Docker Compose: `docker compose up -d`)

### Setup & Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

3. **Deploy database migrations and seed data**:
   ```bash
   npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
   npm run db:seed --workspace=apps/api
   ```
   *Seeds standard medication catalog and demo user:* `patient@prescriptionly.local` / `Password123!`

4. **Run typecheck and build**:
   ```bash
   npm run typecheck
   npm run build
   ```

5. **Run backend invariant tests**:
   ```bash
   npm run test --workspace=apps/api
   ```

6. **Start local development servers**:
   ```bash
   # Terminal 1 (API Server):
   npm run dev --workspace=apps/api

   # Terminal 2 (Background Queue Worker):
   npm run worker --workspace=apps/api

   # Terminal 3 (Web UI):
   npm run dev --workspace=apps/web
   ```

Open `http://localhost:5173` to explore Prescriptionly.
