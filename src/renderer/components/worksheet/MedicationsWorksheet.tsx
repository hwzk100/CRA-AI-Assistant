/**
 * CRA AI Assistant - Medications Worksheet Component
 */

import React, { useState } from 'react';
import { useMedications, useStore } from '../../hooks/useStore';
import type { MedicationRecord } from '@shared/types/worksheet';
import { generateId } from '@shared/types/worksheet';

export const MedicationsWorksheet: React.FC = () => {
  const medications = useMedications();
  const addMedication = useStore(s => s.addMedication);
  const updateMedication = useStore(s => s.updateMedication);
  const removeMedication = useStore(s => s.removeMedication);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    subjectId: string; visitType: string; medicationName: string;
    dosage: string; frequency: string; route: string;
    startDate: string; endDate: string; notes: string;
  }>({ subjectId: '', visitType: '', medicationName: '', dosage: '', frequency: '', route: '', startDate: '', endDate: '', notes: '' });
  const [isAdding, setIsAdding] = useState(false);

  const handleEdit = (medication: MedicationRecord) => {
    setEditingId(medication.id);
    setEditForm({
      subjectId: medication.subjectId, visitType: medication.visitType,
      medicationName: medication.medicationName, dosage: medication.dosage,
      frequency: medication.frequency, route: medication.route,
      startDate: medication.startDate.toISOString().split('T')[0],
      endDate: medication.endDate ? medication.endDate.toISOString().split('T')[0] : '',
      notes: medication.notes || '',
    });
  };

  const handleSave = () => {
    if (editingId) {
      updateMedication(editingId, {
        ...editForm, startDate: new Date(editForm.startDate),
        endDate: editForm.endDate ? new Date(editForm.endDate) : undefined,
      });
    }
    setEditingId(null);
    setEditForm({ subjectId: '', visitType: '', medicationName: '', dosage: '', frequency: '', route: '', startDate: '', endDate: '', notes: '' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ subjectId: '', visitType: '', medicationName: '', dosage: '', frequency: '', route: '', startDate: '', endDate: '', notes: '' });
    setIsAdding(false);
  };

  const handleAdd = () => {
    const newMedication: MedicationRecord = {
      id: generateId(), subjectId: editForm.subjectId, visitType: editForm.visitType,
      medicationName: editForm.medicationName, dosage: editForm.dosage,
      frequency: editForm.frequency, route: editForm.route,
      startDate: new Date(editForm.startDate),
      endDate: editForm.endDate ? new Date(editForm.endDate) : undefined,
      notes: editForm.notes, createdAt: new Date(), updatedAt: new Date(),
    };
    addMedication(newMedication);
    setEditForm({ subjectId: '', visitType: '', medicationName: '', dosage: '', frequency: '', route: '', startDate: '', endDate: '', notes: '' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条用药记录吗？')) removeMedication(id);
  };

  const groupedMedications = medications.reduce((acc, medication) => {
    const subjectId = medication.subjectId || '未分类';
    if (!acc[subjectId]) acc[subjectId] = [];
    acc[subjectId].push(medication);
    return acc;
  }, {} as Record<string, MedicationRecord[]>);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">用药记录</h2>
          <p className="text-sm text-gray-500 mt-1">
            共 {medications.length} 条记录，{Object.keys(groupedMedications).length} 位受试者
          </p>
        </div>
        <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span>添加记录</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {medications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <p className="text-lg font-medium">暂无用药记录</p>
            <p className="text-sm mt-2">上传受试者文档后，AI将自动识别用药信息</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMedications).map(([subjectId, meds]) => (
              <div key={subjectId} className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-700 mb-3 flex items-center">
                  <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-sm font-semibold">{subjectId.charAt(0)}</span>
                  {subjectId}
                  <span className="text-sm text-gray-400 font-normal ml-2">({meds.length} 条记录)</span>
                </h3>
                <div className="space-y-2">
                  {meds.map((med) => (
                    <div key={med.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      {editingId === med.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs text-gray-500">受试者编号</label><input type="text" value={editForm.subjectId} onChange={(e) => setEditForm({ ...editForm, subjectId: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" /></div>
                            <div><label className="text-xs text-gray-500">访视类型</label><input type="text" value={editForm.visitType} onChange={(e) => setEditForm({ ...editForm, visitType: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" /></div>
                          </div>
                          <div><label className="text-xs text-gray-500">药品名称</label><input type="text" value={editForm.medicationName} onChange={(e) => setEditForm({ ...editForm, medicationName: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" /></div>
                          <div className="grid grid-cols-3 gap-3">
                            <div><label className="text-xs text-gray-500">剂量</label><input type="text" value={editForm.dosage} onChange={(e) => setEditForm({ ...editForm, dosage: e.target.value })} placeholder="如: 100mg" className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" /></div>
                            <div><label className="text-xs text-gray-500">频次</label><input type="text" value={editForm.frequency} onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })} placeholder="如: 每日2次" className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" /></div>
                            <div><label className="text-xs text-gray-500">给药途径</label><input type="text" value={editForm.route} onChange={(e) => setEditForm({ ...editForm, route: e.target.value })} placeholder="如: 口服" className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs text-gray-500">开始日期</label><input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" /></div>
                            <div><label className="text-xs text-gray-500">结束日期</label><input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" /></div>
                          </div>
                          <div><label className="text-xs text-gray-500">备注</label><textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none" /></div>
                          <div className="flex items-center space-x-2">
                            <button onClick={handleSave} className="px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors text-sm">保存</button>
                            <button onClick={handleCancel} className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm">取消</button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-medium text-gray-800">{med.medicationName}</h4>
                                <span className="text-sm text-gray-500">{med.dosage}</span>
                                <span className="text-sm text-gray-500">{med.frequency}</span>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{med.route}</span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>开始: {med.startDate.toLocaleDateString()}</span>
                                {med.endDate && <span>结束: {med.endDate.toLocaleDateString()}</span>}
                                {med.visitType && <span>访视: {med.visitType}</span>}
                              </div>
                              {med.notes && <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{med.notes}</p>}
                            </div>
                            <div className="flex items-center space-x-1 ml-4">
                              <button onClick={() => handleEdit(med)} className="p-1 text-gray-400 hover:text-primary-500 transition-colors" title="编辑"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                              <button onClick={() => handleDelete(med.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="删除"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
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
      </div>

      {/* Add Form Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">添加用药记录</h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">受试者编号</label><input type="text" value={editForm.subjectId} onChange={(e) => setEditForm({ ...editForm, subjectId: e.target.value })} placeholder="如: SUB-001" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" /></div>
                <div><label className="text-sm font-medium text-gray-700">访视类型</label><input type="text" value={editForm.visitType} onChange={(e) => setEditForm({ ...editForm, visitType: e.target.value })} placeholder="如: 筛选访视" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" /></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700">药品名称</label><input type="text" value={editForm.medicationName} onChange={(e) => setEditForm({ ...editForm, medicationName: e.target.value })} placeholder="如: 阿司匹林" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-medium text-gray-700">剂量</label><input type="text" value={editForm.dosage} onChange={(e) => setEditForm({ ...editForm, dosage: e.target.value })} placeholder="如: 100mg" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" /></div>
                <div><label className="text-sm font-medium text-gray-700">频次</label><input type="text" value={editForm.frequency} onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })} placeholder="如: 每日2次" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" /></div>
                <div><label className="text-sm font-medium text-gray-700">给药途径</label><input type="text" value={editForm.route} onChange={(e) => setEditForm({ ...editForm, route: e.target.value })} placeholder="如: 口服" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">开始日期</label><input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" /></div>
                <div><label className="text-sm font-medium text-gray-700">结束日期</label><input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" /></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700">备注</label><textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" /></div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={handleAdd} disabled={!editForm.medicationName || !editForm.subjectId} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
