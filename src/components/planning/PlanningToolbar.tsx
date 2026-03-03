import { useSchedule } from '../../hooks/useSchedule';
import { printDepartment } from '../../utils/print';

export default function PlanningToolbar() {
  const { generateNewCycle } = useSchedule();

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  return (
    <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 no-print">
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight text-red-800">Vue Opérationnelle</h2>
        <p className="text-xs text-gray-500 font-medium mt-1">
          Édition directe activée (Midi en haut / Soir en bas).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={generateNewCycle}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-black shadow-lg flex items-center gap-2 transition-all mr-4"
        >
          <span>🔄</span> RÉGÉNÉRER
        </button>
        <button
          onClick={() => printDepartment('encadrement')}
          className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-[10px] font-black"
        >
          🖨️ GÉRANT
        </button>
        <button
          onClick={() => printDepartment('salle')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-[10px] font-black"
        >
          🖨️ SALLE
        </button>
        <button
          onClick={() => printDepartment('cuisine')}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-[10px] font-black"
        >
          🖨️ CUISINE
        </button>
        <span className="text-[10px] font-bold text-gray-400 ml-2">
          Date du jour : {dateStr}
        </span>
      </div>
    </div>
  );
}
