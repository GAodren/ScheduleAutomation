import type { PersonSchedule, DepartmentId, WeekNumber } from '../../types';
import { useSchedule } from '../../hooks/useSchedule';
import ShiftCell from './ShiftCell';

interface PersonRowProps {
  person: PersonSchedule;
  personIndex: number;
  dept: DepartmentId;
  week: WeekNumber;
  defaultNameCellClass: string;
}

export default function PersonRow({ person, personIndex, dept, week, defaultNameCellClass }: PersonRowProps) {
  const { updateShift } = useSchedule();

  const nameStyle = person.role === 'adjoint'
    ? 'name-cell-adjoint'
    : person.role === 'gerant'
      ? 'name-cell-gerant'
      : defaultNameCellClass;

  const isOver = person.hours > person.maxHours;

  return (
    <>
      <div className={`name-cell ${nameStyle}`}>
        {person.id}
        <span className="text-[8px] opacity-50">Lim: {person.maxHours}h</span>
      </div>

      {person.days.map((day, dIdx) => (
        <ShiftCell
          key={dIdx}
          day={day}
          onUpdateMidi={(val) => updateShift(week, dept, personIndex, dIdx, 'midi', val)}
          onUpdateSoir={(val) => updateShift(week, dept, personIndex, dIdx, 'soir', val)}
        />
      ))}

      <div className="total-cell">
        <span className={isOver ? 'over-limit' : ''}>{person.hours}h</span>
      </div>
    </>
  );
}
