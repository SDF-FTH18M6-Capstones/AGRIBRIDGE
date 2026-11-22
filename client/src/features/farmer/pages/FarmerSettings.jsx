
import { useEffect, useState } from "react";

const SETTINGS_KEY = "agribridge-farmer-settings";
const PROFILE_KEY = "agribridge-farmer-profile";
const AUTH_USER_KEY = "agribridge_auth_user";

// Kenyan mobile: 07XXXXXXXX, 01XXXXXXXX or +2547XXXXXXXX
const phonePattern = /^(?:0|\+254)[17]\d{8}$/;

const defaults = {
  fullName: "",
  email: "",
  phone: "",
  payoutNumber: "",
  sms: true,
  emailAlerts: true,
  buyerRole: false,
};

// Read the registered user from the authentication session.
const getRegisteredUser = () => {
  try {
    return JSON.parse(
      sessionStorage.getItem(AUTH_USER_KEY) || "null"
    );
  } catch {
    return null;
  }
};

// Read saved farm details.
const getFarmerProfile = () => {
  try {
    return JSON.parse(
      localStorage.getItem(PROFILE_KEY) || "null"
    );
  } catch {
    return null;
  }
};

// Get the user's name regardless of the registration field naming.
const getFullName = (user) => {
  if (!user) return "";

  return (
    user.full_name ||
    user.fullName ||
    user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    ""
  );
};

const loadSettings = () => {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || "null"
    );

    const user = getRegisteredUser();
    const profile = getFarmerProfile();

    return {
      ...defaults,
      ...(saved || {}),

      // Use saved settings first, then registered account details.
      fullName:
        saved?.fullName ||
        getFullName(user) ||
        profile?.fullName ||
        "",

      email:
        saved?.email ||
        user?.email ||
        "",

      phone:
        saved?.phone ||
        user?.phone ||
        user?.phone_number ||
        profile?.phone ||
        "",

      payoutNumber:
        saved?.payoutNumber ||
        user?.phone ||
        user?.phone_number ||
        profile?.phone ||
        "",
    };
  } catch {
    return defaults;
  }
};

