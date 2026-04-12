import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Settings
  getSettings: () => ipcRenderer.invoke('GET_SETTINGS'),
  saveSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('SAVE_SETTINGS', settings),
  testConnection: () => ipcRenderer.invoke('TEST_CONNECTION'),

  // File upload
  uploadProtocolFile: (filePath: string) => ipcRenderer.invoke('UPLOAD_PROTOCOL_FILE', filePath),
  uploadSubjectFile: (filePath: string) => ipcRenderer.invoke('UPLOAD_SUBJECT_FILE', filePath),

  // AI extraction
  extractCriteria: () => ipcRenderer.invoke('EXTRACT_CRITERIA'),
  extractSubjectData: () => ipcRenderer.invoke('EXTRACT_SUBJECT_DATA'),

  // Eligibility
  verifyEligibility: () => ipcRenderer.invoke('VERIFY_ELIGIBILITY'),

  // Progress events
  onProcessingProgress: (callback: (progress: { stage: string; progress: number; message: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { stage: string; progress: number; message: string }) => callback(data);
    ipcRenderer.on('PROCESSING_PROGRESS', handler);
    return () => ipcRenderer.removeListener('PROCESSING_PROGRESS', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
