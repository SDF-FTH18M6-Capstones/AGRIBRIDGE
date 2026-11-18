
import { useEffect, useState } from "react";

function Settings() {
  const [settings, setSettings] = useState({
    platformName: "AgriBridge",
    contactEmail: "support@agribridge.co.ke",
    contactPhone: "+254 700 000 000",
    moderation: true,
    mpesaPaybill: "",
    mpesaAccount: "",
  });

  const [admins, setAdmins] = useState([
    { id: 1, email: "admin@agribridge.co.ke" },
  ]);

  const [showInvite, setShowInvite] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedSettings = localStorage.getItem("agribridge-settings");
    const savedAdmins = localStorage.getItem("agribridge-admins");

    if (savedSettings) {
      setSettings((current) => ({
        ...current,
        ...JSON.parse(savedSettings),
      }));
    }

    if (savedAdmins) {
      setAdmins(JSON.parse(savedAdmins));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setSettings((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSave = () => {
    localStorage.setItem("agribridge-settings", JSON.stringify(settings));
    localStorage.setItem("agribridge-admins", JSON.stringify(admins));

    setMessage("Settings saved successfully.");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleInvite = (e) => {
    e.preventDefault();

    const email = adminEmail.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    const alreadyExists = admins.some(
      (admin) => admin.email.toLowerCase() === email
    );

    if (alreadyExists) {
      setMessage("This admin already exists.");
      return;
    }

    const updatedAdmins = [
      ...admins,
      { id: Date.now(), email },
    ];

    setAdmins(updatedAdmins);
    localStorage.setItem("agribridge-admins", JSON.stringify(updatedAdmins));

    setAdminEmail("");
    setShowInvite(false);
    setMessage("Admin added successfully.");
    setTimeout(() => setMessage(""), 3000);
  };

  const removeAdmin = (id) => {
    const updatedAdmins = admins.filter((admin) => admin.id !== id);

    setAdmins(updatedAdmins);
    localStorage.setItem("agribridge-admins", JSON.stringify(updatedAdmins));
  };

  return (
    <div className="min-h-screen bg-[#f5f7f4] px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-sm font-medium text-gray-500">
            Admin / Settings
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Platform settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your platform information, payments and administrator access.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
          <button className="transition hover:text-[#14532d]">
            Notifications
          </button>
          <button className="transition hover:text-[#14532d]">
            Profile
          </button>
          <button className="transition hover:text-red-600">
            Logout
          </button>
        </div>
      </div>

      {/* Notification */}
      {message && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {message}
        </div>
      )}

      {/* Settings cards */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">

        {/* Platform settings */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Platform
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Update your platform details and general preferences.
            </p>
          </div>

          <div className="space-y-5">
            {/* Platform name */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Platform name
              </label>
              <input
                type="text"
                name="platformName"
                value={settings.platformName}
                onChange={handleChange}
                placeholder="Enter platform name"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* Contact details */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Contact email
              </label>
              <input
                type="email"
                name="contactEmail"
                value={settings.contactEmail}
                onChange={handleChange}
                placeholder="Enter contact email"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Contact phone
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={settings.contactPhone}
                onChange={handleChange}
                placeholder="Enter contact phone"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* Moderation */}
            <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  Listing moderation
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Review listings before they go live.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.moderation}
                onClick={() =>
                  setSettings((current) => ({
                    ...current,
                    moderation: !current.moderation,
                  }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                  settings.moderation ? "bg-green-700" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    settings.moderation ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Moderation is currently{" "}
              <span className="font-semibold text-gray-700">
                {settings.moderation ? "enabled" : "disabled"}
              </span>.
            </p>

            {/* M-Pesa */}
            <div className="border-t border-gray-100 pt-5">
              <h3 className="mb-4 text-base font-bold text-gray-900">
                M-Pesa configuration
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Paybill / Till number
                  </label>
                  <input
                    type="text"
                    name="mpesaPaybill"
                    value={settings.mpesaPaybill}
                    onChange={handleChange}
                    placeholder="Enter Paybill or Till number"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Account reference
                  </label>
                  <input
                    type="text"
                    name="mpesaAccount"
                    value={settings.mpesaAccount}
                    onChange={handleChange}
                    placeholder="Enter account reference"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Admin accounts */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Admin accounts
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Admins are invited by existing admins. No public sign-up.
            </p>
          </div>

          {/* Admin list */}
          <div className="mb-5 space-y-3">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-800">
                    {admin.email.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {admin.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      Administrator
                    </p>
                  </div>
                </div>

                {admins.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAdmin(admin.id)}
                    className="shrink-0 text-xs font-semibold text-red-600 transition hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Invite admin form */}
          {showInvite && (
            <form
              onSubmit={handleInvite}
              className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4"
            >
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Admin email address
              </label>

              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-green-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-900"
                >
                  Add admin
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowInvite(false);
                    setAdminEmail("");
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="rounded-lg bg-green-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-950 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
            >
              + Invite admin
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg border border-green-800 bg-white px-5 py-3 text-sm font-semibold text-green-900 transition hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
            >
              Save changes
            </button>
          </div>
        </section>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        AgriBridge Admin Panel · Platform Configuration
      </p>
    </div>
  );
}

export default Settings;
