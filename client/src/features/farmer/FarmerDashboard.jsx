
import { Link } from "react-router-dom";

const summaryCards = [
  { title: "Total products" },
  { title: "Orders" },
  { title: "Earnings" },
];

function FarmerDashboard() {
  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">

      {/* Welcome */}
      <section className="mb-10">
        <h1 className="text-3xl font-semibold text-gray-900">
          Welcome back!
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your produce, buyer orders and earnings.
        </p>
      </section>

      {/* Summary cards */}
      <section className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="border border-gray-300 bg-white p-5"
          >
            <p className="text-gray-600">{card.title}</p>
            <h2 className="mt-5 text-2xl font-semibold text-gray-900">
              —
            </h2>
          </div>
        ))}
      </section>

      {/* Products */}
      <section className="mb-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            My Products
          </h2>

          <Link
            to="/my-products"
            className="border border-gray-400 px-5 py-3 text-sm font-medium text-gray-900 hover:bg-green-800 hover:text-white"
          >
            + Add Product
          </Link>
        </div>

        <div className="overflow-x-auto border border-gray-300">
          <table className="w-full min-w-[650px] text-left">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="px-5 py-5 font-medium">Product</th>
                <th className="px-5 py-5 font-medium">Price</th>
                <th className="px-5 py-5 font-medium">Status</th>
                <th className="px-5 py-5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="4" className="h-24"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Latest order */}
      <section>
        <h2 className="mb-5 text-2xl font-semibold text-gray-900">
          Latest order
        </h2>

        <div className="min-h-32 border border-gray-300 p-5 sm:p-6"></div>
      </section>

    </div>
  );
}

export default FarmerDashboard;
