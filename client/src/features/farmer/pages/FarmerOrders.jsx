import { useState } from "react";

const STORAGE_KEY = "agribridge-farmer-orders";
const PRODUCTS_KEY = "agribridge-farmer-products"; // saved by My products

const STATUSES = ["New", "Accepted", "Paid", "Completed", "Declined"];

const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();

const buildSample = () => [
  {
    id: 1056, buyer: "Amina Hassan", buyerType: "Individual",
    product: "Spinach", qty: 15, unit: "bunch", price: 35, status: "New",
    timeline: [{ label: "Order placed", at: ago(9) }],
  },
  {
    id: 1055, buyer: "Mary Atieno", buyerType: "Restaurant",
    product: "Tomatoes", qty: 20, unit: "kg", price: 120, status: "New",
    timeline: [{ label: "Order placed", at: ago(65) }],
  },
  {
    id: 1054, buyer: "Fresh Mart Ltd", buyerType: "Retailer",
    product: "Kale (sukuma wiki)", qty: 150, unit: "bunch", price: 40, status: "Accepted",
    timeline: [
      { label: "Order placed", at: ago(60 * 20) },
      { label: "Accepted by you", at: ago(60 * 19) },
    ],
  },
  {
    id: 1053, buyer: "Peter Kamau", buyerType: "Individual",
    product: "Potatoes", qty: 100, unit: "kg", price: 55, status: "Paid", receipt: "SKG7H2LQ9P",
    timeline: [
      { label: "Order placed", at: ago(60 * 50) },
      { label: "Accepted by you", at: ago(60 * 49) },
      { label: "Buyer paid via M-Pesa", at: ago(60 * 47) },
    ],
  },
  {
    id: 1052, buyer: "Grace Njeri", buyerType: "Individual",
    product: "Tomatoes", qty: 10, unit: "kg", price: 120, status: "Completed", receipt: "SKE4D8MZ1R",
    timeline: [
      { label: "Order placed", at: ago(60 * 24 * 5) },
      { label: "Accepted by you", at: ago(60 * 24 * 5 - 30) },
      { label: "Buyer paid via M-Pesa", at: ago(60 * 24 * 5 - 90) },
      { label: "Marked as completed", at: ago(60 * 24 * 4) },
    ],
  },
  {
    id: 1051, buyer: "John Otieno", buyerType: "Hotel",
    product: "Green maize", qty: 200, unit: "cob", price: 25, status: "Declined",
    timeline: [
      { label: "Order placed", at: ago(60 * 24 * 7) },
      { label: "Declined by you", at: ago(60 * 24 * 7 - 45) },
    ],
  },
];

const statusClass = {
  New: "bg-blue-100 text-blue-700",
  Accepted: "bg-amber-100 text-amber-700",
  Paid: "bg-green-100 text-green-700",
  Completed: "bg-gray-200 text-gray-700",
  Declined: "bg-red-100 text-red-700",
};

const formatKsh = (n) => `KSh ${Number(n).toLocaleString("en-KE")}`;

const formatTime = (iso) =>
  new Date(iso).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const mpesaText = (o) => {
  if (o.status === "New") return "Not paid. Waiting for you to accept the order.";
  if (o.status === "Accepted") return "Awaiting payment from the buyer.";
  if (o.status === "Declined") return "No payment. The order was declined.";
  return `Paid. M-Pesa receipt ${o.receipt}.`;
};

const loadOrders = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : buildSample();
  } catch {
    return buildSample();
  }
};

const readProducts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

