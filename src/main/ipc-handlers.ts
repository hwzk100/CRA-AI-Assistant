import { ipcMain, BrowserWindow, dialog } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/ipc-channels';
import { getConfig, saveConfig } from './config';
import { resetRouter, invokeGateway } from './agents/gateway/index';
import { processFileUpload, extractCriteria, extractSubjectData } from './agents/document/index';
import { verifyEligibility } from './agents/eligibility/index';
import { validateFilePath } from './utils/file-validator';
import { createLogger } from './utils/logger';
import type { AppConfig, ConnectionTestResult } from '../shared/types/config';
import type { FileUploadResult, ProcessingProgress } from '../shared/types/ipc';
import type { DetectedFileType } from './agents/document/file-handler';

const logger = createLogger('IpcHandlers');

// In-memory state for uploaded files
let protocolFileInfo: { filePath: string; fileType: DetectedFileType; mimeType: string } | null = null;
let subjectFileInfo: { filePath: string; fileType: DetectedFileType; mimeType: string } | null = null;

function sendProgress(progress: ProcessingProgress): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(IPC_CHANNELS.PROCESSING_PROGRESS, progress);
  }
}

export function registerIpcHandlers(): void {
  // Settings
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    return getConfig();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (_event, settings: Partial<AppConfig>) => {
    const newConfig = saveConfig(settings);
    resetRouter(); // Reset router to pick up new config
    return newConfig;
  });

  ipcMain.handle(IPC_CHANNELS.TEST_CONNECTION, async (): Promise<ConnectionTestResult> => {
    try {
      const config = getConfig();
      if (!config.apiKey) {
        return { success: false, message: 'API Key 未配置' };
      }

      const startTime = Date.now();
      const response = await invokeGateway({
        prompt: '请回复"连接成功"四个字。',
        contentType: 'text',
        temperature: 0,
        maxTokens: 20,
      });
      const latency = Date.now() - startTime;

      return {
        success: true,
        message: `连接成功: ${response.content.trim()}`,
        model: response.model,
        latency,
      };
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  });

  // File dialog
  ipcMain.handle(IPC_CHANNELS.OPEN_FILE_DIALOG, async (_event, filters: { name: string; extensions: string[] }[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: filters || [
        { name: 'All Supported', extensions: ['pdf', 'jpg', 'jpeg', 'png'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return [];
    return result.filePaths;
  });

  // File upload
  ipcMain.handle(IPC_CHANNELS.UPLOAD_PROTOCOL_FILE, async (_event, filePath: string): Promise<FileUploadResult> => {
    try {
      sendProgress({ stage: 'uploading', progress: 0, message: '正在验证方案文件...' });
      const result = await processFileUpload(filePath, 'protocol', (progress, message) => {
        sendProgress({ stage: 'uploading', progress, message });
      });

      if (result.success) {
        protocolFileInfo = {
          filePath,
          fileType: result.fileType,
          mimeType: '',
        };
      }

      sendProgress({ stage: 'complete', progress: 100, message: '文件上传完成' });
      return result;
    } catch (error) {
      sendProgress({ stage: 'error', progress: 0, message: `上传失败: ${error instanceof Error ? error.message : String(error)}` });
      return {
        success: false,
        filePath,
        fileName: '',
        fileType: 'text-pdf',
        message: `上传失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPLOAD_SUBJECT_FILE, async (_event, filePath: string): Promise<FileUploadResult> => {
    try {
      sendProgress({ stage: 'uploading', progress: 0, message: '正在验证受试者文件...' });
      const result = await processFileUpload(filePath, 'subject', (progress, message) => {
        sendProgress({ stage: 'uploading', progress, message });
      });

      if (result.success) {
        subjectFileInfo = {
          filePath,
          fileType: result.fileType,
          mimeType: '',
        };
      }

      sendProgress({ stage: 'complete', progress: 100, message: '文件上传完成' });
      return result;
    } catch (error) {
      sendProgress({ stage: 'error', progress: 0, message: `上传失败: ${error instanceof Error ? error.message : String(error)}` });
      return {
        success: false,
        filePath,
        fileName: '',
        fileType: 'text-pdf',
        message: `上传失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  });

  // AI extraction
  ipcMain.handle(IPC_CHANNELS.EXTRACT_CRITERIA, async () => {
    if (!protocolFileInfo) {
      throw new Error('请先上传方案文件');
    }

    try {
      sendProgress({ stage: 'extracting', progress: 0, message: '开始提取入排标准...' });
      const data = await extractCriteria(
        protocolFileInfo.filePath,
        protocolFileInfo.fileType,
        protocolFileInfo.mimeType,
        (progress, message) => {
          sendProgress({ stage: 'extracting', progress, message });
        }
      );

      sendProgress({ stage: 'complete', progress: 100, message: '入排标准提取完成' });
      return data;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Extract criteria failed', { error: errMsg });
      sendProgress({ stage: 'error', progress: 0, message: `提取失败: ${errMsg}` });
      throw new Error(`入排标准提取失败: ${errMsg}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXTRACT_SUBJECT_DATA, async () => {
    if (!subjectFileInfo) {
      throw new Error('请先上传受试者文件');
    }

    try {
      sendProgress({ stage: 'extracting', progress: 0, message: '开始提取受试者数据...' });
      const data = await extractSubjectData(
        subjectFileInfo.filePath,
        subjectFileInfo.fileType,
        subjectFileInfo.mimeType,
        (progress, message) => {
          sendProgress({ stage: 'extracting', progress, message });
        }
      );

      sendProgress({ stage: 'complete', progress: 100, message: '受试者数据提取完成' });
      return data;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Extract subject data failed', { error: errMsg });
      sendProgress({ stage: 'error', progress: 0, message: `提取失败: ${errMsg}` });
      throw new Error(`受试者数据提取失败: ${errMsg}`);
    }
  });

  // Eligibility verification
  ipcMain.handle(IPC_CHANNELS.VERIFY_ELIGIBILITY, async (_event, criteria: unknown, subjectData: unknown) => {
    sendProgress({ stage: 'verifying', progress: 0, message: '开始资格核验...' });
    const report = await verifyEligibility(
      criteria as any[],
      subjectData as any,
      (progress, message) => {
        sendProgress({ stage: 'verifying', progress, message });
      }
    );

    sendProgress({ stage: 'complete', progress: 100, message: '资格核验完成' });
    return report;
  });

  logger.info('IPC handlers registered');
}
