import { invokeGateway, getChunkTokens, getMaxImagesPerCall } from '../gateway/index';
import { parsePdf, splitTextIntoChunks, clearPdfCache } from './pdf-parser';
import { convertPdfToImages } from './pdf-to-image';
import {
  CRITERIA_SYSTEM_PROMPT,
  CRITERIA_EXTRACTION_PROMPT,
  CRITERIA_EXTRACTION_FROM_IMAGE_PROMPT,
  VISIT_SCHEDULE_SYSTEM_PROMPT,
  VISIT_SCHEDULE_PROMPT,
} from './prompts/criteria-prompts';
import type { Criterion, VisitSchedule, ProtocolData } from '../../../shared/types/protocol';
import { readFileAsBase64 } from '../../utils/file-validator';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CriteriaExtractor');

// Keywords for pre-filtering relevant chunks
const CRITERIA_KEYWORDS = [
  '纳入标准', '排除标准', '入选标准', '入排标准',
  '纳入条件', '排除条件', '入选条件',
  'inclusion', 'exclusion', 'criteria',
];

const VISIT_KEYWORDS = [
  '访视', '随访', '访视计划', '访视流程',
  '时间窗', '检查项目', '筛选期', '治疗期',
  'visit', 'schedule', '流程表', '试验流程',
];

/**
 * Filter chunks that contain relevant keywords, with a context window
 * to catch content that spans chunk boundaries.
 */
function filterRelevantChunks(
  chunks: string[],
  keywords: string[],
  contextWindow: number = 1
): { filtered: string[]; indices: number[] } {
  const relevantIndices = new Set<number>();

  for (let i = 0; i < chunks.length; i++) {
    const lower = chunks[i].toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        for (
          let j = Math.max(0, i - contextWindow);
          j <= Math.min(chunks.length - 1, i + contextWindow);
          j++
        ) {
          relevantIndices.add(j);
        }
        break;
      }
    }
  }

  if (relevantIndices.size === 0) {
    // Fallback: no keywords found, return all chunks
    return { filtered: chunks, indices: chunks.map((_, i) => i) };
  }

  const sorted = Array.from(relevantIndices).sort((a, b) => a - b);
  const filtered = sorted.map((i) => chunks[i]);
  return { filtered, indices: sorted };
}

function generateId(): string {
  return `criterion_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseCriteriaJson(text: string): { inclusionCriteria: Array<{ index: number; content: string }>; exclusionCriteria: Array<{ index: number; content: string }> } {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.error('No JSON found in criteria response');
    return { inclusionCriteria: [], exclusionCriteria: [] };
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    logger.error('Failed to parse criteria JSON', { error: String(e) });
    return { inclusionCriteria: [], exclusionCriteria: [] };
  }
}

function parseVisitScheduleJson(text: string): { visitSchedules: Array<{ visitName: string; timing: string; visitWindow: string; procedures: string[] }> } {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.error('No JSON found in visit schedule response');
    return { visitSchedules: [] };
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    logger.error('Failed to parse visit schedule JSON', { error: String(e) });
    return { visitSchedules: [] };
  }
}

export async function extractCriteriaFromTextPdf(
  filePath: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ProtocolData> {
  const parseResult = await parsePdf(filePath);
  const chunkTokens = getChunkTokens();
  const chunks = splitTextIntoChunks(parseResult.text, chunkTokens, Math.floor(chunkTokens * 0.1));

  logger.info(`Using chunk size ${chunkTokens} tokens for text model`);

  logger.info(`Total chunks: ${chunks.length}, filtering for relevant content...`);
  onProgress?.(10, `PDF文本已解析（${chunks.length} 个分块），正在筛选相关内容...`);

  // Pre-filter: only process chunks likely containing criteria or visit schedules
  const { filtered: criteriaChunks } = filterRelevantChunks(chunks, [...CRITERIA_KEYWORDS, ...VISIT_KEYWORDS]);

  logger.info(`Filtered to ${criteriaChunks.length} relevant chunks (from ${chunks.length} total)`);
  onProgress?.(15, `筛选出 ${criteriaChunks.length} 个相关分块，开始AI提取...`);

  let allInclusion: Array<{ index: number; content: string }> = [];
  let allExclusion: Array<{ index: number; content: string }> = [];
  let allVisits: Array<{ visitName: string; timing: string; visitWindow: string; procedures: string[] }> = [];

  for (let i = 0; i < criteriaChunks.length; i++) {
    const chunk = criteriaChunks[i];
    const progress = 15 + Math.floor((i / criteriaChunks.length) * 70);
    onProgress?.(progress, `正在处理第 ${i + 1}/${criteriaChunks.length} 批...`);

    // Extract criteria from this chunk
    const criteriaResponse = await invokeGateway({
      prompt: CRITERIA_EXTRACTION_PROMPT.replace('{text}', chunk),
      systemPrompt: CRITERIA_SYSTEM_PROMPT,
      contentType: 'text',
    });

    const criteriaJson = parseCriteriaJson(criteriaResponse.content);
    allInclusion.push(...criteriaJson.inclusionCriteria);
    allExclusion.push(...criteriaJson.exclusionCriteria);

    // Extract visit schedules from this chunk
    const visitResponse = await invokeGateway({
      prompt: VISIT_SCHEDULE_PROMPT.replace('{text}', chunk),
      systemPrompt: VISIT_SCHEDULE_SYSTEM_PROMPT,
      contentType: 'text',
    });

    const visitJson = parseVisitScheduleJson(visitResponse.content);
    allVisits.push(...visitJson.visitSchedules);
  }

  // If criteria pre-filter found nothing, also check visit-only keywords on remaining chunks
  if (allVisits.length === 0) {
    const { filtered: visitChunks } = filterRelevantChunks(chunks, VISIT_KEYWORDS);
    const unprocessedChunks = visitChunks.filter(
      (vc) => !criteriaChunks.includes(vc)
    );

    for (const chunk of unprocessedChunks) {
      const visitResponse = await invokeGateway({
        prompt: VISIT_SCHEDULE_PROMPT.replace('{text}', chunk),
        systemPrompt: VISIT_SCHEDULE_SYSTEM_PROMPT,
        contentType: 'text',
      });

      const visitJson = parseVisitScheduleJson(visitResponse.content);
      allVisits.push(...visitJson.visitSchedules);
    }
  }

  // Deduplicate criteria (similarity check by content equality)
  allInclusion = deduplicateCriteria(allInclusion);
  allExclusion = deduplicateCriteria(allExclusion);
  allVisits = deduplicateVisits(allVisits);

  onProgress?.(90, '数据合并完成');

  // Build criteria objects
  const criteria: Criterion[] = [
    ...allInclusion.map((c, i) => ({
      id: generateId(),
      category: 'inclusion' as const,
      index: c.index || i + 1,
      content: c.content,
    })),
    ...allExclusion.map((c, i) => ({
      id: generateId(),
      category: 'exclusion' as const,
      index: c.index || i + 1,
      content: c.content,
    })),
  ];

  const visitSchedules: VisitSchedule[] = allVisits.map((v) => ({
    id: `visit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    visitName: v.visitName,
    visitWindow: v.visitWindow,
    procedures: v.procedures,
    timing: v.timing,
  }));

  clearPdfCache(filePath);
  return { criteria, visitSchedules };
}

