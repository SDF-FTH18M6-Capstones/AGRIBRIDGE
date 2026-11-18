import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRepeat,
  faBell,
  faUser,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";

const Header = ({
  title = "Buyer dashboard",
  switchLabel = "Switch to Farmer",
  onSwitchRole,
  onNotificationsClick,
  onProfileClick,
  onLogoutClick,
}) => {
  return (
    <header className="flex w-full flex-col gap-4 border-b border-gray-200 bg-white px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">
        {title}
      </h2>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onSwitchRole}
          className="flex items-center gap-2 rounded-lg border border-[#12432f] bg-white px-5 py-3 text-base font-medium text-gray-900 transition-colors hover:bg-gray-50"
        >
          <FontAwesomeIcon icon={faRepeat} className="text-sm" />
          <span>{switchLabel}</span>
        </button>

        <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
          <button
            type="button"
            onClick={onNotificationsClick}
            className="flex items-center gap-1.5 transition-colors hover:text-gray-900"
          >
            <FontAwesomeIcon icon={faBell} />
            <span>Notifications</span>
          </button>

          <span aria-hidden="true">·</span>

          <button
            type="button"
            onClick={onProfileClick}
            className="flex items-center gap-1.5 transition-colors hover:text-gray-900"
          >
            <FontAwesomeIcon icon={faUser} />
            <span>Profile</span>
          </button>

          <span aria-hidden="true">·</span>

          <button
            type="button"
            onClick={onLogoutClick}
            className="flex items-center gap-1.5 transition-colors hover:text-red-600"
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;