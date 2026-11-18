
import React, { useEffect, useState } from "react";

const STORAGE_KEY = "agribridge-orders";
const PAYMENTS_KEY = "agribridge-payments";

function getStoredOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function getStoredPayments() {
  try {
    return JSON.parse(localStorage.getItem(PAYMENTS_KEY)) || [];
  } catch {
    return [];
  }
}

function getCurrentBuyer() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

const MyOrders = () => {
  const buyer = getCurrentBuyer();
  const buyerId = String(buyer.id || buyer.user_id || "buyer-1");
  const buyerName =
    buyer.fullName || buyer.name || buyer.username || "Sample buyer";

  const [selectedFilter, setSelectedFilter] = useState("All");
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const loadOrders = () => {
      const allOrders = getStoredOrders();

      const buyerOrders = allOrders.filter(
        (order) => String(order.buyerId) === buyerId
      );

      setOrders(buyerOrders);

      setSelectedOrder((currentSelected) => {
        if (!currentSelected) return null;

        return (
          buyerOrders.find(
            (order) =>
              String(order.id) === String(currentSelected.id)
          ) || null
        );
      });
    };

    loadOrders();

    window.addEventListener("storage", loadOrders);
    window.addEventListener("agribridge-update", loadOrders);

    return () => {
      window.removeEventListener("storage", loadOrders);
      window.removeEventListener("agribridge-update", loadOrders);
    };
  }, [buyerId]);

  const getOrderStatus = (order) => {
    return order.status || "Awaiting farmer";
  };

  const getOrderAction = (order) => {
    const status = getOrderStatus(order).toLowerCase();

    if (status === "awaiting farmer" || status === "pending") {
      return "Cancel";
    }

    if (
      status === "accepted" &&
      String(order.paymentStatus).toLowerCase() !== "paid"
    ) {
      return "Pay now";
    }

    return "View";
  };

  const getProductName = (order) => {
    if (typeof order.product === "object" && order.product !== null) {
      return order.product.name || order.product.title || "Product";
    }

    return order.product || order.productName || "Product";
  };

  const getFarmerName = (order) => {
    if (typeof order.farmer === "object" && order.farmer !== null) {
      return order.farmer.name || order.farmer.fullName || "Farmer";
    }

    return order.farmerName || order.farmer || "Farmer";
  };

  const getTotal = (order) => {
    if (typeof order.total === "number") {
      return `KSh ${order.total.toLocaleString()}`;
    }

    return (
      order.total ||
      (order.totalAmount
        ? `KSh ${Number(order.totalAmount).toLocaleString()}`
        : "Not available")
    );
  };

  const getAmount = (order) => {
    const value =
      order.totalAmount ??
      order.total ??
      Number(order.price || 0) * Number(order.quantity || order.qty || 0);

    return Number(String(value).replace(/[^\d.-]/g, "")) || 0;
  };

  const filteredOrders =
    selectedFilter === "All"
      ? orders
      : orders.filter(
          (order) =>
            getOrderStatus(order).toLowerCase() ===
            selectedFilter.toLowerCase()
        );

  const updateOrder = (orderId, updates) => {
    const allOrders = getStoredOrders();

    const updatedOrders = allOrders.map((order) =>
      String(order.id) === String(orderId)
        ? {
            ...order,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        : order
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedOrders)
    );

    const buyerOrders = updatedOrders.filter(
      (order) => String(order.buyerId) === buyerId
    );

    setOrders(buyerOrders);

    const updatedSelectedOrder = buyerOrders.find(
      (order) => String(order.id) === String(orderId)
    );

    setSelectedOrder(updatedSelectedOrder || null);

    window.dispatchEvent(new Event("agribridge-update"));
  };

  // Save the payment record and update the order together.
  const handlePayment = (order) => {
    const allOrders = getStoredOrders();
    const allPayments = getStoredPayments();

    const now = new Date().toISOString();

    const orderBuyerId = String(order.buyerId || buyerId);

    const existingIndex = allPayments.findIndex(
      (payment) =>
        String(payment.orderId || payment.order) === String(order.id)
    );

    const existingPayment =
      existingIndex >= 0 ? allPayments[existingIndex] : null;

    const paymentRecord = {
      id: existingPayment?.id || `PAY-${order.id}`,
      orderId: order.id,
      order: order.id,
      buyerId: orderBuyerId,
      buyerName: order.buyerName || buyerName,
      farmerId: order.farmerId || order.sellerId || "",
      farmerName: getFarmerName(order),
      amount: getAmount(order),
      date: existingPayment?.date || now.slice(0, 10),
      createdAt: existingPayment?.createdAt || now,
      method: existingPayment?.method || "M-Pesa",
      receipt:
        existingPayment?.receipt || order.paymentReceipt || "",
      mpesaReceipt: existingPayment?.mpesaReceipt || "",
      status: "Paid",
    };

    const updatedPayments = [...allPayments];

    if (existingIndex >= 0) {
      updatedPayments[existingIndex] = paymentRecord;
    } else {
      updatedPayments.push(paymentRecord);
    }

    const updatedOrders = allOrders.map((existingOrder) =>
      String(existingOrder.id) === String(order.id)
        ? {
            ...existingOrder,
            paymentStatus: "Paid",
            status: "Paid",
            updatedAt: now,
          }
        : existingOrder
    );

    localStorage.setItem(
      PAYMENTS_KEY,
      JSON.stringify(updatedPayments)
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedOrders)
    );

    const buyerOrders = updatedOrders.filter(
      (item) => String(item.buyerId) === buyerId
    );

    setOrders(buyerOrders);

    const updatedSelectedOrder = buyerOrders.find(
      (item) => String(item.id) === String(order.id)
    );

    setSelectedOrder(updatedSelectedOrder || null);

    window.dispatchEvent(new Event("agribridge-update"));
  };

  const handleActionClick = (order, e) => {
    e.stopPropagation();

    const action = getOrderAction(order);

    if (action === "Cancel") {
      const confirmed = window.confirm(
        `Are you sure you want to cancel order #${order.id}?`
      );

      if (!confirmed) return;

      updateOrder(order.id, {
        status: "Cancelled",
      });

      return;
    }

    if (action === "Pay now") {
      const confirmed = window.confirm(
        `Proceed with payment for order #${order.id}?`
      );

      if (!confirmed) return;

      handlePayment(order);
      return;
    }

    setSelectedOrder(order);
  };

  const getStatusStyle = (status) => {
    const normalizedStatus = status.toLowerCase();

    if (
      normalizedStatus === "accepted" ||
      normalizedStatus === "paid" ||
      normalizedStatus === "completed" ||
      normalizedStatus === "delivered"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      normalizedStatus === "declined" ||
      normalizedStatus === "cancelled"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (
      normalizedStatus === "processing" ||
      normalizedStatus === "shipped"
    ) {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left: Orders Table */}
        <div className="space-y-4 rounded-lg border border-gray-300 bg-white p-5 lg:col-span-7">
          <h3 className="text-base font-bold text-gray-900">
            Orders
          </h3>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-300 bg-gray-50 p-2 text-xs text-gray-600">
            <span className="px-1 font-medium">Filter:</span>

            {[
              "All",
              "Awaiting farmer",
              "Accepted",
              "Paid",
              "Processing",
              "Shipped",
              "Completed",
              "Delivered",
              "Declined",
              "Cancelled",
            ].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`rounded px-2.5 py-1 transition-colors ${
                  selectedFilter === filter
                    ? "bg-[#143d24] font-medium text-white"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-600">
                  <th className="py-2.5">Order</th>
                  <th className="py-2.5">Product</th>
                  <th className="py-2.5">Farmer</th>
                  <th className="py-2.5">Total</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 text-xs text-gray-800">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const status = getOrderStatus(order);

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`cursor-pointer transition-colors ${
                          selectedOrder?.id === order.id
                            ? "bg-green-50/50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="py-3 font-medium">
                          #{order.id}
                        </td>

                        <td className="py-3 text-gray-700">
                          {getProductName(order)}
                        </td>

                        <td className="py-3 text-gray-600">
                          {getFarmerName(order)}
                        </td>

                        <td className="py-3 font-medium">
                          {getTotal(order)}
                        </td>

                        <td className="py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="py-3 text-right">
                          <button
                            onClick={(e) =>
                              handleActionClick(order, e)
                            }
                            className="font-semibold text-[#143d24] hover:underline"
                          >
                            {getOrderAction(order)}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="py-8 text-center text-gray-500"
                    >
                      {orders.length === 0
                        ? "You have not placed any orders yet."
                        : `No orders found under "${selectedFilter}".`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Order Details */}
        <div className="space-y-4 rounded-lg border border-gray-300 bg-white p-5 lg:col-span-5">
          <h3 className="text-base font-bold text-gray-900">
            Order details
          </h3>

          {selectedOrder ? (
            <div className="space-y-4 text-xs text-gray-700">
              <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                <div className="flex justify-between gap-3 text-sm font-bold text-gray-900">
                  <span>Order #{selectedOrder.id}</span>

                  <span className="text-[#143d24]">
                    {getOrderStatus(selectedOrder)}
                  </span>
                </div>

                <p>
                  <span className="font-medium text-gray-500">
                    Product:
                  </span>{" "}
                  {getProductName(selectedOrder)}
                </p>

                <p>
                  <span className="font-medium text-gray-500">
                    Farmer:
                  </span>{" "}
                  {getFarmerName(selectedOrder)}
                </p>

                <p>
                  <span className="font-medium text-gray-500">
                    Quantity:
                  </span>{" "}
                  {selectedOrder.quantity || selectedOrder.qty || "Not specified"}
                </p>

                <p>
                  <span className="font-medium text-gray-500">
                    Total:
                  </span>{" "}
                  {getTotal(selectedOrder)}
                </p>

                <p>
                  <span className="font-medium text-gray-500">
                    Payment:
                  </span>{" "}
                  {selectedOrder.paymentStatus || "Not paid"}
                </p>

                <p>
                  <span className="font-medium text-gray-500">
                    Delivery location:
                  </span>{" "}
                  {selectedOrder.location ||
                    selectedOrder.deliveryAddress ||
                    "Not specified"}
                </p>
              </div>

              <div className="space-y-1.5 border-t border-gray-200 pt-2">
                <p className="font-medium text-gray-900">
                  Order timeline & payment receipt:
                </p>

                <p className="text-gray-500">
                  {selectedOrder.createdAt
                    ? `Order placed: ${new Date(
                        selectedOrder.createdAt
                      ).toLocaleString()}`
                    : "Order timeline will appear here."}
                </p>

                <p className="text-gray-500">
                  Payment receipt:{" "}
                  {selectedOrder.paymentReceipt || "Not available"}
                </p>
              </div>

              <div className="pt-3">
                <button
                  onClick={() =>
                    alert(
                      `Reporting a problem for order #${selectedOrder.id}`
                    )
                  }
                  className="rounded-md bg-[#143d24] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#1c5231]"
                >
                  Report a problem
                </button>
              </div>
            </div>
          ) : (
            <p className="py-6 text-xs text-gray-500">
              Select an order from the table to view details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyOrders;
