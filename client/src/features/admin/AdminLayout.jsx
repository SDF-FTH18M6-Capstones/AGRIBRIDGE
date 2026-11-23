import { Outlet } from 'react-router-dom';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
export default function AdminLayout() {
  return <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row"><AdminSidebar /><div className="min-w-0 flex-1"><AdminHeader /><main className="p-4 sm:p-8"><Outlet /></main></div></div>;
}
