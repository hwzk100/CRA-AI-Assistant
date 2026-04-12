/**
 * CRA AI Assistant - Sidebar Component
 */

import React from 'react';
import { useActiveWorksheet, useStore } from '../../hooks/useStore';
import { WORKSHEET_CONFIG, APP_VERSION } from '@shared/constants/app';
import type { WorksheetType } from '@shared/types/worksheet';

export const Sidebar: React.FC = () => {
  const activeWorksheet = useActiveWorksheet();
  const setActiveWorksheet = useStore((state) => state.setActiveWorksheet);

  const worksheets: { type: WorksheetType }[] = [
    { type: 'inclusionCriteria' },
    { type: 'exclusionCriteria' },
    { type: 'visitSchedule' },
    { type: 'subjectVisits' },
    { type: 'medications' },
  ];

  return (
    <aside className="w-60 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {worksheets.map(({ type }) => {
          const config = WORKSHEET_CONFIG[type];
          const isActive = activeWorksheet === type;

          return (
            <button
              key={type}
              onClick={() => setActiveWorksheet(type)}
              className={`
                w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg
                transition-colors duration-150 ease-in-out
                ${isActive
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <span className="text-lg">{config.icon}</span>
              <span className="font-medium text-sm">{config.title}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          CRA AI Assistant V{APP_VERSION}
        </div>
      </div>
    </aside>
  );
};
