import AddStaffForm from './AddStaffForm';
import StaffList from './StaffList';
import CoversConfig from './CoversConfig';

export default function ConfigPage() {
  return (
    <main className="config-page max-w-[1200px] mx-auto px-6 mt-8">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Configuration</h2>
        <p className="text-sm text-gray-500 font-medium mt-1">Gerez vos equipes, couverts et parametres.</p>
      </div>

      {/* Section Couverts */}
      <div className="mb-10">
        <CoversConfig />
      </div>

      {/* Section Personnel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AddStaffForm />
        <StaffList />
      </div>
    </main>
  );
}
