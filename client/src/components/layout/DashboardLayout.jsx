import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

function DashboardLayout({ variant = "farmer" }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  function handleMenuClick() {
    setIsSidebarOpen(true);
  }

  function handleCloseSidebar() {
    setIsSidebarOpen(false);
  }

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header onMenuClick={handleMenuClick} variant={variant} />

      <div className="flex flex-1">
        {isSidebarOpen && (
          <div
            onClick={handleCloseSidebar}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            aria-hidden="true"
          />
        )}

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
          variant={variant}
        />

        <main className="min-w-0 flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;