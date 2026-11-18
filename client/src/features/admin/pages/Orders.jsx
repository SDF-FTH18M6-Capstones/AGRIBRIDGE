
import { useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import AdminHeader from "../components/AdminHeader.jsx";

function Orders() {
  // Orders will be populated from the backend when the API is connected.
  const [orders] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) return orders;

    return orders.filter((order) =>
      [
        order.id,
        order.buyer,
        order.farmer,
        order.total,
        order.status,
        order.date,
        order.county,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm)
    );
  }, [orders, search]);

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="p-5 sm:p-6">
          <h1 className="mb-4 text-2xl font-bold text-[#1f2933]">
            Orders
          </h1>

          <section className="rounded-md border border-gray-300 bg-white p-4">
            <h2 className="mb-3 font-semibold text-[#1f2933]">
              All orders
            </h2>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter: status, date, county"
              aria-label="Filter orders by status, date or county"
              className="mb-4 w-full rounded-md border border-gray-400 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-800">
                    {[
                      "Order",
                      "Buyer",
                      "Farmer",
                      "Total",
                      "Status",
                      "Action",
                    ].map((heading) => (
                      <th key={heading} className="px-2 py-3 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-gray-200 text-gray-700"
                      >
                        <td className="px-2 py-3">{order.id}</td>
                        <td className="px-2 py-3">{order.buyer}</td>
                        <td className="px-2 py-3">{order.farmer}</td>
                        <td className="px-2 py-3">{order.total}</td>
                        <td className="px-2 py-3">{order.status}</td>
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="font-medium text-green-800 underline hover:text-green-600"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-3 py-8 text-center text-gray-500"
                      >
                        No orders available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {selectedOrder && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setSelectedOrder(null)}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="order-details-title"
                className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2
                    id="order-details-title"
                    className="text-xl font-bold text-[#12432f]"
                  >
                    Order details
                  </h2>

                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    aria-label="Close order details"
                    className="rounded-md px-3 py-1 text-xl text-gray-500 hover:bg-gray-100"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3 text-sm text-gray-700">
                  <p><strong>Order:</strong> {selectedOrder.id}</p>
                  <p><strong>Buyer:</strong> {selectedOrder.buyer}</p>
                  <p><strong>Farmer:</strong> {selectedOrder.farmer}</p>
                  <p><strong>Total:</strong> {selectedOrder.total}</p>
                  <p><strong>Status:</strong> {selectedOrder.status}</p>
                  <p><strong>Date:</strong> {selectedOrder.date}</p>
                  <p><strong>County:</strong> {selectedOrder.county}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="mt-6 w-full rounded-md bg-[#12432f] px-4 py-2.5 text-white hover:bg-green-900"
                >
                  Close
                </button>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Orders;
