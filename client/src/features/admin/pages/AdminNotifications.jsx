
import { useState } from "react";

const STORAGE_KEY = "agribridge-admin-notifications";

const buildSampleNotifications = () => [
  {
    id: 1,
    message: "New order received",
    detail: "A buyer has placed a new order on AgriBridge.",
    createdAt: new Date().toISOString(),
    read: false,
  },
  {
    id: 2,
    message: "Payment received",
    detail: "A buyer has completed payment for an order.",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    read: false,
  },
  {
    id: 3,
    message: "Farmer verification update",
    detail: "A farmer account requires verification.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    read: true,
  },
  {
    id: 4,
    message: "New buyer registered",
    detail: "A new buyer has joined AgriBridge.",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    read: true,
  },
];

const timeAgo = (date) => {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  );

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function AdminNotifications() {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : buildSampleNotifications();
    } catch {
      return buildSampleNotifications();
    }
  });

  const saveNotifications = (updatedNotifications) => {
    setNotifications(updatedNotifications);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedNotifications)
    );
  };

  const markAsRead = (id) => {
    const updated = notifications.map((notification) =>
      notification.id === id
        ? { ...notification, read: true }
        : notification
    );

    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((notification) => ({
      ...notification,
      read: true,
    }));

    saveNotifications(updated);
  };

  const resetNotifications = () => {
    saveNotifications(buildSampleNotifications());
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const sortedNotifications = [...notifications].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Order, payment, verification and account updates.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              All Notifications
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {unreadCount === 0
                ? "You are all caught up"
                : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
            </p>
          </div>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="rounded-lg bg-[#174832] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103724] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark all as read
          </button>
        </div>

        {sortedNotifications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-2 py-3 font-medium">Message</th>
                  <th className="px-2 py-3 font-medium">Time</th>
                </tr>
              </thead>

              <tbody>
                {sortedNotifications.map((notification) => (
                  <tr
                    key={notification.id}
                    className={`border-b border-gray-100 ${
                      !notification.read ? "bg-green-50/30" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-2 py-4">
                      {notification.read ? (
                        <span className="text-gray-400">
                          Read
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          New
                        </span>
                      )}
                    </td>

                    <td className="px-2 py-4">
                      <button
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        className={`text-left hover:underline ${
                          notification.read
                            ? "text-gray-700"
                            : "font-semibold text-gray-900"
                        }`}
                      >
                        {notification.message}
                      </button>

                      <p className="mt-1 text-xs text-gray-500">
                        {notification.detail}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-2 py-4 text-gray-500">
                      {timeAgo(notification.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">
            No notifications available.
          </p>
        )}

        <div className="mt-5 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={resetNotifications}
            className="text-xs text-gray-500 underline hover:text-[#168343]"
          >
            Reset sample notifications
          </button>
        </div>
      </section>
    </div>
  );
}

export default AdminNotifications;
