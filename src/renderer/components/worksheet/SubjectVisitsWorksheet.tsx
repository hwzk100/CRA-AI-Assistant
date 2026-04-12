/**
 * CRA AI Assistant - Subject Visits Worksheet Component
 */

import React, { useState } from 'react';
import { useSubjectVisits, useStore } from '../../hooks/useStore';
import type { SubjectVisitData } from '@shared/types/worksheet';
import { generateId } from '@shared/types/worksheet';

export const SubjectVisitsWorksheet: React.FC = () => {
  const subjectVisits = useSubjectVisits();
  const addSubjectVisit = useStore(s => s.addSubjectVisit);
  const updateSubjectVisit = useStore(s => s.updateSubjectVisit);
  const removeSubjectVisit = useStore(s => s.removeSubjectVisit);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    subjectId: string;
    visits: Array<{
      id: string;
      visitType: string;
      plannedDate: string;
      actualDate: string;
      status: 'planned' | 'completed' | 'missed' | 'cancelled' | 'pending' | 'scheduled';
      notes: string;
    }>;
  }>({ subjectId: '', visits: [] });
  const [isAdding, setIsAdding] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedSubjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      return newSet;
    });
  };

  const handleEdit = (subject: SubjectVisitData) => {
    setEditingId(subject.subjectId);
    setEditForm({
      subjectId: subject.subjectId,
      visits: subject.visits.map((v) => ({
        id: v.id, visitType: v.visitType,
        plannedDate: v.plannedDate ? v.plannedDate.toISOString().split('T')[0] : '',
        actualDate: v.actualDate ? v.actualDate.toISOString().split('T')[0] : '',
        status: v.status, notes: v.notes || '',
      })),
    });
    setExpandedSubjects((prev) => new Set(prev).add(subject.subjectId));
  };

  const handleSave = () => {
    if (editingId) {
      updateSubjectVisit(editingId, {
        visits: editForm.visits.map((v) => ({
          id: v.id, visitType: v.visitType,
          plannedDate: v.plannedDate ? new Date(v.plannedDate) : undefined,
          actualDate: v.actualDate ? new Date(v.actualDate) : undefined,
          status: v.status, notes: v.notes,
        })),
      });
    }
    setEditingId(null);
    setEditForm({ subjectId: '', visits: [] });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ subjectId: '', visits: [] });
    setIsAdding(false);
  };

  const handleAdd = () => {
    const newSubject: SubjectVisitData = {
      id: generateId('subject'), subjectId: editForm.subjectId, subjectNumber: editForm.subjectId,
      visits: editForm.visits.map((v) => ({
        id: v.id || generateId('visit'), visitType: v.visitType,
        plannedDate: v.plannedDate ? new Date(v.plannedDate) : undefined,
        actualDate: v.actualDate ? new Date(v.actualDate) : undefined,
        status: v.status, notes: v.notes,
      })),
      createdAt: new Date(), updatedAt: new Date(),
    };
    addSubjectVisit(newSubject);
    setEditForm({ subjectId: '', visits: [] });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个受试者的访视记录吗？')) removeSubjectVisit(id);
  };

  const addVisit = () => {
    setEditForm({
      ...editForm,
      visits: [...editForm.visits, { id: generateId('visit'), visitType: '', plannedDate: '', actualDate: '', status: 'planned', notes: '' }],
    });
  };

  const updateVisit = (index: number, updates: any) => {
    setEditForm({ ...editForm, visits: editForm.visits.map((v, i) => (i === index ? { ...v, ...updates } : v)) });
  };

  const removeVisit = (index: number) => {
    setEditForm({ ...editForm, visits: editForm.visits.filter((_, i) => i !== index) });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'missed': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'missed': return '错过';
      case 'cancelled': return '已取消';
      default: return '计划中';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">受试者访视</h2>
          <p className="text-sm text-gray-500 mt-1">共 {subjectVisits.length} 位受试者</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span>添加受试者</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {subjectVisits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <p className="text-lg font-medium">暂无受试者访视记录</p>
            <p className="text-sm mt-2">上传受试者文档后，AI将自动提取访视信息</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subjectVisits.map((subject) => (
              <div key={subject.subjectId} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleExpanded(subject.subjectId)}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">{subject.subjectId.charAt(0)}</div>
                    <div>
                      <h3 className="font-medium text-gray-800">{subject.subjectId}</h3>
                      <p className="text-sm text-gray-500">{subject.visits.length} 次访视</p>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedSubjects.has(subject.subjectId) ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>

                {expandedSubjects.has(subject.subjectId) && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-white">
                    {editingId === subject.subjectId ? (
                      <div className="space-y-3">
                        {editForm.visits.map((visit, i) => (
                          <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                            <input type="text" value={visit.visitType} onChange={(e) => updateVisit(i, { visitType: e.target.value })} placeholder="访视类型" className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" />
                            <div className="grid grid-cols-2 gap-2">
                              <div><label className="text-xs text-gray-500">计划日期</label><input type="date" value={visit.plannedDate} onChange={(e) => updateVisit(i, { plannedDate: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" /></div>
                              <div><label className="text-xs text-gray-500">实际日期</label><input type="date" value={visit.actualDate} onChange={(e) => updateVisit(i, { actualDate: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" /></div>
                            </div>
                            <select value={visit.status} onChange={(e) => updateVisit(i, { status: e.target.value as any })} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm">
                              <option value="planned">计划中</option><option value="completed">已完成</option><option value="missed">错过</option><option value="cancelled">已取消</option>
                            </select>
                            <textarea value={visit.notes} onChange={(e) => updateVisit(i, { notes: e.target.value })} placeholder="备注" rows={2} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none" />
                            <button onClick={() => removeVisit(i)} className="text-sm text-red-500 hover:text-red-600">删除访视</button>
                          </div>
                        ))}
                        <button onClick={addVisit} className="text-sm text-primary-500 hover:text-primary-600">+ 添加访视</button>
                        <div className="flex items-center space-x-2">
                          <button onClick={handleSave} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">保存</button>
                          <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {subject.visits.map((visit, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-700">{visit.visitType}</span>
                              {visit.plannedDate && <span className="text-xs text-gray-500">计划: {visit.plannedDate.toLocaleDateString()}</span>}
                              {visit.actualDate && <span className="text-xs text-gray-500">实际: {visit.actualDate.toLocaleDateString()}</span>}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(visit.status)}`}>{getStatusText(visit.status)}</span>
                          </div>
                        ))}
                        <div className="flex items-center space-x-2 pt-2">
                          <button onClick={() => handleEdit(subject)} className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">编辑</button>
                          <button onClick={() => handleDelete(subject.subjectId)} className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors">删除</button>
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
              <h3 className="text-lg font-semibold">添加受试者</h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <input type="text" value={editForm.subjectId} onChange={(e) => setEditForm({ ...editForm, subjectId: e.target.value })} placeholder="受试者编号（如：SUB-001）" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">访视记录</h4>
                  <button onClick={addVisit} className="text-sm text-primary-500 hover:text-primary-600">+ 添加访视</button>
                </div>
                <div className="space-y-2">
                  {editForm.visits.map((visit, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                      <input type="text" value={visit.visitType} onChange={(e) => updateVisit(i, { visitType: e.target.value })} placeholder="访视类型" className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" />
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-xs text-gray-500">计划日期</label><input type="date" value={visit.plannedDate} onChange={(e) => updateVisit(i, { plannedDate: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" /></div>
                        <div><label className="text-xs text-gray-500">实际日期</label><input type="date" value={visit.actualDate} onChange={(e) => updateVisit(i, { actualDate: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" /></div>
                      </div>
                      <select value={visit.status} onChange={(e) => updateVisit(i, { status: e.target.value as any })} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm">
                        <option value="planned">计划中</option><option value="completed">已完成</option><option value="missed">错过</option><option value="cancelled">已取消</option>
                      </select>
                      <textarea value={visit.notes} onChange={(e) => updateVisit(i, { notes: e.target.value })} placeholder="备注" rows={2} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none" />
                      <button onClick={() => removeVisit(i)} className="text-sm text-red-500 hover:text-red-600">删除访视</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={handleAdd} disabled={!editForm.subjectId} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
