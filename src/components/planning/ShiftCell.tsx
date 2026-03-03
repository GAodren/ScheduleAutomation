import type { DayShift } from '../../types';
import ShiftEditable from './ShiftEditable';

interface ShiftCellProps {
  day: DayShift;
  onUpdateMidi: (value: string) => void;
  onUpdateSoir: (value: string) => void;
}

export default function ShiftCell({ day, onUpdateMidi, onUpdateSoir }: ShiftCellProps) {
  const isMidiRepos = day.midi === 'REPOS';
  const isSoirRepos = day.soir === 'REPOS';
  const cellClass = (isMidiRepos || isSoirRepos) ? 'full-repos' : '';

  return (
    <div className={`grid-cell ${cellClass}`}>
      <ShiftEditable value={day.midi} position="midi" onUpdate={onUpdateMidi} />
      <ShiftEditable value={day.soir} position="soir" onUpdate={onUpdateSoir} />
    </div>
  );
}
