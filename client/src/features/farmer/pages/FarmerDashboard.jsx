import { useEffect, useState } from "react";

const initialProducts = [
  {
    id: 1,
    name: "Fresh Tomatoes",
    category: "Vegetables",
    quantity: 45,
    price: 120,
    status: "Active",
  },
  {
    id: 2,
    name: "Green Kale",
    category: "Vegetables",
    quantity: 30,
    price: 40,
    status: "Active",
  },
  {
    id: 3,
    name: "Sweet Bananas",
    category: "Fruits",
    quantity: 0,
    price: 100,
    status: "Sold out",
  },
  {
    id: 4,
    name: "Dry Maize",
    category: "Grains",
    quantity: 80,
    price: 75,
    status: "Draft",
  },
];

const initialOrders = [
  {
    id: "ORD-1024",
    buyer: "Mary Wanjiku",
    product: "Fresh Tomatoes",
    quantity: 10,
    amount: 1200,
    status: "Pending",
  },
  {
    id: "ORD-1025",
    buyer: "Peter Kamau",
    product: "Green Kale",
    quantity: 15,
    amount: 600,
    status: "Pending",
  },
  {
    id: "ORD-1026",
    buyer: "Grace Achieng",
    product: "Dry Maize",
    quantity: 20,
    amount: 1500,
    status: "Accepted",
  },
];

const initialRequests = [
  {
    id: 1,
    buyer: "James Otieno",
    product: "Fresh Tomatoes",
    quantity: "25 kg",
    location: "Nakuru",
    status: "New",
  },
  {
    id: 2,
    buyer: "Sarah Njeri",
    product: "Green Kale",
    quantity: "15 kg",
    location: "Naivasha",
    status: "New",
  },
];

const statusStyles = {
  Active: "bg-green-100 text-green-800",
  Pending: "bg-amber-100 text-amber-800",
  Accepted: "bg-blue-100 text-blue-800",
  Declined: "bg-red-100 text-red-800",
  "Sold out": "bg-gray-100 text-gray-700",
  Draft: "bg-gray-100 text-gray-700",
  Unavailable: "bg-orange-100 text-orange-800",
  Archived: "bg-slate-100 text-slate-700",
  New: "bg-green-100 text-green-800",
  Responded: "bg-blue-100 text-blue-800",
};

