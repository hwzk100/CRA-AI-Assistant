/**
 * Global type declarations for the renderer process
 */

interface Window {
  electronAPI: {
    getSettings(): Promise<any>;
    saveSettings(settings: any): Promise<any>;
    testConnection(): Promise<any>;
    uploadProtocolFile(filePath: string): Promise<any>;
    uploadSubjectFile(filePath: string): Promise<any>;
    extractCriteria(): Promise<any>;
    extractSubjectData(): Promise<any>;
    verifyEligibility(): Promise<any>;
    onProcessingProgress(callback: (progress: any) => void): () => void;
  };
}
