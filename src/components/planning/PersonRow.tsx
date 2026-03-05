import type { PersonSchedule, DepartmentId, WeekNumber } from '../../types';
import { useSchedule } from '../../hooks/useSchedule';
import ShiftCell from './ShiftCell';
import AlertBadge from './AlertBadge';

interface PersonRowProps {
  person: PersonSchedule;
  personIndex: number;
  dept: DepartmentId;
  week: WeekNumber;
  defaultNameCellClass: string;
}

export default function PersonRow({ person, personIndex, dept, week, defaultNameCellClass }: PersonRowProps) {
  const { updateShift, state } = useSchedule();

  const nameStyle = person.role === 'adjoint'
    ? 'name-cell-adjoint'
    : person.role === 'gerant'
      ? 'name-cell-gerant'
      : defaultNameCellClass;

  const isOver = person.hours > person.maxHours;

  // Filtrer les alertes pour cette personne
  const personAlerts = (state.legalAlerts || []).filter(
    a => a.personId === person.id && a.dept === dept && a.week === week
  );

  return (
    <>
      <div className={`name-cell ${nameStyle}`}>
        <div className="flex items-center gap-1">
          <span>{person.id}</span>
          <AlertBadge alerts={personAlerts} />
        </div>
        <span className="text-[8px] opacity-50">Lim: {person.maxHours}h</span>
      </div>

      {person.days.map((day, dIdx) => {
        const dayAlerts = personAlerts.filter(a => a.dayIndex === dIdx);
        return (
          <ShiftCell
            key={dIdx}
            day={day}
            hasAlert={dayAlerts.length > 0}
            onUpdateMidi={(val) => updateShift(week, dept, personIndex, dIdx, 'midi', val)}
            onUpdateSoir={(val) => updateShift(week, dept, personIndex, dIdx, 'soir', val)}
          />
        );
      })}

      <div className="total-cell">
        <span className={isOver ? 'over-limit' : ''}>{person.hours}h</span>
      </div>
    </>
  );
}
