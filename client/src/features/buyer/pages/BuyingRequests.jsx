
import { useState, useEffect } from "react";

const STORAGE_KEY = "agribridge-buyer-requests";

function getStoredRequests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
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

function BuyingRequests() {
  const buyer = getCurrentBuyer();

  const buyerId = buyer.id || buyer.user_id || "buyer-1";
  const buyerName =
    buyer.fullName || buyer.name || buyer.username || "Buyer";

  const [myRequests, setMyRequests] = useState([]);

  const [formData, setFormData] = useState({
    product: "",
    quantityNeeded: "",
    priceRange: "",
    preferredLocation: "",
    neededByDate: "",
    qualityRequirements: "",
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadRequests = () => {
      const allRequests = getStoredRequests();

      const buyerRequests = allRequests.filter(
        (request) => String(request.buyerId) === String(buyerId)
      );

      setMyRequests(buyerRequests);
    };

    loadRequests();

    window.addEventListener("storage", loadRequests);
    window.addEventListener("agribridge-update", loadRequests);

    return () => {
      window.removeEventListener("storage", loadRequests);
      window.removeEventListener("agribridge-update", loadRequests);
    };
  }, [buyerId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.product.trim() ||
      !formData.quantityNeeded.trim() ||
      !formData.preferredLocation.trim()
    ) {
      setMessage("Please fill in the required fields.");
      return;
    }

    const newRequest = {
      id: Date.now(),
      buyerId,
      buyerName,
      product: formData.product,
      quantityNeeded: formData.quantityNeeded,
      priceRange: formData.priceRange,
      preferredLocation: formData.preferredLocation,
      neededByDate: formData.neededByDate,
      qualityRequirements: formData.qualityRequirements,
      status: "pending",
      responses: [],
      createdAt: new Date().toISOString(),
    };

    const allRequests = getStoredRequests();
    const updatedRequests = [...allRequests, newRequest];

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedRequests)
    );

    window.dispatchEvent(new Event("agribridge-update"));

    setMyRequests(
      updatedRequests.filter(
        (request) => String(request.buyerId) === String(buyerId)
      )
    );

    setFormData({
      product: "",
      quantityNeeded: "",
      priceRange: "",
      preferredLocation: "",
      neededByDate: "",
      qualityRequirements: "",
    });

    setMessage("Your buying request has been submitted successfully.");
  };

  const getResponseCount = (request) => {
    return Array.isArray(request.responses)
      ? request.responses.length
      : 0;
  };

  const getResponseStyle = (status) => {
    if (status === "accepted") {
      return "bg-green-100 text-green-700";
    }

    if (status === "declined") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            Buying Requests
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create requests and connect with farmers who can supply your products.
          </p>
        </div>

        {/* Create Buying Request */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-800">
            Create a Buying Request
          </h2>

          {message && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Product *
                </label>

                <input
                  type="text"
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                  placeholder="e.g. Fresh tomatoes"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-600"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Quantity Needed *
                </label>

                <input
                  type="text"
                  name="quantityNeeded"
                  value={formData.quantityNeeded}
                  onChange={handleChange}
                  placeholder="e.g. 50 kg"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-600"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Price Range
                </label>

                <input
                  type="text"
                  name="priceRange"
                  value={formData.priceRange}
                  onChange={handleChange}
                  placeholder="e.g. KSh 80 - 120 per kg"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Preferred Location *
                </label>

                <input
                  type="text"
                  name="preferredLocation"
                  value={formData.preferredLocation}
                  onChange={handleChange}
                  placeholder="e.g. Nairobi"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-600"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Needed By
                </label>

                <input
                  type="date"
                  name="neededByDate"
                  value={formData.neededByDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Quality Requirements
                </label>

                <input
                  type="text"
                  name="qualityRequirements"
                  value={formData.qualityRequirements}
                  onChange={handleChange}
                  placeholder="e.g. Fresh, ripe and good quality"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-600"
                />
              </div>

            </div>

            <button
              type="submit"
              className="mt-6 rounded-lg bg-green-700 px-6 py-3 font-medium text-white transition hover:bg-green-800"
            >
              Submit Request
            </button>
          </form>
        </div>

        {/* My Buying Requests */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-800">
            My Buying Requests
          </h2>

          {myRequests.length === 0 ? (
            <div className="rounded-lg bg-gray-50 py-12 text-center">
              <p className="font-medium text-gray-600">
                You haven't submitted any requests yet.
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Your requests will appear here after submission.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">

                <thead>
                  <tr className="border-b bg-gray-50 text-sm text-gray-500">
                    <th className="p-4">Product</th>
                    <th className="p-4">Quantity</th>
                    <th className="p-4">Price Range</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Farmer Responses</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {myRequests.map((request) => {
                    const responses = Array.isArray(request.responses)
                      ? request.responses
                      : [];

                    return (
                      <tr
                        key={request.id}
                        className="border-b last:border-0"
                      >
                        <td className="p-4 font-medium text-gray-800">
                          {request.product}
                        </td>

                        <td className="p-4 text-gray-600">
                          {request.quantityNeeded}
                        </td>

                        <td className="p-4 text-gray-600">
                          {request.priceRange || "Not specified"}
                        </td>

                        <td className="p-4 text-gray-600">
                          {request.preferredLocation}
                        </td>

                        <td className="p-4 text-gray-600">
                          {getResponseCount(request)} farmer(s)
                        </td>

                        <td className="p-4">
                          {responses.length === 0 ? (
                            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                              Pending
                            </span>
                          ) : (
                            <div className="flex flex-col items-start gap-2">
                              {responses.map((response, index) => (
                                <span
                                  key={`${response.farmerId}-${index}`}
                                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getResponseStyle(
                                    response.status
                                  )}`}
                                >
                                  {response.farmerName || "Farmer"}:{" "}
                                  {response.status}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default BuyingRequests;
