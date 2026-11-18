import { useState } from "react";

const STORAGE_KEY = "agribridge-farmer-notifications";

const minutesAgo = (mins) => new Date(Date.now() - mins * 60000).toISOString();

const buildSample = () => [
  {
    id: 1,
    message: "New order received",
    detail: "Order #1042 for 20 kg of tomatoes",
    createdAt: minutesAgo(5),
    read: false,
  },
  {
    id: 2,
    message: "Payment received",
    detail: "KSh 4,500 for order #1042",
    createdAt: minutesAgo(48),
    read: false,
  },
  {
    id: 3,
    message: "Field visit scheduled",
    detail: "A field officer will visit your farm on Friday",
    createdAt: minutesAgo(60 * 5),
    read: false,
  },
  {
    id: 4,
    message: "New buying request near you",
    detail: "A buyer needs 100 kg of maize",
    createdAt: minutesAgo(60 * 26),
    read: true,
  },
  {
    id: 5,
    message: "Order #1039 completed",
    detail: "The buyer confirmed delivery",
    createdAt: minutesAgo(60 * 24 * 3),
    read: true,
  },
  {
    id: 6,
    message: "Phone number updated",
    detail: "Your M-Pesa number was changed",
    createdAt: minutesAgo(60 * 24 * 9),
    read: true,
  },
];

const timeAgo = (iso) => {
  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  );

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function FarmerNotifications() {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : buildSample();
  });

  const save = (next) => {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const markRead = (id) => {
    save(items.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    save(items.map((n) => ({ ...n, read: true })));
  };

  const resetSample = () => {
    save(buildSample());
  };

  const unreadCount = items.filter((n) => !n.read).length;

  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">
          Order, payment, verification and account updates.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="rounded-lg bg-[#174832] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103724] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark all as read
          </button>

          <span className="text-sm text-gray-500">
            {unreadCount === 0 ? "You are all caught up" : `${unreadCount} unread`}
          </span>
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-gray-500">
            No notifications yet. Order, payment and verification updates appear
            here.
          </p>
        ) : (
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
                {sorted.map((n) => (
                  <tr key={n.id} className="border-b border-gray-100">
                    <td className="px-2 py-4">
                      {n.read ? (
                        <span className="text-gray-400">Read</span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          New
                        </span>
                      )}
                    </td>

                    <td className="px-2 py-4">
                      {n.read ? (
                        <p className="text-gray-700">{n.message}</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          title="Mark as read"
                          className="text-left font-semibold text-gray-900 hover:underline"
                        >
                          {n.message}
                        </button>
                      )}
                      <p className="mt-0.5 text-xs text-gray-500">{n.detail}</p>
                    </td>

                    <td className="whitespace-nowrap px-2 py-4 text-gray-500">
                      {timeAgo(n.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={resetSample}
          className="mt-5 text-xs text-gray-500 underline hover:text-[#168343]"
        >
          Reset sample notifications
        </button>
      </section>
    </div>
  );
}

export default FarmerNotifications;