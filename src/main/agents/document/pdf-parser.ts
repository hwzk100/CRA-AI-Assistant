import * as fs from 'fs';
import { createLogger } from '../../utils/logger';

const logger = createLogger('PdfParser');

// Dynamic import for pdf-parse (CommonJS compatible)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

export interface PdfParseResult {
  text: string;
  pageCount: number;
  isTextBased: boolean;
}

const TEXT_THRESHOLD = 50; // Minimum characters to consider as text-based PDF

export async function parsePdf(filePath: string): Promise<PdfParseResult> {
  const dataBuffer = fs.readFileSync(filePath);

  try {
    const data = await pdfParse(dataBuffer);
    const text = data.text || '';
    const isTextBased = text.trim().length > TEXT_THRESHOLD;

    logger.info(`PDF parsed: ${data.numpages} pages, text length: ${text.length}, isTextBased: ${isTextBased}`);

    return {
      text,
      pageCount: data.numpages,
      isTextBased,
    };
  } catch (error) {
    logger.error('PDF parsing failed', { error: String(error) });
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function splitTextIntoChunks(text: string, maxTokens: number = 2000, overlap: number = 500): string[] {
  // Rough approximation: 1 token ≈ 1.5 Chinese characters or 4 English words
  const maxChars = maxTokens * 1.5;
  const overlapChars = overlap * 1.5;

  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);

    // Try to break at paragraph or sentence boundary
    if (end < text.length) {
      const lastNewline = text.lastIndexOf('\n', end);
      const lastPeriod = text.lastIndexOf('。', end);
      const breakPoint = Math.max(lastNewline, lastPeriod);
      if (breakPoint > start + maxChars * 0.5) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end));
    start = end - overlapChars;

    if (start >= text.length) break;
  }

  logger.info(`Text split into ${chunks.length} chunks`);
  return chunks;
}
