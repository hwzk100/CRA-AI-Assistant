/**
 * CRA AI Assistant - File Upload Zone Component
 * Adapted from V4.0 to work with current project's IPC methods
 */

import React, { useCallback, useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { StorageZone, FileType, FileStatus } from '@shared/types/worksheet';
import { generateId } from '@shared/types/worksheet';

interface FileZoneProps {
  zone: StorageZone;
  title: string;
  description: string;
  icon: string;
  acceptedTypes: FileType[];
}

export const FileZone: React.FC<FileZoneProps> = ({
  zone,
  title,
  description,
  icon,
  acceptedTypes,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Subscribe to both file lists and select in render
  const protocolFiles = useStore((state) => state.protocolFiles);
  const subjectFiles = useStore((state) => state.subjectFiles);
  const files = zone === StorageZone.PROTOCOL ? protocolFiles : subjectFiles;

  // Subscribe to store actions
  const addFile = useStore((state) => state.addFile);
  const updateFileStatus = useStore((state) => state.updateFileStatus);
  const setProtocolFiles = useStore((state) => state.setProtocolFiles);
  const setSubjectFiles = useStore((state) => state.setSubjectFiles);
  const removeFile = useStore((state) => state.removeFile);
  const setProcessing = useStore((state) => state.setProcessing);
  const globalIsProcessing = useStore((state) => state.isProcessing);

  // Computed values
  const pendingCount = files.filter(f => f.status === FileStatus.PENDING || f.status === FileStatus.FAILED).length;

  // Clear all files handler
  const handleClearAll = () => {
    if (files.length === 0) return;
    const zoneName = zone === StorageZone.PROTOCOL ? '方案' : '受试者';
    if (confirm(`确定要清空所有${zoneName}文件吗？`)) {
      if (zone === StorageZone.PROTOCOL) {
        setProtocolFiles([]);
      } else {
        setSubjectFiles([]);
      }
    }
  };

  // Handle file selection via native dialog
  const handleFileDialog = async () => {
    try {
      const filePaths = await window.electronAPI.openFileDialog();
      if (!filePaths || filePaths.length === 0) return;

      for (const fp of filePaths) {
        const fileName = fp.split(/[\\/]/).pop() || fp;
        const ext = fileName.toLowerCase().split('.').pop() || '';
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const fileInfo = {
          id: fileId,
          name: fileName,
          path: fp,
          size: 0, // unknown until processed
          type: ext === 'pdf' ? FileType.PDF : FileType.IMAGE,
          status: FileStatus.PENDING,
          uploadedAt: new Date(),
        };

        addFile(zone, fileInfo);
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
    }
  };

  // Process a single file using current project's IPC
  const processSingleFile = async (fileInfo: any): Promise<boolean> => {
    const { id: fileId, path: filePath } = fileInfo;

    try {
      updateFileStatus(zone, fileId, FileStatus.PROCESSING);

      // Check API key via settings
      const settings = useStore.getState().settings;
      if (!settings.apiKey) {
        updateFileStatus(zone, fileId, FileStatus.FAILED, '请先在设置中配置 API Key');
        return false;
      }

      if (zone === StorageZone.PROTOCOL) {
        // Step 1: Upload file
        console.log('[FileZone] Uploading protocol file:', filePath);
        const uploadResult = await window.electronAPI.uploadProtocolFile(filePath);
        if (!uploadResult.success) {
          console.error('[FileZone] Upload failed:', uploadResult.message);
          updateFileStatus(zone, fileId, FileStatus.FAILED, uploadResult.message || '上传失败');
          return false;
        }
        console.log('[FileZone] Upload succeeded, file type:', uploadResult.fileType);

        // Step 2: Extract criteria
        console.log('[FileZone] Extracting criteria...');
        const criteriaResult = await window.electronAPI.extractCriteria();
        console.log('[FileZone] Criteria extraction result:', criteriaResult ? 'received' : 'null');
        if (criteriaResult && criteriaResult.criteria) {
          const { setInclusionCriteria, setExclusionCriteria, setVisitSchedule } = useStore.getState();
          const allCriteria = criteriaResult.criteria;
          console.log('[FileZone] Criteria count:', allCriteria.length);

          // Split into inclusion and exclusion
          const inclusionData = allCriteria
            .filter((c: any) => c.category === 'inclusion')
            .map((c: any, i: number) => ({
              id: `inc_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
              category: '入选标准',
              description: c.content,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
          setInclusionCriteria(inclusionData);

          const exclusionData = allCriteria
            .filter((c: any) => c.category === 'exclusion')
            .map((c: any, i: number) => ({
              id: `exc_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
              category: '排除标准',
              description: c.content,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
          setExclusionCriteria(exclusionData);

          // Also extract visit schedules if available
          if (criteriaResult.visitSchedules) {
            const visitData = criteriaResult.visitSchedules.map((v: any, i: number) => ({
              id: `visit_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
              visitType: v.visitName || v.timing || '',
              visitDay: v.timing || '',
              visitWindow: v.visitWindow || '',
              description: '',
              items: (v.procedures || []).map((p: any, j: number) => ({
                id: `item_${j}`,
                name: typeof p === 'string' ? p : p.name || '',
                category: '',
                required: false,
              })),
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
            setVisitSchedule(visitData);
          }
        }
      } else {
        // SUBJECT zone
        // Step 1: Upload file
        console.log('[FileZone] Uploading subject file:', filePath);
        const uploadResult = await window.electronAPI.uploadSubjectFile(filePath);
        if (!uploadResult.success) {
          console.error('[FileZone] Upload failed:', uploadResult.message);
          updateFileStatus(zone, fileId, FileStatus.FAILED, uploadResult.message || '上传失败');
          return false;
        }
        console.log('[FileZone] Upload succeeded, file type:', uploadResult.fileType);

        // Step 2: Extract subject data
        console.log('[FileZone] Extracting subject data...');
        const subjectResult = await window.electronAPI.extractSubjectData();
        console.log('[FileZone] Subject extraction result:', subjectResult ? 'received' : 'null');
        if (subjectResult && subjectResult.subjectData) {
          const data = subjectResult.subjectData;
          const { addSubjectDemographics, setMedications } = useStore.getState();

          // Store demographics
          if (data.demographics) {
            addSubjectDemographics({
              subjectNumber: data.demographics.subjectId,
              age: data.demographics.age,
              gender: data.demographics.gender,
              ethnicity: data.demographics.ethnicity,
            });
          }

          // Store medications
          if (data.medications && Array.isArray(data.medications)) {
            const medRecords = data.medications.map((m: any, i: number) => ({
              id: `med_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
              subjectId: data.demographics?.subjectId || '未知',
              visitType: '访视',
              medicationName: m.medicationName || '',
              dosage: m.dosage || '',
              frequency: m.frequency || '',
              route: '',
              startDate: m.startDate ? new Date(m.startDate) : new Date(),
              endDate: m.endDate ? new Date(m.endDate) : undefined,
              indication: m.indication,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
            setMedications([...useStore.getState().medications, ...medRecords]);
          }

          // Step 3: Verify eligibility (if criteria exist)
          const { inclusionCriteria, exclusionCriteria } = useStore.getState();
          if (inclusionCriteria.length > 0 || exclusionCriteria.length > 0) {
            try {
              console.log('[FileZone] Verifying eligibility...');
              const eligibilityResult = await window.electronAPI.verifyEligibility();
              if (eligibilityResult && eligibilityResult.report) {
                const report = eligibilityResult.report;
                const {
                  updateInclusionEligibility,
                  updateExclusionEligibility,
                } = useStore.getState();

                report.results.forEach((r: any) => {
                  if (r.category === 'inclusion') {
                    const match = inclusionCriteria.find(c => c.description === r.criterionContent);
                    if (match) {
                      updateInclusionEligibility(
                        match.id,
                        r.status === 'pass',
                        r.evidence
                      );
                    }
                  } else if (r.category === 'exclusion') {
                    const match = exclusionCriteria.find(c => c.description === r.criterionContent);
                    if (match) {
                      updateExclusionEligibility(
                        match.id,
                        r.status === 'fail',
                        r.evidence
                      );
                    }
                  }
                });
              }
            } catch (eligError) {
              console.error('[FileZone] Eligibility verification failed:', eligError);
            }
          }
        }
      }

      console.log('[FileZone] File processing completed:', fileId);
      updateFileStatus(zone, fileId, FileStatus.COMPLETED);
      return true;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[FileZone] Failed to process file:', errMsg);
      updateFileStatus(zone, fileId, FileStatus.FAILED, errMsg || '处理失败');
      return false;
    }
  };

  const getFileIcon = (type: FileType): string => {
    switch (type) {
      case FileType.PDF:
        return '📄';
      case FileType.IMAGE:
        return '🖼️';
      default:
        return '📁';
    }
  };

  const getStatusColor = (status: FileStatus): string => {
    switch (status) {
      case FileStatus.PENDING:
        return 'bg-gray-100 text-gray-600';
      case FileStatus.PROCESSING:
        return 'bg-blue-100 text-blue-600';
      case FileStatus.COMPLETED:
        return 'bg-green-100 text-green-600';
      case FileStatus.FAILED:
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: FileStatus): string => {
    switch (status) {
      case FileStatus.PENDING:
        return '等待中';
      case FileStatus.PROCESSING:
        return '处理中';
      case FileStatus.COMPLETED:
        return '已完成';
      case FileStatus.FAILED:
        return '失败';
      default:
        return '未知';
    }
  };

  // Support multi-file drag and drop
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      const filePath = (file as any).path;
      if (!filePath) continue; // skip if no full path available

      const fileName = file.name;
      const ext = fileName.toLowerCase().split('.').pop() || '';
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const fileInfo = {
        id: fileId,
        name: fileName,
        path: filePath,
        size: file.size,
        type: ext === 'pdf' ? FileType.PDF : FileType.IMAGE,
        status: FileStatus.PENDING,
        uploadedAt: new Date(),
      };

      addFile(zone, fileInfo);
    }
  }, [zone]);

  // Start processing all pending files
  const handleStartProcessing = async () => {
    // Pre-check API key
    const settings = useStore.getState().settings;
    if (!settings.apiKey) {
      alert('请先在设置中配置 API Key');
      return;
    }

    const currentFiles = zone === StorageZone.PROTOCOL
      ? useStore.getState().protocolFiles
      : useStore.getState().subjectFiles;
    const filesToProcess = currentFiles.filter(
      f => f.status === FileStatus.PENDING || f.status === FileStatus.FAILED
    );

    if (filesToProcess.length === 0) return;

    setProcessing(true, 'processing', 0);

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        const progress = Math.round(((i) / filesToProcess.length) * 100);
        setProcessing(true, 'processing', progress);

        // Safety timeout: 5 minutes per file max
        const timeoutMs = 5 * 60 * 1000;
        const result = await Promise.race([
          processSingleFile(filesToProcess[i]),
          new Promise<false>((_, reject) =>
            setTimeout(() => {
              updateFileStatus(zone, filesToProcess[i].id, FileStatus.FAILED, '处理超时，请重试');
              reject(new Error('timeout'));
            }, timeoutMs)
          ),
        ]).catch((err) => {
          if (err instanceof Error && err.message === 'timeout') return false as const;
          throw err;
        });
      }
    } finally {
      setProcessing(false, 'idle', 100);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Upload Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={handleFileDialog}
        className={`
          border-2 border-dashed rounded-lg p-3 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
        `}
      >
        <div className="text-2xl mb-1">{icon}</div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
        <p className="text-xs text-gray-500 mb-2">{description}</p>
        <div className="inline-flex items-center px-3 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
          <span className="text-xs font-medium">选择文件</span>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 mt-4 overflow-y-auto">
        {/* File List Header */}
        {files.length > 0 && (
          <div className="flex items-center justify-between px-2 py-2 mb-2 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-600">
              已上传 {files.length} 个文件
            </span>
            <div className="flex items-center space-x-2">
              {pendingCount > 0 && (
                <button
                  onClick={handleStartProcessing}
                  disabled={globalIsProcessing}
                  className={`text-xs px-2.5 py-1 rounded transition-colors flex items-center space-x-1 ${
                    globalIsProcessing
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {globalIsProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                      <span>处理中...</span>
                    </>
                  ) : (
                    <span>开始处理 ({pendingCount})</span>
                  )}
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center space-x-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>清空全部</span>
              </button>
            </div>
          </div>
        )}
        {files.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-sm">暂无文件</span>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-xl flex-shrink-0">{getFileIcon(file.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                    {file.errorMessage ? (
                      <p className="text-xs text-red-500 truncate" title={file.errorMessage}>
                        {file.errorMessage}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">
                        {file.size > 0 ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(file.status)}`}>
                    {getStatusText(file.status)}
                  </span>
                  <button
                    onClick={() => {
                      removeFile(zone, file.id);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="删除文件"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
