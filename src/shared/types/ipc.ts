export type DocumentCategory = 'medical-record' | 'lab-report' | 'drug-inventory' | 'other';

export interface ProcessingProgress {
  stage: 'uploading' | 'parsing' | 'classifying' | 'extracting' | 'verifying' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

export interface FileUploadResult {
  success: boolean;
  filePath: string;
  fileName: string;
  fileType: 'text-pdf' | 'scanned-pdf' | 'image';
  message?: string;
}
