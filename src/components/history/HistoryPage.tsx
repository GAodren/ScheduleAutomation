import { useState, useMemo } from 'react';
import { useSchedule } from '../../hooks/useSchedule';
import { DAYS, DEPARTMENT_CONFIGS } from '../../data/defaults';
import type { WeekSchedule, DepartmentId, PersonSchedule } from '../../types';

interface HistoryEntry {
  yearWeek: string;
  initial: WeekSchedule;
  final: WeekSchedule | null;
}

function totalHours(schedule: WeekSchedule): number {
  let total = 0;
  for (const dept of Object.keys(schedule) as DepartmentId[]) {
    for (const person of schedule[dept]) {
      total += person.hours;
    }
  }
  return total;
}

function shiftChanged(
  initial: PersonSchedule | undefined,
  final: PersonSchedule | undefined,
  dayIdx: number,
  shift: 'midi' | 'soir'
): boolean {
  if (!initial || !final) return false;
  return initial.days[dayIdx]?.[shift] !== final.days[dayIdx]?.[shift];
}

export default function HistoryPage() {
  const { state } = useSchedule();

  // historyData sera ajoute au state plus tard ; pour l'instant on cast
  const historyData: HistoryEntry[] = (state as any).historyData ?? [];

  const [selectedWeek, setSelectedWeek] = useState<string>(
    historyData.length > 0 ? historyData[0].yearWeek : ''
  );

  const selectedEntry = useMemo(
    () => historyData.find((e) => e.yearWeek === selectedWeek) ?? null,
    [historyData, selectedWeek]
  );

  const stats = useMemo(() => {
    if (!selectedEntry) return null;
    const initialHours = totalHours(selectedEntry.initial);
    const finalHours = selectedEntry.final ? totalHours(selectedEntry.final) : null;
    return {
      initialHours,
      finalHours,
      delta: finalHours !== null ? finalHours - initialHours : null,
    };
  }, [selectedEntry]);

  if (historyData.length === 0) {
    return (
      <main className="max-w-[1200px] mx-auto px-6 mt-8">
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-lg font-bold text-gray-500">Aucun historique disponible</p>
          <p className="text-sm mt-1">
            L'historique apparaitra ici une fois qu'un planning aura ete valide puis realise.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1600px] mx-auto px-6 mt-8">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Historique des Plannings</h2>
        <p className="text-xs text-gray-500 font-medium mt-1">Comparez le previsionnel et le realise semaine par semaine.</p>
      </div>

      {/* Header: week selector + stats */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label htmlFor="history-week-select" className="text-sm font-bold text-gray-700">
            Semaine :
          </label>
          <select
            id="history-week-select"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="rounded-lg border-2 border-gray-200 px-3 py-2 text-sm font-bold focus:outline-none focus:border-red-500"
          >
            {historyData.map((entry) => (
              <option key={entry.yearWeek} value={entry.yearWeek}>
                {entry.yearWeek}
              </option>
            ))}
          </select>
        </div>

        {stats && (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Previsionnel : </span>
              <span className="font-black text-blue-600">{stats.initialHours.toFixed(1)}h</span>
            </div>
            {stats.finalHours !== null && (
              <>
                <div>
                  <span className="text-gray-500">Realise : </span>
                  <span className="font-black text-green-600">{stats.finalHours.toFixed(1)}h</span>
                </div>
                <div>
                  <span className="text-gray-500">Delta : </span>
                  <span
                    className={`font-black ${
                      stats.delta! > 0 ? 'text-red-600' : stats.delta! < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}
                  >
                    {stats.delta! > 0 ? '+' : ''}
                    {stats.delta!.toFixed(1)}h
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Side-by-side comparison */}
      {selectedEntry && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-black text-blue-700 uppercase mb-3">Previsionnel</h3>
            <ScheduleView
              schedule={selectedEntry.initial}
              compareWith={selectedEntry.final}
              highlightMode="none"
            />
          </div>

          <div>
            {selectedEntry.final ? (
              <>
                <h3 className="text-sm font-black text-green-700 uppercase mb-3">Realise</h3>
                <ScheduleView
                  schedule={selectedEntry.final}
                  compareWith={selectedEntry.initial}
                  highlightMode="diff"
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-xl p-10">
                Realise non encore saisi pour cette semaine
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// Compact schedule view for comparison
interface ScheduleViewProps {
  schedule: WeekSchedule;
  compareWith: WeekSchedule | null;
  highlightMode: 'none' | 'diff';
}

function ScheduleView({ schedule, compareWith, highlightMode }: ScheduleViewProps) {
  return (
    <div className="space-y-4">
      {DEPARTMENT_CONFIGS.map((deptCfg) => {
        const people = schedule[deptCfg.id] ?? [];
        if (people.length === 0) return null;

        const comparePeople = compareWith?.[deptCfg.id] ?? [];

        return (
          <div key={deptCfg.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className={`px-4 py-2 text-xs font-black text-white uppercase ${deptCfg.colorClass}`}>
              {deptCfg.label}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-1.5 font-black text-gray-500 uppercase w-28">Nom</th>
                    {DAYS.map((day) => (
                      <th key={day} className="text-center px-1 py-1.5 font-black text-gray-500 uppercase">
                        {day.slice(0, 3)}
                      </th>
                    ))}
                    <th className="text-center px-3 py-1.5 font-black text-gray-500 uppercase w-12">H</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((person) => {
                    const comparePerson = comparePeople.find((p) => p.id === person.id);

                    return (
                      <tr key={person.id} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-3 py-1.5 font-bold text-gray-800 truncate max-w-[7rem]">
                          {person.id}
                        </td>
                        {DAYS.map((_, dayIdx) => {
                          const midi = person.days[dayIdx]?.midi ?? '';
                          const soir = person.days[dayIdx]?.soir ?? '';

                          const midiChanged =
                            highlightMode === 'diff' && shiftChanged(comparePerson, person, dayIdx, 'midi');
                          const soirChanged =
                            highlightMode === 'diff' && shiftChanged(comparePerson, person, dayIdx, 'soir');

                          return (
                            <td key={dayIdx} className="text-center px-0.5 py-1.5">
                              <div
                                className={`leading-tight text-[10px] ${
                                  midiChanged ? 'bg-red-100 text-red-700 rounded px-0.5 font-bold' : ''
                                }`}
                              >
                                {midi || '-'}
                              </div>
                              <div
                                className={`leading-tight text-[10px] ${
                                  soirChanged ? 'bg-red-100 text-red-700 rounded px-0.5 font-bold' : ''
                                }`}
                              >
                                {soir || '-'}
                              </div>
                            </td>
                          );
                        })}
                        <td className="text-center px-3 py-1.5 font-black text-red-600">
                          {person.hours.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
