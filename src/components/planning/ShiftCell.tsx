import type { DayShift } from '../../types';
import ShiftEditable from './ShiftEditable';

interface ShiftCellProps {
  day: DayShift;
  hasAlert?: boolean;
  onUpdateMidi: (value: string) => void;
  onUpdateSoir: (value: string) => void;
}

export default function ShiftCell({ day, hasAlert, onUpdateMidi, onUpdateSoir }: ShiftCellProps) {
  const isMidiRepos = day.midi === 'REPOS';
  const isSoirRepos = day.soir === 'REPOS';

  return (
    <div className={`grid-cell shift-cell-split ${hasAlert ? 'cell-alert' : ''}`}>
      <div className={`shift-half shift-half-midi ${isMidiRepos ? 'shift-half-repos' : ''}`}>
        <ShiftEditable value={day.midi} position="midi" onUpdate={onUpdateMidi} />
      </div>
      <div className="shift-divider" />
      <div className={`shift-half shift-half-soir ${isSoirRepos ? 'shift-half-repos' : ''}`}>
        <ShiftEditable value={day.soir} position="soir" onUpdate={onUpdateSoir} />
      </div>
    </div>
  );
}
