import { invokeGateway, getChunkTokens, getMaxImagesPerCall } from '../gateway/index';
import { parsePdf, splitTextIntoChunks, clearPdfCache } from './pdf-parser';
import { convertPdfToImages } from './pdf-to-image';
import {
  SUBJECT_SYSTEM_PROMPT,
  SUBJECT_EXTRACTION_PROMPT,
  SUBJECT_EXTRACTION_FROM_IMAGE_PROMPT,
} from './prompts/subject-prompts';
import type { SubjectData, SubjectDemographics, VitalSign, MedicalHistory, MedicationRecord } from '../../../shared/types/subject';
import { readFileAsBase64 } from '../../utils/file-validator';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SubjectExtractor');

function parseSubjectJson(text: string): SubjectData {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.error('No JSON found in subject response');
    return createEmptySubjectData();
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      demographics: parsed.demographics || createEmptyDemographics(),
      vitalSigns: parsed.vitalSigns || [],
      medicalHistory: parsed.medicalHistory || [],
      medications: parsed.medications || [],
    };
  } catch (e) {
    logger.error('Failed to parse subject JSON', { error: String(e) });
    return createEmptySubjectData();
  }
}

function createEmptyDemographics(): SubjectDemographics {
  return { subjectId: '', initials: '', age: 0, gender: '' };
}

function createEmptySubjectData(): SubjectData {
  return {
    demographics: createEmptyDemographics(),
    vitalSigns: [],
    medicalHistory: [],
    medications: [],
  };
}

function mergeSubjectData(results: SubjectData[]): SubjectData {
  if (results.length === 0) return createEmptySubjectData();
  if (results.length === 1) return results[0];

  // Merge: take the first non-empty value for demographics
  const merged: SubjectData = {
    demographics: results[0].demographics,
    vitalSigns: [],
    medicalHistory: [],
    medications: [],
  };

  for (const result of results) {
    // Fill missing demographics from other chunks
    if (!merged.demographics.subjectId && result.demographics.subjectId) {
      merged.demographics.subjectId = result.demographics.subjectId;
    }
    if (!merged.demographics.initials && result.demographics.initials) {
      merged.demographics.initials = result.demographics.initials;
    }
    if (!merged.demographics.age && result.demographics.age) {
      merged.demographics.age = result.demographics.age;
    }
    if (!merged.demographics.gender && result.demographics.gender) {
      merged.demographics.gender = result.demographics.gender;
    }

    merged.vitalSigns.push(...result.vitalSigns);
    merged.medicalHistory.push(...result.medicalHistory);
    merged.medications.push(...result.medications);
  }

  // Deduplicate
  merged.vitalSigns = deduplicateByString(merged.vitalSigns, (v) => `${v.type}-${v.value}`);
  merged.medicalHistory = deduplicateByString(merged.medicalHistory, (h) => h.condition.toLowerCase());
  merged.medications = deduplicateByString(merged.medications, (m) => m.medicationName.toLowerCase());

  return merged;
}

function deduplicateByString<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function extractSubjectFromTextPdf(
  filePath: string,
  onProgress?: (progress: number, message: string) => void
): Promise<SubjectData> {
  const parseResult = await parsePdf(filePath);
  const chunkTokens = getChunkTokens();
  const chunks = splitTextIntoChunks(parseResult.text, chunkTokens, Math.floor(chunkTokens * 0.1));

  logger.info(`Using chunk size ${chunkTokens} tokens for subject extraction`);

  logger.info(`Processing ${chunks.length} chunks for subject data extraction`);
  onProgress?.(10, 'PDF文本已解析，开始分批提取受试者数据...');

  const results: SubjectData[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const progress = 10 + Math.floor((i / chunks.length) * 80);
    onProgress?.(progress, `正在处理第 ${i + 1}/${chunks.length} 批...`);

    const response = await invokeGateway({
      prompt: SUBJECT_EXTRACTION_PROMPT.replace('{text}', chunks[i]),
      systemPrompt: SUBJECT_SYSTEM_PROMPT,
      contentType: 'text',
    });

    results.push(parseSubjectJson(response.content));
  }

  onProgress?.(90, '受试者数据合并完成');
  clearPdfCache(filePath);
  return mergeSubjectData(results);
}

export async function extractSubjectFromScannedPdf(
  filePath: string,
  onProgress?: (progress: number, message: string) => void
): Promise<SubjectData> {
  const images = await convertPdfToImages(filePath);
  const maxImages = getMaxImagesPerCall();

  logger.info(`Converted ${images.length} pages to images, batching with max ${maxImages} per call`);

  onProgress?.(10, `已转换${images.length}页为图片，开始AI识别受试者数据...`);

  const results: SubjectData[] = [];
  const totalBatches = Math.ceil(images.length / maxImages);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * maxImages;
    const batch = images.slice(start, start + maxImages);
    const progress = 10 + Math.floor((batchIdx / totalBatches) * 80);
    const batchEnd = Math.min(start + maxImages, images.length);
    onProgress?.(progress, `正在识别第 ${start + 1}-${batchEnd}/${images.length} 页...`);

    const response = await invokeGateway({
      prompt: SUBJECT_EXTRACTION_FROM_IMAGE_PROMPT,
      systemPrompt: SUBJECT_SYSTEM_PROMPT,
      contentType: 'image',
      images: batch.map(img => ({ base64: img.base64, mimeType: img.mimeType })),
    });

    results.push(parseSubjectJson(response.content));
  }

  onProgress?.(90, '受试者数据合并完成');
  return mergeSubjectData(results);
}

export async function extractSubjectFromImage(
  filePath: string,
  mimeType: string,
  onProgress?: (progress: number, message: string) => void
): Promise<SubjectData> {
  const base64 = readFileAsBase64(filePath);

  onProgress?.(20, '正在识别受试者图片数据...');

  const response = await invokeGateway({
    prompt: SUBJECT_EXTRACTION_FROM_IMAGE_PROMPT,
    systemPrompt: SUBJECT_SYSTEM_PROMPT,
    contentType: 'image',
    imageBase64: base64,
    imageMimeType: mimeType,
  });

  onProgress?.(90, '识别完成');
  return parseSubjectJson(response.content);
}
