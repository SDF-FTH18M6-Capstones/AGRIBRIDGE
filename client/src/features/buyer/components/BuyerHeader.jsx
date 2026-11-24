
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRepeat,
  faBell,
  faUser,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";

const BuyerHeader = ({
  title = "Welcome to AgriBridge",
  switchLabel = "Switch to Farmer",
  onSwitchRole,
  onNotificationsClick,
  onProfileClick,
  onLogoutClick,
}) => {
  return (
    <header className="flex w-full flex-col gap-4 border-b border-gray-200 bg-white px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between lg:px-10">
      
      {/* Header title */}
      <div>
        <p className="text-sm font-medium text-gray-500">
          Buyer Portal
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-green-950">
          {title}
        </h2>
      </div>

      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={onSwitchRole}
          className="flex items-center gap-2 rounded-xl border border-[#12432f] bg-white px-5 py-3 font-medium text-green-950 transition hover:bg-green-50"
        >
          <FontAwesomeIcon icon={faRepeat} />
          <span>{switchLabel}</span>
        </button>

        <button
          type="button"
          onClick={onNotificationsClick}
          className="flex items-center gap-2 font-medium text-gray-600 transition hover:text-green-950"
        >
          <FontAwesomeIcon icon={faBell} />
          <span>Notifications</span>
        </button>

        <button
          type="button"
          onClick={onProfileClick}
          className="flex items-center gap-2 font-medium text-gray-600 transition hover:text-green-950"
        >
          <FontAwesomeIcon icon={faUser} />
          <span>Profile</span>
        </button>

        <button
          type="button"
          onClick={onLogoutClick}
          className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 font-medium text-red-600 transition hover:bg-red-100"
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default BuyerHeader;
