/**
 * CRA AI Assistant - Visit Schedule Worksheet Component
 */

import React, { useState } from 'react';
import { useVisitSchedule, useStore } from '../../hooks/useStore';
import type { VisitSchedule, VisitItem } from '@shared/types/worksheet';
import { generateId } from '@shared/types/worksheet';

export const VisitScheduleWorksheet: React.FC = () => {
  const visitSchedule = useVisitSchedule();
  const addVisitSchedule = useStore(s => s.addVisitSchedule);
  const updateVisitSchedule = useStore(s => s.updateVisitSchedule);
  const removeVisitSchedule = useStore(s => s.removeVisitSchedule);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    visitType: string;
    visitDay: string;
    visitWindow: string;
    description: string;
    items: VisitItem[];
  }>({ visitType: '', visitDay: '', visitWindow: '', description: '', items: [] });
  const [isAdding, setIsAdding] = useState(false);
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedVisits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      return newSet;
    });
  };

  const handleEdit = (visit: VisitSchedule) => {
    setEditingId(visit.id);
    setEditForm({
      visitType: visit.visitType, visitDay: visit.visitDay, visitWindow: visit.visitWindow,
      description: visit.description, items: visit.items,
    });
    setExpandedVisits((prev) => new Set(prev).add(visit.id));
  };

  const handleSave = () => {
    if (editingId) {
      updateVisitSchedule(editingId, { ...editForm, updatedAt: new Date() });
    }
    setEditingId(null);
    setEditForm({ visitType: '', visitDay: '', visitWindow: '', description: '', items: [] });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ visitType: '', visitDay: '', visitWindow: '', description: '', items: [] });
    setIsAdding(false);
  };

  const handleAdd = () => {
    const newVisit: VisitSchedule = {
      id: generateId(), visitType: editForm.visitType, visitDay: editForm.visitDay,
      visitWindow: editForm.visitWindow, description: editForm.description,
      items: editForm.items, createdAt: new Date(), updatedAt: new Date(),
    };
    addVisitSchedule(newVisit);
    setEditForm({ visitType: '', visitDay: '', visitWindow: '', description: '', items: [] });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个访视吗？')) removeVisitSchedule(id);
  };

  const addItem = () => {
    setEditForm({
      ...editForm,
      items: [...editForm.items, { id: `item_${Date.now()}`, name: '', category: '', required: false }],
    });
  };

  const updateItem = (index: number, updates: Partial<VisitItem>) => {
    setEditForm({ ...editForm, items: editForm.items.map((item, i) => (i === index ? { ...item, ...updates } : item)) });
  };

  const removeItem = (index: number) => {
    setEditForm({ ...editForm, items: editForm.items.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">访视计划</h2>
          <p className="text-sm text-gray-500 mt-1">共 {visitSchedule.length} 个访视</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span>添加访视</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {visitSchedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-lg font-medium">暂无访视计划</p>
            <p className="text-sm mt-2">上传方案文档后，AI将自动提取访视计划</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visitSchedule.map((visit, index) => (
              <div key={visit.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                {/* Visit Header */}
                <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleExpanded(visit.id)}>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">{index + 1}</div>
                    <div>
                      <h3 className="font-medium text-gray-800">{visit.visitType}</h3>
                      <p className="text-sm text-gray-500">{visit.visitDay}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">{visit.items.length} 项检查</span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedVisits.has(visit.id) ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* Visit Details */}
                {expandedVisits.has(visit.id) && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-white">
                    {editingId === visit.id ? (
                      <div className="space-y-3">
                        <input type="text" value={editForm.visitType} onChange={(e) => setEditForm({ ...editForm, visitType: e.target.value })} placeholder="访视名称" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                        <input type="text" value={editForm.visitDay} onChange={(e) => setEditForm({ ...editForm, visitDay: e.target.value })} placeholder="访视时间（如：第1天）" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                        <input type="text" value={editForm.visitWindow} onChange={(e) => setEditForm({ ...editForm, visitWindow: e.target.value })} placeholder="时间窗口（如：±3天）" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                        <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="描述" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" />
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-700">检查项目</h4>
                            <button onClick={addItem} className="text-sm text-primary-500 hover:text-primary-600">+ 添加项目</button>
                          </div>
                          <div className="space-y-2">
                            {editForm.items.map((item, i) => (
                              <div key={item.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                <input type="text" value={item.name} onChange={(e) => updateItem(i, { name: e.target.value })} placeholder="项目名称" className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" />
                                <input type="text" value={item.category} onChange={(e) => updateItem(i, { category: e.target.value })} placeholder="分类" className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" />
                                <label className="flex items-center space-x-1 text-sm"><input type="checkbox" checked={item.required} onChange={(e) => updateItem(i, { required: e.target.checked })} className="rounded" /><span>必选</span></label>
                                <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button onClick={handleSave} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">保存</button>
                          <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-2"><span className="text-gray-500">时间窗口:</span><span className="text-gray-700">{visit.visitWindow || '未设置'}</span></div>
                          {visit.description && <div className="flex items-center space-x-2"><span className="text-gray-500">描述:</span><span className="text-gray-700">{visit.description}</span></div>}
                        </div>
                        {visit.items.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">检查项目</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {visit.items.map((item) => (
                                <div key={item.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border border-gray-200">
                                  {item.required && <span className="text-red-500">*</span>}
                                  <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                                  {item.category && <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">{item.category}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 pt-2">
                          <button onClick={() => handleEdit(visit)} className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">编辑</button>
                          <button onClick={() => handleDelete(visit.id)} className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors">删除</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Form Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">添加访视</h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <input type="text" value={editForm.visitType} onChange={(e) => setEditForm({ ...editForm, visitType: e.target.value })} placeholder="访视名称（如：筛选访视）" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              <input type="text" value={editForm.visitDay} onChange={(e) => setEditForm({ ...editForm, visitDay: e.target.value })} placeholder="访视时间（如：第1天）" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              <input type="text" value={editForm.visitWindow} onChange={(e) => setEditForm({ ...editForm, visitWindow: e.target.value })} placeholder="时间窗口（如：±3天）" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="描述" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">检查项目</h4>
                  <button onClick={addItem} className="text-sm text-primary-500 hover:text-primary-600">+ 添加项目</button>
                </div>
                <div className="space-y-2">
                  {editForm.items.map((item, i) => (
                    <div key={item.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <input type="text" value={item.name} onChange={(e) => updateItem(i, { name: e.target.value })} placeholder="项目名称" className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" />
                      <input type="text" value={item.category} onChange={(e) => updateItem(i, { category: e.target.value })} placeholder="分类" className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" />
                      <label className="flex items-center space-x-1 text-sm"><input type="checkbox" checked={item.required} onChange={(e) => updateItem(i, { required: e.target.checked })} className="rounded" /><span>必选</span></label>
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={handleAdd} disabled={!editForm.visitType} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
