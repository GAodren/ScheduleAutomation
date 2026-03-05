import { ScheduleProvider } from './context/ScheduleContext';
import { useSchedule } from './hooks/useSchedule';
import Navbar from './components/layout/Navbar';
import PlanningPage from './components/planning/PlanningPage';
import ConfigPage from './components/config/ConfigPage';
import HistoryPage from './components/history/HistoryPage';

function AppContent() {
  const { state, dismissError } = useSchedule();

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4 text-gray-500 font-medium">Chargement du planning...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (state.currentPage) {
      case 'planning': return <PlanningPage />;
      case 'config': return <ConfigPage />;
      case 'history': return <HistoryPage />;
    }
  };

  return (
    <>
      {state.error && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-3 flex justify-between items-center">
          <span className="text-sm font-medium">Erreur : {state.error}</span>
          <button
            onClick={dismissError}
            className="text-red-500 hover:text-red-700 font-bold text-sm"
          >
            Fermer
          </button>
        </div>
      )}
      <Navbar />
      {renderPage()}
    </>
  );
}

export default function App() {
  return (
    <ScheduleProvider>
      <AppContent />
    </ScheduleProvider>
  );
}
