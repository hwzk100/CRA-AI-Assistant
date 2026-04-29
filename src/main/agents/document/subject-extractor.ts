import { invokeGateway, getChunkTokens, getMaxImagesPerCall } from '../gateway/index';
import { parsePdf, splitTextIntoChunks, clearPdfCache } from './pdf-parser';
import { convertPdfToImages } from './pdf-to-image';
import { extractRelevantSections } from './section-locator';
import {
  SUBJECT_SYSTEM_PROMPT,
  SUBJECT_EXTRACTION_PROMPT,
  SUBJECT_EXTRACTION_FROM_IMAGE_PROMPT,
} from './prompts/subject-prompts';
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  CLASSIFICATION_PROMPT,
  parseCategoryResponse,
} from './prompts/classification-prompts';
import type { DocumentCategory } from './prompts/classification-prompts';
import {
  MEDICAL_RECORD_SYSTEM_PROMPT,
  MEDICAL_RECORD_EXTRACTION_PROMPT,
} from './prompts/subject-prompts-medical';
import {
  LAB_REPORT_SYSTEM_PROMPT,
  LAB_REPORT_EXTRACTION_PROMPT,
} from './prompts/subject-prompts-lab';
import {
  DRUG_INVENTORY_SYSTEM_PROMPT,
  DRUG_INVENTORY_EXTRACTION_PROMPT,
} from './prompts/subject-prompts-drug';
import type { SubjectData, SubjectDemographics, VitalSign, MedicalHistory, MedicationRecord } from '../../../shared/types/subject';
import { readFileAsBase64 } from '../../utils/file-validator';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SubjectExtractor');

// Re-export DocumentCategory for consumers
export type { DocumentCategory };

/** Result type that includes classification info */
export interface SubjectExtractionResult {
  subjectData: SubjectData;
  documentCategory?: DocumentCategory;
}

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

// ============================================================================
// Classification helpers
// ============================================================================

/** Classify a single image via AI vision model */
async function classifyImage(base64: string, mimeType: string): Promise<DocumentCategory> {
  const response = await invokeGateway({
    prompt: CLASSIFICATION_PROMPT,
    systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
    contentType: 'image',
    imageBase64: base64,
    imageMimeType: mimeType,
    maxTokens: 20,
    temperature: 0,
  });
  return parseCategoryResponse(response.content);
}

/** Get extraction prompts for a given category */
function getPromptForCategory(category: DocumentCategory): { systemPrompt: string; extractionPrompt: string } {
  switch (category) {
    case 'medical-record':
      return { systemPrompt: MEDICAL_RECORD_SYSTEM_PROMPT, extractionPrompt: MEDICAL_RECORD_EXTRACTION_PROMPT };
    case 'lab-report':
      return { systemPrompt: LAB_REPORT_SYSTEM_PROMPT, extractionPrompt: LAB_REPORT_EXTRACTION_PROMPT };
    case 'drug-inventory':
      return { systemPrompt: DRUG_INVENTORY_SYSTEM_PROMPT, extractionPrompt: DRUG_INVENTORY_EXTRACTION_PROMPT };
    default:
      return { systemPrompt: SUBJECT_SYSTEM_PROMPT, extractionPrompt: SUBJECT_EXTRACTION_FROM_IMAGE_PROMPT };
  }
}

