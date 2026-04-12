import * as path from 'path';
import * as fs from 'fs';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  fileSize?: number;
}

function detectMimeFromPath(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return mimeMap[ext] || null;
}

export function validateFilePath(filePath: string): FileValidationResult {
  // Normalize and check for path traversal
  const normalized = path.normalize(filePath);

  if (normalized.includes('..')) {
    return { valid: false, error: 'Path traversal detected' };
  }

  // Check file exists
  if (!fs.existsSync(normalized)) {
    return { valid: false, error: 'File does not exist' };
  }

  // Check MIME type
  const mimeType = detectMimeFromPath(normalized);
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, error: `Unsupported file type: ${mimeType || 'unknown'}` };
  }

  // Check file size
  const stats = fs.statSync(normalized);
  if (stats.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large: ${(stats.size / 1024 / 1024).toFixed(1)}MB (max 100MB)` };
  }

  if (stats.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  return {
    valid: true,
    mimeType,
    fileSize: stats.size,
  };
}

export function readFileAsBase64(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
}

export function readFileBuffer(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}
