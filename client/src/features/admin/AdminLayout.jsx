
import { Link } from "react-router-dom";

const summaryCards = [
  {
    title: "Farmers",
    value: 0,
  },
  {
    title: "Buyers",
    value: 0,
  },
  {
    title: "Pending verifications",
    value: 0,
  },
  {
    title: "Orders",
    value: 0,
  },
];

const managementCards = [
  {
    title: "Products",
    description: "Moderate product listings",
    path: "/admin/products",
  },
  {
    title: "Orders and payments",
    description: "Monitor marketplace transactions",
    path: "/admin/orders",
  },
  {
    title: "Disputes",
    description: "Manage open complaints",
    path: "/admin/disputes",
  },
  {
    title: "Users",
    description: "Manage farmers, buyers and field officers",
    path: "/admin/farmers",
  },
];

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#f4f7f2]">

      {/* Dashboard heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1f2933]">
          Admin Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Overview of AgriBridge platform activities.
        </p>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-600">
              {card.title}
            </p>

            <h2 className="mt-3 text-3xl font-bold text-[#12432f]">
              {card.value}
            </h2>
          </div>
        ))}
      </section>

      {/* Verification queue */}
      <section className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
          <div>
            <h2 className="font-semibold text-[#1f2933]">
              Verification Queue
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Review farmer verification applications.
            </p>
          </div>

          <Link
            to="/admin/verification"
            className="rounded-md bg-[#12432f] px-4 py-2 text-sm font-medium text-white hover:bg-green-900"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
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
                    className="px-4 py-3 font-medium text-gray-700"
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
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No verification applications available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Management section */}
      <section className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-[#1f2933]">
          Management
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {managementCards.map((card) => (
            <Link
              key={card.title}
              to={card.path}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-green-700 hover:shadow-md"
            >
              <h3 className="font-semibold text-[#12432f]">
                {card.title}
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                {card.description}
              </p>

              <span className="mt-4 inline-block text-sm font-medium text-green-800">
                Manage →
              </span>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}

export default AdminDashboard;
