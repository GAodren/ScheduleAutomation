import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useSchedule } from '../../hooks/useSchedule';
import { DAYS } from '../../data/defaults';
import type { PersonSchedule } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

export default function Charts() {
  const { state } = useSchedule();
  const weekData = state.scheduleData[state.currentWeek];

  const allPersons: PersonSchedule[] = useMemo(() => [
    ...(weekData.encadrement || []),
    ...(weekData.salle || []),
    ...(weekData.cuisine || []),
  ], [weekData]);

  const hoursData = useMemo(() => ({
    labels: allPersons.map(p => p.id),
    datasets: [
      {
        label: 'Heures réelles',
        data: allPersons.map(p => p.hours),
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
      {
        label: 'Objectif',
        data: allPersons.map(p => p.maxHours),
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
      },
    ],
  }), [allPersons]);

  const coverageData = useMemo(() => ({
    labels: DAYS.map(d => d),
    datasets: [{
      label: 'Présents',
      data: DAYS.map((_, i) =>
        allPersons.filter(p => p.days[i].midi !== 'REPOS' || p.days[i].soir !== 'REPOS').length
      ),
      borderColor: '#16a34a',
      tension: 0.4,
    }],
  }), [allPersons]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 charts-container">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xs font-black text-gray-400 uppercase mb-4">Volume Horaire Hebdomadaire</h3>
        <div style={{ height: 300 }}>
          <Bar
            data={hoursData}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { ticks: { autoSkip: false, font: { size: 9 } } },
              },
            }}
          />
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xs font-black text-gray-400 uppercase mb-4">Taux de Présence</h3>
        <div style={{ height: 300 }}>
          <Line
            data={coverageData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>
    </div>
  );
}
