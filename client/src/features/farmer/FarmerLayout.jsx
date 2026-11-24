import { Outlet } from "react-router-dom";
import FarmerHeader from "./components/FarmerHeader.jsx";
import FarmerSidebar from "./components/FarmerSidebar.jsx";


function FarmerLayout() {
  return (
    <div className="dashboard-shell min-h-screen bg-white">
      <div className="flex min-h-screen flex-col md:flex-row">
        <FarmerSidebar />

        <div className="min-w-0 flex-1">
          <FarmerHeader />

          <main className="min-h-[calc(100vh-76px)] p-5 lg:p-8">
            <div className="mx-auto w-full max-w-[1600px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default FarmerLayout;