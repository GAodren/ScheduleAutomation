import { ScheduleProvider } from './context/ScheduleContext';
import { useSchedule } from './hooks/useSchedule';
import Navbar from './components/layout/Navbar';
import PlanningPage from './components/planning/PlanningPage';
import ConfigPage from './components/config/ConfigPage';

function AppContent() {
  const { state } = useSchedule();

  return (
    <>
      <Navbar />
      {state.currentPage === 'planning' ? <PlanningPage /> : <ConfigPage />}
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
