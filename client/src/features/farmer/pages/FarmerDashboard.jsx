
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSeedling,
  faClipboardCheck,
  faBox,
  faPlus,
  faClipboardList,
  faShoppingBag,
  faUsers,
  faArrowRight,
  faLocationDot,
  faCheck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

const PRODUCTS_KEY = "agribridge-farmer-products";
const ORDERS_KEY = "agribridge-farmer-orders";
const REQUESTS_KEY = "agribridge-buyer-requests";
const VERIFICATION_KEY = "agribridge-farmer-verification";

const sampleProducts = [
  {
    id: 1,
    name: "Fresh Tomatoes",
    category: "Vegetables",
    price: 120,
    quantity: 50,
    unit: "kg",
    status: "Available",
  },
  {
    id: 2,
    name: "Green Kale",
    category: "Vegetables",
    price: 40,
    quantity: 100,
    unit: "bunches",
    status: "Available",
  },
  {
    id: 3,
    name: "Sweet Bananas",
    category: "Fruits",
    price: 80,
    quantity: 30,
    unit: "kg",
    status: "Available",
  },
  {
    id: 4,
    name: "Dry Maize",
    category: "Grains",
    price: 65,
    quantity: 0,
    unit: "kg",
    status: "Out of stock",
  },
];

const sampleOrders = [
  {
    id: "ORD-1024",
    buyer: "James Otieno",
    product: "Fresh Tomatoes",
    quantity: 20,
    total: 2400,
    status: "Pending",
  },
  {
    id: "ORD-1025",
    buyer: "Sarah Njeri",
    product: "Green Kale",
    quantity: 30,
    total: 1200,
    status: "Pending",
  },
  {
    id: "ORD-1026",
    buyer: "Peter Kamau",
    product: "Sweet Bananas",
    quantity: 15,
    total: 1200,
    status: "Accepted",
  },
];

function getInitialData(key, sampleData) {
  try {
    const saved = localStorage.getItem(key);

    if (saved !== null) {
      return JSON.parse(saved);
    }

    localStorage.setItem(key, JSON.stringify(sampleData));
    return sampleData;
  } catch (error) {
    console.error("Could not load dashboard data:", error);
    return sampleData;
  }
}

function getVerificationStatus() {
  try {
    const saved = localStorage.getItem(VERIFICATION_KEY);

    if (!saved) return "not_submitted";

    const parsed = JSON.parse(saved);

    if (typeof parsed === "string") {
      return parsed.toLowerCase().replaceAll(" ", "_");
    }

    return parsed.status || "not_submitted";
  } catch {
    return "not_submitted";
  }
}