function FarmerOrders() {
  const [orders, setOrders] = useState(loadOrders);
  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const save = (next) => {
    setOrders(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const changeStatus = (id, status, label, extra = {}) => {
    save(
      orders.map((o) =>
        o.id === id
          ? {
              ...o,
              ...extra,
              status,
              timeline: [...o.timeline, { label, at: new Date().toISOString() }],
            }
          : o
      )
    );
    setSelectedId(id);
  };

  const accept = (order) => {
    setError("");

    // Accepting reduces the quantity on the matching product in My products
    const products = readProducts();
    const match = products.find(
      (p) => p.name.toLowerCase() === order.product.toLowerCase()
    );

    if (match && match.qty < order.qty) {
      setSelectedId(order.id);
      setError(
        `Not enough stock. You have ${match.qty} ${match.unit} of ${match.name} left.`
      );
      return;
    }

    if (match) {
      const newQty = match.qty - order.qty;
      const nextProducts = products.map((p) =>
        p.id === match.id
          ? {
              ...p,
              qty: newQty,
              status: newQty === 0 && p.status === "Active" ? "Sold out" : p.status,
            }
          : p
      );
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(nextProducts));
    }

    changeStatus(order.id, "Accepted", "Accepted by you");
    setMessage(
      match
        ? `Order #${order.id} accepted. ${order.qty} ${order.unit} was taken off your ${match.name} stock.`
        : `Order #${order.id} accepted. The buyer can now pay.`
    );
  };

  const decline = (order) => {
    setError("");
    changeStatus(order.id, "Declined", "Declined by you");
    setMessage(`Order #${order.id} was declined.`);
  };

  const complete = (order) => {
    setError("");
    changeStatus(order.id, "Completed", "Marked as completed");
    setMessage(`Order #${order.id} is complete.`);
  };

  // Testing only: pretend the buyer paid with M-Pesa
  const simulatePayment = (order) => {
    const receipt =
      "SK" + Math.random().toString(36).slice(2, 10).toUpperCase();
    changeStatus(order.id, "Paid", "Buyer paid via M-Pesa", { receipt });
    setMessage(`Payment received for order #${order.id}.`);
  };

  const resetSample = () => {
    save(buildSample());
    setSelectedId(null);
    setMessage("");
    setError("");
  };

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: orders.filter((o) => o.status === s).length }),
    {}
  );

  const visible =
    filter === "All" ? orders : orders.filter((o) => o.status === filter);

  const selected = orders.find((o) => o.id === selectedId);

  const linkButton =
    "text-sm font-medium text-gray-700 underline hover:text-[#168343]";

  const sectionClass = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Incoming orders</h1>
        <p className="mt-1 text-sm text-gray-500">
          Accept or decline orders from buyers.
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
        {/* Orders list */}
        <section className={sectionClass}>
          <h2 className="mb-4 text-lg font-bold text-gray-900">Orders</h2>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter orders by status"
            className="mb-5 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#168343] focus:ring-2 focus:ring-green-100"
          >
            <option value="All">Filter: All ({orders.length})</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s} ({counts[s]})
              </option>
            ))}
          </select>

          {visible.length === 0 ? (
            <p className="text-sm text-gray-500">
              {orders.length === 0
                ? "No orders yet. New orders from buyers appear here."
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
                  {visible.map((o) => (
                    <tr
                      key={o.id}
                      className={`border-b border-gray-100 ${
                        o.id === selectedId ? "bg-green-50" : ""
                      }`}
                    >
                      <td className="px-2 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(o.id);
                            setError("");
                          }}
                          className="text-left font-semibold text-gray-900 hover:underline"
                        >
                          {o.buyer}
                        </button>
                      </td>
                      <td className="px-2 py-4 text-gray-700">{o.product}</td>
                      <td className="px-2 py-4 text-gray-700">
                        {o.qty} {o.unit}
                      </td>
                      <td className="px-2 py-4 font-medium text-gray-900">
                        {formatKsh(o.qty * o.price)}
                      </td>
                      <td className="px-2 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[o.status]}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-4">
                        {o.status === "New" ? (
                          <span className="flex gap-2">
                            <button type="button" onClick={() => accept(o)} className={linkButton}>
                              Accept
                            </button>
                            <span className="text-gray-400">/</span>
                            <button type="button" onClick={() => decline(o)} className={linkButton}>
                              Decline
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(o.id);
                              setError("");
                            }}
                            className={linkButton}
                          >
                            View
                          </button>
                        )}
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
            Reset sample orders
          </button>
        </section>

        {/* Order details */}
        <section className={`${sectionClass} xl:sticky xl:top-4`}>
          <h2 className="mb-3 text-lg font-bold text-gray-900">Order details</h2>

          {!selected ? (
            <p className="text-sm text-gray-500">
              Select an order to see the buyer, product, timeline and payment
              status.
            </p>
          ) : (
            <div className="space-y-4">
              <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
                <dt className="text-gray-500">Order</dt>
                <dd className="font-semibold text-gray-900">#{selected.id}</dd>

                <dt className="text-gray-500">Buyer</dt>
                <dd className="text-gray-900">
                  {selected.buyer}{" "}
                  <span className="text-xs text-gray-500">({selected.buyerType})</span>
                </dd>

                <dt className="text-gray-500">Product</dt>
                <dd className="text-gray-900">{selected.product}</dd>

                <dt className="text-gray-500">Quantity</dt>
                <dd className="text-gray-900">
                  {selected.qty} {selected.unit}
                </dd>

                <dt className="text-gray-500">Price</dt>
                <dd className="text-gray-900">
                  {formatKsh(selected.price)} / {selected.unit}
                </dd>

                <dt className="text-gray-500">Total</dt>
                <dd className="font-semibold text-gray-900">
                  {formatKsh(selected.qty * selected.price)}
                </dd>

                <dt className="text-gray-500">M-Pesa payment</dt>
                <dd className="text-gray-900">{mpesaText(selected)}</dd>
              </dl>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Order timeline
                </h3>
                <ol className="space-y-2 border-l-2 border-green-200 pl-4">
                  {selected.timeline.map((t, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      {t.label}
                      <span className="block text-xs text-gray-500">
                        {formatTime(t.at)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {selected.status === "New" && (
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

              {selected.status === "Accepted" && (
                <div className="rounded-lg border border-dashed border-gray-300 p-3">
                  <p className="text-sm text-gray-600">
                    Waiting for the buyer to pay with M-Pesa.
                  </p>
                  <button
                    type="button"
                    onClick={() => simulatePayment(selected)}
                    className="mt-2 text-xs font-medium text-gray-500 underline hover:text-[#168343]"
                  >
                    Testing only: simulate the buyer's payment
                  </button>
                </div>
              )}

              {selected.status === "Paid" && (
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