import { Outlet } from "react-router-dom";
import FarmerHeader from "./components/FarmerHeader.jsx";
import FarmerSidebar from "./components/FarmerSidebar.jsx";


function FarmerLayout() {
  return (
    <div className="min-h-screen bg-[#f4f7f3]">
      <div className="flex min-h-screen">
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