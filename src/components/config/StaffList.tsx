import { useState } from 'react';
import { useSchedule } from '../../hooks/useSchedule';
import type { DepartmentId, ExpertiseLevel } from '../../types';
import { DEPARTMENT_IDS, DAYS, EXPERTISE_LABELS, CONTRACT_LABELS } from '../../data/defaults';

const EXPERTISE_COLORS: Record<ExpertiseLevel, string> = {
  novice: 'bg-orange-100 text-orange-700',
  intermediaire: 'bg-blue-100 text-blue-700',
  expert: 'bg-green-100 text-green-700',
};

export default function StaffList() {
  const { state, removeStaff, toggleAdjoint, updateStaffLimit, editStaffName, updateStaffField } = useSchedule();
  const { staffConfig } = state;

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

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

  const toggleExpand = (key: string) => {
    setExpandedKey(expandedKey === key ? null : key);
  };

  const deptLabel = (dept: DepartmentId) =>
    dept === 'encadrement' ? 'GERANT' : dept.toUpperCase();

  const deptColor = (dept: DepartmentId) =>
    dept === 'cuisine' ? 'text-orange-600' : dept === 'salle' ? 'text-green-600' : 'text-indigo-600';

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
      <h3 className="text-lg font-black text-gray-800 uppercase mb-6 flex items-center gap-2">
        Liste du Personnel
      </h3>
      <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
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
              const isExpanded = expandedKey === key;

              return (
                <div key={key} className="bg-gray-50 rounded-lg border border-gray-100 group">
                  {/* Collapsed view */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => toggleExpand(key)}
                  >
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
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="input-edit-name"
                          />
                        ) : (
                          <>
                            <span className={`text-sm font-bold ${isAdjoint ? 'text-blue-600' : isGerant ? 'text-indigo-800' : 'text-gray-800'}`}>
                              {p.id}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(dept, idx, p.id); }}
                              className="text-gray-400 hover:text-blue-600 text-xs opacity-0 group-hover:opacity-100 transition-all"
                            >
                              ✏️
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${EXPERTISE_COLORS[p.expertise]}`}>
                          {EXPERTISE_LABELS[p.expertise]}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400">
                          {CONTRACT_LABELS[p.contractType]}
                        </span>
                        <span className="text-[9px] font-black text-red-600">{p.maxHours}h</span>
                        {p.polyvalent && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                            Polyvalent
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isGerant && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleAdjoint(dept, idx); }}
                          className={`text-[9px] font-black px-2 py-0.5 rounded uppercase transition-all ${
                            isAdjoint
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                          }`}
                        >
                          {isAdjoint ? 'ADJOINT' : 'Standard'}
                        </button>
                      )}
                      <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-gray-200 pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Expertise</label>
                          <select
                            value={p.expertise}
                            onChange={(e) => updateStaffField(dept, idx, 'expertise', e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-xs"
                          >
                            {(Object.entries(EXPERTISE_LABELS) as [ExpertiseLevel, string][]).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Contrat</label>
                          <select
                            value={p.contractType}
                            onChange={(e) => updateStaffField(dept, idx, 'contractType', e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-xs"
                          >
                            {(Object.entries(CONTRACT_LABELS)).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Max H/Sem</label>
                          <input
                            type="number"
                            value={p.maxHours}
                            onChange={(e) => updateStaffLimit(dept, idx, parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Couverts Midi</label>
                          <input
                            type="number"
                            value={p.coversMidi}
                            onChange={(e) => updateStaffField(dept, idx, 'coversMidi', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Couverts Soir</label>
                          <input
                            type="number"
                            value={p.coversSoir}
                            onChange={(e) => updateStaffField(dept, idx, 'coversSoir', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={p.polyvalent}
                            onChange={(e) => updateStaffField(dept, idx, 'polyvalent', e.target.checked)}
                            className="w-4 h-4 accent-red-600"
                          />
                          <span className="text-xs font-bold text-gray-600">Polyvalent</span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Jours de repos fixes</label>
                        <div className="flex gap-1 flex-wrap">
                          {DAYS.map((day, dayIdx) => {
                            const isRest = p.restDays.includes(dayIdx);
                            return (
                              <button
                                key={dayIdx}
                                onClick={() => {
                                  const newRestDays = isRest
                                    ? p.restDays.filter(d => d !== dayIdx)
                                    : [...p.restDays, dayIdx];
                                  updateStaffField(dept, idx, 'restDays', newRestDays);
                                }}
                                className={`text-[9px] font-black px-2 py-1 rounded transition-all ${
                                  isRest
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                }`}
                              >
                                {day.substring(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => removeStaff(dept, idx)}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs py-2 rounded-lg transition-all"
                      >
                        Supprimer ce membre
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
