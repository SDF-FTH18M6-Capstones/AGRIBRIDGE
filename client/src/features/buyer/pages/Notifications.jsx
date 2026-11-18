import React, { useState } from 'react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      status: 'New',
      message: 'Farmer accepted your order #1025',
      time: '10 mins ago',
      read: false,
    },
    {
      id: 2,
      status: 'Read',
      message: 'Your M-Pesa payment for order #1024 was confirmed successfully.',
      time: 'Yesterday',
      read: true,
    },
  ]);

  const handleMarkAllAsRead = () => {
    setNotifications(
      notifications.map((n) => ({ ...n, status: 'Read', read: true }))
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-300 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900">Notifications</h3>

          <button
            onClick={handleMarkAllAsRead}
            className="bg-[#143d24] hover:bg-[#1c5231] text-white text-xs font-medium py-2 px-4 rounded-md transition-colors w-fit"
          >
            Mark all as read
          </button>
        </div>

        {/* Notifications Table / List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium text-gray-600">
                <th className="py-2.5 w-24">Status</th>
                <th className="py-2.5">Message</th>
                <th className="py-2.5 text-right w-32">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs text-gray-800">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <tr
                    key={n.id}
                    className={`hover:bg-gray-50 ${
                      !n.read ? 'bg-green-50/30 font-medium' : ''
                    }`}
                  >
                    <td className="py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          n.status === 'New'
                            ? 'bg-green-100 text-[#143d24]'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {n.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-800">{n.message}</td>
                    <td className="py-3 text-right text-gray-500">{n.time}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-gray-500">
                    No notifications available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer note matching wireframe */}
        <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
          Order, payment, verification and account updates[cite: 10].
        </p>
      </div>
    </div>
  );
};

export default Notifications;