import { useRef, useCallback } from 'react';
import { formatDisplay } from '../../utils/formatting';

interface ShiftEditableProps {
  value: string;
  position: 'midi' | 'soir';
  onUpdate: (newValue: string) => void;
}

export default function ShiftEditable({ value, position, onUpdate }: ShiftEditableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isRepos = value === 'REPOS';

  const handleBlur = useCallback(() => {
    const newValue = ref.current?.innerText.trim() || '';
    onUpdate(newValue);
  }, [onUpdate]);

  const posClass = position === 'midi' ? 'midi-time' : 'soir-time';
  const reposClass = isRepos ? 'repos-tag' : '';

  return (
    <div
      ref={ref}
      className={`shift-editable ${posClass} ${reposClass}`}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      dangerouslySetInnerHTML={{ __html: formatDisplay(value) }}
    />
  );
}
