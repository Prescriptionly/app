import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../../config/env';
import { ValidationError, NotFoundError } from '../../shared/errors/app-error';

export interface StoredFileMetadata {
  storageKey: string;
  fileHash: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

export class LocalDiskStorage {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  validateFile(file: Express.Multer.File): void {
    if (!file || !file.buffer) {
      throw new ValidationError('No file data provided');
    }

    if (file.size > env.MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(`File size exceeds limit of ${Math.round(env.MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB`);
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new ValidationError(`Unsupported file type: ${file.mimetype}. Allowed types: PDF, JPEG, PNG, WEBP`);
    }
  }

  async saveFile(file: Express.Multer.File): Promise<StoredFileMetadata> {
    this.validateFile(file);

    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const ext = path.extname(file.originalname).toLowerCase() || this.getExtensionFromMime(file.mimetype);
    const storageKey = `${fileHash}${ext}`;
    const filePath = path.join(this.baseDir, storageKey);

    if (!fs.existsSync(filePath)) {
      await fs.promises.writeFile(filePath, file.buffer);
    }

    return {
      storageKey,
      fileHash,
      fileName: file.originalname,
      fileSizeBytes: file.size,
      mimeType: file.mimetype,
    };
  }

  async saveBuffer(buffer: Buffer, fileName: string, mimeType: string): Promise<StoredFileMetadata> {
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const ext = path.extname(fileName).toLowerCase() || this.getExtensionFromMime(mimeType);
    const storageKey = `${fileHash}${ext}`;
    const filePath = path.join(this.baseDir, storageKey);

    if (!fs.existsSync(filePath)) {
      await fs.promises.writeFile(filePath, buffer);
    }

    return {
      storageKey,
      fileHash,
      fileName,
      fileSizeBytes: buffer.length,
      mimeType,
    };
  }

  getFilePath(storageKey: string): string {
    const safeKey = path.basename(storageKey);
    const filePath = path.join(this.baseDir, safeKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Stored document file not found on disk');
    }
    return filePath;
  }

  async getFileBuffer(storageKey: string): Promise<Buffer> {
    const filePath = this.getFilePath(storageKey);
    return fs.promises.readFile(filePath);
  }

  private getExtensionFromMime(mimeType: string): string {
    switch (mimeType) {
      case 'application/pdf':
        return '.pdf';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/jpeg':
      default:
        return '.jpg';
    }
  }
}

export const storage = new LocalDiskStorage();
