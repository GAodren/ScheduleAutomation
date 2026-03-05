import { useState } from 'react';
import { useSchedule } from '../../hooks/useSchedule';
import type { DepartmentId, ExpertiseLevel, ContractType } from '../../types';
import { EXPERTISE_LABELS, CONTRACT_LABELS } from '../../data/defaults';

export default function AddStaffForm() {
  const { addStaff } = useSchedule();
  const [name, setName] = useState('');
  const [dept, setDept] = useState<DepartmentId>('salle');
  const [maxHours, setMaxHours] = useState(35);
  const [expertise, setExpertise] = useState<ExpertiseLevel>('intermediaire');
  const [contractType, setContractType] = useState<ContractType>('cdi');
  const [polyvalent, setPolyvalent] = useState(false);
  const [coversMidi, setCoversMidi] = useState(30);
  const [coversSoir, setCoversSoir] = useState(25);

  const handleSubmit = () => {
    if (!name.trim()) return;
    addStaff(name.trim(), dept, maxHours, {
      expertise,
      contractType,
      polyvalent,
      coversMidi,
      coversSoir,
    });
    setName('');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 h-fit">
      <h3 className="text-lg font-black text-red-700 uppercase mb-6 flex items-center gap-2">
        Ajouter un membre
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
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Departement</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value as DepartmentId)}
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-3 py-3 text-sm focus:border-red-500 outline-none"
            >
              <option value="encadrement">Gerant</option>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Expertise</label>
            <select
              value={expertise}
              onChange={(e) => setExpertise(e.target.value as ExpertiseLevel)}
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-3 py-3 text-sm focus:border-red-500 outline-none"
            >
              {(Object.entries(EXPERTISE_LABELS) as [ExpertiseLevel, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Contrat</label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value as ContractType)}
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-3 py-3 text-sm focus:border-red-500 outline-none"
            >
              {(Object.entries(CONTRACT_LABELS) as [ContractType, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Couverts Midi</label>
            <input
              type="number"
              value={coversMidi}
              onChange={(e) => setCoversMidi(parseInt(e.target.value) || 0)}
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-3 py-3 text-sm focus:border-red-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Couverts Soir</label>
            <input
              type="number"
              value={coversSoir}
              onChange={(e) => setCoversSoir(parseInt(e.target.value) || 0)}
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-3 py-3 text-sm focus:border-red-500 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={polyvalent}
              onChange={(e) => setPolyvalent(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <span className="text-xs font-bold text-gray-600">Polyvalent (peut travailler dans d'autres departements)</span>
          </label>
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
