import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-gray-50 md:h-screen md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 print:p-0 print:overflow-visible">
        <Outlet />
      </main>
    </div>
  );
}
