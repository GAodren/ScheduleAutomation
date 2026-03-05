import { useSchedule } from '../../hooks/useSchedule';
import { DAYS } from '../../data/defaults';
import type { WeekNumber } from '../../types';

export default function CoversConfig() {
  const { state, updateCovers, setWeek } = useSchedule();
  const { coversData, currentWeek } = state;

  const weekCovers = coversData[currentWeek];

  const allZero = weekCovers.every((day) => day.midi === 0 && day.soir === 0);

  const handleChange = (dayIndex: number, service: 'midi' | 'soir', raw: string) => {
    const value = Math.max(0, parseInt(raw, 10) || 0);
    updateCovers(currentWeek, dayIndex, service, value);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
      <h3 className="text-lg font-black text-gray-800 uppercase mb-6">
        Previsions de Couverts
      </h3>

      {/* Week toggle */}
      <div className="flex gap-2 mb-6">
        {([1, 2] as WeekNumber[]).map((week) => (
          <button
            key={week}
            onClick={() => setWeek(week)}
            className={`text-xs font-black px-4 py-1.5 rounded-lg uppercase transition-all ${
              currentWeek === week
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
          >
            S{week}
          </button>
        ))}
      </div>

      {/* Warning if all covers are 0 */}
      {allZero && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-300 rounded-lg">
          <p className="text-xs font-bold text-amber-700">
            Veuillez saisir les couverts avant de generer le planning
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead>
            <tr>
              <th className="text-[10px] font-black text-gray-400 uppercase py-2 pr-3 text-left w-16">
                Service
              </th>
              {DAYS.map((day, i) => (
                <th key={i} className="text-[10px] font-black text-gray-500 uppercase py-2 px-1">
                  {day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['midi', 'soir'] as const).map((service) => (
              <tr key={service} className="border-t border-gray-100">
                <td className="text-[10px] font-black text-gray-400 uppercase py-3 pr-3 text-left">
                  {service === 'midi' ? 'Midi' : 'Soir'}
                </td>
                {weekCovers.map((day, dayIndex) => (
                  <td key={dayIndex} className="py-2 px-1">
                    <input
                      type="number"
                      min={0}
                      value={day[service]}
                      onChange={(e) => handleChange(dayIndex, service, e.target.value)}
                      className="w-14 text-center text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
                    />
                  </td>
                ))}
              </tr>
            ))}

            {/* Totals row */}
            <tr className="border-t-2 border-gray-300">
              <td className="text-[10px] font-black text-red-600 uppercase py-3 pr-3 text-left">
                Total
              </td>
              {weekCovers.map((day, dayIndex) => {
                const total = day.midi + day.soir;
                return (
                  <td key={dayIndex} className="py-2 px-1">
                    <span className={`text-sm font-black ${total > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                      {total}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
