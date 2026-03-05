import { useSchedule } from '../../hooks/useSchedule';
import type { PlanningStatus } from '../../types';

const STATUS_CONFIG: Record<PlanningStatus, { label: string; badgeClass: string }> = {
  draft: { label: 'BROUILLON', badgeClass: 'status-badge status-draft' },
  initial: { label: 'PREVISIONNEL', badgeClass: 'status-badge status-initial' },
  final: { label: 'REALISE', badgeClass: 'status-badge status-final' },
};

const STEPS: { key: PlanningStatus; label: string }[] = [
  { key: 'draft', label: 'Brouillon' },
  { key: 'initial', label: 'Previsionnel' },
  { key: 'final', label: 'Realise' },
];

function stepIndex(status: PlanningStatus): number {
  return STEPS.findIndex((s) => s.key === status);
}

export default function PlanningStatusBar() {
  const { state, validatePlanning, startFinalEntry, switchPage } = useSchedule();
  const { planningStatus } = state;

  const currentStep = stepIndex(planningStatus);
  const config = STATUS_CONFIG[planningStatus];

  return (
    <div className="flex items-center gap-4 px-4 py-2 mb-6 bg-white border border-gray-200 rounded-lg shadow-sm no-print">
      {/* Progress steps */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span
                  className={`text-[9px] mt-0.5 whitespace-nowrap ${
                    isCurrent ? 'text-blue-600 font-bold' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mb-4 mx-0.5 ${
                    idx < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="w-px h-8 bg-gray-200" />

      <span className={config.badgeClass}>{config.label}</span>

      <div className="flex-1" />

      {planningStatus === 'draft' && (
        <button
          onClick={validatePlanning}
          className="px-3 py-1.5 text-xs font-black text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Valider comme Previsionnel
        </button>
      )}
      {planningStatus === 'initial' && (
        <button
          onClick={startFinalEntry}
          className="px-3 py-1.5 text-xs font-black text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
        >
          Saisir le Realise
        </button>
      )}
      {planningStatus === 'final' && (
        <button
          onClick={() => switchPage('history')}
          className="px-3 py-1.5 text-xs font-black text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Consulter l'historique
        </button>
      )}
    </div>
  );
}
