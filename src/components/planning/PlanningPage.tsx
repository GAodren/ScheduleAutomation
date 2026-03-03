import { useSchedule } from '../../hooks/useSchedule';
import { DEPARTMENT_CONFIGS } from '../../data/defaults';
import PlanningToolbar from './PlanningToolbar';
import DepartmentBlock from './DepartmentBlock';
import Charts from './Charts';

export default function PlanningPage() {
  const { state } = useSchedule();
  const weekData = state.scheduleData[state.currentWeek];

  return (
    <main className="planning-page max-w-[1600px] mx-auto px-6 mt-6">
      <PlanningToolbar />

      <div>
        {DEPARTMENT_CONFIGS.map(conf => (
          <DepartmentBlock
            key={conf.id}
            config={conf}
            persons={weekData[conf.id] || []}
            week={state.currentWeek}
          />
        ))}
      </div>

      <Charts />
    </main>
  );
}
