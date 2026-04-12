/**
 * CRA AI Assistant - Eligibility Matrix Component
 */

import React from 'react';
import type { InclusionCriteria, ExclusionCriteria, FileInfo } from '@shared/types/worksheet';

interface EligibilityMatrixProps {
  criteria: InclusionCriteria[] | ExclusionCriteria[];
  subjectFiles: FileInfo[];
  isInclusion: boolean;
}

const getEligibilityBadge = (eligible: boolean, isInclusion: boolean): React.ReactNode => {
  if (isInclusion) {
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
        eligible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {eligible ? '✓ 符合' : '✗ 不符合'}
      </span>
    );
  } else {
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
        eligible ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
      }`}>
        {eligible ? '✗ 应排除' : '✓ 不排除'}
      </span>
    );
  }
};

export const EligibilityMatrix: React.FC<EligibilityMatrixProps> = ({
  criteria,
  subjectFiles,
  isInclusion,
}) => {
  const completedFiles = subjectFiles.filter(f => f.status === 'completed');

  if (completedFiles.length === 0 || criteria.length === 0) return null;

  const hasResults = criteria.some(c => c.fileResults && c.fileResults.length > 0);
  if (!hasResults) return null;

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[200px]">标准描述</th>
            {completedFiles.map((file) => (
              <th key={file.id} className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-l border-gray-200 min-w-[150px] max-w-[200px]">
                <div className="truncate" title={file.name}>{file.name}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {criteria.map((c, index) => (
            <tr key={c.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
              <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 sticky left-0 bg-white z-10">
                <div className="font-medium">{c.description}</div>
              </td>
              {completedFiles.map((file) => {
                const fileResult = c.fileResults?.find((r) => r.fileId === file.id);
                return (
                  <td key={file.id} className="px-4 py-3 text-center border-b border-l border-gray-200">
                    {fileResult ? (
                      <div className="space-y-1">
                        <div className="flex justify-center">{getEligibilityBadge(fileResult.eligible, isInclusion)}</div>
                        {fileResult.reason && <p className="text-xs text-gray-500 truncate" title={fileResult.reason}>{fileResult.reason}</p>}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">未分析</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EligibilityMatrix;