function FarmerDashboard() {
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [requests, setRequests] = useState(initialRequests);
  const [message, setMessage] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("Pending review");

  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem("agribridge-farmer-products");
      const savedOrders = localStorage.getItem("agribridge-farmer-orders");
      const savedRequests = localStorage.getItem("agribridge-farmer-requests");
      const savedVerification = localStorage.getItem("agribridge-farmer-verification");

      if (savedProducts) setProducts(JSON.parse(savedProducts));
      if (savedOrders) setOrders(JSON.parse(savedOrders));
      if (savedRequests) setRequests(JSON.parse(savedRequests));
      if (savedVerification) setVerificationStatus(savedVerification);
    } catch (error) {
      console.error("Failed to load dashboard data from localStorage:", error);
    }
  }, []);

  const saveProducts = (updatedProducts) => {
    setProducts(updatedProducts);
    localStorage.setItem("agribridge-farmer-products", JSON.stringify(updatedProducts));
  };

  const saveOrders = (updatedOrders) => {
    setOrders(updatedOrders);
    localStorage.setItem("agribridge-farmer-orders", JSON.stringify(updatedOrders));
  };

  const updateOrder = (id, status) => {
    const targetOrder = orders.find((o) => o.id === id);

    if (status === "Accepted" && targetOrder) {
      const updatedProducts = products.map((product) => {
        if (product.name === targetOrder.product) {
          const newQty = Math.max(0, product.quantity - targetOrder.quantity);
          return {
            ...product,
            quantity: newQty,
            status: newQty === 0 ? "Sold out" : product.status,
          };
        }
        return product;
      });
      saveProducts(updatedProducts);
    }

    const updatedOrders = orders.map((order) =>
      order.id === id ? { ...order, status } : order
    );
    saveOrders(updatedOrders);
    setMessage(`Order ${id} ${status.toLowerCase()} successfully.`);
  };

  const updateQuantity = (id, rawValue) => {
    const parsed = Number(rawValue);
    const safeQty = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);

    const updatedProducts = products.map((product) =>
      product.id === id
        ? {
            ...product,
            quantity: safeQty,
            status:
              safeQty === 0
                ? "Sold out"
                : product.status === "Sold out"
                ? "Active"
                : product.status,
          }
        : product
    );
    saveProducts(updatedProducts);
  };

  const updateProductStatus = (id, status) => {
    const updatedProducts = products.map((product) =>
      product.id === id ? { ...product, status } : product
    );
    saveProducts(updatedProducts);
  };

  const respondToRequest = (id, status) => {
    const updatedRequests = requests.map((request) =>
      request.id === id ? { ...request, status } : request
    );
    setRequests(updatedRequests);
    localStorage.setItem("agribridge-farmer-requests", JSON.stringify(updatedRequests));
    setMessage(`Buyer request ${status.toLowerCase()}.`);
  };

  const activeProducts = products.filter((p) => p.status === "Active").length;
  const pendingOrders = orders.filter((o) => o.status === "Pending").length;
  const totalSales = orders
    .filter((o) => o.status === "Accepted")
    .reduce((total, o) => total + o.amount, 0);
  const totalOrders = orders.length;

  const stats = [
    {
      label: "Active products",
      value: activeProducts,
      icon: "▣",
      color: "bg-green-50 text-green-700",
    },
    {
      label: "Total orders",
      value: totalOrders,
      icon: "▤",
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Pending orders",
      value: pendingOrders,
      icon: "◷",
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "Sales",
      value: `KSh ${totalSales.toLocaleString("en-KE")}`,
      icon: "KSh",
      color: "bg-purple-50 text-purple-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <p className="mb-1 text-sm font-medium text-green-700">Welcome back</p>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Farmer dashboard
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your farm, products and incoming orders.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            className="ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Verification status */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-gray-900">Verification status:</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                verificationStatus === "Verified"
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {verificationStatus}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Keep your farm information and documents up to date.
          </p>
        </div>
        <a
          href="/farmer/verification"
          className="inline-flex justify-center rounded-lg border border-[#14532d] px-5 py-2.5 text-sm font-semibold text-[#14532d] transition hover:bg-green-50"
        >
          Continue verification
        </a>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <span
                className={`flex h-10 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-bold ${stat.color}`}
              >
                {stat.icon}
              </span>
            </div>
            <h3 className="mt-4 text-2xl font-bold text-gray-900">{stat.value}</h3>
          </div>
        ))}
      </section>

      {/* Orders and products */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Incoming orders */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="font-bold text-gray-900">Incoming orders</h3>
              <p className="mt-1 text-xs text-gray-500">
                Review and respond to buyer orders.
              </p>
            </div>
            <a
              href="/farmer/orders"
              className="text-sm font-semibold text-green-800 hover:underline"
            >
              View all
            </a>
          </div>
          <div className="divide-y divide-gray-100">
            {orders.map((order) => (
              <div key={order.id} className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{order.buyer}</p>
                    <p className="mt-1 text-xs text-gray-500">{order.id}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusStyles[order.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-sm text-gray-600">
                  <span>{order.product}</span>
                  <span>{order.quantity} units</span>
                  <span className="font-semibold text-gray-900">
                    KSh {order.amount.toLocaleString("en-KE")}
                  </span>
                </div>
                {order.status === "Pending" && (
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => updateOrder(order.id, "Accepted")}
                      className="flex-1 rounded-lg bg-[#123f2c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-900"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => updateOrder(order.id, "Declined")}
                      className="flex-1 rounded-lg border border-[#14532d] px-4 py-2.5 text-sm font-semibold text-[#14532d] transition hover:bg-green-50"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
            {orders.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-500">
                No incoming orders yet.
              </p>
            )}
          </div>
        </div>

        {/* My products */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="font-bold text-gray-900">My products</h3>
              <p className="mt-1 text-xs text-gray-500">
                Manage your listed products and stock.
              </p>
            </div>
            <a
              href="/farmer/products"
              className="text-sm font-semibold text-green-800 hover:underline"
            >
              View all
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Qty left</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-800">{product.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        KSh {product.price} / unit
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min="0"
                        value={product.quantity}
                        onChange={(e) => updateQuantity(product.id, e.target.value)}
                        className="w-20 rounded-md border border-gray-300 px-2 py-2 outline-none focus:border-green-700 focus:ring-1 focus:ring-green-100"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[product.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={product.status}
                        onChange={(e) =>
                          updateProductStatus(product.id, e.target.value)
                        }
                        className="rounded-md border border-gray-300 bg-white px-2 py-2 text-xs outline-none focus:border-green-700"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Active">Active</option>
                        <option value="Sold out">Sold out</option>
                        <option value="Unavailable">Unavailable</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-5 py-3">
            <a
              href="/farmer/products"
              className="text-sm font-semibold text-green-800 hover:underline"
            >
              Manage all products →
            </a>
          </div>
        </div>
      </section>

      {/* Bottom dashboard cards */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-lg text-green-800">
            ✓
          </div>
          <h3 className="font-bold text-gray-900">Verification</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Submit your ID, farm details and ownership documents. Track your
            verification status.
          </p>
          <a
            href="/farmer/verification"
            className="mt-4 inline-block text-sm font-semibold text-green-800 hover:underline"
          >
            Manage verification →
          </a>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-lg text-blue-800">
            +
          </div>
          <h3 className="font-bold text-gray-900">Add product (4 steps)</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Add product information, price and quantity, harvest status, farm
            details and confirm your listing.
          </p>
          <a
            href="/farmer/products/new"
            className="mt-4 inline-block text-sm font-semibold text-green-800 hover:underline"
          >
            Add a product →
          </a>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-lg text-amber-800">
            ✉
          </div>
          <h3 className="font-bold text-gray-900">Buyer requests</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Browse buyer requests, review their requirements and respond to
            interested buyers.
          </p>
          <a
            href="/farmer/requests"
            className="mt-4 inline-block text-sm font-semibold text-green-800 hover:underline"
          >
            Browse requests →
          </a>
        </div>
      </section>

      {/* Buyer requests table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-gray-900">Recent buyer requests</h3>
            <p className="mt-1 text-xs text-gray-500">
              Buyers looking for agricultural products.
            </p>
          </div>
          <a
            href="/farmer/requests"
            className="text-sm font-semibold text-green-800 hover:underline"
          >
            View requests →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Buyer</th>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Quantity</th>
                <th className="px-5 py-3 font-semibold">Location</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((request) => (
                <tr key={request.id}>
                  <td className="px-5 py-4 font-semibold text-gray-800">
                    {request.buyer}
                  </td>
                  <td className="px-5 py-4 text-gray-600">{request.product}</td>
                  <td className="px-5 py-4 text-gray-600">{request.quantity}</td>
                  <td className="px-5 py-4 text-gray-600">{request.location}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        statusStyles[request.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {request.status === "New" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => respondToRequest(request.id, "Responded")}
                          className="rounded-md bg-green-800 px-3 py-2 text-xs font-semibold text-white hover:bg-green-900"
                        >
                          Respond
                        </button>
                        <button
                          type="button"
                          onClick={() => respondToRequest(request.id, "Declined")}
                          className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">{request.status}</span>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    No buyer requests available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-5 text-center text-xs text-gray-400">
        AgriBridge Farmer Dashboard · Sample data for frontend development
      </footer>
    </div>
  );
}

export default FarmerDashboard;