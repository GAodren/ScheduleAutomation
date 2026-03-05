import { useSchedule } from '../../hooks/useSchedule';
import { printDepartment } from '../../utils/print';

export default function PlanningToolbar() {
  const { generateNewCycle, generateSmartCycle, state } = useSchedule();

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  // Verifier si les couverts sont saisis
  const hasCovers = state.coversData
    ? Object.values(state.coversData).some(week =>
        week.some(day => day.midi > 0 || day.soir > 0)
      )
    : false;

  return (
    <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 no-print">
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight text-red-800">Vue Operationnelle</h2>
        <p className="text-xs text-gray-500 font-medium mt-1">
          Edition directe activee (Midi en haut / Soir en bas).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {hasCovers ? (
          <button
            onClick={generateSmartCycle}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-black shadow-lg flex items-center gap-2 transition-all mr-4"
          >
            GENERER (Smart)
          </button>
        ) : (
          <div className="flex items-center gap-2 mr-4">
            <button
              onClick={generateNewCycle}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-xs font-black shadow-lg flex items-center gap-2 transition-all"
            >
              REGENERER (Basique)
            </button>
            <span className="text-[9px] text-amber-600 font-bold max-w-[140px] leading-tight">
              Saisissez les couverts pour la generation intelligente
            </span>
          </div>
        )}

        <button
          onClick={() => printDepartment('encadrement')}
          className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-[10px] font-black"
        >
          GERANT
        </button>
        <button
          onClick={() => printDepartment('salle')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-[10px] font-black"
        >
          SALLE
        </button>
        <button
          onClick={() => printDepartment('cuisine')}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-[10px] font-black"
        >
          CUISINE
        </button>
        <span className="text-[10px] font-bold text-gray-400 ml-2">
          Date du jour : {dateStr}
        </span>
      </div>
    </div>
  );
}