export async function extractCriteriaFromScannedPdf(
  filePath: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ProtocolData> {
  const images = await convertPdfToImages(filePath);
  const maxImages = getMaxImagesPerCall();

  logger.info(`Converted ${images.length} pages to images, batching with max ${maxImages} per call`);

  onProgress?.(10, `已转换${images.length}页为图片，开始AI识别...`);

  let allInclusion: Array<{ index: number; content: string }> = [];
  let allExclusion: Array<{ index: number; content: string }> = [];
  let allVisits: Array<{ visitName: string; timing: string; visitWindow: string; procedures: string[] }> = [];

  const totalBatches = Math.ceil(images.length / maxImages);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * maxImages;
    const batch = images.slice(start, start + maxImages);
    const progress = 10 + Math.floor((batchIdx / totalBatches) * 70);
    const batchEnd = Math.min(start + maxImages, images.length);
    onProgress?.(progress, `正在识别第 ${start + 1}-${batchEnd}/${images.length} 页...`);

    const criteriaResponse = await invokeGateway({
      prompt: CRITERIA_EXTRACTION_FROM_IMAGE_PROMPT,
      systemPrompt: CRITERIA_SYSTEM_PROMPT,
      contentType: 'image',
      images: batch.map(img => ({ base64: img.base64, mimeType: img.mimeType })),
    });

    const criteriaJson = parseCriteriaJson(criteriaResponse.content);
    allInclusion.push(...criteriaJson.inclusionCriteria);
    allExclusion.push(...criteriaJson.exclusionCriteria);
  }

  allInclusion = deduplicateCriteria(allInclusion);
  allExclusion = deduplicateCriteria(allExclusion);

  onProgress?.(90, '数据合并完成');

  const criteria: Criterion[] = [
    ...allInclusion.map((c, i) => ({
      id: generateId(),
      category: 'inclusion' as const,
      index: c.index || i + 1,
      content: c.content,
    })),
    ...allExclusion.map((c, i) => ({
      id: generateId(),
      category: 'exclusion' as const,
      index: c.index || i + 1,
      content: c.content,
    })),
  ];

  return { criteria, visitSchedules: [] };
}

export async function extractCriteriaFromImage(
  filePath: string,
  mimeType: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ProtocolData> {
  const base64 = readFileAsBase64(filePath);

  onProgress?.(20, '正在识别图片...');

  const response = await invokeGateway({
    prompt: CRITERIA_EXTRACTION_FROM_IMAGE_PROMPT,
    systemPrompt: CRITERIA_SYSTEM_PROMPT,
    contentType: 'image',
    imageBase64: base64,
    imageMimeType: mimeType,
  });

  const criteriaJson = parseCriteriaJson(response.content);

  onProgress?.(90, '识别完成');

  const criteria: Criterion[] = [
    ...criteriaJson.inclusionCriteria.map((c, i) => ({
      id: generateId(),
      category: 'inclusion' as const,
      index: c.index || i + 1,
      content: c.content,
    })),
    ...criteriaJson.exclusionCriteria.map((c, i) => ({
      id: generateId(),
      category: 'exclusion' as const,
      index: c.index || i + 1,
      content: c.content,
    })),
  ];

  return { criteria, visitSchedules: [] };
}

function deduplicateCriteria(criteria: Array<{ index: number; content: string }>): Array<{ index: number; content: string }> {
  const seen = new Set<string>();
  return criteria.filter((c) => {
    // Simple dedup by normalized content
    const key = c.content.trim().toLowerCase().slice(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateVisits(visits: Array<{ visitName: string; timing: string; visitWindow: string; procedures: string[] }>): Array<{ visitName: string; timing: string; visitWindow: string; procedures: string[] }> {
  const seen = new Set<string>();
  return visits.filter((v) => {
    const key = v.visitName.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
