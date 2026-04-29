/**
 * CRA AI Assistant - Zustand State Management Store
 * Single store with persist middleware, adapted from V4.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FileInfo,
  InclusionCriteria,
  ExclusionCriteria,
  VisitSchedule,
  SubjectVisitData,
  MedicationRecord,
  WorksheetType,
  FileStatus,
  DocumentCategory,
  SubjectDemographics,
  InclusionFileResult,
  ExclusionFileResult,
} from '@shared/types/worksheet';
import { StorageZone } from '@shared/types/worksheet';
import type { AppConfig, ConnectionTestResult } from '@shared/types/config';
import { DEFAULT_CONFIG } from '@shared/types/config';
import { WORKSHEET_CONFIG } from '@shared/constants/app';
import { generateId } from '@shared/types/worksheet';

// ============================================================================
// State Interface
// ============================================================================

interface AppState {
  // File Management
  protocolFiles: FileInfo[];
  subjectFiles: FileInfo[];

  // Worksheet Data
  inclusionCriteria: InclusionCriteria[];
  exclusionCriteria: ExclusionCriteria[];
  visitSchedule: VisitSchedule[];
  subjectVisits: SubjectVisitData[];
  medications: MedicationRecord[];
  subjectDemographics: SubjectDemographics[];

  // UI State
  activeWorksheet: WorksheetType;
  isProcessing: boolean;
  processingStage: string;
  processingProgress: number;

  // Settings (adapted to current AppConfig)
  settings: AppConfig;
  isTesting: boolean;
  testResult: ConnectionTestResult | null;

  // Error State
  error: string | null;
}

interface AppActions {
  // File Actions
  setProtocolFiles: (files: FileInfo[]) => void;
  setSubjectFiles: (files: FileInfo[]) => void;
  addFile: (zone: StorageZone, file: FileInfo) => void;
  removeFile: (zone: StorageZone, fileId: string) => void;
  updateFileStatus: (zone: StorageZone, fileId: string, status: FileStatus, errorMessage?: string, documentCategory?: DocumentCategory) => void;

  // Worksheet Actions
  setActiveWorksheet: (worksheet: WorksheetType) => void;
  setInclusionCriteria: (criteria: InclusionCriteria[]) => void;
  addInclusionCriteria: (criteria: InclusionCriteria) => void;
  updateInclusionCriteria: (id: string, updates: Partial<InclusionCriteria>) => void;
  removeInclusionCriteria: (id: string) => void;
  updateInclusionEligibility: (id: string, eligible: boolean, reason: string) => void;
  updateInclusionFileResults: (criteriaId: string, fileResults: InclusionFileResult[]) => void;
  clearInclusionEligibility: () => void;

  setExclusionCriteria: (criteria: ExclusionCriteria[]) => void;
  addExclusionCriteria: (criteria: ExclusionCriteria) => void;
  updateExclusionCriteria: (id: string, updates: Partial<ExclusionCriteria>) => void;
  removeExclusionCriteria: (id: string) => void;
  updateExclusionEligibility: (id: string, eligible: boolean, reason: string) => void;
  updateExclusionFileResults: (criteriaId: string, fileResults: ExclusionFileResult[]) => void;
  clearExclusionEligibility: () => void;
  clearAllEligibility: () => void;

  setVisitSchedule: (schedule: VisitSchedule[]) => void;
  addVisitSchedule: (schedule: VisitSchedule) => void;
  updateVisitSchedule: (id: string, updates: Partial<VisitSchedule>) => void;
  removeVisitSchedule: (id: string) => void;

  setSubjectVisits: (visits: SubjectVisitData[]) => void;
  addSubjectVisit: (visit: SubjectVisitData) => void;
  updateSubjectVisit: (id: string, updates: Partial<SubjectVisitData>) => void;
  removeSubjectVisit: (id: string) => void;

  setMedications: (medications: MedicationRecord[]) => void;
  addMedication: (medication: MedicationRecord) => void;
  updateMedication: (id: string, updates: Partial<MedicationRecord>) => void;
  removeMedication: (id: string) => void;

  // Demographics Actions
  setSubjectDemographics: (demographics: SubjectDemographics[]) => void;
  addSubjectDemographics: (demographics: SubjectDemographics) => void;

  // Processing Actions
  setProcessing: (isProcessing: boolean, stage?: string, progress?: number) => void;

  // Settings Actions (adapted for AppConfig)
  setSettings: (settings: AppConfig) => void;
  updateSettings: (updates: Partial<AppConfig>) => void;
  resetSettings: () => void;
  setTestResult: (result: ConnectionTestResult | null) => void;
  setIsTesting: (isTesting: boolean) => void;

  // Error Actions
  setError: (error: string | null) => void;

  // Clear Actions
  clearWorksheetData: (worksheet: WorksheetType) => void;
  clearAllWorksheetData: () => void;
}

type AppStore = AppState & AppActions;

// ============================================================================
// Store Creation
// ============================================================================

const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial State
      protocolFiles: [],
      subjectFiles: [],

      inclusionCriteria: [],
      exclusionCriteria: [],
      visitSchedule: [],
      subjectVisits: [],
      medications: [],
      subjectDemographics: [],

      activeWorksheet: 'inclusionCriteria',
      isProcessing: false,
      processingStage: 'idle',
      processingProgress: 0,

      settings: DEFAULT_CONFIG,
      isTesting: false,
      testResult: null,
      error: null,

      // File Actions
      setProtocolFiles: (files) => set({ protocolFiles: files }),
      setSubjectFiles: (files) => set({ subjectFiles: files }),

      addFile: (zone, file) =>
        set((state) => {
          if (zone === StorageZone.PROTOCOL) {
            return { protocolFiles: [...state.protocolFiles, file] };
          }
          return { subjectFiles: [...state.subjectFiles, file] };
        }),

      removeFile: (zone, fileId) =>
        set((state) => {
          if (zone === StorageZone.PROTOCOL) {
            return { protocolFiles: state.protocolFiles.filter((f) => f.id !== fileId) };
          }
          return { subjectFiles: state.subjectFiles.filter((f) => f.id !== fileId) };
        }),

      updateFileStatus: (zone, fileId, status, errorMessage, documentCategory) =>
        set((state) => {
          const updateFile = (file: FileInfo): FileInfo => ({
            ...file,
            status,
            ...(status === 'completed' && { processedAt: new Date() }),
            ...(errorMessage && { errorMessage }),
            ...(documentCategory && { documentCategory }),
          });

          if (zone === StorageZone.PROTOCOL) {
            return {
              protocolFiles: state.protocolFiles.map((f) =>
                f.id === fileId ? updateFile(f) : f
              ),
            };
          }
          return {
            subjectFiles: state.subjectFiles.map((f) =>
              f.id === fileId ? updateFile(f) : f
            ),
          };
        }),

      // Worksheet Actions
      setActiveWorksheet: (worksheet) => set({ activeWorksheet: worksheet }),

      setInclusionCriteria: (criteria) => set({ inclusionCriteria: criteria }),

      addInclusionCriteria: (criteria) =>
        set((state) => ({
          inclusionCriteria: [...state.inclusionCriteria, criteria],
        })),

      updateInclusionCriteria: (id, updates) =>
        set((state) => ({
          inclusionCriteria: state.inclusionCriteria.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
          ),
        })),

      removeInclusionCriteria: (id) =>
        set((state) => ({
          inclusionCriteria: state.inclusionCriteria.filter((c) => c.id !== id),
        })),

      updateInclusionEligibility: (id, eligible, reason) =>
        set((state) => ({
          inclusionCriteria: state.inclusionCriteria.map((c) =>
            c.id === id ? { ...c, eligible, reason, updatedAt: new Date() } : c
          ),
        })),

      updateInclusionFileResults: (criteriaId, fileResults) =>
        set((state) => ({
          inclusionCriteria: state.inclusionCriteria.map((c) =>
            c.id === criteriaId
              ? { ...c, fileResults, updatedAt: new Date() }
              : c
          ),
        })),

      clearInclusionEligibility: () =>
        set((state) => ({
          inclusionCriteria: state.inclusionCriteria.map((c) => ({
            ...c,
            eligible: undefined,
            reason: undefined,
            fileResults: undefined,
          })),
        })),

      setExclusionCriteria: (criteria) => set({ exclusionCriteria: criteria }),

      addExclusionCriteria: (criteria) =>
        set((state) => ({
          exclusionCriteria: [...state.exclusionCriteria, criteria],
        })),

      updateExclusionCriteria: (id, updates) =>
        set((state) => ({
          exclusionCriteria: state.exclusionCriteria.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
          ),
        })),

      removeExclusionCriteria: (id) =>
        set((state) => ({
          exclusionCriteria: state.exclusionCriteria.filter((c) => c.id !== id),
        })),

      updateExclusionEligibility: (id, eligible, reason) =>
        set((state) => ({
          exclusionCriteria: state.exclusionCriteria.map((c) =>
            c.id === id ? { ...c, eligible, reason, updatedAt: new Date() } : c
          ),
        })),

      updateExclusionFileResults: (criteriaId, fileResults) =>
        set((state) => ({
          exclusionCriteria: state.exclusionCriteria.map((c) =>
            c.id === criteriaId
              ? { ...c, fileResults, updatedAt: new Date() }
              : c
          ),
        })),

      clearExclusionEligibility: () =>
        set((state) => ({
          exclusionCriteria: state.exclusionCriteria.map((c) => ({
            ...c,
            eligible: undefined,
            reason: undefined,
            fileResults: undefined,
          })),
        })),

      clearAllEligibility: () =>
        set((state) => ({
          inclusionCriteria: state.inclusionCriteria.map((c) => ({
            ...c,
            eligible: undefined,
            reason: undefined,
            fileResults: undefined,
          })),
          exclusionCriteria: state.exclusionCriteria.map((c) => ({
            ...c,
            eligible: undefined,
            reason: undefined,
            fileResults: undefined,
          })),
        })),

      setVisitSchedule: (schedule) => set({ visitSchedule: schedule }),

      addVisitSchedule: (schedule) =>
        set((state) => ({
          visitSchedule: [...state.visitSchedule, schedule],
        })),

      updateVisitSchedule: (id, updates) =>
        set((state) => ({
          visitSchedule: state.visitSchedule.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
          ),
        })),

      removeVisitSchedule: (id) =>
        set((state) => ({
          visitSchedule: state.visitSchedule.filter((s) => s.id !== id),
        })),

      setSubjectVisits: (visits) => set({ subjectVisits: visits }),

      addSubjectVisit: (visit) =>
        set((state) => ({
          subjectVisits: [...state.subjectVisits, visit],
        })),

      updateSubjectVisit: (id, updates) =>
        set((state) => ({
          subjectVisits: state.subjectVisits.map((v) =>
            v.id === id ? { ...v, ...updates, updatedAt: new Date() } : v
          ),
        })),

      removeSubjectVisit: (id) =>
        set((state) => ({
          subjectVisits: state.subjectVisits.filter((v) => v.id !== id),
        })),

      setMedications: (medications) => set({ medications }),

      addMedication: (medication) =>
        set((state) => ({
          medications: [...state.medications, medication],
        })),

      updateMedication: (id, updates) =>
        set((state) => ({
          medications: state.medications.map((m) =>
            m.id === id ? { ...m, ...updates, updatedAt: new Date() } : m
          ),
        })),

      removeMedication: (id) =>
        set((state) => ({
          medications: state.medications.filter((m) => m.id !== id),
        })),

      // Demographics Actions
      setSubjectDemographics: (demographics) => set({ subjectDemographics: demographics }),

      addSubjectDemographics: (demographics) =>
        set((state) => ({
          subjectDemographics: [...state.subjectDemographics, demographics],
        })),

      // Processing Actions
      setProcessing: (isProcessing, stage = 'idle', progress = 0) =>
        set({
          isProcessing,
          processingStage: stage,
          processingProgress: progress,
        }),

      // Settings Actions
      setSettings: (settings) => set({ settings }),

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      resetSettings: () => set({ settings: DEFAULT_CONFIG }),

      setTestResult: (result) => set({ testResult: result }),
      setIsTesting: (isTesting) => set({ isTesting }),

      // Error Actions
      setError: (error) => set({ error }),

      // Clear Actions
      clearWorksheetData: (worksheet) =>
        set(() => {
          switch (worksheet) {
            case 'inclusionCriteria':
              return { inclusionCriteria: [] };
            case 'exclusionCriteria':
              return { exclusionCriteria: [] };
            case 'visitSchedule':
              return { visitSchedule: [] };
            case 'subjectVisits':
              return { subjectVisits: [] };
            case 'medications':
              return { medications: [] };
          }
        }),

      clearAllWorksheetData: () =>
        set({
          inclusionCriteria: [],
          exclusionCriteria: [],
          visitSchedule: [],
          subjectVisits: [],
          medications: [],
          subjectDemographics: [],
        }),
    }),
    {
      name: 'cra-ai-assistant-storage',
      partialize: (state) => ({
        settings: state.settings,
        inclusionCriteria: state.inclusionCriteria,
        exclusionCriteria: state.exclusionCriteria,
        visitSchedule: state.visitSchedule,
        subjectVisits: state.subjectVisits,
        medications: state.medications,
        subjectDemographics: state.subjectDemographics,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Rehydrate Date objects from serialized strings
          const reviveDates = <T extends { createdAt?: unknown; updatedAt?: unknown }>(
            items: T[]
          ): T[] => {
            return items.map(item => ({
              ...item,
              createdAt: item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt as string),
              updatedAt: item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt as string),
            }));
          };

          state.inclusionCriteria = reviveDates(state.inclusionCriteria);
          state.exclusionCriteria = reviveDates(state.exclusionCriteria);
          state.visitSchedule = reviveDates(state.visitSchedule);
          state.subjectVisits = reviveDates(state.subjectVisits);
          state.medications = reviveDates(state.medications);

          // Auto-clear eligibility data on startup (stale results)
          const hasInclusionEligibility = state.inclusionCriteria.some(c => c.eligible !== undefined || c.fileResults !== undefined);
          const hasExclusionEligibility = state.exclusionCriteria.some(c => c.eligible !== undefined || c.fileResults !== undefined);

          if (hasInclusionEligibility || hasExclusionEligibility) {
            state.clearAllEligibility();
          }
        }
      },
    }
  )
);

// ============================================================================
// Helper Hooks
// ============================================================================

export const useStore = useAppStore;

export const useProtocolFiles = () => useAppStore((state) => state.protocolFiles);
export const useSubjectFiles = () => useAppStore((state) => state.subjectFiles);
export const useActiveWorksheet = () => useAppStore((state) => state.activeWorksheet);
export const useIsProcessing = () => useAppStore((state) => state.isProcessing);
export const useSettings = () => useAppStore((state) => state.settings);

// Worksheet data hooks
export const useInclusionCriteria = () => useAppStore((state) => state.inclusionCriteria);
export const useExclusionCriteria = () => useAppStore((state) => state.exclusionCriteria);
export const useVisitSchedule = () => useAppStore((state) => state.visitSchedule);
export const useSubjectVisits = () => useAppStore((state) => state.subjectVisits);
export const useMedications = () => useAppStore((state) => state.medications);
export const useSubjectDemographics = () => useAppStore((state) => state.subjectDemographics);

// Clear eligibility hooks
export const useClearInclusionEligibility = () =>
  useAppStore((state) => state.clearInclusionEligibility);
export const useClearExclusionEligibility = () =>
  useAppStore((state) => state.clearExclusionEligibility);
export const useClearAllEligibility = () =>
  useAppStore((state) => state.clearAllEligibility);
