/**
 * CRA AI Assistant - Worksheet Type Definitions
 * Rich types for the worksheet UI, ported from V4.0
 */

// ============================================================================
// Storage Zone
// ============================================================================

export enum StorageZone {
  PROTOCOL = 'protocol',
  SUBJECT = 'subject',
}

// ============================================================================
// File Status & Type
// ============================================================================

export enum FileStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum FileType {
  PDF = 'pdf',
  IMAGE = 'image',
  WORD = 'word',
  EXCEL = 'excel',
  UNKNOWN = 'unknown',
}

export type DocumentCategory = 'medical-record' | 'lab-report' | 'drug-inventory' | 'other';

export interface FileInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  type: FileType;
  status: FileStatus;
  uploadedAt: Date;
  processedAt?: Date;
  errorMessage?: string;
  documentCategory?: DocumentCategory;
}

// ============================================================================
// Worksheet Type
// ============================================================================

export type WorksheetType =
  | 'inclusionCriteria'
  | 'exclusionCriteria'
  | 'visitSchedule'
  | 'subjectVisits'
  | 'medications';

// ============================================================================
// Criteria Types (rich versions for worksheet UI)
// ============================================================================

export interface InclusionFileResult {
  fileId: string;
  fileName: string;
  eligible: boolean;
  reason: string;
}

export interface InclusionCriteria {
  id: string;
  category: string;
  description: string;
  eligible?: boolean;
  reason?: string;
  fileResults?: InclusionFileResult[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExclusionFileResult {
  fileId: string;
  fileName: string;
  eligible: boolean;
  reason: string;
}

export interface ExclusionCriteria {
  id: string;
  category: string;
  description: string;
  eligible?: boolean;
  reason?: string;
  fileResults?: ExclusionFileResult[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Visit Schedule Types (rich versions)
// ============================================================================

export interface VisitItem {
  id: string;
  name: string;
  category: string;
  required: boolean;
  description?: string;
}

export interface VisitSchedule {
  id: string;
  visitType: string;
  visitDay: string;
  visitWindow: string;
  description: string;
  items: VisitItem[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Subject Visit Types
// ============================================================================

export type VisitStatus = 'planned' | 'scheduled' | 'completed' | 'missed' | 'cancelled' | 'pending';

export interface SubjectVisitItemData {
  id: string;
  visitType: string;
  visitDay?: string;
  plannedDate?: Date;
  actualDate?: Date;
  status: VisitStatus;
  completionPercentage?: number;
  notes?: string;
}

export interface SubjectVisitData {
  id: string;
  subjectId: string;
  subjectNumber: string;
  screeningNumber?: string;
  randomizationNumber?: string;
  visits: SubjectVisitItemData[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Subject Demographics (rich version)
// ============================================================================

export interface SubjectDemographics {
  subjectNumber?: string;
  screeningNumber?: string;
  randomizationNumber?: string;
  age?: number | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  ethnicity?: string | null;
  birthDate?: string | null;
}

// ============================================================================
// Medication Record (rich version)
// ============================================================================

export interface MedicationRecord {
  id: string;
  subjectId: string;
  visitType: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Excel Export Types
// ============================================================================

export interface ExcelExportData {
  inclusionCriteria: InclusionCriteria[];
  exclusionCriteria: ExclusionCriteria[];
  visitSchedule: VisitSchedule[];
  subjectVisits: SubjectVisitData[];
  medications: MedicationRecord[];
  subjectDemographics: SubjectDemographics[];
}

export interface ExcelExportOptions {
  outputPath?: string;
  fileName?: string;
  author?: string;
  title?: string;
  subject?: string;
  keywords?: string;
  category?: string;
  comments?: string;
  includeEmptySheets?: boolean;
  freezeHeaderRow?: boolean;
  autoFilter?: boolean;
}

export interface ExcelExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
  bytesWritten?: number;
  sheetCount?: number;
}

// ============================================================================
// File Filter
// ============================================================================

export interface FileFilter {
  name: string;
  extensions: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

export const generateId = (prefix: string = ''): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
};

export const formatDate = (
  date: Date | string | undefined | null,
  format: 'short' | 'long' = 'short'
): string => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    const locale = 'zh-CN';
    if (format === 'short') {
      return d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
    } else {
      return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    }
  } catch {
    return '-';
  }
};

export const getVisitStatusText = (status: VisitStatus): string => {
  const statusMap: Record<VisitStatus, string> = {
    planned: '计划中',
    scheduled: '已安排',
    completed: '已完成',
    missed: '缺失',
    cancelled: '已取消',
    pending: '待定',
  };
  return statusMap[status] || status;
};

export const getVisitStatusColor = (status: VisitStatus): string => {
  const colorMap: Record<VisitStatus, string> = {
    planned: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    missed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    pending: 'bg-purple-100 text-purple-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
};
