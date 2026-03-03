import type { DepartmentDisplayConfig, PersonSchedule, WeekNumber } from '../../types';
import PlanningGrid from './PlanningGrid';

interface DepartmentBlockProps {
  config: DepartmentDisplayConfig;
  persons: PersonSchedule[];
  week: WeekNumber;
}

export default function DepartmentBlock({ config, persons, week }: DepartmentBlockProps) {
  return (
    <div className="dept-block" id={`block-${config.id}`}>
      <div className={`dept-title-bar ${config.colorClass}`}>{config.label}</div>
      <PlanningGrid
        persons={persons}
        dept={config.id}
        week={week}
        defaultNameCellClass={config.nameCellClass}
      />
    </div>
  );
}
