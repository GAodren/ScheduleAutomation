import { useState, useRef } from 'react';
import type { LegalAlert } from '../../types';

interface AlertBadgeProps {
  alerts: LegalAlert[];
}

function AlertIcon({ severity }: { severity: 'warning' | 'error' }) {
  if (severity === 'error') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function AlertBadge({ alerts }: AlertBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!alerts || alerts.length === 0) return null;

  // Determine the highest severity for the grouped badge
  const hasError = alerts.some((a) => a.severity === 'error');
  const displaySeverity: 'warning' | 'error' = hasError ? 'error' : 'warning';

  const bgClass = displaySeverity === 'error'
    ? 'bg-red-500 text-white'
    : 'bg-amber-400 text-amber-900';

  const tooltipBorderClass = displaySeverity === 'error'
    ? 'border-red-300'
    : 'border-amber-300';

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge */}
      <span
        className={`inline-flex items-center justify-center gap-0.5 rounded-full px-1 py-0.5 text-[10px] font-semibold leading-none cursor-default ${bgClass}`}
      >
        <AlertIcon severity={displaySeverity} />
        {alerts.length > 1 && <span>{alerts.length}</span>}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-max max-w-xs rounded-md border bg-white shadow-lg p-2 text-xs ${tooltipBorderClass}`}
        >
          <ul className="space-y-1">
            {alerts.map((alert, idx) => (
              <li key={idx} className="flex items-start gap-1">
                <span
                  className={`mt-0.5 shrink-0 inline-block w-1.5 h-1.5 rounded-full ${
                    alert.severity === 'error' ? 'bg-red-500' : 'bg-amber-400'
                  }`}
                />
                <span className="text-gray-700">{alert.message}</span>
              </li>
            ))}
          </ul>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white" />
        </div>
      )}
    </div>
  );
}
