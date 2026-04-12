import { invokeGateway } from '../gateway/index';
import { parsePdf, splitTextIntoChunks } from './pdf-parser';
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
  const chunks = splitTextIntoChunks(parseResult.text);

  logger.info(`Processing ${chunks.length} chunks for criteria extraction`);
  onProgress?.(10, 'PDF文本已解析，开始分批提取...');

  let allInclusion: Array<{ index: number; content: string }> = [];
  let allExclusion: Array<{ index: number; content: string }> = [];
  let allVisits: Array<{ visitName: string; timing: string; visitWindow: string; procedures: string[] }> = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const progress = 10 + Math.floor((i / chunks.length) * 70);
    onProgress?.(progress, `正在处理第 ${i + 1}/${chunks.length} 批...`);

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

  return { criteria, visitSchedules, rawText: parseResult.text };
}

export async function extractCriteriaFromScannedPdf(
  filePath: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ProtocolData> {
  const images = await convertPdfToImages(filePath);
  logger.info(`Converted ${images.length} pages to images`);

  onProgress?.(10, `已转换${images.length}页为图片，开始AI识别...`);

  let allInclusion: Array<{ index: number; content: string }> = [];
  let allExclusion: Array<{ index: number; content: string }> = [];
  let allVisits: Array<{ visitName: string; timing: string; visitWindow: string; procedures: string[] }> = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const progress = 10 + Math.floor((i / images.length) * 70);
    onProgress?.(progress, `正在识别第 ${i + 1}/${images.length} 页...`);

    const criteriaResponse = await invokeGateway({
      prompt: CRITERIA_EXTRACTION_FROM_IMAGE_PROMPT,
      systemPrompt: CRITERIA_SYSTEM_PROMPT,
      contentType: 'image',
      imageBase64: image.base64,
      imageMimeType: image.mimeType,
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