/** Determine the dominant category from a list of per-page categories */
function getDominantCategory(categories: DocumentCategory[]): DocumentCategory {
  const counts = new Map<DocumentCategory, number>();
  for (const cat of categories) {
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  let dominant: DocumentCategory = 'other';
  let maxCount = 0;
  for (const [cat, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      dominant = cat;
    }
  }
  return dominant;
}

// ============================================================================
// Public extraction functions
// ============================================================================

export async function extractSubjectFromTextPdf(
  filePath: string,
  onProgress?: (progress: number, message: string) => void
): Promise<SubjectExtractionResult> {
  const parseResult = await parsePdf(filePath);
  const chunkTokens = getChunkTokens();

  logger.info(`Using chunk size ${chunkTokens} tokens for subject extraction`);
  onProgress?.(10, '正在分析文档结构...');

  // Try section-based extraction first
  const sectionResult = extractRelevantSections(parseResult.text, [
    'demographics', 'medications',
  ]);

  let chunks: string[];

  if (sectionResult.success) {
    logger.info(`Section-based extraction: found ${sectionResult.sections.length} sections, ${sectionResult.totalLength} chars`);
    onProgress?.(15, `已定位 ${sectionResult.sections.length} 个相关章节，开始AI提取...`);

    chunks = splitTextIntoChunks(sectionResult.combinedText, chunkTokens, Math.floor(chunkTokens * 0.1));
  } else {
    logger.info(`Section detection failed (${sectionResult.fallbackReason}), falling back to chunking`);
    chunks = splitTextIntoChunks(parseResult.text, chunkTokens, Math.floor(chunkTokens * 0.1));

    logger.info(`Processing ${chunks.length} chunks for subject data extraction`);
    onProgress?.(10, 'PDF文本已解析，开始分批提取受试者数据...');
  }

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
  return { subjectData: mergeSubjectData(results) };
}

export async function extractSubjectFromScannedPdf(
  filePath: string,
  onProgress?: (progress: number, message: string) => void
): Promise<SubjectExtractionResult> {
  const images = await convertPdfToImages(filePath);
  const maxImages = getMaxImagesPerCall();

  logger.info(`Converted ${images.length} pages to images, batching with max ${maxImages} per call`);

  // Phase 1: Classify each page
  onProgress?.(10, `正在分类 ${images.length} 页文档...`);

  const pageCategories: DocumentCategory[] = [];
  for (let i = 0; i < images.length; i++) {
    const progress = 10 + Math.floor((i / images.length) * 20);
    onProgress?.(progress, `正在分类第 ${i + 1}/${images.length} 页...`);

    const category = await classifyImage(images[i].base64, images[i].mimeType);
    pageCategories.push(category);
    logger.info(`Page ${i + 1} classified as: ${category}`);
  }

  // Group pages by category for batched extraction
  const categoryGroups = new Map<DocumentCategory, number[]>();
  pageCategories.forEach((cat, idx) => {
    if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
    categoryGroups.get(cat)!.push(idx);
  });

  logger.info('Page classification summary:', Object.fromEntries(
    Array.from(categoryGroups.entries()).map(([cat, pages]) => [cat, pages.length])
  ));

  // Phase 2: Extract using category-specific prompts
  const results: SubjectData[] = [];
  let processedGroups = 0;

  for (const [category, pageIndices] of categoryGroups) {
    processedGroups++;
    const groupProgress = 30 + Math.floor((processedGroups / categoryGroups.size) * 60);

    const { systemPrompt, extractionPrompt } = getPromptForCategory(category);
    const groupImages = pageIndices.map(idx => images[idx]);

    // Batch within the group
    const totalBatches = Math.ceil(groupImages.length / maxImages);

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const start = batchIdx * maxImages;
      const batch = groupImages.slice(start, start + maxImages);
      const batchProgress = groupProgress + Math.floor((batchIdx / totalBatches) * (60 / categoryGroups.size));
      onProgress?.(
        batchProgress,
        `正在提取${category === 'medical-record' ? '病历' : category === 'lab-report' ? '化验单' : category === 'drug-inventory' ? '药物表' : '其他'}数据 (${start + 1}-${Math.min(start + maxImages, groupImages.length)}/${groupImages.length} 页)...`
      );

      const response = await invokeGateway({
        prompt: extractionPrompt,
        systemPrompt,
        contentType: 'image',
        images: batch.map(img => ({ base64: img.base64, mimeType: img.mimeType })),
      });

      results.push(parseSubjectJson(response.content));
    }
  }

  const dominantCategory = getDominantCategory(pageCategories);
  onProgress?.(90, '受试者数据合并完成');
  return {
    subjectData: mergeSubjectData(results),
    documentCategory: dominantCategory,
  };
}

export async function extractSubjectFromImage(
  filePath: string,
  mimeType: string,
  onProgress?: (progress: number, message: string) => void
): Promise<SubjectExtractionResult> {
  const base64 = readFileAsBase64(filePath);

  // Phase 1: Classify
  onProgress?.(10, '正在分类文档...');
  const category = await classifyImage(base64, mimeType);
  logger.info(`Image classified as: ${category}`);

  // Phase 2: Extract with category-specific prompt
  const { systemPrompt, extractionPrompt } = getPromptForCategory(category);
  const categoryLabel = category === 'medical-record' ? '病历' : category === 'lab-report' ? '化验单' : category === 'drug-inventory' ? '药物表' : '通用';

  onProgress?.(20, `正在提取${categoryLabel}数据...`);

  const response = await invokeGateway({
    prompt: extractionPrompt,
    systemPrompt,
    contentType: 'image',
    imageBase64: base64,
    imageMimeType: mimeType,
  });

  onProgress?.(90, '识别完成');
  return {
    subjectData: parseSubjectJson(response.content),
    documentCategory: category,
  };
}