function getCurrentFarmer() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function FarmerDashboard() {
  const farmer = getCurrentFarmer();
  const farmerId = farmer.id || farmer.user_id || "farmer-1";

  const [products, setProducts] = useState(() =>
    getInitialData(PRODUCTS_KEY, sampleProducts)
  );

  const [orders, setOrders] = useState(() =>
    getInitialData(ORDERS_KEY, sampleOrders)
  );

  const [requests, setRequests] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState(
    getVerificationStatus
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadDashboardData = () => {
      try {
        const savedProducts = localStorage.getItem(PRODUCTS_KEY);
        const savedOrders = localStorage.getItem(ORDERS_KEY);
        const savedRequests = localStorage.getItem(REQUESTS_KEY);

        if (savedProducts) {
          setProducts(JSON.parse(savedProducts));
        }

        if (savedOrders) {
          setOrders(JSON.parse(savedOrders));
        }

        if (savedRequests) {
          setRequests(JSON.parse(savedRequests));
        }

        setVerificationStatus(getVerificationStatus());
      } catch (error) {
        console.error("Failed to refresh farmer dashboard:", error);
      }
    };

    loadDashboardData();

    window.addEventListener("storage", loadDashboardData);
    window.addEventListener("agribridge-update", loadDashboardData);

    return () => {
      window.removeEventListener("storage", loadDashboardData);
      window.removeEventListener("agribridge-update", loadDashboardData);
    };
  }, []);

  const saveProducts = (updatedProducts) => {
    setProducts(updatedProducts);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updatedProducts));
    window.dispatchEvent(new Event("agribridge-update"));
  };

  const saveOrders = (updatedOrders) => {
    setOrders(updatedOrders);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
    window.dispatchEvent(new Event("agribridge-update"));
  };

  const updateOrderStatus = (id, status) => {
    const targetOrder = orders.find(
      (order) => String(order.id) === String(id)
    );

    if (!targetOrder) return;

    if (status === "Accepted") {
      const updatedProducts = products.map((product) => {
        if (product.name !== targetOrder.product) {
          return product;
        }

        const newQuantity = Math.max(
          0,
          Number(product.quantity) - Number(targetOrder.quantity)
        );

        return {
          ...product,
          quantity: newQuantity,
          status: newQuantity > 0 ? "Available" : "Out of stock",
        };
      });

      saveProducts(updatedProducts);
    }

    const updatedOrders = orders.map((order) =>
      String(order.id) === String(id)
        ? { ...order, status }
        : order
    );

    saveOrders(updatedOrders);
    setMessage(`Order ${id} has been ${status.toLowerCase()}.`);
  };

  const updateProductQuantity = (id) => {
    const product = products.find(
      (item) => String(item.id) === String(id)
    );

    if (!product) return;

    const newQuantity = window.prompt(
      `Enter the new quantity for ${product.name}:`,
      product.quantity
    );

    if (newQuantity === null) return;

    if (
      newQuantity.trim() === "" ||
      !Number.isFinite(Number(newQuantity)) ||
      Number(newQuantity) < 0
    ) {
      setMessage("Please enter a valid quantity.");
      return;
    }

    const quantity = Number(newQuantity);

    const updatedProducts = products.map((item) =>
      String(item.id) === String(id)
        ? {
            ...item,
            quantity,
            status: quantity > 0 ? "Available" : "Out of stock",
          }
        : item
    );

    saveProducts(updatedProducts);
    setMessage("Product quantity updated successfully.");
  };

  const getRequestStatus = (request) => {
    const response = Array.isArray(request.responses)
      ? request.responses.find(
          (item) => String(item.farmerId) === String(farmerId)
        )
      : null;

    return response?.status || "pending";
  };

  const updateRequestStatus = (id, status) => {
    const allRequests = (() => {
      try {
        return JSON.parse(localStorage.getItem(REQUESTS_KEY)) || [];
      } catch {
        return [];
      }
    })();

    const updatedRequests = allRequests.map((request) => {
      if (String(request.id) !== String(id)) {
        return request;
      }

      const oldResponses = Array.isArray(request.responses)
        ? request.responses
        : [];

      const newResponse = {
        farmerId,
        farmerName:
          farmer.fullName || farmer.full_name || farmer.name || "Farmer",
        status: status.toLowerCase(),
        respondedAt: new Date().toISOString(),
      };

      const alreadyResponded = oldResponses.some(
        (response) => String(response.farmerId) === String(farmerId)
      );

      const responses = alreadyResponded
        ? oldResponses.map((response) =>
            String(response.farmerId) === String(farmerId)
              ? newResponse
              : response
          )
        : [...oldResponses, newResponse];

      return {
        ...request,
        responses,
      };
    });

    localStorage.setItem(REQUESTS_KEY, JSON.stringify(updatedRequests));
    setRequests(updatedRequests);
    setMessage(`Buyer request ${status.toLowerCase()} successfully.`);

    window.dispatchEvent(new Event("agribridge-update"));
  };

  const availableProducts = products.filter(
    (product) =>
      Number(product.quantity) > 0 &&
      product.status !== "Archived" &&
      product.status !== "Unavailable"
  ).length;

  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const pendingRequests = requests.filter(
    (request) => getRequestStatus(request) === "pending"
  ).length;

  const stats = [
    {
      title: "Total Products",
      value: products.length,
      description: "Products listed",
      icon: faBox,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Available Products",
      value: availableProducts,
      description: "Currently in stock",
      icon: faSeedling,
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Pending Orders",
      value: pendingOrders,
      description: "Awaiting your response",
      icon: faShoppingBag,
      color: "bg-orange-100 text-orange-700",
    },
    {
      title: "Buyer Requests",
      value: pendingRequests,
      description: "Requests awaiting response",
      icon: faUsers,
      color: "bg-purple-100 text-purple-700",
    },
  ];

  const verificationMessages = {
    approved: "Your farmer account has been verified.",
    field_verified:
      "Your field inspection has been completed. Awaiting final approval.",
    field_visit_scheduled:
      "A field officer has been assigned to inspect your farm.",
    pending_review: "Your application is waiting for admin review.",
    rejected:
      "Your verification application was rejected. Check the feedback.",
    more_information_requested:
      "Additional information is required for your application.",
    not_submitted:
      "Complete your farmer verification to access all platform services.",
  };

  const verificationLabels = {
    approved: "Approved",
    field_verified: "Field Verified",
    field_visit_scheduled: "Field Visit Scheduled",
    pending_review: "Pending Review",
    rejected: "Rejected",
    more_information_requested: "More Information Required",
    not_submitted: "Not Submitted",
  };

  const getOrderTotal = (order) => {
    return Number(order.total ?? order.amount ?? 0);
  };

  const getRequestBuyer = (request) => {
    return request.buyerName || request.buyer || "Buyer";
  };

  const getRequestQuantity = (request) => {
    return (
      request.quantityNeeded ||
      request.qty ||
      `${request.quantity || ""} ${request.unit || ""}`.trim() ||
      "Not specified"
    );
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-[#174832] p-6 text-white shadow-sm sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-green-100">Farmer Dashboard</p>

          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
            Welcome to AgriBridge!
          </h2>

          <p className="mt-2 max-w-xl text-sm text-green-100">
            Manage your farm, monitor your products and connect with
            potential buyers from one place.
          </p>
        </div>

        <Link
          to="/farmer/products/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#174832] hover:bg-green-50"
        >
          <FontAwesomeIcon icon={faPlus} />
          Add Product
        </Link>
      </section>

      <section className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            <FontAwesomeIcon icon={faClipboardCheck} />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              Farmer Verification
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {verificationMessages[verificationStatus] ||
                "Check your farmer verification application status."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              verificationStatus === "approved"
                ? "bg-green-100 text-green-800"
                : verificationStatus === "rejected"
                ? "bg-red-100 text-red-800"
                : "bg-orange-100 text-orange-800"
            }`}
          >
            {verificationLabels[verificationStatus] || verificationStatus}
          </span>

          <Link
            to="/farmer/verification"
            className="text-sm font-semibold text-[#174832] hover:underline"
          >
            View details
            <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
          </Link>
        </div>
      </section>

      {message && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Close message"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Overview</h2>
          <p className="text-sm text-gray-500">
            Here's what's happening on your farm.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>

                  <h3 className="mt-2 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </h3>
                </div>

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}
                >
                  <FontAwesomeIcon icon={stat.icon} className="text-xl" />
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h2 className="font-bold text-gray-900">Incoming Orders</h2>
            <p className="mt-1 text-sm text-gray-500">
              Review orders from your buyers.
            </p>
          </div>

          <Link
            to="/farmer/orders"
            className="text-sm font-semibold text-[#174832] hover:underline"
          >
            View all
            <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Order ID</th>
                <th className="px-5 py-3">Buyer</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Quantity</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-4 font-semibold text-gray-800">
                    {order.id}
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {order.buyerName || order.buyer || "Buyer"}
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {order.product}
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {order.quantity}
                  </td>

                  <td className="px-5 py-4 font-medium text-gray-800">
                    KSh {getOrderTotal(order).toLocaleString("en-KE")}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        order.status === "Accepted"
                          ? "bg-green-100 text-green-700"
                          : order.status === "Declined"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {order.status === "Pending" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateOrderStatus(order.id, "Accepted")
                          }
                          title="Accept order"
                          className="rounded-lg bg-green-100 px-3 py-2 text-green-700 hover:bg-green-200"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateOrderStatus(order.id, "Declined")
                          }
                          title="Decline order"
                          className="rounded-lg bg-red-100 px-3 py-2 text-red-700 hover:bg-red-200"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Updated</span>
                    )}
                  </td>
                </tr>
              ))}

              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-gray-500">
                    No orders have been received yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h2 className="font-bold text-gray-900">My Products</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your listed farm products.
            </p>
          </div>

          <Link
            to="/farmer/products/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#174832] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#103923]"
          >
            <FontAwesomeIcon icon={faPlus} />
            Add Product
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Quantity</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {products.slice(0, 5).map((product) => (
                <tr key={product.id}>
                  <td className="px-5 py-4 font-semibold text-gray-800">
                    {product.name}
                  </td>

                  <td className="px-5 py-4 text-gray-600">
                    {product.category}
                  </td>

                  <td className="px-5 py-4 font-medium text-gray-800">
                    KSh {Number(product.price).toLocaleString("en-KE")}
                  </td>

                  <td className="px-5 py-4 text-gray-600">
                    {product.quantity} {product.unit || ""}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        Number(product.quantity) > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {Number(product.quantity) > 0
                        ? "Available"
                        : "Out of stock"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => updateProductQuantity(product.id)}
                      className="text-sm font-semibold text-[#174832] hover:underline"
                    >
                      Update stock
                    </button>
                  </td>
                </tr>
              ))}

              {products.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-gray-500">
                    You haven't added any products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-100 p-4 text-right">
          <Link
            to="/farmer/products"
            className="text-sm font-semibold text-[#174832] hover:underline"
          >
            View all products
            <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
          <p className="text-sm text-gray-500">
            Quickly access important farmer services.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            to="/farmer/verification"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-green-300 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-[#174832]">
              <FontAwesomeIcon icon={faClipboardCheck} className="text-xl" />
            </div>

            <h3 className="font-bold text-gray-900">Farmer Verification</h3>
            <p className="mt-1 text-sm text-gray-500">
              Submit and manage your farmer verification.
            </p>

            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#174832]">
              View verification
              <FontAwesomeIcon
                icon={faArrowRight}
                className="transition group-hover:translate-x-1"
              />
            </span>
          </Link>

          <Link
            to="/farmer/products/new"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-green-300 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <FontAwesomeIcon icon={faPlus} className="text-xl" />
            </div>

            <h3 className="font-bold text-gray-900">Add Product</h3>
            <p className="mt-1 text-sm text-gray-500">
              List your fresh produce for potential buyers.
            </p>

            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#174832]">
              Add a product
              <FontAwesomeIcon
                icon={faArrowRight}
                className="transition group-hover:translate-x-1"
              />
            </span>
          </Link>

          <Link
            to="/farmer/requests"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-green-300 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <FontAwesomeIcon icon={faClipboardList} className="text-xl" />
            </div>

            <h3 className="font-bold text-gray-900">Buyer Requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              View requests from potential buyers.
            </p>

            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#174832]">
              View requests
              <FontAwesomeIcon
                icon={faArrowRight}
                className="transition group-hover:translate-x-1"
              />
            </span>
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h2 className="font-bold text-gray-900">
              Recent Buyer Requests
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              See what buyers are looking for.
            </p>
          </div>

          <Link
            to="/farmer/requests"
            className="text-sm font-semibold text-[#174832] hover:underline"
          >
            View all
            <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Buyer</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Quantity</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {requests.slice(0, 5).map((request) => {
                const status = getRequestStatus(request);

                return (
                  <tr key={request.id}>
                    <td className="px-5 py-4 font-semibold text-gray-800">
                      {getRequestBuyer(request)}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {request.product}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {getRequestQuantity(request)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      <FontAwesomeIcon
                        icon={faLocationDot}
                        className="mr-1 text-gray-400"
                      />
                      {request.preferredLocation || request.location || "Not specified"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          status === "accepted"
                            ? "bg-green-100 text-green-700"
                            : status === "declined"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateRequestStatus(request.id, "Accepted")
                            }
                            title="Accept request"
                            className="rounded-lg bg-green-100 px-3 py-2 text-green-700 hover:bg-green-200"
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateRequestStatus(request.id, "Declined")
                            }
                            title="Decline request"
                            className="rounded-lg bg-red-100 px-3 py-2 text-red-700 hover:bg-red-200"
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Updated
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {requests.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-gray-500">
                    No buyer requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default FarmerDashboard;
