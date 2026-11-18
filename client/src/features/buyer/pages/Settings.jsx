import React, { useState } from 'react';

const Settings = ({ onSwitchRole }) => {
  const [accountData, setAccountData] = useState({
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phoneNumber: '0712345678',
  });

  const [preferences, setPreferences] = useState({
    notificationSettings: 'SMS / email',
    buyerType: 'Wholesale Buyer',
    deliveryContact: 'Nairobi, Wakulima Market',
  });

  const handleAccountSave = (e) => {
    e.preventDefault();
    alert('Account settings saved successfully!');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your AgriBridge account?')) {
      alert('Account deletion requested.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Account Section (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-gray-300 rounded-lg p-5 space-y-4">
          <h3 className="text-base font-bold text-gray-900">Account</h3>

          <form onSubmit={handleAccountSave} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-gray-600 mb-1 font-medium">Full name</label>
              <input
                type="text"
                value={accountData.fullName}
                onChange={(e) =>
                  setAccountData({ ...accountData, fullName: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-[#143d24]"
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1 font-medium">Email</label>
              <input
                type="email"
                value={accountData.email}
                onChange={(e) =>
                  setAccountData({ ...accountData, email: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-[#143d24]"
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1 font-medium">Phone number</label>
              <input
                type="tel"
                value={accountData.phoneNumber}
                onChange={(e) =>
                  setAccountData({ ...accountData, phoneNumber: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-[#143d24]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => alert('Password change link sent to email.')}
                className="bg-[#143d24] hover:bg-[#1c5231] text-white text-xs font-medium py-2.5 px-4 rounded-md transition-colors"
              >
                Change password
              </button>

              <button
                type="submit"
                className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-500 text-xs font-medium py-2.5 px-4 rounded-md transition-colors"
              >
                Save changes
              </button>
            </div>
          </form>
        </div>

        {/* Right: Preferences Section (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-300 rounded-lg p-5 space-y-4">
          <h3 className="text-base font-bold text-gray-900">Preferences</h3>

          <p className="text-xs text-gray-600">
            Buyer type, delivery contact details, switch or add Farmer role[cite: 11].
          </p>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-gray-600 mb-1 font-medium">
                Notification settings: SMS / email
              </label>
              <input
                type="text"
                value={preferences.notificationSettings}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    notificationSettings: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-[#143d24]"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onSwitchRole}
                className="w-full bg-[#143d24] hover:bg-[#1c5231] text-white text-xs font-medium py-2.5 px-4 rounded-md transition-colors"
              >
                Switch or add Farmer role
              </button>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="bg-red-700 hover:bg-red-800 text-white text-xs font-medium py-2.5 px-4 rounded-md transition-colors"
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;