function FarmerSettings() {
  const [settings, setSettings] = useState(loadSettings);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordError, setPasswordError] = useState("");

  const [showDelete, setShowDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleted, setDeleted] = useState(false);

  // Refresh account details when Settings loads.
  useEffect(() => {
    const refreshed = loadSettings();
    setSettings(refreshed);
  }, []);

  const persist = (next) => {
    setSettings(next);

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(next)
      );

      // Keep registered account details in sync with saved settings.
      const user = getRegisteredUser();

      if (user) {
        sessionStorage.setItem(
          AUTH_USER_KEY,
          JSON.stringify({
            ...user,
            full_name: next.fullName,
            email: next.email,
            phone: next.phone,
          })
        );
      }
    } catch (storageError) {
      console.error("Could not save settings:", storageError);
    }
  };

  const handleChange = (event) => {
    setSettings({
      ...settings,
      [event.target.name]: event.target.value,
    });

    setMessage("");
    setError("");
  };

  const handleToggle = (event) => {
    setSettings({
      ...settings,
      [event.target.name]: event.target.checked,
    });

    setMessage("");
  };

  const handleSave = (event) => {
    event.preventDefault();

    if (!settings.fullName.trim()) {
      setError("Enter your full name.");
      return;
    }

    if (!settings.email.trim()) {
      setError("Enter your email address.");
      return;
    }

    if (!phonePattern.test(settings.phone.trim())) {
      setError(
        "Enter a valid phone number, for example 0712345678."
      );
      return;
    }

    persist({ ...settings });
    setError("");
    setMessage("Your account settings have been saved.");
  };

  const savePreferences = () => {
    if (!phonePattern.test(settings.payoutNumber.trim())) {
      setError(
        "Enter a valid M-Pesa payout number, for example 0712345678."
      );
      setMessage("");
      return;
    }

    if (!settings.sms && !settings.emailAlerts) {
      setError(
        "Choose at least one way to receive notifications."
      );
      setMessage("");
      return;
    }

    persist({ ...settings });
    setError("");
    setMessage("Your preferences have been saved.");
  };

  const toggleBuyerRole = () => {
    const next = {
      ...settings,
      buyerRole: !settings.buyerRole,
    };

    persist(next);
    setError("");

    setMessage(
      next.buyerRole
        ? "Buyer role added. You can now use Switch to Buyer."
        : "Buyer role removed."
    );
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();

    if (!password.current) {
      setPasswordError("Enter your current password.");
      return;
    }

    if (password.next.length < 8) {
      setPasswordError(
        "Your new password must be at least 8 characters."
      );
      return;
    }

    if (password.next !== password.confirm) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    // Password changes must eventually be handled by the API.
    setPassword({
      current: "",
      next: "",
      confirm: "",
    });

    setPasswordError("");
    setShowPassword(false);
    setError("");

    setMessage(
      "Password validation passed. Connect the password API to complete the change."
    );
  };

  const handleDelete = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("agribridge-"))
      .forEach((key) => localStorage.removeItem(key));

    Object.keys(sessionStorage)
      .filter((key) => key.startsWith("agribridge_"))
      .forEach((key) => sessionStorage.removeItem(key));

    setDeleted(true);
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#168343] focus:ring-2 focus:ring-green-100";

  const labelClass =
    "mb-2 block text-sm font-medium text-gray-700";

  const sectionClass =
    "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

  if (deleted) {
    return (
      <section className={sectionClass}>
        <h1 className="text-lg font-bold text-gray-900">
          Account data cleared
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Browser data has been cleared. This does not delete
          your account from the server.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Settings
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage your account and preferences.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        {/* Account */}
        <section className={sectionClass}>
          <h2 className="mb-5 text-lg font-bold text-gray-900">
            Account
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="fullName" className={labelClass}>
                Full name
              </label>

              <input
                id="fullName"
                name="fullName"
                value={settings.fullName}
                onChange={handleChange}
                placeholder="Full name"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={settings.email}
                onChange={handleChange}
                placeholder="Email"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone number
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={settings.phone}
                onChange={handleChange}
                placeholder="Phone number"
                className={inputClass}
                required
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowPassword(!showPassword);
                  setPasswordError("");
                }}
                className="rounded-lg bg-[#174832] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103724]"
              >
                Change password
              </button>

              <button
                type="submit"
                className="rounded-lg border border-[#174832] px-5 py-3 text-sm font-semibold text-[#174832] transition hover:bg-green-50"
              >
                Save changes
              </button>
            </div>
          </form>

          {showPassword && (
            <form
              onSubmit={handlePasswordSubmit}
              className="mt-5 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <div>
                <label htmlFor="currentPassword" className={labelClass}>
                  Current password
                </label>

                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={password.current}
                  onChange={(e) => {
                    setPassword({
                      ...password,
                      current: e.target.value,
                    });
                    setPasswordError("");
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="newPassword" className={labelClass}>
                  New password (at least 8 characters)
                </label>

                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={password.next}
                  onChange={(e) => {
                    setPassword({
                      ...password,
                      next: e.target.value,
                    });
                    setPasswordError("");
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className={labelClass}>
                  Confirm new password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={password.confirm}
                  onChange={(e) => {
                    setPassword({
                      ...password,
                      confirm: e.target.value,
                    });
                    setPasswordError("");
                  }}
                  className={inputClass}
                />
              </div>

              {passwordError && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {passwordError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-[#174832] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103724]"
                >
                  Update password
                </button>

                <button
                  type="button"
                  onClick={() => setShowPassword(false)}
                  className="rounded-lg border border-[#174832] px-5 py-3 text-sm font-semibold text-[#174832] transition hover:bg-green-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Preferences */}
        <section className={sectionClass}>
          <h2 className="mb-1 text-lg font-bold text-gray-900">
            Preferences
          </h2>

          <p className="mb-5 text-xs text-gray-500">
            M-Pesa payout number, switch or add Buyer role
          </p>

          <div className="space-y-5">
            <div>
              <label htmlFor="payoutNumber" className={labelClass}>
                M-Pesa payout number
              </label>

              <input
                id="payoutNumber"
                name="payoutNumber"
                type="tel"
                value={settings.payoutNumber}
                onChange={handleChange}
                placeholder="0712345678"
                className={inputClass}
              />

              <p className="mt-1 text-xs text-gray-500">
                Payments from buyers are sent to this number.
              </p>
            </div>

            <fieldset>
              <legend className={labelClass}>
                Notification settings
              </legend>

              <div className="space-y-2">
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="sms"
                    checked={settings.sms}
                    onChange={handleToggle}
                    className="h-4 w-4 accent-[#168343]"
                  />
                  SMS
                </label>

                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="emailAlerts"
                    checked={settings.emailAlerts}
                    onChange={handleToggle}
                    className="h-4 w-4 accent-[#168343]"
                  />
                  Email
                </label>
              </div>
            </fieldset>

            <button
              type="button"
              onClick={savePreferences}
              className="rounded-lg border border-[#174832] px-5 py-3 text-sm font-semibold text-[#174832] transition hover:bg-green-50"
            >
              Save preferences
            </button>

            <div className="border-t border-gray-100 pt-5">
              <p className="text-sm font-medium text-gray-700">
                Buyer role
              </p>

              <p className="mb-3 mt-1 text-xs text-gray-500">
                {settings.buyerRole
                  ? "You can switch between Farmer and Buyer."
                  : "Add the Buyer role to also order from other farmers."}
              </p>

              <button
                type="button"
                onClick={toggleBuyerRole}
                className="rounded-lg border border-[#174832] px-5 py-3 text-sm font-semibold text-[#174832] transition hover:bg-green-50"
              >
                {settings.buyerRole
                  ? "Remove Buyer role"
                  : "Add Buyer role"}
              </button>
            </div>

            <div className="border-t border-gray-100 pt-5">
              {!showDelete ? (
                <button
                  type="button"
                  onClick={() => setShowDelete(true)}
                  className="rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
                >
                  Delete account
                </button>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">
                    This permanently deletes your account.
                  </p>

                  <p className="mt-1 text-xs text-red-700">
                    Type DELETE to confirm.
                  </p>

                  <input
                    aria-label="Type DELETE to confirm"
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                    className={`${inputClass} mt-3`}
                  />

                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleteText !== "DELETE"}
                      className="rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear browser data
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowDelete(false);
                        setDeleteText("");
                      }}
                      className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default FarmerSettings;
