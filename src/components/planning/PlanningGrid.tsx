import type { PersonSchedule, DepartmentId, WeekNumber } from '../../types';
import { DAYS } from '../../data/defaults';
import PersonRow from './PersonRow';

interface PlanningGridProps {
  persons: PersonSchedule[];
  dept: DepartmentId;
  week: WeekNumber;
  defaultNameCellClass: string;
}

export default function PlanningGrid({ persons, dept, week, defaultNameCellClass }: PlanningGridProps) {
  return (
    <div className="planning-grid">
      {/* Headers */}
      <div className="grid-header">Nom</div>
      {DAYS.map(d => (
        <div key={d} className="grid-header">{d.substring(0, 3)}</div>
      ))}
      <div className="grid-header">Total</div>

      {/* Person rows */}
      {persons.map((p, pIdx) => (
        <PersonRow
          key={`${p.id}-${pIdx}`}
          person={p}
          personIndex={pIdx}
          dept={dept}
          week={week}
          defaultNameCellClass={defaultNameCellClass}
        />
      ))}
    </div>
  );
}
