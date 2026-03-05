import { useState } from 'react';
import type { StaffMember, DepartmentId } from '../../types';
import { EXPERTISE_LABELS, CONTRACT_LABELS, DAYS } from '../../data/defaults';
import { useSchedule } from '../../hooks/useSchedule';

interface StaffProfileCardProps {
  member: StaffMember;
  dept: DepartmentId;
  index: number;
}

const EXPERTISE_COLORS: Record<StaffMember['expertise'], string> = {
  novice: 'bg-orange-100 text-orange-700',
  intermediaire: 'bg-blue-100 text-blue-700',
  expert: 'bg-green-100 text-green-700',
};

const ROLE_COLORS: Record<StaffMember['role'], string> = {
  gerant: 'bg-indigo-100 text-indigo-700',
  adjoint: 'bg-blue-100 text-blue-700',
  standard: 'bg-gray-100 text-gray-600',
};

export default function StaffProfileCard({ member, dept, index }: StaffProfileCardProps) {
  const { updateStaffField, removeStaff } = useSchedule();
  const [expanded, setExpanded] = useState(false);

  const handleFieldChange = (field: string, value: unknown) => {
    updateStaffField(dept, index, field, value);
  };

  const handleRestDayToggle = (dayIndex: number) => {
    const current = member.restDays;
    const next = current.includes(dayIndex)
      ? current.filter((d) => d !== dayIndex)
      : [...current, dayIndex];
    handleFieldChange('restDays', next);
  };

  return (
    <div
      className={`border rounded-xl transition-all duration-200 ${
        expanded ? 'border-red-300 shadow-lg' : 'border-gray-200 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-gray-800 truncate">{member.id}</span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${ROLE_COLORS[member.role]}`}>
            {member.role}
          </span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded ${EXPERTISE_COLORS[member.expertise]}`}>
            {EXPERTISE_LABELS[member.expertise]}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] font-black text-red-600">{member.maxHours}h</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-4">
          {/* Nom */}
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Nom</label>
            <span className="text-sm font-bold text-gray-800">{member.id}</span>
          </div>

          {/* Role */}
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Role</label>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${ROLE_COLORS[member.role]}`}>
              {member.role}
            </span>
          </div>

          {/* Expertise */}
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Expertise</label>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${EXPERTISE_COLORS[member.expertise]}`}>
              {EXPERTISE_LABELS[member.expertise]}
            </span>
          </div>

          {/* Contract */}
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Type de contrat</label>
            <select
              value={member.contractType}
              onChange={(e) => handleFieldChange('contractType', e.target.value)}
              className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {(Object.entries(CONTRACT_LABELS) as [string, string][]).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Max heures */}
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">
              Max heures/semaine
            </label>
            <input
              type="number"
              min={0}
              value={member.maxHours}
              onChange={(e) => handleFieldChange('maxHours', parseFloat(e.target.value) || 0)}
              className="w-20 text-sm font-bold text-red-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Polyvalent */}
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-black text-gray-400 uppercase">Polyvalent</label>
            <button
              type="button"
              onClick={() => handleFieldChange('polyvalent', !member.polyvalent)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                member.polyvalent ? 'bg-red-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                  member.polyvalent ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>

          {/* Couverts */}
          <div className="flex gap-4">
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">
                Couverts midi
              </label>
              <input
                type="number"
                min={0}
                value={member.coversMidi}
                onChange={(e) => handleFieldChange('coversMidi', parseInt(e.target.value, 10) || 0)}
                className="w-16 text-sm font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">
                Couverts soir
              </label>
              <input
                type="number"
                min={0}
                value={member.coversSoir}
                onChange={(e) => handleFieldChange('coversSoir', parseInt(e.target.value, 10) || 0)}
                className="w-16 text-sm font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>

          {/* Jours de repos fixes */}
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase block mb-2">
              Jours de repos fixes
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((day, dayIndex) => {
                const active = member.restDays.includes(dayIndex);
                return (
                  <button
                    key={dayIndex}
                    type="button"
                    onClick={() => handleRestDayToggle(dayIndex)}
                    className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase transition-all ${
                      active
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remove button */}
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => removeStaff(dept, index)}
              className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
            >
              Supprimer ce membre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
