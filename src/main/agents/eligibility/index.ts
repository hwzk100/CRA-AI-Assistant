import { invokeGateway } from '../gateway/index';
import { ELIGIBILITY_SYSTEM_PROMPT, ELIGIBILITY_VERIFICATION_PROMPT } from './prompts/eligibility-prompts';
import type { Criterion } from '../../../shared/types/protocol';
import type { SubjectData } from '../../../shared/types/subject';
import type { EligibilityResult, EligibilityReport } from '../../../shared/types/eligibility';
import { createLogger } from '../../utils/logger';

const logger = createLogger('EligibilityAgent');

function formatCriteria(criteria: Criterion[], category: 'inclusion' | 'exclusion'): string {
  const filtered = criteria.filter((c) => c.category === category);
  return filtered
    .map((c) => `${c.index}. [ID: ${c.id}] ${c.content}`)
    .join('\n');
}

function formatSubjectData(subject: SubjectData): string {
  const parts: string[] = [];

  parts.push('### 人口学信息');
  parts.push(`- 受试者编号: ${subject.demographics.subjectId}`);
  parts.push(`- 姓名缩写: ${subject.demographics.initials}`);
  parts.push(`- 年龄: ${subject.demographics.age}`);
  parts.push(`- 性别: ${subject.demographics.gender}`);
  if (subject.demographics.ethnicity) {
    parts.push(`- 民族: ${subject.demographics.ethnicity}`);
  }

  if (subject.vitalSigns.length > 0) {
    parts.push('\n### 生命体征');
    for (const vs of subject.vitalSigns) {
      parts.push(`- ${vs.type}: ${vs.value} ${vs.unit}${vs.date ? ` (${vs.date})` : ''}`);
    }
  }

  if (subject.medicalHistory.length > 0) {
    parts.push('\n### 病史');
    for (const mh of subject.medicalHistory) {
      parts.push(`- ${mh.condition}${mh.onsetDate ? ` (发病: ${mh.onsetDate})` : ''}${mh.status ? ` [${mh.status}]` : ''}`);
    }
  }

  if (subject.medications.length > 0) {
    parts.push('\n### 用药记录');
    for (const med of subject.medications) {
      parts.push(`- ${med.medicationName} ${med.dosage} ${med.frequency}${med.indication ? ` (适应症: ${med.indication})` : ''}`);
    }
  }

  return parts.join('\n');
}

interface ParsedEligibilityResult {
  results: Array<{
    criterionId: string;
    criterionContent: string;
    category: 'inclusion' | 'exclusion';
    status: 'pass' | 'fail' | 'unknown';
    evidence: string;
    confidence: number;
    notes?: string;
  }>;
  overallEligible: boolean;
  summary: string;
}

function parseEligibilityJson(text: string): ParsedEligibilityResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.error('No JSON found in eligibility response');
    return { results: [], overallEligible: false, summary: '解析失败' };
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    logger.error('Failed to parse eligibility JSON', { error: String(e) });
    return { results: [], overallEligible: false, summary: '解析失败' };
  }
}

export async function verifyEligibility(
  criteria: Criterion[],
  subjectData: SubjectData,
  onProgress?: (progress: number, message: string) => void
): Promise<EligibilityReport> {
  onProgress?.(10, '准备核验数据...');

  const inclusionText = formatCriteria(criteria, 'inclusion');
  const exclusionText = formatCriteria(criteria, 'exclusion');
  const subjectText = formatSubjectData(subjectData);

  onProgress?.(30, '正在调用AI进行资格核验...');

  const prompt = ELIGIBILITY_VERIFICATION_PROMPT
    .replace('{inclusionCriteria}', inclusionText)
    .replace('{exclusionCriteria}', exclusionText)
    .replace('{subjectData}', subjectText);

  const response = await invokeGateway({
    prompt,
    systemPrompt: ELIGIBILITY_SYSTEM_PROMPT,
    contentType: 'text',
  });

  onProgress?.(80, '正在解析核验结果...');

  const parsed = parseEligibilityJson(response.content);

  const results: EligibilityResult[] = parsed.results.map((r) => ({
    criterionId: r.criterionId,
    criterionContent: r.criterionContent,
    category: r.category,
    status: r.status,
    evidence: r.evidence,
    confidence: r.confidence,
    notes: r.notes,
  }));

  onProgress?.(100, '核验完成');

  return {
    subjectId: subjectData.demographics.subjectId,
    results,
    overallEligible: parsed.overallEligible,
    summary: parsed.summary,
    verifiedAt: new Date().toISOString(),
  };
}
