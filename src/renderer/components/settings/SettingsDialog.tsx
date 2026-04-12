/**
 * CRA AI Assistant - Settings Dialog Component
 * Adapted for current AppConfig shape (provider, textModel, visionModel)
 */

import React, { useState, useEffect } from 'react';
import { useSettings, useStore } from '../../hooks/useStore';
import type { AppConfig } from '@shared/types/config';
import { DEFAULT_CONFIG } from '@shared/types/config';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const settings = useSettings();
  const updateSettings = useStore((state) => state.updateSettings);
  const resetSettings = useStore((state) => state.resetSettings);

  const [localSettings, setLocalSettings] = useState<AppConfig>(settings);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setTestResult(null);
    }
  }, [settings, isOpen]);

  const handleSave = () => {
    updateSettings(localSettings);
    // Also persist to main process
    window.electronAPI.saveSettings(localSettings).catch(() => {});
    onClose();
  };

  const handleReset = () => {
    resetSettings();
    setLocalSettings(DEFAULT_CONFIG);
    window.electronAPI.saveSettings(DEFAULT_CONFIG).catch(() => {});
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Save first so test uses the current settings
      await window.electronAPI.saveSettings(localSettings);
      updateSettings(localSettings);

      const result = await window.electronAPI.testConnection();
      if (result && result.success) {
        setTestResult({
          success: true,
          message: `连接成功！模型: ${result.model || '未知'}${result.latency ? ` (${result.latency}ms)` : ''}`,
        });
      } else {
        setTestResult({
          success: false,
          message: result?.message || '连接失败',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '连接测试失败',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">设置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Provider Selection */}
          <section>
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <span className="mr-2">🔌</span>
              服务商
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setLocalSettings({ ...localSettings, provider: 'zhipu' })}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors font-medium ${
                  localSettings.provider === 'zhipu'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                智谱 AI
              </button>
              <button
                onClick={() => setLocalSettings({ ...localSettings, provider: 'openai' })}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors font-medium ${
                  localSettings.provider === 'openai'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                OpenAI 兼容
              </button>
            </div>
          </section>

          {/* API Configuration */}
          <section>
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <span className="mr-2">🔑</span>
              API 配置
            </h3>

            <div className="space-y-4">
              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={localSettings.apiKey}
                  onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                  placeholder="输入 API Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {localSettings.provider === 'zhipu' && (
                  <p className="text-xs text-gray-500 mt-1">
                    获取 API Key:{' '}
                    <a
                      href="https://open.bigmodel.cn/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                      onClick={(e) => e.preventDefault()}
                    >
                      https://open.bigmodel.cn/
                    </a>
                  </p>
                )}
              </div>

              {/* Test Connection */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleTestConnection}
                  disabled={!localSettings.apiKey || isTesting}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isTesting ? '测试中...' : '测试连接'}
                </button>

                {testResult && (
                  <div className={`flex items-center space-x-1 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{testResult.success ? '✓' : '✗'}</span>
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* API Endpoint */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API 端点
                </label>
                <input
                  type="text"
                  value={localSettings.provider === 'zhipu' ? localSettings.apiEndpoint : (localSettings.openaiApiEndpoint || '')}
                  onChange={(e) => {
                    if (localSettings.provider === 'zhipu') {
                      setLocalSettings({ ...localSettings, apiEndpoint: e.target.value });
                    } else {
                      setLocalSettings({ ...localSettings, openaiApiEndpoint: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Model Selection */}
              {localSettings.provider === 'zhipu' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      文本模型
                    </label>
                    <select
                      value={localSettings.textModel}
                      onChange={(e) => setLocalSettings({ ...localSettings, textModel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="glm-5.1">GLM-5.1</option>
                      <option value="glm-4">GLM-4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      视觉模型
                    </label>
                    <select
                      value={localSettings.visionModel}
                      onChange={(e) => setLocalSettings({ ...localSettings, visionModel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="glm-4.6v-flash">GLM-4.6V-Flash</option>
                      <option value="glm-4v">GLM-4V</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    模型名称
                  </label>
                  <input
                    type="text"
                    value={localSettings.openaiModel || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, openaiModel: e.target.value })}
                    placeholder="如: gpt-4o"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            重置默认
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
