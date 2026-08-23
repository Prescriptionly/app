import assert from 'assert';
import { prisma } from '../src/infrastructure/database/prisma';
import { authService } from '../src/modules/auth/auth.service';
import { patientService } from '../src/modules/patients/patient.service';
import { documentService } from '../src/modules/documents/document.service';
import { ocrService } from '../src/modules/ocr/ocr.service';
import { prescriptionService } from '../src/modules/prescriptions/prescription.service';
import { treatmentService } from '../src/modules/treatments/treatment.service';
import { medicationEventService } from '../src/modules/medication-events/medication-event.service';
import { sharingService } from '../src/modules/sharing/sharing.service';
import { dbQueue } from '../src/infrastructure/queue/db-queue';

async function runInvariantTests() {
  console.log('\n--- 🧪 RUNNING PRESCRIPTIONLY CRITICAL INVARIANT TESTS ---');

  const timestamp = Date.now();
  const testEmail1 = `alice_${timestamp}@test.com`;
  const testEmail2 = `bob_${timestamp}@test.com`;

  // ----------------------------------------------------
  // INVARIANT 1: Account Authentication & Patient Profile Isolation
  // ----------------------------------------------------
  console.log('Testing Invariant 1: Cross-user & patient isolation...');
  const user1 = await authService.register({
    email: testEmail1,
    password: 'Password123!',
    displayName: 'Alice Test',
  });
  const user2 = await authService.register({
    email: testEmail2,
    password: 'Password123!',
    displayName: 'Bob Test',
  });

  const profile1 = await patientService.getPrimaryProfile(user1.account.id);
  const profile2 = await patientService.getPrimaryProfile(user2.account.id);

  assert.notStrictEqual(profile1.id, profile2.id, 'Profiles must be separate');

  // Verify cross-user access is blocked
  let accessBlocked = false;
  try {
    await patientService.getProfileById(profile1.id, user2.account.id);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 403) {
      accessBlocked = true;
    }
  }
  assert.strictEqual(accessBlocked, true, 'User 2 must NOT access User 1 profile');
  console.log('✅ Invariant 1 Passed: Cross-user authorization isolation strictly enforced.');

  // ----------------------------------------------------
  // INVARIANT 2: Original Document Vault & Untrusted OCR Draft Isolation
  // ----------------------------------------------------
  console.log('Testing Invariant 2: Original evidence intact & draft extraction unconfirmed by default...');
  const fakeFile = {
    fieldname: 'file',
    originalname: 'doctor-rx.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: Buffer.from('FAKE_PRESCRIPTION_IMAGE_BYTES_12345'),
    size: 34,
  } as Express.Multer.File;

  const uploadedDoc = await documentService.uploadDocument(profile1.id, user1.account.id, fakeFile, {
    title: 'Dr. Smith Clinic Rx',
    category: 'PRESCRIPTION',
  });

  assert.strictEqual(uploadedDoc.category, 'PRESCRIPTION');
  assert.strictEqual(uploadedDoc.version.versionNumber, 1);
  assert.strictEqual(uploadedDoc.version.fileName, 'doctor-rx.png');

  // Process OCR
  await ocrService.processExtractionDraft(uploadedDoc.version.id);

  const extraction = await prisma.documentExtraction.findFirst({
    where: { documentVersionId: uploadedDoc.version.id },
  });

  assert.ok(extraction, 'Extraction record must exist');
  assert.strictEqual(extraction.isConfirmed, false, 'OCR draft extraction must NOT be automatically confirmed');
  assert.strictEqual(extraction.status, 'EXTRACTED');

  // Verify prescriptions table is still empty for this doc before explicit user review
  const unconfirmedRxList = await prescriptionService.getPrescriptions(profile1.id, user1.account.id);
  assert.strictEqual(unconfirmedRxList.length, 0, 'Prescriptions must NOT exist before user verification');
  console.log('✅ Invariant 2 Passed: Untrusted OCR drafts do not become clinical data without confirmation.');

  // ----------------------------------------------------
  // INVARIANT 3: OCR Review & Confirmation with Ambiguity Flagging
  // ----------------------------------------------------
  console.log('Testing Invariant 3: Explicit user review and confirmation preserves draft and creates structured Rx...');
  const confirmedRx = await ocrService.confirmExtraction(extraction.id, user1.account.id, {
    prescriberName: 'Dr. Sarah Jenkins',
    clinicName: 'Metro Health Clinic',
    prescribedDate: new Date().toISOString(),
    medications: [
      {
        enteredName: 'Metformin',
        form: 'TABLET',
        strength: '500 mg',
        originalInstructionText: 'Take 1 tablet twice daily with meals.',
        doseQuantity: 1,
        doseUnit: 'tablet',
        frequencyCount: 2,
        frequencyPeriod: 'DAY',
        isPrn: false,
        durationDays: 30,
        confidence: 0.95,
        warningFlags: [],
      },
    ],
  });

  assert.ok(confirmedRx.id, 'Prescription created');
  const confirmedExtraction = await ocrService.getExtraction(extraction.id, user1.account.id);
  assert.strictEqual(confirmedExtraction.isConfirmed, true, 'Extraction status must be confirmed');
  assert.strictEqual(confirmedExtraction.status, 'CONFIRMED');
  console.log('✅ Invariant 3 Passed: User confirmation creates structured Rx while retaining draft provenance.');

  // ----------------------------------------------------
  // INVARIANT 4: Prescribed vs Actual Reality & Standalone Medication Events
  // ----------------------------------------------------
  console.log('Testing Invariant 4: Standalone OTC medication events and Prescribed vs Actual separation...');
  
  // Standalone event (OTC Aspirin with no prescription)
  const standaloneEvent = await medicationEventService.logEvent(profile1.id, user1.account.id, {
    medicationName: 'Aspirin OTC',
    form: 'TABLET',
    quantity: 1,
    unit: 'tablet',
    action: 'TAKEN',
    eventTimestamp: new Date().toISOString(),
    isStandalone: true,
    notes: 'Took for headache after work',
  });

  assert.strictEqual(standaloneEvent.isStandalone, true);
  assert.strictEqual(standaloneEvent.treatmentId, null);

  const prescribedVsActual = await medicationEventService.getPrescribedVsActual(profile1.id, user1.account.id);
  assert.ok(prescribedVsActual.prescribedCount >= 1, 'Prescribed treatments must be tracked');
  assert.ok(prescribedVsActual.actualEvents.length >= 1, 'Actual events must be tracked independently');
  console.log('✅ Invariant 4 Passed: Standalone events and Prescribed vs Actual separation verified.');

  // ----------------------------------------------------
  // INVARIANT 5: Scoped Sharing & Expiration / Revocation Enforcement
  // ----------------------------------------------------
  console.log('Testing Invariant 5: Scoped sharing grants and revocation enforcement...');
  const shareResult = await sharingService.createShareGrant(profile1.id, user1.account.id, {
    recipientLabel: 'Dr. Jones Consult',
    allowedCategories: ['MEDICATIONS', 'HISTORY'],
    expiresInHours: 24,
  });

  assert.ok(shareResult.shareToken, 'Share token generated');
  const sharedWallet = await sharingService.accessSharedWallet(shareResult.shareToken);
  assert.ok(sharedWallet.patient, 'Shared wallet accessible before revocation');

  // Revoke grant
  await sharingService.revokeShareGrant(shareResult.grant.id, user1.account.id);

  let revokedBlocked = false;
  try {
    await sharingService.accessSharedWallet(shareResult.shareToken);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 403) {
      revokedBlocked = true;
    }
  }
  assert.strictEqual(revokedBlocked, true, 'Revoked share grant must reject access');
  console.log('✅ Invariant 5 Passed: Revoked share grants immediately block access.');

  // ----------------------------------------------------
  // INVARIANT 6: Background Queue Deduplication & Idempotency
  // ----------------------------------------------------
  console.log('Testing Invariant 6: Queue deduplication and idempotency...');
  const dedupKey = `test_job_${timestamp}`;
  const job1 = await dbQueue.enqueue('DATA_CLEANUP', { reason: 'daily' }, profile1.id, dedupKey);
  const job2 = await dbQueue.enqueue('DATA_CLEANUP', { reason: 'daily' }, profile1.id, dedupKey);

  assert.strictEqual(job1.id, job2.id, 'Duplicate jobs with same deduplication key must not duplicate');
  console.log('✅ Invariant 6 Passed: Background job queue deduplication verified.');

  console.log('\n🎉 ALL CRITICAL INVARIANT TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runInvariantTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ INVARIANT TEST FAILED:', err);
    process.exit(1);
  });
