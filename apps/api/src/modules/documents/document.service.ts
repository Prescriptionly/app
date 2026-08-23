import { prisma } from '../../infrastructure/database/prisma';
import { storage, StoredFileMetadata } from '../../infrastructure/storage/local-disk-storage';
import { patientService } from '../patients/patient.service';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { Document, DocumentCategory, DocumentStatus } from '@prisma/client';

export class DocumentService {
  async getDocuments(
    patientProfileId: string,
    accountId: string,
    filters?: {
      category?: DocumentCategory;
      status?: DocumentStatus;
      search?: string;
    }
  ): Promise<Document[]> {
    await patientService.getProfileById(patientProfileId, accountId);

    const whereClause: Record<string, unknown> = {
      patientProfileId,
      deletedAt: null,
    };

    if (filters?.category) {
      whereClause.category = filters.category;
    }

    if (filters?.status) {
      whereClause.status = filters.status;
    } else {
      whereClause.status = 'ACTIVE';
    }

    if (filters?.search) {
      whereClause.title = { contains: filters.search.trim() };
    }

    return prisma.document.findMany({
      where: whereClause,
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            extractions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocumentById(documentId: string, accountId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        patientProfile: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            extractions: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        prescriptions: {
          include: {
            items: {
              include: {
                dosageInstructions: true,
                medicationConcept: true,
              },
            },
          },
        },
      },
    });

    if (!document || document.deletedAt) {
      throw new NotFoundError('Document not found');
    }

    if (document.patientProfile.accountId !== accountId) {
      throw new ForbiddenError('You do not have access to this document');
    }

    return document;
  }

  async uploadDocument(
    patientProfileId: string,
    accountId: string,
    file: Express.Multer.File,
    data: {
      title?: string;
      category?: DocumentCategory;
      notes?: string | null;
    }
  ) {
    await patientService.getProfileById(patientProfileId, accountId);

    const storedFile: StoredFileMetadata = await storage.saveFile(file);
    const title = data.title?.trim() || file.originalname.replace(/\.[^/.]+$/, '');
    const category = data.category || 'OTHER';

    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          patientProfileId,
          title,
          category,
          notes: data.notes?.trim() || null,
        },
      });

      const version = await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          storageKey: storedFile.storageKey,
          fileHash: storedFile.fileHash,
          fileName: storedFile.fileName,
          fileSizeBytes: storedFile.fileSizeBytes,
          mimeType: storedFile.mimeType,
          versionNumber: 1,
        },
      });

      // Initialize pending extraction draft
      const extraction = await tx.documentExtraction.create({
        data: {
          documentVersionId: version.id,
          status: 'PENDING',
        },
      });

      // Enqueue background processing job
      await tx.backgroundJob.create({
        data: {
          patientProfileId,
          jobType: 'OCR_PROCESSING',
          payloadJson: JSON.stringify({
            documentId: doc.id,
            documentVersionId: version.id,
            extractionId: extraction.id,
            storageKey: storedFile.storageKey,
            mimeType: storedFile.mimeType,
          }),
          deduplicationKey: `ocr_${version.id}`,
        },
      });

      await tx.auditEvent.create({
        data: {
          accountId,
          patientProfileId,
          action: 'DOCUMENT_UPLOADED',
          entityType: 'Document',
          entityId: doc.id,
          metadataJson: JSON.stringify({
            fileName: storedFile.fileName,
            fileSize: storedFile.fileSizeBytes,
            category,
          }),
        },
      });

      return {
        ...doc,
        version,
        extraction,
      };
    });

    return document;
  }

  async getDownloadStream(versionId: string, accountId: string) {
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: {
        document: {
          include: { patientProfile: true },
        },
      },
    });

    if (!version || version.document.deletedAt) {
      throw new NotFoundError('Document version not found');
    }

    if (version.document.patientProfile.accountId !== accountId) {
      throw new ForbiddenError('Access denied');
    }

    const filePath = storage.getFilePath(version.storageKey);
    return {
      filePath,
      fileName: version.fileName,
      mimeType: version.mimeType,
      fileSizeBytes: version.fileSizeBytes,
    };
  }

  async archiveDocument(documentId: string, accountId: string) {
    await this.getDocumentById(documentId, accountId);
    return prisma.document.update({
      where: { id: documentId },
      data: { status: 'ARCHIVED' },
    });
  }

  async deleteDocument(documentId: string, accountId: string) {
    await this.getDocumentById(documentId, accountId);
    return prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date(), status: 'DELETED' },
    });
  }
}

export const documentService = new DocumentService();
