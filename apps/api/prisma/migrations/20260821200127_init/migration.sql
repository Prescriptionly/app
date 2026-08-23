-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `pendingNewEmail` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Account_email_key`(`email`),
    INDEX `Account_email_idx`(`email`),
    INDEX `Account_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `csrfToken` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_accountId_idx`(`accountId`),
    INDEX `Session_tokenHash_idx`(`tokenHash`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailVerificationToken` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `targetEmail` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmailVerificationToken_tokenHash_key`(`tokenHash`),
    INDEX `EmailVerificationToken_accountId_idx`(`accountId`),
    INDEX `EmailVerificationToken_tokenHash_idx`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_tokenHash_key`(`tokenHash`),
    INDEX `PasswordResetToken_accountId_idx`(`accountId`),
    INDEX `PasswordResetToken_tokenHash_idx`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PatientProfile` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `isDobApproximate` BOOLEAN NOT NULL DEFAULT false,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `bloodGroup` VARCHAR(191) NULL,
    `emergencyNotes` TEXT NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `isPrimary` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `PatientProfile_accountId_idx`(`accountId`),
    INDEX `PatientProfile_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` VARCHAR(191) NOT NULL,
    `patientProfileId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` ENUM('PRESCRIPTION', 'LAB_REPORT', 'IMAGING_REPORT', 'DISCHARGE_SUMMARY', 'DOCTOR_LETTER', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `status` ENUM('ACTIVE', 'ARCHIVED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Document_patientProfileId_idx`(`patientProfileId`),
    INDEX `Document_category_idx`(`category`),
    INDEX `Document_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentVersion` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `fileHash` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileSizeBytes` INTEGER NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `pageCount` INTEGER NOT NULL DEFAULT 1,
    `versionNumber` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DocumentVersion_documentId_idx`(`documentId`),
    INDEX `DocumentVersion_fileHash_idx`(`fileHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentExtraction` (
    `id` VARCHAR(191) NOT NULL,
    `documentVersionId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'EXTRACTED', 'FAILED', 'CONFIRMED') NOT NULL DEFAULT 'PENDING',
    `ocrText` LONGTEXT NULL,
    `confidenceScoresJson` TEXT NULL,
    `rawExtractedJson` LONGTEXT NULL,
    `verifiedJson` LONGTEXT NULL,
    `isConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `confirmedAt` DATETIME(3) NULL,
    `confirmedByAccountId` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DocumentExtraction_documentVersionId_idx`(`documentVersionId`),
    INDEX `DocumentExtraction_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MedicationConcept` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `genericName` VARCHAR(191) NULL,
    `form` ENUM('TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT', 'INHALER', 'DROPS', 'PATCH', 'POWDER', 'OTHER') NOT NULL DEFAULT 'TABLET',
    `defaultStrength` VARCHAR(191) NULL,
    `defaultRoute` VARCHAR(191) NULL,
    `isCustom` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MedicationConcept_code_key`(`code`),
    INDEX `MedicationConcept_name_idx`(`name`),
    INDEX `MedicationConcept_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Prescription` (
    `id` VARCHAR(191) NOT NULL,
    `patientProfileId` VARCHAR(191) NOT NULL,
    `sourceDocumentId` VARCHAR(191) NULL,
    `prescriberName` VARCHAR(191) NULL,
    `clinicName` VARCHAR(191) NULL,
    `prescribedDate` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Prescription_patientProfileId_idx`(`patientProfileId`),
    INDEX `Prescription_prescribedDate_idx`(`prescribedDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrescriptionItem` (
    `id` VARCHAR(191) NOT NULL,
    `prescriptionId` VARCHAR(191) NOT NULL,
    `medicationConceptId` VARCHAR(191) NULL,
    `enteredMedicationName` VARCHAR(191) NOT NULL,
    `form` ENUM('TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT', 'INHALER', 'DROPS', 'PATCH', 'POWDER', 'OTHER') NOT NULL DEFAULT 'TABLET',
    `strength` VARCHAR(191) NULL,
    `originalInstructionText` TEXT NOT NULL,
    `normalizationStatus` VARCHAR(191) NOT NULL DEFAULT 'USER_ENTERED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PrescriptionItem_prescriptionId_idx`(`prescriptionId`),
    INDEX `PrescriptionItem_medicationConceptId_idx`(`medicationConceptId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DosageInstruction` (
    `id` VARCHAR(191) NOT NULL,
    `prescriptionItemId` VARCHAR(191) NOT NULL,
    `doseQuantity` DECIMAL(10, 3) NOT NULL,
    `doseUnit` VARCHAR(191) NOT NULL,
    `route` VARCHAR(191) NULL,
    `frequencyCount` INTEGER NOT NULL DEFAULT 1,
    `frequencyPeriod` ENUM('DAY', 'WEEK', 'MONTH', 'AS_NEEDED') NOT NULL DEFAULT 'DAY',
    `timingDetails` VARCHAR(191) NULL,
    `isPrn` BOOLEAN NOT NULL DEFAULT false,
    `prnReason` VARCHAR(191) NULL,
    `durationDays` INTEGER NULL,
    `maxDailyDose` DECIMAL(10, 3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DosageInstruction_prescriptionItemId_idx`(`prescriptionItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Treatment` (
    `id` VARCHAR(191) NOT NULL,
    `patientProfileId` VARCHAR(191) NOT NULL,
    `prescriptionItemId` VARCHAR(191) NULL,
    `customMedicationName` VARCHAR(191) NULL,
    `status` ENUM('PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'DISCONTINUED') NOT NULL DEFAULT 'ACTIVE',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `stopReason` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Treatment_patientProfileId_idx`(`patientProfileId`),
    INDEX `Treatment_prescriptionItemId_idx`(`prescriptionItemId`),
    INDEX `Treatment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreatmentSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `treatmentId` VARCHAR(191) NOT NULL,
    `intervalDays` INTEGER NOT NULL DEFAULT 1,
    `timesOfDayJson` VARCHAR(191) NOT NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TreatmentSchedule_treatmentId_idx`(`treatmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpectedDose` (
    `id` VARCHAR(191) NOT NULL,
    `treatmentScheduleId` VARCHAR(191) NOT NULL,
    `expectedTimestamp` DATETIME(3) NOT NULL,
    `expectedQuantity` DECIMAL(10, 3) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'OVERDUE', 'LOGGED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExpectedDose_treatmentScheduleId_idx`(`treatmentScheduleId`),
    INDEX `ExpectedDose_expectedTimestamp_idx`(`expectedTimestamp`),
    INDEX `ExpectedDose_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MedicationEvent` (
    `id` VARCHAR(191) NOT NULL,
    `patientProfileId` VARCHAR(191) NOT NULL,
    `treatmentId` VARCHAR(191) NULL,
    `expectedDoseId` VARCHAR(191) NULL,
    `medicationName` VARCHAR(191) NOT NULL,
    `form` ENUM('TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT', 'INHALER', 'DROPS', 'PATCH', 'POWDER', 'OTHER') NOT NULL DEFAULT 'TABLET',
    `quantity` DECIMAL(10, 3) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `action` ENUM('TAKEN', 'ADMINISTERED', 'APPLIED', 'USED', 'SKIPPED', 'PARTIAL', 'OTHER') NOT NULL DEFAULT 'TAKEN',
    `eventTimestamp` DATETIME(3) NOT NULL,
    `isApproximateTime` BOOLEAN NOT NULL DEFAULT false,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `correctionNotes` TEXT NULL,
    `isStandalone` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MedicationEvent_patientProfileId_idx`(`patientProfileId`),
    INDEX `MedicationEvent_treatmentId_idx`(`treatmentId`),
    INDEX `MedicationEvent_expectedDoseId_idx`(`expectedDoseId`),
    INDEX `MedicationEvent_eventTimestamp_idx`(`eventTimestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Symptom` (
    `id` VARCHAR(191) NOT NULL,
    `patientProfileId` VARCHAR(191) NOT NULL,
    `treatmentId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `severity` ENUM('MILD', 'MODERATE', 'SEVERE', 'CRITICAL') NOT NULL DEFAULT 'MILD',
    `startedAt` DATETIME(3) NOT NULL,
    `endedAt` DATETIME(3) NULL,
    `isApproximate` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Symptom_patientProfileId_idx`(`patientProfileId`),
    INDEX `Symptom_treatmentId_idx`(`treatmentId`),
    INDEX `Symptom_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HealthSummary` (
    `id` VARCHAR(191) NOT NULL,
    `patientProfileId` VARCHAR(191) NOT NULL,
    `summaryType` ENUM('PATIENT', 'CLINICIAN') NOT NULL DEFAULT 'PATIENT',
    `title` VARCHAR(191) NOT NULL,
    `contentMarkdown` LONGTEXT NOT NULL,
    `provenanceJson` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HealthSummary_patientProfileId_idx`(`patientProfileId`),
    INDEX `HealthSummary_summaryType_idx`(`summaryType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExportJob` (
    `id` VARCHAR(191) NOT NULL,
    `patientProfileId` VARCHAR(191) NOT NULL,
    `format` ENUM('PDF', 'JSON', 'FHIR_R4') NOT NULL DEFAULT 'PDF',
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `storageKey` VARCHAR(191) NULL,
    `filterScopeJson` TEXT NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    INDEX `ExportJob_patientProfileId_idx`(`patientProfileId`),
    INDEX `ExportJob_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShareGrant` (
    `id` VARCHAR(191) NOT NULL,
    `patientProfileId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `recipientLabel` VARCHAR(191) NOT NULL,
    `allowedCategoriesJson` TEXT NOT NULL,
    `dateStart` DATETIME(3) NULL,
    `dateEnd` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `accessCount` INTEGER NOT NULL DEFAULT 0,
    `lastAccessedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ShareGrant_tokenHash_key`(`tokenHash`),
    INDEX `ShareGrant_patientProfileId_idx`(`patientProfileId`),
    INDEX `ShareGrant_tokenHash_idx`(`tokenHash`),
    INDEX `ShareGrant_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmergencyProfile` (
    `id` VARCHAR(191) NOT NULL,
    `patientProfileId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `emergencyContactsJson` TEXT NOT NULL,
    `selectedAllergiesJson` TEXT NOT NULL,
    `selectedMedicationIdsJson` TEXT NOT NULL,
    `medicalNotes` TEXT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmergencyProfile_patientProfileId_key`(`patientProfileId`),
    UNIQUE INDEX `EmergencyProfile_tokenHash_key`(`tokenHash`),
    INDEX `EmergencyProfile_tokenHash_idx`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `type` ENUM('MEDICATION_REMINDER', 'OCR_COMPLETED', 'EXPORT_READY', 'SECURITY_ALERT', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `linkUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_accountId_idx`(`accountId`),
    INDEX `Notification_isRead_idx`(`isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SecurityConsent` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `consentType` VARCHAR(191) NOT NULL,
    `granted` BOOLEAN NOT NULL DEFAULT true,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SecurityConsent_accountId_idx`(`accountId`),
    INDEX `SecurityConsent_consentType_idx`(`consentType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` VARCHAR(191) NOT NULL,
    `patientProfileId` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `metadataJson` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditEvent_patientProfileId_idx`(`patientProfileId`),
    INDEX `AuditEvent_accountId_idx`(`accountId`),
    INDEX `AuditEvent_action_idx`(`action`),
    INDEX `AuditEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BackgroundJob` (
    `id` VARCHAR(191) NOT NULL,
    `patientProfileId` VARCHAR(191) NULL,
    `jobType` ENUM('OCR_PROCESSING', 'AI_SUMMARY', 'EXPORT_GENERATION', 'NOTIFICATION_DISPATCH', 'DATA_CLEANUP') NOT NULL,
    `payloadJson` LONGTEXT NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `scheduledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lockedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `deduplicationKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BackgroundJob_deduplicationKey_key`(`deduplicationKey`),
    INDEX `BackgroundJob_status_idx`(`status`),
    INDEX `BackgroundJob_jobType_idx`(`jobType`),
    INDEX `BackgroundJob_scheduledAt_idx`(`scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailVerificationToken` ADD CONSTRAINT `EmailVerificationToken_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientProfile` ADD CONSTRAINT `PatientProfile_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_patientProfileId_fkey` FOREIGN KEY (`patientProfileId`) REFERENCES `PatientProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentVersion` ADD CONSTRAINT `DocumentVersion_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentExtraction` ADD CONSTRAINT `DocumentExtraction_documentVersionId_fkey` FOREIGN KEY (`documentVersionId`) REFERENCES `DocumentVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prescription` ADD CONSTRAINT `Prescription_patientProfileId_fkey` FOREIGN KEY (`patientProfileId`) REFERENCES `PatientProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prescription` ADD CONSTRAINT `Prescription_sourceDocumentId_fkey` FOREIGN KEY (`sourceDocumentId`) REFERENCES `Document`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrescriptionItem` ADD CONSTRAINT `PrescriptionItem_prescriptionId_fkey` FOREIGN KEY (`prescriptionId`) REFERENCES `Prescription`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrescriptionItem` ADD CONSTRAINT `PrescriptionItem_medicationConceptId_fkey` FOREIGN KEY (`medicationConceptId`) REFERENCES `MedicationConcept`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DosageInstruction` ADD CONSTRAINT `DosageInstruction_prescriptionItemId_fkey` FOREIGN KEY (`prescriptionItemId`) REFERENCES `PrescriptionItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Treatment` ADD CONSTRAINT `Treatment_patientProfileId_fkey` FOREIGN KEY (`patientProfileId`) REFERENCES `PatientProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Treatment` ADD CONSTRAINT `Treatment_prescriptionItemId_fkey` FOREIGN KEY (`prescriptionItemId`) REFERENCES `PrescriptionItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentSchedule` ADD CONSTRAINT `TreatmentSchedule_treatmentId_fkey` FOREIGN KEY (`treatmentId`) REFERENCES `Treatment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpectedDose` ADD CONSTRAINT `ExpectedDose_treatmentScheduleId_fkey` FOREIGN KEY (`treatmentScheduleId`) REFERENCES `TreatmentSchedule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicationEvent` ADD CONSTRAINT `MedicationEvent_patientProfileId_fkey` FOREIGN KEY (`patientProfileId`) REFERENCES `PatientProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicationEvent` ADD CONSTRAINT `MedicationEvent_treatmentId_fkey` FOREIGN KEY (`treatmentId`) REFERENCES `Treatment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicationEvent` ADD CONSTRAINT `MedicationEvent_expectedDoseId_fkey` FOREIGN KEY (`expectedDoseId`) REFERENCES `ExpectedDose`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Symptom` ADD CONSTRAINT `Symptom_patientProfileId_fkey` FOREIGN KEY (`patientProfileId`) REFERENCES `PatientProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Symptom` ADD CONSTRAINT `Symptom_treatmentId_fkey` FOREIGN KEY (`treatmentId`) REFERENCES `Treatment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HealthSummary` ADD CONSTRAINT `HealthSummary_patientProfileId_fkey` FOREIGN KEY (`patientProfileId`) REFERENCES `PatientProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExportJob` ADD CONSTRAINT `ExportJob_patientProfileId_fkey` FOREIGN KEY (`patientProfileId`) REFERENCES `PatientProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShareGrant` ADD CONSTRAINT `ShareGrant_patientProfileId_fkey` FOREIGN KEY (`patientProfileId`) REFERENCES `PatientProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyProfile` ADD CONSTRAINT `EmergencyProfile_patientProfileId_fkey` FOREIGN KEY (`patientProfileId`) REFERENCES `PatientProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SecurityConsent` ADD CONSTRAINT `SecurityConsent_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_patientProfileId_fkey` FOREIGN KEY (`patientProfileId`) REFERENCES `PatientProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BackgroundJob` ADD CONSTRAINT `BackgroundJob_patientProfileId_fkey` FOREIGN KEY (`patientProfileId`) REFERENCES `PatientProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
