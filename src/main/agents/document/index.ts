import { detectFileType, type DetectedFileType } from './file-handler';
import { extractCriteriaFromTextPdf, extractCriteriaFromScannedPdf, extractCriteriaFromImage } from './criteria-extractor';
import { extractSubjectFromTextPdf, extractSubjectFromScannedPdf, extractSubjectFromImage } from './subject-extractor';
import type { ProtocolData } from '../../../shared/types/protocol';
import type { SubjectData } from '../../../shared/types/subject';
import type { FileUploadResult } from '../../../shared/types/ipc';
import { validateFilePath } from '../../utils/file-validator';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DocumentAgent');

export async function processFileUpload(
  filePath: string,
  fileType: 'protocol' | 'subject',
  onProgress?: (progress: number, message: string) => void
): Promise<FileUploadResult> {
  // Validate file
  const validation = validateFilePath(filePath);
  if (!validation.valid) {
    return {
      success: false,
      filePath,
      fileName: '',
      fileType: 'text-pdf',
      message: validation.error,
    };
  }

  // Detect file type
  onProgress?.(5, '正在检测文件类型...');
  const detection = await detectFileType(filePath);

  logger.info(`File detected as: ${detection.fileType}`, {
    filePath,
    mimeType: detection.mimeType,
  });

  return {
    success: true,
    filePath,
    fileName: filePath.split(/[\\/]/).pop() || '',
    fileType: detection.fileType,
    message: `文件已识别为${detection.fileType === 'text-pdf' ? '文本PDF' : detection.fileType === 'scanned-pdf' ? '扫描PDF' : '图片'}`,
  };
}

export async function extractCriteria(
  filePath: string,
  detectedFileType: DetectedFileType,
  mimeType: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ProtocolData> {
  onProgress?.(0, '开始提取入排标准...');

  switch (detectedFileType) {
    case 'text-pdf':
      return extractCriteriaFromTextPdf(filePath, onProgress);
    case 'scanned-pdf':
      return extractCriteriaFromScannedPdf(filePath, onProgress);
    case 'image':
      return extractCriteriaFromImage(filePath, mimeType, onProgress);
    default:
      throw new Error(`Unsupported file type: ${detectedFileType}`);
  }
}

export async function extractSubjectData(
  filePath: string,
  detectedFileType: DetectedFileType,
  mimeType: string,
  onProgress?: (progress: number, message: string) => void
): Promise<SubjectData> {
  onProgress?.(0, '开始提取受试者数据...');

  switch (detectedFileType) {
    case 'text-pdf':
      return extractSubjectFromTextPdf(filePath, onProgress);
    case 'scanned-pdf':
      return extractSubjectFromScannedPdf(filePath, onProgress);
    case 'image':
      return extractSubjectFromImage(filePath, mimeType, onProgress);
    default:
      throw new Error(`Unsupported file type: ${detectedFileType}`);
  }
}
