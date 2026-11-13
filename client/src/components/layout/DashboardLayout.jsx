
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  function handleMenuClick() {
    setIsSidebarOpen(true);
  }

  function handleCloseSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          onClick={handleCloseSidebar}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
      />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">

        <Header onMenuClick={handleMenuClick} />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>

      </div>
    </div>
  );
}

export default DashboardLayout;
