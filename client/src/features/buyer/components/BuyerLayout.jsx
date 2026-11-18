
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import BuyerSidebar from "./BuyerSidebar.jsx";
import BuyerHeader from "./BuyerHeader.jsx";

const BuyerLayout = ({ onSwitchToFarmer, onLogout }) => {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      {/* Buyer Sidebar */}
      <BuyerSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Buyer Header */}
        <BuyerHeader
          title={
            activeTab === "Overview"
              ? "Buyer Dashboard"
              : activeTab
          }
          switchLabel="Switch to Farmer"
          onSwitchRole={onSwitchToFarmer}
          onNotificationsClick={() =>
            setActiveTab("Notifications")
          }
          onProfileClick={() =>
            setActiveTab("Settings")
          }
          onLogoutClick={onLogout}
        />

        {/* Page Content */}
        <main className="flex-1 px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default BuyerLayout;
