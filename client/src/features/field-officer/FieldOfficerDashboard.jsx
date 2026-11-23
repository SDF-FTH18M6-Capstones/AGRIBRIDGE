import { VerificationPage } from '../portal/PortalPages';
import useAuth from '../../hooks/useAuth';
export default function FieldOfficerDashboard() {
  const { logout } = useAuth();
  return <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8"><header className="flex justify-between gap-4"><a href="/" className="text-xl font-bold text-green-900">AgriBridge</a><button onClick={logout} className="rounded-lg border px-4 py-2">Logout</button></header><VerificationPage role="officer" /></main>;
}
