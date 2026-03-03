import { useState } from 'react';
import { useSchedule } from '../../hooks/useSchedule';
import type { DepartmentId } from '../../types';

export default function AddStaffForm() {
  const { addStaff } = useSchedule();
  const [name, setName] = useState('');
  const [dept, setDept] = useState<DepartmentId>('encadrement');
  const [maxHours, setMaxHours] = useState(35);

  const handleSubmit = () => {
    if (!name.trim()) return;
    addStaff(name.trim(), dept, maxHours);
    setName('');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 h-fit">
      <h3 className="text-lg font-black text-red-700 uppercase mb-6 flex items-center gap-2">
        <span>👤</span> Ajouter un membre
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nom Complet</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Jean Dupont"
            className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-red-500 outline-none transition-all"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Département</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value as DepartmentId)}
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-3 py-3 text-sm focus:border-red-500 outline-none"
            >
              <option value="encadrement">Gérant</option>
              <option value="salle">Salle</option>
              <option value="cuisine">Cuisine</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Max Heures / Sem.</label>
            <input
              type="number"
              value={maxHours}
              onChange={(e) => setMaxHours(parseFloat(e.target.value) || 35)}
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-3 py-3 text-sm focus:border-red-500 outline-none"
            />
          </div>
        </div>
        <button
          onClick={handleSubmit}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg transition-all mt-4"
        >
          VALIDER L'AJOUT
        </button>
      </div>
    </div>
  );
}
