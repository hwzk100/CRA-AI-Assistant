/**
 * CRA AI Assistant - Inclusion Criteria Worksheet Component
 */

import React, { useState } from 'react';
import { useInclusionCriteria, useStore, useSubjectFiles } from '../../hooks/useStore';
import type { InclusionCriteria, InclusionFileResult } from '@shared/types/worksheet';
import { generateId } from '@shared/types/worksheet';

export const InclusionCriteriaWorksheet: React.FC = () => {
  const inclusionCriteria = useInclusionCriteria();
  const subjectFiles = useSubjectFiles();
  const addInclusionCriteria = useStore(s => s.addInclusionCriteria);
  const updateInclusionCriteria = useStore(s => s.updateInclusionCriteria);
  const removeInclusionCriteria = useStore(s => s.removeInclusionCriteria);
  const clearInclusionEligibility = useStore(s => s.clearInclusionEligibility);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ category: string; description: string }>({
    category: '',
    description: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleEdit = (criteria: InclusionCriteria) => {
    setEditingId(criteria.id);
    setEditForm({
      category: criteria.category,
      description: criteria.description,
    });
  };

  const handleSave = () => {
    if (editingId) {
      updateInclusionCriteria(editingId, {
        ...editForm,
        updatedAt: new Date(),
      });
    }
    setEditingId(null);
    setEditForm({ category: '', description: '' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ category: '', description: '' });
    setIsAdding(false);
  };

  const handleAdd = () => {
    const newCriteria: InclusionCriteria = {
      id: generateId(),
      category: editForm.category || '未分类',
      description: editForm.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addInclusionCriteria(newCriteria);
    setEditForm({ category: '', description: '' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条入选标准吗？')) {
      removeInclusionCriteria(id);
    }
  };

  // Merge multi-file results into single conclusion
  const getMergedResult = (criteria: InclusionCriteria) => {
    if (criteria.eligible !== undefined) {
      return { eligible: criteria.eligible, reason: criteria.reason };
    }

    if (criteria.fileResults && criteria.fileResults.length > 0) {
      const fileResults = criteria.fileResults;

      if (fileResults.length === 1) {
        return { eligible: fileResults[0].eligible, reason: fileResults[0].reason };
      }

      const allEligible = fileResults.every(r => r.eligible === true);
      const allIneligible = fileResults.every(r => r.eligible === false);

      if (allEligible) {
        return { eligible: true, reason: `所有文件均符合：${fileResults.map(r => r.fileName).join('、')}` };
      }
      if (allIneligible) {
        return { eligible: false, reason: `所有文件均不符合：${fileResults.map(r => r.fileName).join('、')}` };
      }

      const eligibleCount = fileResults.filter(r => r.eligible).length;
      const totalCount = fileResults.length;
      if (eligibleCount > totalCount / 2) {
        return { eligible: true, reason: `多数符合 (${eligibleCount}/${totalCount} 个文件)` };
      } else {
        return { eligible: false, reason: `多数不符合 (${totalCount - eligibleCount}/${totalCount} 个文件)` };
      }
    }

    return null;
  };

  const groupedCriteria = inclusionCriteria.reduce((acc, criteria) => {
    const category = criteria.category || '未分类';
    if (!acc[category]) acc[category] = [];
    acc[category].push(criteria);
    return acc;
  }, {} as Record<string, InclusionCriteria[]>);

  const hasAnalyzedData = inclusionCriteria.some(c => c.eligible !== undefined || (c.fileResults && c.fileResults.length > 0));

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">入选标准</h2>
          <p className="text-sm text-gray-500 mt-1">
            共 {inclusionCriteria.length} 条标准，{Object.keys(groupedCriteria).length} 个分类
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasAnalyzedData && (
            <button
              onClick={() => {
                if (confirm('确定要清除所有分析结果吗？')) clearInclusionEligibility();
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>清除分析结果</span>
            </button>
          )}
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>添加标准</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {inclusionCriteria.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">暂无入选标准</p>
            <p className="text-sm mt-2">上传方案文档后，AI将自动提取入选标准</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCriteria).map(([category, criteria]) => (
              <div key={category} className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-700 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {category}
                  <span className="text-sm text-gray-400 font-normal ml-2">({criteria.length})</span>
                </h3>
                <div className="space-y-2">
                  {criteria.map((c) => (
                    <div
                      key={c.id}
                      className={`bg-white border rounded-lg p-3 hover:border-gray-300 transition-colors ${
                        c.eligible === true ? 'border-green-300 bg-green-50' :
                        c.eligible === false ? 'border-red-300 bg-red-50' :
                        'border-gray-200'
                      }`}
                    >
                      {editingId === c.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            placeholder="分类"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          />
                          <textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="标准描述"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none"
                          />
                          <div className="flex items-center space-x-2">
                            <button onClick={handleSave} className="px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors text-sm">保存</button>
                            <button onClick={handleCancel} className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm">取消</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-gray-700">{c.description}</p>
                            {(() => {
                              const mergedResult = getMergedResult(c);
                              if (mergedResult) {
                                return (
                                  <div className="flex items-center space-x-2 mt-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      mergedResult.eligible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                      {mergedResult.eligible ? '符合' : '不符合'}
                                    </span>
                                    <span className="text-sm text-gray-600">{mergedResult.reason}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button onClick={() => handleEdit(c)} className="p-1 text-gray-400 hover:text-primary-500 transition-colors" title="编辑">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="删除">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Form */}
        {isAdding && (
          <div className="fixed bottom-0 right-0 w-96 bg-white border-t border-gray-200 shadow-lg p-4">
            <h4 className="text-lg font-medium text-gray-800 mb-3">添加入选标准</h4>
            <div className="space-y-3">
              <input
                type="text"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                placeholder="分类"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="标准描述"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAdd}
                  disabled={!editForm.description}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  添加
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
