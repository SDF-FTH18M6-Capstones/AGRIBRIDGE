
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import BuyerSidebar from "./BuyerSidebar.jsx";
import BuyerHeader from "./BuyerHeader.jsx";
import useAuth from "../../../hooks/useAuth.js";

const BuyerLayout = () => {
  const [activeTab, setActiveTab] = useState("Overview");
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#f8f9fa]">
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
          switchLabel={user.capabilities?.farmer ? "Farmer dashboard" : "Farmer setup"}
          onSwitchRole={() => navigate(user.capabilities?.farmer ? "/farmer" : "/profile?setup=farmer")}
          onNotificationsClick={() => navigate("/buyer/notifications")}
          onProfileClick={() => navigate("/profile")}
          onLogoutClick={handleLogout}
        />

        <main className="flex-1 px-4 py-6 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default BuyerLayout;
