import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar.jsx";
import AdminHeader from "./components/AdminHeader.jsx";
import api from "../../services/api";

const managementCards = [
  {
    title: "Products",
    description: "Moderate listings",
    path: "/admin/products",
  },
  {
    title: "Orders and payments",
    description: "Monitor transactions",
    path: "/admin/orders",
  },
  {
    title: "Disputes",
    description: "Open complaints",
    path: "/admin/disputes",
  },
  {
    title: "Users",
    description:
      "Farmers, buyers, officers. Admin accounts by invitation only.",
    path: "/admin/farmers",
  },
];

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/dashboards/admin");

        if (isMounted) {
          setDashboard(response.data.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.message || "Failed to load dashboard data."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const summaryCards = [
    {
      title: "Farmers",
      value: dashboard?.farmers?.total ?? 0,
    },
    {
      title: "Buyers",
      value: dashboard?.buyers?.total ?? 0,
    },
    {
      title: "Total users",
      value: dashboard?.users?.total ?? 0,
    },
    {
      title: "Orders",
      value: dashboard?.orders?.total ?? 0,
    },
  ];

  const statistics = [
    {
      title: "Total products",
      value: dashboard?.products?.total ?? 0,
    },
    {
      title: "Total payments",
      value: dashboard?.payments?.total ?? 0,
    },
    {
      title: "Buyer requests",
      value: dashboard?.requests?.total ?? 0,
    },
    {
      title: "Amount paid",
      value: `KES ${Number(
        dashboard?.payments?.paid_amount ?? 0
      ).toLocaleString("en-KE")}`,
    },
  ];

  const statusSections = [
    {
      title: "Product status",
      statuses: dashboard?.products?.by_status,
    },
    {
      title: "Order status",
      statuses: dashboard?.orders?.by_status,
    },
    {
      title: "Request status",
      statuses: dashboard?.requests?.by_status,
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-[#1f2933]">
              Admin dashboard
            </h1>
          </div>

          {loading && (
            <p className="mb-4 text-sm text-gray-600">
              Loading dashboard data...
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 p-4"
            >
              <p className="text-sm text-red-700">{error}</p>

              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-2 text-sm font-semibold text-red-800 underline"
              >
                Try again
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.title}
                className="rounded-md border border-gray-300 bg-white p-4"
              >
                <p className="text-sm text-gray-600">
                  {card.title}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-[#1f2933]">
                  {loading ? "..." : card.value}
                </h2>
              </div>
            ))}
          </section>

          <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statistics.map((item) => (
              <div
                key={item.title}
                className="rounded-md border border-gray-300 bg-white p-4"
              >
                <p className="text-sm text-gray-600">
                  {item.title}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-[#1f2933]">
                  {loading ? "..." : item.value}
                </h2>
              </div>
            ))}
          </section>

          <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {statusSections.map((section) => (
              <div
                key={section.title}
                className="rounded-md border border-gray-300 bg-white p-4"
              >
                <h2 className="mb-3 font-semibold text-[#1f2933]">
                  {section.title}
                </h2>

                {loading ? (
                  <p className="text-sm text-gray-500">
                    Loading...
                  </p>
                ) : section.statuses ? (
                  <div className="space-y-2">
                    {Object.entries(section.statuses).map(
                      ([status, count]) => (
                        <div
                          key={status}
                          className="flex justify-between text-sm"
                        >
                          <span className="capitalize text-gray-600">
                            {status.replaceAll("_", " ")}
                          </span>

                          <span className="font-semibold text-[#1f2933]">
                            {count}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No status information available.
                  </p>
                )}
              </div>
            ))}
          </section>

          <section className="mt-4 rounded-md border border-gray-300 bg-white">
            <h2 className="px-4 pt-4 font-semibold text-[#1f2933]">
              Verification queue
            </h2>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-800">
                    {[
                      "Farmer",
                      "Applied",
                      "County",
                      "Documents",
                      "Officer",
                      "Status",
                      "Review",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-3 py-3 font-medium"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td
                      colSpan="7"
                      className="px-4 py-5 text-center text-gray-500"
                    >
                      No verification applications available.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="border-t border-gray-200 px-4 py-3 text-xs text-gray-600">
              Review opens documents, inspection report, Approve / Reject /
              Request info, with audit history.
            </p>
          </section>

          <section className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {managementCards.map((card) => (
              <Link
                key={card.title}
                to={card.path}
                className="rounded-md border border-gray-300 bg-white p-4 transition hover:border-green-700 hover:shadow-sm"
              >
                <h2 className="font-semibold text-[#1f2933]">
                  {card.title}
                </h2>

                <p className="mt-1 text-xs text-gray-600">
                  {card.description}
                </p>
              </Link>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;