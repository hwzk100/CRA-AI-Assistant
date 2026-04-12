import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../../utils/logger';

const logger = createLogger('PdfToImage');

interface PdfPageImage {
  pageNumber: number;
  base64: string;
  mimeType: string;
}

/**
 * Convert scanned PDF pages to images using pdf-to-img (ESM module, dynamic import)
 */
export async function convertPdfToImages(filePath: string): Promise<PdfPageImage[]> {
  logger.info(`Converting PDF to images: ${filePath}`);

  const pdfToImg = await import('pdf-to-img');

  // pdf-to-img exports different things in different versions
  const pdf = await (pdfToImg as any).default(filePath, {
    scale: 2,
    // @ts-ignore - pdf-to-img types may vary
    type: 'png',
  });

  const images: PdfPageImage[] = [];
  let pageNumber = 0;

  for await (const page of pdf) {
    pageNumber++;
    const base64 = Buffer.from(page).toString('base64');
    images.push({
      pageNumber,
      base64,
      mimeType: 'image/png',
    });
    logger.info(`Page ${pageNumber} converted to image`);
  }

  logger.info(`Total ${images.length} pages converted`);
  return images;
}
