/**
 * CRA AI Assistant - Header Component
 */

import React, { useState } from 'react';
import { useSettings, useIsProcessing, useStore } from '../../hooks/useStore';
import { SettingsDialog } from '../settings/SettingsDialog';

export const Header: React.FC = () => {
  const settings = useSettings();
  const isProcessing = useIsProcessing();
  const processingProgress = useStore((state) => state.processingProgress);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const inclusionCriteria = useStore((state) => state.inclusionCriteria);
  const exclusionCriteria = useStore((state) => state.exclusionCriteria);
  const visitSchedule = useStore((state) => state.visitSchedule);
  const subjectVisits = useStore((state) => state.subjectVisits);
  const medications = useStore((state) => state.medications);
  const subjectDemographics = useStore((state) => state.subjectDemographics);

  const hasData =
    inclusionCriteria.length > 0 ||
    exclusionCriteria.length > 0 ||
    visitSchedule.length > 0 ||
    subjectVisits.length > 0 ||
    medications.length > 0 ||
    subjectDemographics.length > 0;

  return (
    <>
      <header className="h-14 bg-primary-600 text-white flex items-center justify-between px-4 shadow-md">
        {/* Left Section - Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-primary-600 font-bold text-lg">C</span>
          </div>
          <h1 className="text-xl font-semibold">CRA AI Assistant</h1>
        </div>

        {/* Center Section - Processing Status */}
        {isProcessing && (
          <div className="flex items-center space-x-2 bg-primary-700 px-4 py-1.5 rounded-full">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span className="text-sm font-medium">
              处理中{processingProgress > 0 ? ` (${processingProgress}%)` : '...'}
            </span>
          </div>
        )}

        {/* Right Section - Actions */}
        <div className="flex items-center space-x-2">
          {/* Export Button - disabled since exportTracker IPC doesn't exist yet */}
          <button
            disabled={true}
            className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 bg-gray-400 text-gray-200 cursor-not-allowed"
            title="导出Excel（即将推出）"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium">导出</span>
          </button>

          {/* API Status Indicator */}
          {settings.apiKey ? (
            <div className="flex items-center space-x-1.5 bg-primary-700 px-3 py-1.5 rounded-md">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs font-medium">API 已连接</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-red-500 px-3 py-1.5 rounded-md">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-xs font-medium">API 未配置</span>
            </div>
          )}

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-primary-700 rounded-lg transition-colors"
            title="设置"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
