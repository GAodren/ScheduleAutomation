import { useState } from 'react';
import { useSchedule } from '../../hooks/useSchedule';
import type { DepartmentId } from '../../types';
import { DEPARTMENT_IDS } from '../../data/defaults';

export default function StaffList() {
  const { state, removeStaff, toggleAdjoint, updateStaffLimit, editStaffName } = useSchedule();
  const { staffConfig } = state;

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (dept: DepartmentId, idx: number, currentName: string) => {
    setEditingKey(`${dept}-${idx}`);
    setEditValue(currentName);
  };

  const commitEdit = (dept: DepartmentId, idx: number) => {
    const newName = editValue.trim();
    if (newName && newName !== staffConfig[dept][idx].id) {
      editStaffName(dept, idx, newName);
    }
    setEditingKey(null);
  };

  const deptLabel = (dept: DepartmentId) =>
    dept === 'encadrement' ? 'GÉRANT' : dept.toUpperCase();

  const deptColor = (dept: DepartmentId) =>
    dept === 'cuisine' ? 'text-orange-600' : dept === 'salle' ? 'text-green-600' : 'text-indigo-600';

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
      <h3 className="text-lg font-black text-gray-800 uppercase mb-6 flex items-center gap-2">
        <span>📋</span> Liste du Personnel
      </h3>
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {DEPARTMENT_IDS.map(dept => (
          <div key={dept}>
            <div className="pt-4 pb-2 border-b border-gray-100">
              <span className={`text-[10px] font-black ${deptColor(dept)}`}>{deptLabel(dept)}</span>
            </div>

            {staffConfig[dept].map((p, idx) => {
              const isAdjoint = p.role === 'adjoint';
              const isGerant = p.role === 'gerant';
              const key = `${dept}-${idx}`;
              const isEditing = editingKey === key;

              return (
                <div key={key} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 group">
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(dept, idx)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(dept, idx);
                            if (e.key === 'Escape') setEditingKey(null);
                          }}
                          autoFocus
                          className="input-edit-name"
                        />
                      ) : (
                        <>
                          <span className={`text-sm font-bold ${isAdjoint ? 'text-blue-600' : isGerant ? 'text-indigo-800' : 'text-gray-800'}`}>
                            {p.id}
                          </span>
                          <button
                            onClick={() => startEdit(dept, idx, p.id)}
                            className="text-gray-400 hover:text-blue-600 text-xs opacity-0 group-hover:opacity-100 transition-all"
                          >
                            ✏️
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center">
                        <span className="text-[9px] text-gray-400 font-bold uppercase mr-1">Obj:</span>
                        <input
                          type="number"
                          value={p.maxHours}
                          onChange={(e) => updateStaffLimit(dept, idx, parseFloat(e.target.value) || 0)}
                          className="w-auto max-w-[28px] bg-transparent text-[9px] font-black text-red-600 focus:outline-none focus:underline text-right"
                        />
                        <span className="text-[9px] font-black text-red-600">h</span>
                      </div>
                      {!isGerant && (
                        <button
                          onClick={() => toggleAdjoint(dept, idx)}
                          className={`text-[9px] font-black px-2 py-0.5 rounded uppercase transition-all ${
                            isAdjoint
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                          }`}
                        >
                          {isAdjoint ? '⭐ ADJOINT' : 'Standard'}
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeStaff(dept, idx)}
                    className="opacity-0 group-hover:opacity-100 bg-gray-200 hover:bg-red-100 hover:text-red-600 p-2 rounded-md transition-all"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
