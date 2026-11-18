
import { useEffect, useState } from "react";

const STORAGE_KEY = "agribridge-buyer-requests";

function getStoredRequests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function getCurrentFarmer() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function BuyerRequests() {
  const farmer = getCurrentFarmer();

  const farmerId = farmer.id || farmer.user_id || "farmer-1";
  const farmerName =
    farmer.fullName || farmer.name || farmer.username || "Farmer";

  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    const loadRequests = () => {
      setRequests(getStoredRequests());
    };

    loadRequests();

    window.addEventListener("storage", loadRequests);
    window.addEventListener("agribridge-update", loadRequests);

    return () => {
      window.removeEventListener("storage", loadRequests);
      window.removeEventListener("agribridge-update", loadRequests);
    };
  }, []);

  const getFarmerResponse = (request) => {
    if (!Array.isArray(request.responses)) {
      return null;
    }

    return request.responses.find(
      (response) =>
        String(response.farmerId) === String(farmerId)
    );
  };

  const getRequestStatus = (request) => {
    const response = getFarmerResponse(request);

    if (response) {
      return response.status;
    }

    return "pending";
  };

  const updateRequest = (requestId, newStatus) => {
    const allRequests = getStoredRequests();

    const updatedRequests = allRequests.map((request) => {
      if (String(request.id) !== String(requestId)) {
        return request;
      }

      const oldResponses = Array.isArray(request.responses)
        ? request.responses
        : [];

      const newResponse = {
        farmerId,
        farmerName,
        status: newStatus,
        respondedAt: new Date().toISOString(),
      };

      const existingResponse = oldResponses.some(
        (response) =>
          String(response.farmerId) === String(farmerId)
      );

      let updatedResponses;

      if (existingResponse) {
        updatedResponses = oldResponses.map((response) =>
          String(response.farmerId) === String(farmerId)
            ? newResponse
            : response
        );
      } else {
        updatedResponses = [...oldResponses, newResponse];
      }

      return {
        ...request,
        responses: updatedResponses,
      };
    });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedRequests)
    );

    setRequests(updatedRequests);
    setSelectedRequest(null);

    window.dispatchEvent(new Event("agribridge-update"));
  };

  const filteredRequests = requests.filter((request) => {
    const buyerName = request.buyerName || request.buyer || "Buyer";
    const product = request.product || "";

    const matchesSearch =
      buyerName.toLowerCase().includes(search.toLowerCase()) ||
      product.toLowerCase().includes(search.toLowerCase());

    const status = getRequestStatus(request);

    const matchesFilter =
      filter === "All" ||
      status.toLowerCase() === filter.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const pendingCount = requests.filter(
    (request) => getRequestStatus(request) === "pending"
  ).length;

  const acceptedCount = requests.filter(
    (request) => getRequestStatus(request) === "accepted"
  ).length;

  const declinedCount = requests.filter(
    (request) => getRequestStatus(request) === "declined"
  ).length;

  const getQuantity = (request) => {
    return (
      request.quantityNeeded ||
      request.qty ||
      `${request.quantity || ""} ${request.unit || ""}`.trim() ||
      "Not specified"
    );
  };

  const getDate = (request) => {
    if (request.neededByDate) {
      return new Date(request.neededByDate).toLocaleDateString();
    }

    if (request.createdAt) {
      return new Date(request.createdAt).toLocaleDateString();
    }

    return "Not specified";
  };

  const getStatusStyle = (status) => {
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
            Buyer Requests
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View buying requests from buyers and respond to their needs.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Requests</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-800">
              {requests.length}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending</p>
            <h2 className="mt-2 text-3xl font-bold text-yellow-600">
              {pendingCount}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Accepted</p>
            <h2 className="mt-2 text-3xl font-bold text-green-600">
              {acceptedCount}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Declined</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {declinedCount}
            </h2>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                All Buyer Requests
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Requests submitted by buyers on AgriBridge.
              </p>
            </div>

            <input
              type="text"
              placeholder="Search buyer or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-600 md:w-72"
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {["All", "Pending", "Accepted", "Declined"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filter === status
                    ? "bg-green-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {filteredRequests.length === 0 ? (
            <div className="rounded-lg bg-gray-50 py-12 text-center">
              <p className="font-medium text-gray-600">
                No buyer requests found.
              </p>
              <p className="mt-1 text-sm text-gray-400">
                New requests from buyers will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead>
                  <tr className="border-b bg-gray-50 text-sm text-gray-500">
                    <th className="p-4">Buyer</th>
                    <th className="p-4">Product</th>
                    <th className="p-4">Quantity</th>
                    <th className="p-4">Price Range</th>
                    <th className="p-4">Needed By</th>
                    <th className="p-4">Your Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map((request) => {
                    const status = getRequestStatus(request);

                    return (
                      <tr
                        key={request.id}
                        className="border-b last:border-0"
                      >
                        <td className="p-4 font-medium text-gray-800">
                          {request.buyerName || request.buyer || "Buyer"}
                        </td>

                        <td className="p-4 text-gray-600">
                          {request.product}
                        </td>

                        <td className="p-4 text-gray-600">
                          {getQuantity(request)}
                        </td>

                        <td className="p-4 text-gray-600">
                          {request.priceRange || "Not specified"}
                        </td>

                        <td className="p-4 text-gray-600">
                          {getDate(request)}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusStyle(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="font-medium text-green-700 hover:text-green-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  Request Details
                </h2>

                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-2xl text-gray-400 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Buyer</p>
                  <p className="mt-1 font-medium text-gray-800">
                    {selectedRequest.buyerName ||
                      selectedRequest.buyer ||
                      "Buyer"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Product</p>
                  <p className="mt-1 font-medium text-gray-800">
                    {selectedRequest.product}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Quantity Needed</p>
                  <p className="mt-1 font-medium text-gray-800">
                    {getQuantity(selectedRequest)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Price Range</p>
                  <p className="mt-1 font-medium text-gray-800">
                    {selectedRequest.priceRange || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Preferred Location</p>
                  <p className="mt-1 font-medium text-gray-800">
                    {selectedRequest.preferredLocation ||
                      selectedRequest.location ||
                      "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Needed By</p>
                  <p className="mt-1 font-medium text-gray-800">
                    {getDate(selectedRequest)}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm text-gray-500">
                  Quality Requirements
                </p>
                <p className="mt-1 text-gray-800">
                  {selectedRequest.qualityRequirements ||
                    selectedRequest.message ||
                    "No additional requirements."}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-sm text-gray-500">Your Response</p>
                <p className="mt-1 font-medium capitalize text-gray-800">
                  {getRequestStatus(selectedRequest)}
                </p>
              </div>

              {getRequestStatus(selectedRequest) === "pending" && (
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() =>
                      updateRequest(selectedRequest.id, "accepted")
                    }
                    className="flex-1 rounded-lg bg-green-700 px-5 py-3 font-medium text-white hover:bg-green-800"
                  >
                    Accept Request
                  </button>

                  <button
                    onClick={() =>
                      updateRequest(selectedRequest.id, "declined")
                    }
                    className="flex-1 rounded-lg bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700"
                  >
                    Decline Request
                  </button>
                </div>
              )}

              <button
                onClick={() => setSelectedRequest(null)}
                className="mt-4 w-full rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BuyerRequests;
