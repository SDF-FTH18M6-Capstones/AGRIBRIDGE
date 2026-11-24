import { VerificationPage } from '../portal/PortalPages';
import useAuth from '../../hooks/useAuth';
import DashboardSidebar from '../../components/ui/DashboardSidebar';
const items=[{name:'Overview',path:'/field-officer'},{name:'My profiles',path:'/profile'},{name:'Settings',path:'/account'},{name:'Marketplace',path:'/marketplace'}];
export default function FieldOfficerDashboard() {
 const {logout}=useAuth();
 return <div className="dashboard-shell flex min-h-screen flex-col md:flex-row"><DashboardSidebar items={items} portal="Field officer portal" home="/field-officer" /><div className="min-w-0 flex-1"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-6"><div><p className="text-xs text-gray-500">Field officer portal</p><h1 className="mt-1 text-xl font-bold">Your farm visits & reviews</h1></div><button onClick={logout} className="btn btn-secondary">Logout</button></header><main><VerificationPage role="officer" /></main></div></div>;
}
