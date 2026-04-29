/**
 * CRA AI Assistant - Application Constants
 */

import type { WorksheetType, FileFilter } from '../types/worksheet';

// ============================================================================
// Application Info
// ============================================================================

export const APP_NAME = 'CRA AI Assistant';
export const APP_VERSION = '5.0.1';

// ============================================================================
// File Constraints
// ============================================================================

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.webp'];
export const MAX_FILES_PER_ZONE = 100;

// ============================================================================
// File Filters
// ============================================================================

export const FILE_FILTERS: Record<string, FileFilter[]> = {
  all: [
    { name: 'All Supported Files', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'bmp', 'webp'] },
    { name: 'All Files', extensions: ['*'] },
  ],
  pdf: [{ name: 'PDF Documents', extensions: ['pdf'] }],
  image: [
    { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'webp'] },
  ],
};

// ============================================================================
// Worksheet Configuration
// ============================================================================

export const WORKSHEET_CONFIG: Record<
  WorksheetType,
  { title: string; description: string; icon: string; color: string }
> = {
  inclusionCriteria: {
    title: '入选标准',
    description: '研究方案的入选标准列表',
    icon: '✓',
    color: 'green',
  },
  exclusionCriteria: {
    title: '排除标准',
    description: '研究方案的排除标准列表',
    icon: '✗',
    color: 'red',
  },
  visitSchedule: {
    title: '访视计划',
    description: '临床试验访视时间表和检查项目',
    icon: '📅',
    color: 'blue',
  },
  subjectVisits: {
    title: '受试者访视',
    description: '受试者访视记录追踪',
    icon: '👤',
    color: 'purple',
  },
  medications: {
    title: '用药记录',
    description: '受试者用药记录管理',
    icon: '💊',
    color: 'orange',
  },
};

// ============================================================================
// Processing Stages
// ============================================================================

export const PROCESSING_STAGES = {
  idle: 'idle',
  uploading: 'uploading',
  parsing: 'parsing',
  analyzing: 'analyzing',
  extracting: 'extracting',
  validating: 'validating',
  completing: 'completing',
  error: 'error',
} as const;

export const PROCESSING_STAGE_MESSAGES: Record<string, string> = {
  idle: '准备就绪',
  uploading: '正在上传文件...',
  parsing: '正在解析文件内容...',
  analyzing: 'AI 正在分析...',
  extracting: '正在提取数据...',
  validating: '正在验证数据...',
  completing: '处理完成',
  error: '处理出错',
};

// ============================================================================
// UI Constants
// ============================================================================

export const UI_SIDEBAR_WIDTH = 240;
export const UI_HEADER_HEIGHT = 56;
