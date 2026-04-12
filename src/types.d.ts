declare module 'pdf-parse' {
  interface PdfData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    text: string;
    version: string;
  }

  function pdfParse(dataBuffer: Buffer): Promise<PdfData>;
  export = pdfParse;
}

declare module 'pdf-to-img' {
  interface PdfDocument extends AsyncIterable<Buffer> {}

  function pdfToImg(filePath: string, options?: { scale?: number; type?: string }): Promise<PdfDocument>;
  export default pdfToImg;
}
