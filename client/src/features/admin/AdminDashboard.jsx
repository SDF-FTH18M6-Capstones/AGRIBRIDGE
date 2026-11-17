import { Link } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar.jsx";
import AdminHeader from "./components/AdminHeader.jsx";

const summaryCards = [
  { title: "Farmers", value: 0 },
  { title: "Buyers", value: 0 },
  { title: "Pending verifications", value: 0 },
  { title: "Orders", value: 0 },
];

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
  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">

      {/* Sidebar */}
      <AdminSidebar />

      {/* Main dashboard */}
      <div className="min-w-0 flex-1">

        {/* Header */}
        <AdminHeader />

        <main className="p-5 sm:p-6">

          {/* Dashboard title */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-[#1f2933]">
              Admin dashboard
            </h1>
          </div>

          {/* Summary cards */}
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
                  {card.value}
                </h2>
              </div>
            ))}
          </section>

          {/* Verification queue */}
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

          {/* Management cards */}
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
