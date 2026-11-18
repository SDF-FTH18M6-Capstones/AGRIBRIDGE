
import { useEffect, useState } from "react";

const STORAGE_KEY = "agribridge-orders";
const PRODUCTS_KEY = "agribridge-farmer-products";

const STATUSES = [
  "New",
  "Accepted",
  "Paid",
  "Completed",
  "Declined",
];

const statusClass = {
  New: "bg-blue-100 text-blue-700",
  Accepted: "bg-amber-100 text-amber-700",
  Paid: "bg-green-100 text-green-700",
  Completed: "bg-gray-200 text-gray-700",
  Declined: "bg-red-100 text-red-700",
};

function getCurrentFarmer() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function loadOrders() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function readProducts() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(PRODUCTS_KEY) || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

const getStatus = (order) => {
  const status = String(order.status || "New").toLowerCase();

  if (
    status === "awaiting farmer" ||
    status === "pending" ||
    status === "new"
  ) {
    return "New";
  }

  if (status === "accepted" || status === "processing" || status === "shipped") {
    return "Accepted";
  }

  if (status === "paid") return "Paid";

  if (status === "completed" || status === "delivered") {
    return "Completed";
  }

  if (status === "declined" || status === "cancelled") {
    return "Declined";
  }

  return "New";
};

const getProductName = (order) => {
  if (typeof order.product === "object" && order.product !== null) {
    return order.product.name || order.product.title || "Product";
  }

  return order.product || order.productName || "Product";
};

const getQuantity = (order) => {
  const quantity = order.qty ?? order.quantity ?? 0;
  return Number.parseFloat(quantity) || 0;
};

const getUnit = (order) => order.unit || "unit";

const getPrice = (order) => {
  if (order.price !== undefined) {
    return Number(order.price) || 0;
  }

  if (order.totalAmount !== undefined) {
    const quantity = getQuantity(order);
    return quantity > 0
      ? Number(order.totalAmount) / quantity
      : 0;
  }

  if (order.total !== undefined) {
    const quantity = getQuantity(order);
    return quantity > 0
      ? Number(order.total) / quantity
      : 0;
  }

  return 0;
};

const getBuyerName = (order) =>
  order.buyerName ||
  order.buyer ||
  order.customerName ||
  "Buyer";

const getFarmerId = (order) =>
  order.farmerId || order.sellerId || "";

const formatKsh = (amount) =>
  `KSh ${Number(amount).toLocaleString("en-KE")}`;

