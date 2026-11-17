import { Link } from "react-router-dom";

function FarmerHeader() {
  return (
    <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4 lg:px-8">
      <div>
        <p className="text-sm font-medium text-gray-500">Farmer portal</p>
        <h2 className="text-xl font-bold text-gray-900">
          Welcome to AgriBridge
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/buyer"
          className="rounded-lg border border-[#174832] px-4 py-2 text-sm font-semibold text-[#174832] transition hover:bg-[#174832] hover:text-white"
        >
          Switch to Buyer
        </Link>

        <Link
          to="/farmer/notifications"
          className="text-sm font-medium text-gray-600 hover:text-[#159447]"
        >
          Notifications
        </Link>

        <Link
          to="/farmer/settings"
          className="text-sm font-medium text-gray-600 hover:text-[#159447]"
        >
          Profile
        </Link>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/login";
          }}
          className="text-sm font-medium text-gray-600 hover:text-red-600"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default FarmerHeader;

