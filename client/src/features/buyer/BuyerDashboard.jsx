
import { Link } from "react-router-dom";

const sampleOrders = [
  {
    id: "AGR-1024",
    product: "Fresh Tomatoes",
    farmer: "Jane Wanjiku",
    location: "Nakuru",
    total: 510,
    status: "In transit",
  },
  {
    id: "AGR-1023",
    product: "Ripe Mangoes",
    farmer: "Peter Mutua",
    location: "Makueni",
    total: 900,
    status: "Pending",
  },
  {
    id: "AGR-1022",
    product: "Irish Potatoes",
    farmer: "Mary Njeri",
    location: "Nyandarua",
    total: 1600,
    status: "Delivered",
  },
];

const formatKES = (amount) =>
  `KES ${amount.toLocaleString("en-KE")}`;

const statusStyles = {
  "Pending": "bg-amber-50 text-amber-800",
  "In transit": "bg-blue-50 text-blue-800",
  "Delivered": "bg-green-100 text-green-800",
};

export default function BuyerDashboard() {
  const totalOrders = sampleOrders.length;
  const pendingOrders = sampleOrders.filter(
    (order) => order.status === "Pending"
  ).length;
  const completedOrders = sampleOrders.filter(
    (order) => order.status === "Delivered"
  ).length;
  const totalSpent = sampleOrders
    .filter((order) => order.status === "Delivered")
    .reduce((sum, order) => sum + order.total, 0);

  const stats = [
    { label: "Total Orders", value: totalOrders },
    { label: "Pending Orders", value: pendingOrders },
    { label: "Completed Orders", value: completedOrders },
    { label: "Total Spent", value: formatKES(totalSpent) },
  ];

  return (
    <main className="min-h-screen bg-[#f7faf6] p-4 text-gray-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Welcome */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-green-700">
              Buyer workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold text-green-950">
              Buyer Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Welcome back! Here's your buying overview.
            </p>
          </div>

          <Link
            to="/marketplace"
            className="rounded-lg bg-green-800 px-5 py-3 font-semibold text-white transition hover:bg-green-900"
          >
            Browse Produce →
          </Link>
        </div>

        {/* Statistics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-green-100 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-500">
                {stat.label}
              </p>
              <p className="mt-3 text-2xl font-bold text-green-900">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        {/* Recent orders */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-6">
            <div>
              <h2 className="text-xl font-bold text-green-950">
                Recent Orders
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Your latest agricultural produce purchases
              </p>
            </div>

            <Link
              to="/buyer/orders"
              className="text-sm font-semibold text-green-800 hover:underline"
            >
              View all orders →
            </Link>
          </div>

          <div className="divide-y">
            {sampleOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {order.product}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    #{order.id} · {order.farmer} · {order.location}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-semibold">
                    {formatKES(order.total)}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusStyles[order.status] ||
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="mb-5 text-xl font-bold text-green-950">
            Quick Actions
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              to="/marketplace"
              className="rounded-xl border border-green-100 bg-white p-6 shadow-sm transition hover:border-green-300 hover:shadow-md"
            >
              <h3 className="font-bold text-green-900">
                Browse Produce →
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Explore fresh produce from farmers.
              </p>
            </Link>

            <Link
              to="/buyer/orders"
              className="rounded-xl border border-green-100 bg-white p-6 shadow-sm transition hover:border-green-300 hover:shadow-md"
            >
              <h3 className="font-bold text-green-900">
                My Orders →
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Review your current and previous orders.
              </p>
            </Link>

            <Link
              to="/buyer/track-orders"
              className="rounded-xl border border-green-100 bg-white p-6 shadow-sm transition hover:border-green-300 hover:shadow-md"
            >
              <h3 className="font-bold text-green-900">
                Track Orders →
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Check the progress of your deliveries.
              </p>
            </Link>
          </div>
        </section>

        <p className="text-xs text-gray-500">
          Demo dashboard: order information is sample data and
          is not yet connected to the backend.
        </p>
      </div>
    </main>
  );
}
