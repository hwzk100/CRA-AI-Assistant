import { createLogger } from '../../utils/logger';

const logger = createLogger('SectionLocator');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SectionType =
  | 'inclusion'
  | 'exclusion'
  | 'visit-schedule'
  | 'demographics'
  | 'medications';

export interface SectionMatch {
  title: string;
  startOffset: number;
  endOffset: number;
  text: string;
  sectionTypes: SectionType[];
}

export interface SectionExtractionResult {
  success: boolean;
  sections: SectionMatch[];
  combinedText: string;
  totalLength: number;
  fallbackReason?: string;
}

// ---------------------------------------------------------------------------
// Keyword mappings
// ---------------------------------------------------------------------------

const SECTION_KEYWORDS: Record<SectionType, string[]> = {
  inclusion: ['纳入标准', '入选标准', '纳入条件', '入选条件', '入排标准', '入排条件'],
  exclusion: ['排除标准', '排除条件', '入排标准', '入排条件'],
  'visit-schedule': ['访视计划', '访视流程', '随访计划', '试验流程', '流程表'],
  demographics: ['受试者信息', '人口学'],
  medications: ['合并用药', '既往用药', '用药记录', '用药史'],
};

// ---------------------------------------------------------------------------
// Title-line detection regexes
// ---------------------------------------------------------------------------

const TITLE_PATTERNS: RegExp[] = [
  // 编号型: "3.2 入选标准", "1.2.3 xxx"
  /^\s*\d+(\.\d+){1,3}\s+\S/,
  // 中文章节型: "第三章 纳入标准", "第二节 排除标准"
  /^\s*第[一二三四五六七八九十百零\d]+[章节篇部部分]\s*\S/,
  // 附录型: "附录一 xxx"
  /^\s*附录[一二三四五六七八九十\d]*\s*\S/,
];

const MAX_TITLE_LINE_LENGTH = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBareKeywordTitle(trimmed: string): boolean {
  // 规则1: 短行（裸标题不超过15字符）
  if (trimmed.length === 0 || trimmed.length > 15) return false;

  // 规则2: 不以句末标点结尾
  if (/[。；！？]$/.test(trimmed)) return false;

  // 规则3: 包含 SECTION_KEYWORDS 中的关键词，且关键词在前4个字符内
  let found = false;
  for (const keywords of Object.values(SECTION_KEYWORDS)) {
    for (const kw of keywords) {
      const pos = trimmed.indexOf(kw);
      if (pos !== -1) {
        if (pos > 3) return false; // 关键词不在行首附近
        found = true;
        break;
      }
    }
    if (found) break;
  }
  return found;
}

function isTitleLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TITLE_LINE_LENGTH) return false;

  // 路径1: 带前缀的标题（原有逻辑不变）
  if (TITLE_PATTERNS.some((re) => re.test(trimmed))) return true;

  // 路径2: 裸关键词标题（新增）
  if (isBareKeywordTitle(trimmed)) return true;

  return false;
}

function detectSectionTypes(title: string): SectionType[] {
  const types: SectionType[] = [];
  const seen = new Set<SectionType>();

  for (const [sectionType, keywords] of Object.entries(SECTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (title.includes(kw)) {
        const st = sectionType as SectionType;
        if (!seen.has(st)) {
          seen.add(st);
          types.push(st);
        }
        break;
      }
    }
  }

  return types;
}

// ---------------------------------------------------------------------------
// Core algorithm
// ---------------------------------------------------------------------------

export function extractRelevantSections(
  text: string,
  targetTypes: SectionType[],
): SectionExtractionResult {
  const targetSet = new Set(targetTypes);
  const lines = text.split('\n');

  // Phase 1: Detect all section headers with their offsets
  const headers: Array<{ lineIndex: number; offset: number; types: SectionType[]; title: string }> = [];
  let currentOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isTitleLine(line)) {
      const types = detectSectionTypes(line);
      if (types.length > 0) {
        headers.push({ lineIndex: i, offset: currentOffset, types, title: line.trim() });
      }
    }

    currentOffset += line.length + 1; // +1 for the \n
  }

  if (headers.length === 0) {
    logger.info('No section headers detected, will fall back to chunking');
    return {
      success: false,
      sections: [],
      combinedText: '',
      totalLength: 0,
      fallbackReason: 'NO_HEADERS_DETECTED',
    };
  }

  // Phase 2: Build SectionMatch list (each header → next header boundary)
  const allSections: SectionMatch[] = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const nextOffset = i + 1 < headers.length ? headers[i + 1].offset : text.length;

    allSections.push({
      title: header.title,
      startOffset: header.offset,
      endOffset: nextOffset,
      text: text.slice(header.offset, nextOffset),
      sectionTypes: header.types,
    });
  }

  logger.info(`Detected ${allSections.length} sections: ${allSections.map((s) => `"${s.title}" [${s.sectionTypes.join(',')}]`).join(', ')}`);

  // Phase 3: Filter to target types
  const matchedSections = allSections.filter((section) =>
    section.sectionTypes.some((t) => targetSet.has(t)),
  );

  if (matchedSections.length === 0) {
    logger.info('No sections matched target types, will fall back to chunking');
    return {
      success: false,
      sections: allSections,
      combinedText: '',
      totalLength: 0,
      fallbackReason: 'NO_TARGET_TYPE_MATCH',
    };
  }

  const combinedText = matchedSections.map((s) => s.text).join('\n');
  const totalLength = combinedText.length;

  if (totalLength < 50) {
    logger.info(`Matched section text too short (${totalLength} chars), will fall back to chunking`);
    return {
      success: false,
      sections: matchedSections,
      combinedText,
      totalLength,
      fallbackReason: 'SECTION_TEXT_TOO_SHORT',
    };
  }

  logger.info(`Section-based extraction: ${matchedSections.length} sections, ${totalLength} chars total`);
  return {
    success: true,
    sections: matchedSections,
    combinedText,
    totalLength,
  };
}
