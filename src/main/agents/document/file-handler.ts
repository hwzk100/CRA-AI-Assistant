import * as path from 'path';
import * as fs from 'fs';
import { createLogger } from '../../utils/logger';
import { parsePdf } from './pdf-parser';

const logger = createLogger('FileHandler');

export type DetectedFileType = 'text-pdf' | 'scanned-pdf' | 'image';

export interface FileDetectionResult {
  fileType: DetectedFileType;
  mimeType: string;
  text?: string;
  pageCount?: number;
}

export async function detectFileType(filePath: string): Promise<FileDetectionResult> {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = getMimeType(ext);

  if (mimeType.startsWith('image/')) {
    return {
      fileType: 'image',
      mimeType,
    };
  }

  if (ext === '.pdf') {
    const result = await parsePdf(filePath);
    return {
      fileType: result.isTextBased ? 'text-pdf' : 'scanned-pdf',
      mimeType,
      text: result.text,
      pageCount: result.pageCount,
    };
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

function getMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return mimeMap[ext] || 'application/octet-stream';
}
