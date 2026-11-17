
import { useState } from "react";

const initialRequests = [
  {
    id: 1,
    buyer: "Mary Wanjiku",
    product: "Fresh Tomatoes",
    quantity: 50,
    unit: "kg",
    price: 120,
    location: "Nairobi",
    date: "17 Nov 2026",
    message: "I would like fresh tomatoes for my grocery shop.",
    status: "Pending",
  },
  {
    id: 2,
    buyer: "Peter Mwangi",
    product: "Green Kale",
    quantity: 30,
    unit: "bunches",
    price: 40,
    location: "Kiambu",
    date: "16 Nov 2026",
    message: "Please confirm if you can supply this quantity.",
    status: "Pending",
  },
  {
    id: 3,
    buyer: "Grace Achieng",
    product: "Sweet Potatoes",
    quantity: 100,
    unit: "kg",
    price: 90,
    location: "Nakuru",
    date: "15 Nov 2026",
    message: "Looking for a regular supplier.",
    status: "Accepted",
  },
  {
    id: 4,
    buyer: "John Kamau",
    product: "Fresh Avocados",
    quantity: 25,
    unit: "kg",
    price: 150,
    location: "Thika",
    date: "14 Nov 2026",
    message: "Kindly let me know when these will be ready.",
    status: "Declined",
  },
];

function BuyerRequests() {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const updateRequest = (id, newStatus) => {
    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === id
          ? { ...request, status: newStatus }
          : request
      )
    );

    setSelectedRequest(null);
  };

  const filteredRequests = requests.filter((request) => {
    const matchesFilter =
      filter === "All" || request.status === filter;

    const matchesSearch =
      request.buyer.toLowerCase().includes(search.toLowerCase()) ||
      request.product.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const pendingCount = requests.filter(
    (request) => request.status === "Pending"
  ).length;

  const acceptedCount = requests.filter(
    (request) => request.status === "Accepted"
  ).length;

  const declinedCount = requests.filter(
    (request) => request.status === "Declined"
  ).length;

  const getStatusStyle = (status) => {
    if (status === "Accepted") {
      return "bg-green-100 text-green-700";
    }

    if (status === "Declined") {
      return "bg-red-100 text-red-700";
    }

    return "bg-orange-100 text-orange-700";
  };

  return (
    <div className="space-y-7">
      {/* Page heading */}
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

          <span className="w-fit rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
            {pendingCount} pending requests
          </span>
        </div>
      </div>

      {/* Summary cards */}
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
          <h2 className="mt-2 text-3xl font-bold text-orange-600">
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

      {/* Requests table */}
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
                <th className="px-6 py-4 font-semibold">Total value</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="transition hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">
                      {request.buyer}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {request.location}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    {request.product}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    {request.quantity} {request.unit}
                  </td>

                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    KSh {(request.quantity * request.price).toLocaleString("en-KE")}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {request.date}
                  </td>

                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(request.status)}`}>
                      {request.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-sm font-semibold text-green-700 hover:text-green-900"
                      >
                        View
                      </button>

                      {request.status === "Pending" && (
                        <>
                          <button
                            onClick={() => updateRequest(request.id, "Accepted")}
                            className="text-sm font-semibold text-green-700 hover:text-green-900"
                          >
                            Accept
                          </button>

                          <button
                            onClick={() => updateRequest(request.id, "Declined")}
                            className="text-sm font-semibold text-red-600 hover:text-red-800"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-14 text-center">
                    <p className="font-semibold text-gray-800">
                      No requests found
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Try another search or filter.
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

      {/* Request details modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Request details
              </h2>

              <button
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
                  {selectedRequest.buyer}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Product</p>
                  <p className="mt-1 font-medium text-gray-900">
                    {selectedRequest.product}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Quantity</p>
                  <p className="mt-1 font-medium text-gray-900">
                    {selectedRequest.quantity} {selectedRequest.unit}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Price per unit</p>
                  <p className="mt-1 font-medium text-gray-900">
                    KSh {selectedRequest.price}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Total value</p>
                  <p className="mt-1 font-semibold text-green-700">
                    KSh {(selectedRequest.quantity * selectedRequest.price).toLocaleString("en-KE")}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500">Buyer message</p>
                <p className="mt-1 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                  {selectedRequest.message}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Request status</p>
                <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(selectedRequest.status)}`}>
                  {selectedRequest.status}
                </span>
              </div>
            </div>

            {selectedRequest.status === "Pending" && (
              <div className="mt-6 flex gap-3 border-t border-gray-100 pt-5">
                <button
                  onClick={() => updateRequest(selectedRequest.id, "Declined")}
                  className="flex-1 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Decline request
                </button>

                <button
                  onClick={() => updateRequest(selectedRequest.id, "Accepted")}
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
