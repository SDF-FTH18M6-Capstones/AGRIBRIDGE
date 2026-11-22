
import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import BuyerSidebar from "./BuyerSidebar.jsx";
import BuyerHeader from "./BuyerHeader.jsx";
import useAuth from "../../../hooks/useAuth.js";

const BuyerLayout = () => {
  const [activeTab, setActiveTab] = useState("Overview");
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      <BuyerSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <BuyerHeader
          title={
            activeTab === "Overview"
              ? "Buyer Dashboard"
              : activeTab
          }
          switchLabel="Switch to Farmer"
          onNotificationsClick={() =>
            setActiveTab("Notifications")
          }
          onProfileClick={() =>
            setActiveTab("Settings")
          }
          onLogoutClick={handleLogout}
        />

        <main className="flex-1 px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default BuyerLayout;
