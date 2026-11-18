
import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import AdminHeader from "../components/AdminHeader.jsx";

const STORAGE_KEY = "agribridge-orders";

const ORDER_STATUSES = [
  "Awaiting farmer",
  "Accepted",
  "Paid",
  "Processing",
  "Shipped",
  "Completed",
  "Declined",
  "Cancelled",
];

const loadOrders = () => {
  try {
    const savedOrders = localStorage.getItem(STORAGE_KEY);
    return savedOrders ? JSON.parse(savedOrders) : [];
  } catch (error) {
    console.error("Could not load orders:", error);
    return [];
  }
};

const getOrderTotal = (order) => {
  if (order.total !== undefined && order.total !== null) {
    return typeof order.total === "number"
      ? `KES ${order.total.toLocaleString()}`
      : order.total;
  }

  const quantity = Number(order.qty || order.quantity || 0);
  const price = Number(order.price || 0);

  return `KES ${(quantity * price).toLocaleString()}`;
};

const getOrderDate = (order) => {
  const date = order.createdAt || order.date;

  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getStatusStyle = (status) => {
  const styles = {
    "Awaiting farmer": "bg-yellow-100 text-yellow-800",
    New: "bg-yellow-100 text-yellow-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Accepted: "bg-blue-100 text-blue-800",
    Paid: "bg-green-100 text-green-800",
    Processing: "bg-purple-100 text-purple-800",
    Shipped: "bg-indigo-100 text-indigo-800",
    Completed: "bg-green-100 text-green-800",
    Declined: "bg-red-100 text-red-800",
    Cancelled: "bg-gray-100 text-gray-700",
  };

  return styles[status] || "bg-gray-100 text-gray-700";
};

function Orders() {
  const [orders, setOrders] = useState(loadOrders);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const refreshOrders = () => {
      setOrders(loadOrders());
    };

    window.addEventListener("storage", refreshOrders);
    window.addEventListener("agribridge-update", refreshOrders);

    return () => {
      window.removeEventListener("storage", refreshOrders);
      window.removeEventListener("agribridge-update", refreshOrders);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) return orders;

    return orders.filter((order) =>
      [
        order.id,
        order.buyer,
        order.buyerName,
        order.farmer,
        order.farmerName,
        order.product,
        order.total,
        order.price,
        order.status,
        order.date,
        order.createdAt,
        order.county,
        order.location,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm)
    );
  }, [orders, search]);

  const updateOrderStatus = (orderId, newStatus) => {
    const updatedOrders = orders.map((order) => {
      if (String(order.id) !== String(orderId)) {
        return order;
      }

      return {
        ...order,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        timeline: [
          ...(Array.isArray(order.timeline) ? order.timeline : []),
          {
            label: `Admin updated status to ${newStatus}`,
            at: new Date().toISOString(),
          },
        ],
      };
    });

    setOrders(updatedOrders);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));

    window.dispatchEvent(new Event("agribridge-update"));

    const updatedSelectedOrder = updatedOrders.find(
      (order) => String(order.id) === String(orderId)
    );

    setSelectedOrder(updatedSelectedOrder || null);
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="p-5 sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#1f2933]">
                Orders
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Monitor and manage all platform orders.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">Total orders</p>
              <p className="text-xl font-bold text-[#12432f]">
                {orders.length}
              </p>
            </div>
          </div>

          <section className="rounded-md border border-gray-300 bg-white p-4">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-semibold text-[#1f2933]">
                  All orders
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Orders placed by buyers across the platform.
                </p>
              </div>

              <span className="text-sm text-gray-500">
                Showing {filteredOrders.length} of {orders.length}
              </span>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders, buyers, farmers, products..."
              aria-label="Search orders"
              className="mb-4 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-800">
                    <th className="px-3 py-3 font-medium">Order</th>
                    <th className="px-3 py-3 font-medium">Buyer</th>
                    <th className="px-3 py-3 font-medium">Farmer</th>
                    <th className="px-3 py-3 font-medium">Total</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        <td className="px-3 py-3 font-medium">
                          {order.id}
                        </td>

                        <td className="px-3 py-3">
                          {order.buyerName || order.buyer || "Unknown buyer"}
                        </td>

                        <td className="px-3 py-3">
                          {order.farmerName || order.farmer || "Unknown farmer"}
                        </td>

                        <td className="px-3 py-3">
                          {getOrderTotal(order)}
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                              order.status
                            )}`}
                          >
                            {order.status || "Awaiting farmer"}
                          </span>
                        </td>

                        <td className="px-3 py-3">
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
                        className="px-3 py-10 text-center text-gray-500"
                      >
                        {orders.length === 0
                          ? "No orders have been placed yet."
                          : "No orders found. Try a different search."}
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
                  <div>
                    <h2
                      id="order-details-title"
                      className="text-xl font-bold text-[#12432f]"
                    >
                      Order details
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Order #{selectedOrder.id}
                    </p>
                  </div>

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
                  <p>
                    <strong>Buyer:</strong>{" "}
                    {selectedOrder.buyerName ||
                      selectedOrder.buyer ||
                      "Unknown buyer"}
                  </p>

                  <p>
                    <strong>Farmer:</strong>{" "}
                    {selectedOrder.farmerName ||
                      selectedOrder.farmer ||
                      "Unknown farmer"}
                  </p>

                  <p>
                    <strong>Product:</strong>{" "}
                    {selectedOrder.product || "Not available"}
                  </p>

                  <p>
                    <strong>Quantity:</strong>{" "}
                    {selectedOrder.qty ||
                      selectedOrder.quantity ||
                      "Not available"}{" "}
                    {selectedOrder.unit || ""}
                  </p>

                  <p>
                    <strong>Unit price:</strong>{" "}
                    KES {Number(selectedOrder.price || 0).toLocaleString()}
                  </p>

                  <p>
                    <strong>Total:</strong> {getOrderTotal(selectedOrder)}
                  </p>

                  <p>
                    <strong>Payment:</strong>{" "}
                    {selectedOrder.paymentStatus || "Not available"}
                  </p>

                  <p>
                    <strong>Location:</strong>{" "}
                    {selectedOrder.county ||
                      selectedOrder.location ||
                      "Not available"}
                  </p>

                  <p>
                    <strong>Date:</strong> {getOrderDate(selectedOrder)}
                  </p>

                  <div className="border-t border-gray-200 pt-4">
                    <label
                      htmlFor="admin-order-status"
                      className="mb-2 block font-semibold text-gray-800"
                    >
                      Update order status
                    </label>

                    <select
                      id="admin-order-status"
                      value={selectedOrder.status || "Awaiting farmer"}
                      onChange={(event) =>
                        updateOrderStatus(
                          selectedOrder.id,
                          event.target.value
                        )
                      }
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
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