const formatTime = (iso) => {
  if (!iso) return "Not available";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getTimeline = (order) => {
  if (Array.isArray(order.timeline) && order.timeline.length > 0) {
    return order.timeline;
  }

  return [
    {
      label: "Order placed",
      at: order.createdAt || new Date().toISOString(),
    },
  ];
};

const mpesaText = (order) => {
  const status = getStatus(order);

  if (status === "New") {
    return "Not paid. Waiting for you to accept the order.";
  }

  if (status === "Accepted") {
    return "Awaiting payment from the buyer.";
  }

  if (status === "Declined") {
    return "No payment. The order was declined.";
  }

  if (order.receipt || order.paymentReceipt) {
    return `Paid. M-Pesa receipt ${
      order.receipt || order.paymentReceipt
    }.`;
  }

  return status === "Paid" || status === "Completed"
    ? "Payment received."
    : "Payment information unavailable.";
};

function FarmerOrders() {
  const farmer = getCurrentFarmer();

  const farmerId = farmer.id || farmer.user_id || "farmer-1";

  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadFarmerOrders = () => {
      const allOrders = loadOrders();

      const farmerOrders = allOrders.filter(
        (order) =>
          String(getFarmerId(order)) === String(farmerId)
      );

      setOrders(farmerOrders);

      setSelectedId((currentId) => {
        if (
          currentId &&
          farmerOrders.some(
            (order) => String(order.id) === String(currentId)
          )
        ) {
          return currentId;
        }

        return farmerOrders.length > 0
          ? farmerOrders[0].id
          : null;
      });
    };

    loadFarmerOrders();

    window.addEventListener("storage", loadFarmerOrders);
    window.addEventListener("agribridge-update", loadFarmerOrders);

    return () => {
      window.removeEventListener("storage", loadFarmerOrders);
      window.removeEventListener("agribridge-update", loadFarmerOrders);
    };
  }, [farmerId]);

  const save = (nextOrders) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nextOrders)
    );

    setOrders(
      nextOrders.filter(
        (order) =>
          String(getFarmerId(order)) === String(farmerId)
      )
    );

    window.dispatchEvent(new Event("agribridge-update"));
  };

  const changeStatus = (order, status, label, extra = {}) => {
    const allOrders = loadOrders();
    const now = new Date().toISOString();

    const updatedOrders = allOrders.map((item) => {
      if (String(item.id) !== String(order.id)) {
        return item;
      }

      return {
        ...item,
        ...extra,
        status,
        timeline: [
          ...getTimeline(item),
          {
            label,
            at: now,
          },
        ],
        updatedAt: now,
      };
    });

    save(updatedOrders);
    setSelectedId(order.id);
  };

  const accept = (order) => {
    setError("");
    setMessage("");

    const products = readProducts();
    const productName = getProductName(order);
    const quantity = getQuantity(order);

    const match = products.find(
      (product) =>
        String(product.name).toLowerCase() ===
        String(productName).toLowerCase()
    );

    if (match && Number(match.qty ?? match.quantity ?? 0) < quantity) {
      setSelectedId(order.id);

      setError(
        `Not enough stock. You have ${
          match.qty ?? match.quantity ?? 0
        } ${match.unit || getUnit(order)} of ${match.name} left.`
      );

      return;
    }

    if (match) {
      const currentQty = Number(match.qty ?? match.quantity ?? 0);
      const newQty = currentQty - quantity;

      const nextProducts = products.map((product) =>
        String(product.id) === String(match.id)
          ? {
              ...product,
              qty: newQty,
              quantity:
                product.quantity !== undefined
                  ? newQty
                  : product.quantity,
              status:
                newQty === 0
                  ? "Out of stock"
                  : product.status === "Sold out" ||
                      product.status === "Out of stock"
                    ? "Available"
                    : product.status,
            }
          : product
      );

      localStorage.setItem(
        PRODUCTS_KEY,
        JSON.stringify(nextProducts)
      );
    }

    changeStatus(
      order,
      "Accepted",
      "Accepted by farmer"
    );

    setMessage(
      match
        ? `Order #${order.id} accepted. ${quantity} ${getUnit(
            order
          )} was deducted from your stock.`
        : `Order #${order.id} accepted. The buyer can now pay.`
    );
  };

  const decline = (order) => {
    setError("");
    setMessage("");

    changeStatus(
      order,
      "Declined",
      "Declined by farmer"
    );

    setMessage(`Order #${order.id} was declined.`);
  };

  const complete = (order) => {
    setError("");
    setMessage("");

    changeStatus(
      order,
      "Completed",
      "Marked as completed"
    );

    setMessage(`Order #${order.id} is complete.`);
  };

  const counts = STATUSES.reduce((acc, status) => {
    acc[status] = orders.filter(
      (order) => getStatus(order) === status
    ).length;

    return acc;
  }, {});

  const visible =
    filter === "All"
      ? orders
      : orders.filter(
          (order) => getStatus(order) === filter
        );

  const selected = orders.find(
    (order) => String(order.id) === String(selectedId)
  );

  const linkButton =
    "text-sm font-medium text-gray-700 underline hover:text-[#168343]";

  const sectionClass =
    "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Incoming orders
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          View and manage orders placed for your products.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className={sectionClass}>
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Orders
          </h2>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter orders by status"
            className="mb-5 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#168343] focus:ring-2 focus:ring-green-100"
          >
            <option value="All">
              Filter: All ({orders.length})
            </option>

            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status} ({counts[status]})
              </option>
            ))}
          </select>

          {visible.length === 0 ? (
            <p className="text-sm text-gray-500">
              {orders.length === 0
                ? "No orders yet. New orders for your products will appear here."
                : `No ${filter.toLowerCase()} orders.`}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="px-2 py-3 font-medium">Buyer</th>
                    <th className="px-2 py-3 font-medium">Product</th>
                    <th className="px-2 py-3 font-medium">Qty</th>
                    <th className="px-2 py-3 font-medium">Total</th>
                    <th className="px-2 py-3 font-medium">Status</th>
                    <th className="px-2 py-3 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {visible.map((order) => {
                    const status = getStatus(order);
                    const quantity = getQuantity(order);
                    const total = quantity * getPrice(order);

                    return (
                      <tr
                        key={order.id}
                        className={`border-b border-gray-100 ${
                          String(order.id) === String(selectedId)
                            ? "bg-green-50"
                            : ""
                        }`}
                      >
                        <td className="px-2 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(order.id);
                              setError("");
                            }}
                            className="text-left font-semibold text-gray-900 hover:underline"
                          >
                            {getBuyerName(order)}
                          </button>
                        </td>

                        <td className="px-2 py-4 text-gray-700">
                          {getProductName(order)}
                        </td>

                        <td className="px-2 py-4 text-gray-700">
                          {quantity} {getUnit(order)}
                        </td>

                        <td className="px-2 py-4 font-medium text-gray-900">
                          {formatKsh(total)}
                        </td>

                        <td className="px-2 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              statusClass[status]
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-2 py-4">
                          {status === "New" ? (
                            <span className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => accept(order)}
                                className={linkButton}
                              >
                                Accept
                              </button>

                              <span className="text-gray-400">/</span>

                              <button
                                type="button"
                                onClick={() => decline(order)}
                                className={linkButton}
                              >
                                Decline
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(order.id);
                                setError("");
                              }}
                              className={linkButton}
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${sectionClass} xl:sticky xl:top-4`}>
          <h2 className="mb-3 text-lg font-bold text-gray-900">
            Order details
          </h2>

          {!selected ? (
            <p className="text-sm text-gray-500">
              Select an order to see the buyer, product, timeline and payment status.
            </p>
          ) : (
            <div className="space-y-4">
              <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
                <dt className="text-gray-500">Order</dt>
                <dd className="font-semibold text-gray-900">
                  #{selected.id}
                </dd>

                <dt className="text-gray-500">Buyer</dt>
                <dd className="text-gray-900">
                  {getBuyerName(selected)}
                </dd>

                <dt className="text-gray-500">Product</dt>
                <dd className="text-gray-900">
                  {getProductName(selected)}
                </dd>

                <dt className="text-gray-500">Quantity</dt>
                <dd className="text-gray-900">
                  {getQuantity(selected)} {getUnit(selected)}
                </dd>

                <dt className="text-gray-500">Price</dt>
                <dd className="text-gray-900">
                  {formatKsh(getPrice(selected))} / {getUnit(selected)}
                </dd>

                <dt className="text-gray-500">Total</dt>
                <dd className="font-semibold text-gray-900">
                  {formatKsh(
                    getQuantity(selected) * getPrice(selected)
                  )}
                </dd>

                <dt className="text-gray-500">M-Pesa payment</dt>
                <dd className="text-gray-900">
                  {mpesaText(selected)}
                </dd>
              </dl>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Order timeline
                </h3>

                <ol className="space-y-2 border-l-2 border-green-200 pl-4">
                  {getTimeline(selected).map((item, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      {item.label}

                      <span className="block text-xs text-gray-500">
                        {formatTime(item.at)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {getStatus(selected) === "New" && (
                <div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => accept(selected)}
                      className="rounded-lg bg-[#174832] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103724]"
                    >
                      Accept order
                    </button>

                    <button
                      type="button"
                      onClick={() => decline(selected)}
                      className="rounded-lg border border-[#174832] px-5 py-3 text-sm font-semibold text-[#174832] transition hover:bg-green-50"
                    >
                      Decline order
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Accepting reduces your available quantity.
                  </p>
                </div>
              )}

              {getStatus(selected) === "Accepted" && (
                <div className="rounded-lg border border-dashed border-gray-300 p-3">
                  <p className="text-sm text-gray-600">
                    Waiting for the buyer to pay with M-Pesa.
                  </p>
                </div>
              )}

              {getStatus(selected) === "Paid" && (
                <button
                  type="button"
                  onClick={() => complete(selected)}
                  className="rounded-lg bg-[#174832] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103724]"
                >
                  Mark as completed
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default FarmerOrders;
