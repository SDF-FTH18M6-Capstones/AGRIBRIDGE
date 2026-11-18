
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
    farmer.fullName || farmer.full_name || farmer.name || farmer.username || "Farmer";

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
      (response) => String(response.farmerId) === String(farmerId)
    );
  };

  const getRequestStatus = (request) => {
    const response = getFarmerResponse(request);
    return response?.status || "pending";
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
        (response) => String(response.farmerId) === String(farmerId)
      );

      const updatedResponses = existingResponse
        ? oldResponses.map((response) =>
            String(response.farmerId) === String(farmerId)
              ? newResponse
              : response
          )
        : [...oldResponses, newResponse];

      return {
        ...request,
        responses: updatedResponses,
      };
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRequests));

    setRequests(updatedRequests);
    setSelectedRequest(null);

    window.dispatchEvent(new Event("agribridge-update"));
  };

  const getQuantity = (request) => {
    return (
      request.quantityNeeded ||
      request.qty ||
      `${request.quantity || ""} ${request.unit || ""}`.trim() ||
      "Not specified"
    );
  };

  const getDate = (request) => {
    const date = request.neededByDate || request.createdAt;

    if (!date) return "Not specified";

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
    if (status === "accepted") {
      return "bg-green-100 text-green-700";
    }

    if (status === "declined") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  const filteredRequests = requests.filter((request) => {
    const buyerName = request.buyerName || request.buyer || "Buyer";
    const product = request.product || "";

    const matchesSearch =
      String(buyerName).toLowerCase().includes(search.toLowerCase()) ||
      String(product).toLowerCase().includes(search.toLowerCase());

    const status = getRequestStatus(request);

    const matchesFilter =
      filter === "All" || status === filter.toLowerCase();

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

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-medium text-green-700">
          Farmer dashboard / Buyer requests
        </p>

        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Buyer Requests
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Review purchase requests from buyers and manage your responses.
            </p>
          </div>

          <span className="w-fit rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-700">
            {pendingCount} pending requests
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total requests</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {requests.length}
          </h2>
          <p className="mt-1 text-xs text-gray-400">All buyer requests</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Pending</p>
          <h2 className="mt-2 text-3xl font-bold text-yellow-600">
            {pendingCount}
          </h2>
          <p className="mt-1 text-xs text-gray-400">Awaiting your response</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Accepted</p>
          <h2 className="mt-2 text-3xl font-bold text-green-700">
            {acceptedCount}
          </h2>
          <p className="mt-1 text-xs text-gray-400">Approved requests</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Declined</p>
          <h2 className="mt-2 text-3xl font-bold text-red-600">
            {declinedCount}
          </h2>
          <p className="mt-1 text-xs text-gray-400">Declined requests</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-bold text-gray-900">
              Purchase requests
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              View buyer details and respond to requests.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search buyer or product..."
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-600"
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-600"
            >
              <option value="All">All requests</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="Declined">Declined</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Buyer</th>
                <th className="px-6 py-4 font-semibold">Product</th>
                <th className="px-6 py-4 font-semibold">Quantity</th>
                <th className="px-6 py-4 font-semibold">Price Range</th>
                <th className="px-6 py-4 font-semibold">Needed By</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredRequests.map((request) => {
                const status = getRequestStatus(request);

                return (
                  <tr key={request.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">
                        {request.buyerName || request.buyer || "Buyer"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {request.preferredLocation || request.location || ""}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {request.product || "Not specified"}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {getQuantity(request)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {request.priceRange || "Not specified"}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {getDate(request)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(status)}`}
                      >
                        {status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(request)}
                        className="text-sm font-semibold text-green-700 hover:text-green-900"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-14 text-center">
                    <p className="font-semibold text-gray-800">
                      No requests found
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      New requests from buyers will appear here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-100 px-6 py-4 text-sm text-gray-500">
          Showing {filteredRequests.length} of {requests.length} requests
        </div>
      </div>

      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Request details
              </h2>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-gray-500">Buyer</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {selectedRequest.buyerName ||
                    selectedRequest.buyer ||
                    "Buyer"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Product</p>
                <p className="mt-1 font-medium text-gray-900">
                  {selectedRequest.product || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Quantity needed</p>
                <p className="mt-1 font-medium text-gray-900">
                  {getQuantity(selectedRequest)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Price range</p>
                <p className="mt-1 font-medium text-gray-900">
                  {selectedRequest.priceRange || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Preferred location</p>
                <p className="mt-1 font-medium text-gray-900">
                  {selectedRequest.preferredLocation ||
                    selectedRequest.location ||
                    "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Needed by</p>
                <p className="mt-1 font-medium text-gray-900">
                  {getDate(selectedRequest)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Quality requirements</p>
                <p className="mt-1 text-sm text-gray-700">
                  {selectedRequest.qualityRequirements ||
                    selectedRequest.message ||
                    "No additional requirements."}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Your response</p>
                <span
                  className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                    getRequestStatus(selectedRequest)
                  )}`}
                >
                  {getRequestStatus(selectedRequest)}
                </span>
              </div>
            </div>

            {getRequestStatus(selectedRequest) === "pending" && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    updateRequest(selectedRequest.id, "declined")
                  }
                  className="flex-1 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Decline request
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateRequest(selectedRequest.id, "accepted")
                  }
                  className="flex-1 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800"
                >
                  Accept request
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BuyerRequests;


