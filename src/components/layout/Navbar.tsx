import { useSchedule } from '../../hooks/useSchedule';
import type { PageId, WeekNumber } from '../../types';

export default function Navbar() {
  const { state, switchPage, setWeek } = useSchedule();
  const { currentPage, currentWeek } = state;

  const tabClass = (page: PageId) =>
    `px-5 py-2 rounded-lg text-xs font-black transition-all ${
      currentPage === page
        ? 'bg-white text-red-600 shadow-sm'
        : 'text-gray-500 hover:text-gray-700'
    }`;

  const weekBtnClass = (w: WeekNumber) =>
    `px-4 py-1.5 rounded-md text-xs font-black transition-all ${
      currentWeek === w
        ? 'shadow-sm bg-white text-red-600'
        : 'text-gray-400 hover:text-gray-600'
    }`;

  return (
    <nav className="bg-white border-b-4 border-red-600 shadow-sm sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-2xl mr-3">🍕</span>
          <div>
            <h1 className="text-xl font-black text-red-700 tracking-tighter">DEL ARTE</h1>
            <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">Planning & Gestion</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl no-print">
            <button onClick={() => switchPage('planning')} className={tabClass('planning')}>
              📅 PLANNING
            </button>
            <button onClick={() => switchPage('config')} className={tabClass('config')}>
              ⚙️ CONFIGURATION
            </button>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setWeek(1)} className={weekBtnClass(1)}>S1</button>
            <button onClick={() => setWeek(2)} className={weekBtnClass(2)}>S2</button>
          </div>
        </div>
      </div>
    </nav>
  );
}
