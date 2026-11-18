
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faUser,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";

function AdminHeader() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    navigate("/login", { replace: true });
  };

  return (
    <header className="relative z-20 flex w-full min-h-[76px] flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4 shadow-sm lg:px-8">
      {/* Portal title */}
      <div className="shrink-0">
        <p className="text-sm font-medium text-gray-500">
          Admin Portal
        </p>

        <h2 className="text-xl font-bold text-[#174832]">
          Welcome to AgriBridge
        </h2>
      </div>

      {/* Header actions */}
      <nav className="flex flex-wrap items-center gap-3">
        {/* Notifications */}
        <Link
          to="/admin/notifications"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-[#159447]"
        >
          <FontAwesomeIcon icon={faBell} className="h-4 w-4" />
          Notifications
        </Link>

        {/* Profile */}
        <Link
          to="/admin/settings"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-[#159447]"
        >
          <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
          Profile
        </Link>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
        >
          <FontAwesomeIcon
            icon={faRightFromBracket}
            className="h-4 w-4"
          />
          Logout
        </button>
      </nav>
    </header>
  );
}

export default AdminHeader;
