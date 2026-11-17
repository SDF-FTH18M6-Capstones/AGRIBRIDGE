import { Outlet } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar.jsx";
import AdminHeader from "./components/AdminHeader.jsx";

function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="p-5 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;